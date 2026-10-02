import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PluginHost } from "../dist/engine/extensions/plugin-host.js";
import { CommandBus } from "../dist/engine/extensions/command-bus.js";
import { EventBus } from "../dist/engine/extensions/event-bus.js";
import {
  readOnly,
  objectSchema,
  jsonValue,
  validateSchema,
  validateValue,
} from "../dist/engine/extensions/values.js";
import { validateLayout } from "../dist/engine/extensions/ui-registry.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { companionCare } from "../dist/plugins/companion-care.js";
import { createFieldJournal } from "../dist/plugins/field-journal.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { Random, createMonster } from "../dist/engine/model.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import { Battle } from "../dist/engine/battle.js";
import { GEN3_GLOBAL_HOOKS } from "../dist/engine/rules/gen3/global-rules.js";
const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const manifest = (id, setup, rest = {}) => ({
  id,
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: [],
  setup,
  ...rest,
});
function gameWith(
  plugins = [
    companionCare,
    createFieldJournal(base.maps.LittlerootTown_ProfessorBirchsLab),
  ],
) {
  const errors = [],
    { host, catalog, db } = createEmeraldPlugins(
      structuredClone(base),
      plugins,
      (e) => errors.push(e),
    );
  const timeline = new Timeline({ now: () => 0, wait: async () => {} }),
    game = new EmeraldAdventure({
      db,
      catalog,
      plugins: host,
      timeline,
      transitions: new TransitionController(timeline),
      director: new BattleDirector(timeline),
      motion: new GridMotion(new SceneGraph(db.maps)),
      storage: { getItem: () => null, setItem() {} },
    });
  const presentation = [];
  game.ui = {
    blocked: false,
    dialog: null,
    updateSide() {},
    extensions: {
      refresh() {},
      present: (id, payload) => presentation.push({ id, payload }),
    },
  };
  const ports = attachEmeraldExtensions(game, host);
  game.state.party.push(createMonster("mudkip", 6, db, game.rng));
  game.state.flags.rescued = true;
  game.state.flags.pokedex = true;
  return { game, host, catalog, db, errors, presentation, ...ports };
}

test("Plugin startup orders dependencies, rejects versions/cycles/duplicates, and failed setup leaks no registration", () => {
  const host = new PluginHost({ base: {} }),
    order = [];
  host.load([
    manifest("second", () => order.push("second"), {
      dependencies: { first: 1 },
    }),
    manifest("first", (api) => {
      order.push("first");
      api.content.register("resources", "one", "assets/egg-front.png");
    }),
  ]);
  assert.deepEqual(order, ["first", "second"]);
  for (const plugins of [
    [manifest("x", () => {}, { apiVersion: 2 })],
    [manifest("x", () => {}), manifest("x", () => {})],
    [manifest("x", () => {}, { dependencies: { missing: 1 } })],
    [
      manifest("x", () => {}, { dependencies: { y: 1 } }),
      manifest("y", () => {}, { dependencies: { x: 1 } }),
    ],
  ])
    assert.throws(() => new PluginHost({ base: {} }).load(plugins));
  const failed = new PluginHost({ base: {} });
  assert.throws(() =>
    failed.load([
      manifest("bad", (api) => {
        api.content.register("resources", "foo", "assets/egg-front.png");
        throw new Error("setup fault");
      }),
    ]),
  );
  assert.equal(failed.catalog.entries.size, 0);
  assert.equal(failed.manifests.size, 0);
});

test("JSON and schema boundaries reject prototypes, cycles, non-finite data, extra keys and unsupported schema options", () => {
  for (const value of [
    NaN,
    () => {},
    new Date(),
    JSON.parse('{"__proto__":{}}'),
  ])
    assert.throws(() => jsonValue(value));
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => jsonValue(cyclic));
  assert.throws(() => jsonValue("long", 2));
  assert.throws(() =>
    validateSchema({
      type: "object",
      properties: {},
      additionalProperties: true,
    }),
  );
  assert.throws(() => validateSchema({ type: "string", pattern: "secret" }));
  const schema = validateSchema(
    objectSchema({ count: { type: "integer", minimum: 0, maximum: 2 } }, [
      "count",
    ]),
  );
  for (const value of [{ count: 3 }, { count: 1, extra: 2 }, {}])
    assert.throws(() => validateValue(schema, value));
  const projection = readOnly({ mon: { hp: 10 } });
  assert.throws(() => (projection.mon.hp = 0));
});

test("Two independent plugins register pages and slots without modifying the built-in catalogs", () => {
  const { host, db, catalog } = gameWith();
  assert.equal(host.ui.pages.size, 2);
  assert.equal(host.ui.inSlot("monster.detail").length, 2);
  assert(db.maps["field-journal:annex"]);
  assert(catalog.items["field-journal:trail-biscuit"]);
  assert(!base.maps["field-journal:annex"]);
  assert.equal(
    db.maps.LittlerootTown_ProfessorBirchsLab.warps.length,
    base.maps.LittlerootTown_ProfessorBirchsLab.warps.length + 1,
  );
  assert.equal(db.resources["mudkip-front"], "assets/mudkip-front.png");
  const naked = gameWith([]);
  assert.equal(naked.host.ui.pages.size, 0);
  assert.equal(naked.host.ui.inSlot("monster.detail").length, 0);
});

test("Detail interaction composes action, core item/friendship, saved memory, lifecycle and presentation once", async () => {
  const { game, host, bus, presentation } = gameWith(),
    mon = game.state.party[0],
    friendship = mon.friendship;
  game.state.bag.blue_pokeblock = 2;
  await bus.execute("companion-care:interact", {
    uid: mon.uid,
    activity: "feed",
  });
  assert.equal(game.state.bag.blue_pokeblock, 1);
  assert(mon.beauty > 0);
  assert(mon.friendship > friendship);
  assert.equal(presentation.length, 1);
  const record = game.state.extensions["companion-care"];
  assert.equal(record.data.partners[mon.uid].interactions, 1);
  assert.equal(record.states[mon.uid]["companion-care:excited"].remaining, 128);
  assert(validateSave(game.state, game.db, game.catalog, host));
  host.runtime.advance("step");
  assert.equal(
    game.state.extensions["companion-care"].states[mon.uid][
      "companion-care:excited"
    ].remaining,
    127,
  );
  for (let i = 0; i < 127; i++) host.runtime.advance("step");
  assert(!game.state.extensions["companion-care"].states[mon.uid]);
  const view = host.runtime.view("companion-care", { uid: mon.uid }),
    tree = host.runtime.evaluate(
      host.ui.pages.get("companion-care:interaction").render,
      view,
    );
  validateLayout(tree, {
    actions: host.actions,
    resources: game.db.resources,
    themes: host.ui.themes,
  });
});

test("Failed feeding rolls back memory, states, inventory, friendship, events and feedback", async () => {
  const { game, host, bus, presentation } = gameWith(),
    mon = game.state.party[0];
  game.state.bag.blue_pokeblock = 1;
  mon.sheen = 250;
  const original = structuredClone(game.state),
    events = [];
  host.events.on("companion-care:interacted", (e) => events.push(e));
  const originalUse = game.useItem.bind(game);
  game.useItem = (...args) => {
    const result = originalUse(...args);
    if (result.ok) throw new Error("after item fault");
    return result;
  };
  await assert.rejects(
    bus.execute("companion-care:interact", { uid: mon.uid, activity: "feed" }),
    /fault/,
  );
  assert.deepEqual(game.state, original);
  assert.equal(game.state.party[0], mon);
  assert.equal(presentation.length, 0);
  assert.equal(events.length, 0);
  assert(!host.runtime.active);
});

test("Custom states tick and expire once with transactional lifecycle callbacks; stale context cannot write later", async () => {
  let apiRef,
    stale,
    applies = 0,
    removes = 0;
  const plugin = manifest("clock", (api) => {
    apiRef = api;
    const status = api.states.register("pulse", {
      clock: "round",
      schema: objectSchema(),
      onApply: () => applies++,
      onTick: (ctx) =>
        ctx.store.set("ticks", (ctx.store.get("ticks") || 0) + 1),
      onRemove: () => removes++,
    });
    api.actions.register("start", {
      schema: objectSchema({ uid: { type: "string" } }, ["uid"]),
      run: (ctx, { uid }) => {
        stale = ctx;
        ctx.states.attach(status, uid, { duration: 2 });
      },
    });
  });
  const { game, host, bus } = gameWith([plugin]);
  await bus.execute("clock:start", { uid: game.state.party[0].uid });
  host.runtime.advance("step");
  assert.equal(applies, 1);
  host.runtime.advance("round");
  host.runtime.advance("round");
  host.runtime.advance("round");
  assert.equal(applies, 1);
  assert.equal(removes, 1);
  assert.equal(apiRef.store.get("ticks"), 2);
  assert.throws(() => stale.store.set("ticks", 10), /Expired/);
});

test("Plugin numeric rules enter the same battle pipeline and cannot mutate snapshot or dispatch commands", () => {
  let apiRef, snapshot;
  const plugin = manifest("rules", (api) => {
    apiRef = api;
    api.rules.register("boost", {
      phase: "attack",
      modify: (value, c) => {
        snapshot = c;
        assert.throws(() => (c.actor.hp = 0));
        api.commands
          .dispatch("core.field.move", { direction: "down" })
          .catch(() => {});
        return value + 10;
      },
    });
  });
  const { game, host, db } = gameWith([plugin]),
    rng = new Random(42),
    enemy = createMonster("zigzagoon", 5, db, rng);
  const battle = new Battle({
    party: game.state.party,
    enemy,
    db,
    rng,
    bag: game.state.bag,
    traits: {
      abilities: game.catalog.abilities,
      heldItems: game.catalog.heldItems,
      hooks: [...GEN3_GLOBAL_HOOKS, ...game.ruleHooks],
    },
  });
  battle.act({ kind: "move", index: 0 });
  assert(snapshot.actor.uid);
  assert(!Object.hasOwn(snapshot, "battle"));
  assert(!Object.hasOwn(snapshot, "rng"));
  assert.equal(game.state.position.map, "LittlerootTown");
});

test("Core permission and namespace boundaries reject foreign status writes and undeclared intents", async () => {
  const plugin = manifest("bad", (api) => {
    api.actions.register("change", {
      schema: objectSchema({ uid: { type: "string" } }, ["uid"]),
      run: (ctx, { uid }) => ctx.intent({ kind: "friendship", uid, amount: 1 }),
    });
  });
  const { game, bus } = gameWith([plugin]);
  await assert.rejects(
    bus.execute("bad:change", { uid: game.state.party[0].uid }),
    /permission/,
  );
  assert.throws(
    () =>
      bus.executeSync("bad:change", { uid: game.state.party[0].uid, extra: 1 }),
    /unknown property/,
  );
});

test("Plugin memory survives lead changes, box custody and omission; content references report missing dependency", async () => {
  const { game, host, bus } = gameWith(),
    m = game.state.party[0];
  game.state.party.push(createMonster("treecko", 5, game.db, game.rng));
  await bus.execute("companion-care:interact", { uid: m.uid, activity: "pet" });
  game.setLead(1);
  game.depositBox(1);
  assert.equal(
    game.state.extensions["companion-care"].data.partners[m.uid].interactions,
    1,
  );
  const naked = gameWith([]);
  assert(validateSave(game.state, naked.db, naked.catalog, naked.host));
  const copy = structuredClone(game.state);
  copy.position = { map: "field-journal:annex", x: 3, y: 5, dir: "up" };
  copy.contentDependencies = ["field-journal"];
  assert(!validateSave(copy, naked.db, naked.catalog, naked.host));
  const broken = structuredClone(game.state);
  broken.extensions["companion-care"].states = {
    x: { "companion-care:excited": { remaining: 0, data: { mood: 2 } } },
  };
  assert(!validateSave(broken, game.db, game.catalog, host));
});

test("Event failures are isolated and recursive cascades are bounded", () => {
  const errors = [],
    bus = new EventBus({ limit: 4, onError: (e) => errors.push(e) }),
    values = [];
  bus.on("x", () => {
    throw new Error("listener");
  });
  bus.on("x", (e) => values.push(e.sequence));
  bus.emit("x");
  assert.equal(values.length, 1);
  assert.equal(errors.length, 1);
  bus.on("loop", () => bus.emit("loop"));
  bus.emit("loop");
  assert(errors.some((e) => /cascade/.test(e.message)));
  assert(!bus.delivering);
});

test("Command bus serializes asynchronous work, validates network declarations, and releases locks on failure", async () => {
  const bus = new CommandBus(),
    schema = objectSchema();
  let finish;
  bus.register("slow", {
    schema,
    mode: "async",
    network: true,
    run: () => new Promise((resolve) => (finish = resolve)),
  });
  bus.register("local", { schema, run: () => true });
  const running = bus.execute("slow");
  await assert.rejects(bus.execute("slow"), (e) => e.code === "busy");
  finish(true);
  await running;
  assert(!bus.active);
  await assert.rejects(
    bus.execute("local", {}, "network"),
    (e) => e.code === "not_network_enabled",
  );
  bus.register("fault", {
    schema,
    mode: "async",
    run: () => {
      throw new Error("fault");
    },
  });
  await assert.rejects(bus.execute("fault"));
  assert(!bus.active);
});

test("New species, moves, traits, movement and growth predicates are registered as content and validated before play", () => {
  const plugin = manifest("content", (api) => {
    const ability = api.content.register("abilities", "quiet", { hooks: [] });
    api.content.register("species", "bud", {
      ...structuredClone(base.species.treecko),
      name: "Bud",
      abilities: [ability],
    });
    api.content.register("resources", "bud-front", "assets/treecko-front.png");
    api.content.register("resources", "bud-back", "assets/treecko-back.png");
    const effect = api.content.register("moveEffects", "hit", {});
    api.content.register("moves", "tap", {
      ...base.moves.tackle,
      name: "Tap",
      effect,
    });
    api.content.register("movement", "stroll", {
      name: "Stroll",
      actor: "BrendanNormal",
      durations: [200],
      surface: "land",
      allowed: () => true,
      traverse: ({ cell }) => {
        assert.throws(() => (cell.collision = 0));
        return cell.collision === 0;
      },
    });
    const predicate = "content:ready";
    api.content.register("growthConditions", "ready", {
      schema: objectSchema(
        {
          type: { type: "string", enum: [predicate] },
          minimum: { type: "integer", minimum: 0, maximum: 255 },
        },
        ["type", "minimum"],
      ),
      test: ({ mon }, condition) => mon.friendship >= condition.minimum,
    });
    api.content.register("evolutions", "bud-evolution", {
      from: "content:bud",
      to: "treecko",
      trigger: "level",
      conditions: [{ type: predicate, minimum: 80 }],
    });
  });
  const { game, db, host } = gameWith([plugin]);
  const m = createMonster("content:bud", 5, db, game.rng);
  m.friendship = 90;
  game.state.party.push(m);
  const plan = game.growth.evolutionPlan(m);
  assert.equal(plan.to, "treecko");
  assert(game.evolutions.commit(plan).ok);
  assert.equal(m.species, "treecko");
  assert(game.setMovementMode("content:stroll").ok);
  assert(game.movement.traversal("content:stroll", { cell: { collision: 0 } }));
  assert(validateSave(game.state, db, game.catalog, host));
  const broken = manifest("broken", (api) =>
    api.content.register("moves", "bad", {
      ...base.moves.tackle,
      effect: "unknown-effect",
    }),
  );
  assert.throws(() => gameWith([broken]), /unknown|Unknown/);
});

test("Async status callbacks are rejected and late callbacks cannot modify committed records", async () => {
  let release;
  const errors = [],
    plugin = manifest("async-status", (api) => {
      const status = api.states.register("bad", {
        clock: "step",
        schema: objectSchema(),
        onTick: async (ctx) => {
          await new Promise((resolve) => (release = resolve));
          ctx.store.set("late", true);
        },
      });
      api.actions.register("start", {
        schema: objectSchema({ uid: { type: "string" } }, ["uid"]),
        run: (ctx, { uid }) => ctx.states.attach(status, uid, { duration: 2 }),
      });
    });
  const { game, host, bus } = gameWith([plugin]);
  await bus.execute("async-status:start", { uid: game.state.party[0].uid });
  const before = structuredClone(game.state.extensions);
  host.runtime.advance("step");
  assert.deepEqual(game.state.extensions, before);
  release();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(game.state.extensions, before);
  assert.equal(host.runtime.active, false);
});

test("A state fault restores its clock and memory and missing plugin core content is never silently loaded", async () => {
  const plugin = manifest("faulty", (api) => {
    const id = api.states.register("timer", {
      clock: "step",
      schema: objectSchema(),
      onTick: (ctx) => {
        ctx.store.set("bad", true);
        throw new Error("tick fault");
      },
    });
    api.actions.register("start", {
      schema: objectSchema({ uid: { type: "string" } }, ["uid"]),
      run: (ctx, { uid }) => ctx.states.attach(id, uid, { duration: 1 }),
    });
  });
  const { game, host, bus, errors } = gameWith([plugin]);
  await bus.execute("faulty:start", { uid: game.state.party[0].uid });
  const original = structuredClone(game.state.extensions);
  host.runtime.advance("step");
  assert.deepEqual(game.state.extensions, original);
  assert(errors.some((e) => e.message === "tick fault"));
  const normal = gameWith(),
    document = normal.game.exportDocument();
  document.state.position = {
    map: "field-journal:annex",
    x: 3,
    y: 5,
    dir: "up",
  };
  document.state.contentDependencies = ["field-journal"];
  assert.throws(() => game.loadDocument(document), /field-journal/);
  assert.equal(game.state.position.map, "LittlerootTown");
});

test("Two live sessions cannot silently overwrite each other and read-only save inspection does not adopt a changed baseline", async () => {
  const { SaveStore } = await import("../dist/engine/save-store.js");
  let raw = null;
  const storage = {
    getItem: () => raw,
    setItem: (key, value) => (raw = value),
  };
  const a = new SaveStore(storage, "test", () => true),
    b = new SaveStore(storage, "test", () => true);
  a.load();
  b.load();
  a.save({ value: 1 });
  assert.equal(b.load().state.value, 1);
  assert.throws(
    () => b.save({ value: 2 }),
    (e) => e.code === "save_conflict",
  );
  assert.equal(JSON.parse(raw).state.value, 1);
  b.acceptCurrent();
  b.save({ value: 2 });
  assert.throws(
    () => a.save({ value: 3 }),
    (e) => e.code === "save_conflict",
  );
});

test("Extension map references and grid values fail before play, including patched connections", () => {
  for (const patch of [
    {
      map: "LittlerootTown_ProfessorBirchsLab",
      warps: [{ x: 1, y: 1, dest_map: "missing", dest_warp_id: "0" }],
    },
    {
      map: "LittlerootTown_ProfessorBirchsLab",
      connections: [{ direction: "up", offset: 0, map: "missing" }],
    },
  ])
    assert.throws(
      () =>
        gameWith([
          manifest("bad-map", (api) =>
            api.content.register("mapExtensions", "patch", patch),
          ),
        ]),
      /extension/,
    );
});
test("Intent shapes reject extra fields before writes and observer failures cannot undo committed actions", async () => {
  const plugin = manifest(
    "strict",
    (api) => {
      api.actions.register("extra", {
        schema: objectSchema(),
        run(ctx) {
          ctx.store.set("should-rollback", true);
          ctx.intent({
            kind: "friendship",
            uid: ctx.query().party[0].uid,
            amount: 1,
            ignored: true,
          });
        },
      });
      api.actions.register("commit", {
        schema: objectSchema(),
        run(ctx) {
          ctx.store.set("committed", true);
        },
      });
    },
    { permissions: ["friendship"] },
  );
  const { host, bus, game, errors } = gameWith([plugin]);
  await assert.rejects(bus.execute("strict:extra"), /unknown property/);
  assert.deepEqual(game.state.extensions.strict.data, {});
  host.runtime.ports.changed = () => {
    throw new Error("view fault");
  };
  await bus.execute("strict:commit");
  assert.equal(game.state.extensions.strict.data.committed, true);
  assert.equal(errors.at(-1).message, "view fault");
});
test("Themes and world feedback use bounded public definitions; invalid scopes and asynchronous validation fail", () => {
  assert.throws(
    () =>
      gameWith([
        manifest("bad-scope", (api) =>
          api.presentation.register("effect", {
            draw() {},
            duration: 500,
            scope: "invalid",
          }),
        ),
      ]),
    /presentation/,
  );
  assert.throws(
    () =>
      gameWith([
        manifest("async-data", () => {}, { validateData: async () => {} }),
      ]),
    /synchronous/,
  );
  const { host } = gameWith();
  assert(host.ui.themes.has("companion-care:warm"));
  assert.throws(
    () =>
      validateLayout(
        { kind: "panel", theme: "missing", children: [] },
        { actions: host.actions, resources: {}, themes: host.ui.themes },
      ),
    /theme/,
  );
  assert.throws(
    () => validateSchema({ type: "integer", minimum: 5, maximum: 2 }),
    /bounds/,
  );
});
