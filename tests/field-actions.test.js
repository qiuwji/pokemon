import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  FieldActionRegistry,
  FieldActionService,
} from "../dist/engine/field-actions.js";
import { FishingSession } from "../dist/engine/fishing.js";
import { gen3FishingRules } from "../dist/engine/rules/gen3/fishing.js";
import { FieldActionDirector } from "../dist/presentation/field-action-director.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { createMonster } from "../dist/engine/model.js";
import { EncounterTableRegistry } from "../dist/engine/encounter-tables.js";
import { EncounterService } from "../dist/engine/encounters.js";
import { GEN3_ABILITIES } from "../dist/engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../dist/engine/rules/gen3/held-items.js";
import { Random } from "../dist/engine/model.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import { createEmeraldPresentation } from "../dist/packs/emerald/animations.js";
import { drawFieldAction } from "../dist/presentation/field-action-canvas.js";

const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const definition = {
  name: "Paint",
  cue: "paint",
  duration: 100,
  allowed: (c) => c.allowed,
  target: () => ({ map: "test", x: 1, y: 1 }),
  plan: () => ({ kind: "paint" }),
};
function service() {
  const context = { allowed: true, position: { x: 0 } },
    events = [],
    calls = [];
  const actions = new FieldActionService({
    registry: new FieldActionRegistry({ paint: definition }),
    query: () => context,
    prepareOperation: (operation) => operation,
    commitOperation: async (operation) => {
      calls.push(operation);
      return { ok: true };
    },
    emit: (...args) => events.push(args),
  });
  return { actions, context, events, calls };
}
test("Field plans validate before changes, expose immutable data and cannot be forged, reused or committed by a different issuer", async () => {
  const s = service(),
    other = service(),
    { plan } = s.actions.prepare("paint");
  assert(Object.isFrozen(plan.operation));
  assert.throws(() => (plan.target.x = 8), TypeError);
  assert.throws(() => s.actions.prepare("paint", { unexpected: true }));
  assert.throws(() => s.actions.prepare("missing"), /Unknown/);
  assert.equal((await other.actions.commit(plan)).ok, false);
  assert.equal((await s.actions.commit({ ...plan })).ok, false);
  assert.equal(s.calls.length, 0);
  assert.equal(s.events.length, 0);
  assert.equal((await s.actions.commit(plan)).ok, true);
  assert.equal((await s.actions.commit(plan)).ok, false);
  assert.equal(s.calls.length, 1);
  assert.equal(s.events[0][0], "core:field-action");
});
test("Changed conditions, coordinates and cancelled plans reject without side effects", async () => {
  const s = service(),
    plan = s.actions.prepare("paint").plan;
  s.context.allowed = false;
  assert.equal((await s.actions.commit(plan)).ok, false);
  assert.equal(s.actions.prepare("paint").ok, false);
  s.context.allowed = true;
  const moved = s.actions.prepare("paint").plan;
  s.context.position.x++;
  assert.equal((await s.actions.commit(moved)).ok, false);
  const cancelled = s.actions.prepare("paint").plan;
  s.actions.discard(cancelled);
  assert.equal((await s.actions.commit(cancelled)).ok, false);
  assert.equal(s.calls.length, 0);
});
test("Registration rejects duplicate actions, missing rules, invalid durations and invalid schemas", () => {
  const registry = new FieldActionRegistry({ paint: definition });
  assert.throws(() => registry.register("paint", definition));
  for (const change of [
    { target: null },
    { duration: -1 },
    { duration: Infinity },
    { schema: { type: "object" } },
    { schema: { type: "string" } },
  ])
    assert.throws(() =>
      registry.register("other", { ...definition, ...change }),
    );
});
test("Action transitions commit only under cover and release presentation on exceptions", async () => {
  let now = 0;
  const timeline = new Timeline({
      now: () => now,
      wait: async (ms) => (now += ms),
    }),
    transitions = new TransitionController(timeline),
    director = new FieldActionDirector({ timeline });
  await director.play(
    {
      id: "dive",
      cue: "dive",
      target: {},
      duration: 600,
      operation: { kind: "travel" },
    },
    () => {
      assert(transitions.sample().covered);
      assert(director.sample());
    },
    { transitions },
  );
  assert.equal(director.sample(), null);
  await assert.rejects(
    director.play(
      {
        id: "cut",
        cue: "cut",
        target: {},
        duration: 100,
        operation: { kind: "world" },
      },
      () => {
        throw new Error("occupied");
      },
      { transitions },
    ),
    /occupied/,
  );
  assert.equal(director.sample(), null);
  assert.equal(transitions.busy, false);
});

function fieldMap(overrides = {}) {
  return {
    ...base.maps.Route101,
    id: "Lab",
    title: "Field lab",
    width: 5,
    height: 6,
    blocks: Array(30).fill(0),
    behavior: Array(30).fill(0),
    connections: [],
    warps: [],
    npcs: [],
    signs: [],
    elements: [],
    ...overrides,
  };
}
function adventure({ maps = {}, plugins = [], onWait = () => {} } = {}) {
  let time = 0,
    saved = null,
    game;
  const data = { ...base, maps: { ...base.maps, Lab: fieldMap(), ...maps } };
  const compiled = createEmeraldPlugins(data, plugins);
  const timeline = new Timeline({
    now: () => time,
    wait: async (ms) => {
      time += ms;
      onWait(game, ms);
    },
  });
  const transitions = new TransitionController(timeline),
    director = new BattleDirector(timeline);
  game = new EmeraldAdventure({
    ...compiled,
    plugins: compiled.host,
    storage: { getItem: () => saved, setItem: (_, value) => (saved = value) },
    motion: new GridMotion(new SceneGraph(compiled.db.maps)),
    director,
    transitions,
    timeline,
  });
  game.attachUI({ blocked: false, dialog: null, updateSide() {}, toast() {} });
  game.state.party = [createMonster("mudkip", 10, game.db, game.rng)];
  game.enter({ map: "Lab", x: 2, y: 4, dir: "up" });
  const { bus } = attachEmeraldExtensions(game, compiled.host);
  return { game, bus, ...compiled, saved: () => saved };
}
test("Cut runs through a public command, saves an object overlay, and a repeated action cannot remove a different object", async () => {
  const s = adventure({
      maps: {
        Lab: fieldMap({
          elements: [
            {
              id: "tree",
              kind: "cutTree",
              actor: "BrendanNormal",
              x: 2,
              y: 3,
              dir: "down",
            },
          ],
        }),
      },
    }),
    g = s.game;
  g.state.flags.badgeStone = true;
  g.state.party[0].moves = [{ id: "cut", pp: 1, maxPP: 30 }];
  assert.equal(
    (await s.bus.execute("core.field.action", { id: "cut" })).ok,
    true,
  );
  assert.equal(g.worldState.state.visits.Lab.objects.tree.hidden, true);
  assert.equal(g.field.npcs.objects("Lab").length, 0);
  assert.equal(
    g.state.party[0].moves[0].pp,
    1,
    "Field moves do not consume PP",
  );
  const document = g.exportDocument();
  g.loadDocument(document);
  assert.equal(g.field.npcs.objects("Lab").length, 0);
  assert.equal((await g.performFieldAction("cut")).ok, false);
  assert.equal(g.actionBusy, false);
  assert.equal(g.fieldDirector.active, false);
});
test("Rock smash requires the correct badge and move; normal field actions do not honor research equipment bypass", async () => {
  const s = adventure({
      maps: {
        Lab: fieldMap({
          elements: [
            {
              id: "rock",
              kind: "breakableRock",
              actor: "BrendanNormal",
              x: 2,
              y: 3,
              dir: "down",
            },
          ],
        }),
      },
    }),
    g = s.game;
  g.state.flags.fieldTraining = true;
  g.state.party[0].moves = [{ id: "rock_smash", pp: 15, maxPP: 15 }];
  const seed = g.rng.seed;
  assert.equal((await g.performFieldAction("rock-smash")).ok, false);
  assert.equal(g.rng.seed, seed);
  assert.equal(g.field.npcs.objects("Lab").length, 1);
  g.state.flags.badgeDynamo = true;
  assert.equal((await g.performFieldAction("rock-smash")).ok, true);
});
test("A content-only plugin defines an action and receives read-only state; host validation rejects an illegal player-blocking plan", async () => {
  let frozen = false;
  const plugin = {
    id: "fieldlab",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: ["movement"],
    setup(api) {
      api.content.register("fieldActions", "paint", {
        ...definition,
        cue: "field-cut",
        allowed(c) {
          frozen = Object.isFrozen(c.flags);
          return true;
        },
        target: (c) => c.position,
        plan: (c) => ({
          kind: "world",
          operations: [
            { kind: "tile", map: c.position.map, x: 1, y: 1, behavior: 2 },
          ],
        }),
      });
      api.content.register("fieldActions", "block", {
        ...definition,
        cue: "field-cut",
        allowed: () => true,
        target: (c) => c.position,
        plan: (c) => ({
          kind: "world",
          operations: [
            {
              kind: "tile",
              map: c.position.map,
              x: c.position.x,
              y: c.position.y,
              block: 1024,
            },
          ],
        }),
      });
    },
  };
  const s = adventure({ plugins: [plugin] }),
    revision = s.game.worldState.state.revision;
  assert.equal(
    (await s.bus.execute("core.field.action", { id: "fieldlab:paint" })).ok,
    true,
  );
  assert(frozen);
  assert.equal(s.game.worldState.maps.Lab.behavior[6], 2);
  const blocked = await s.game.performFieldAction("fieldlab:block");
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /block the player/);
  assert.equal(s.game.worldState.state.revision, revision + 1);
});
test("Changes during action animation invalidate the old target and release locks", async () => {
  let changed = false;
  const s = adventure({
    maps: {
      Lab: fieldMap({
        elements: [
          {
            id: "tree",
            kind: "cutTree",
            actor: "BrendanNormal",
            x: 2,
            y: 3,
            dir: "down",
          },
        ],
      }),
    },
    onWait(g) {
      if (!changed) {
        changed = true;
        g.state.flags.badgeStone = false;
      }
    },
  });
  s.game.state.flags.badgeStone = true;
  s.game.state.party[0].moves = [{ id: "cut", pp: 30, maxPP: 30 }];
  assert.equal((await s.game.performFieldAction("cut")).ok, false);
  assert.equal(s.game.field.npcs.objects("Lab").length, 1);
  assert.equal(s.game.actionBusy, false);
});
test("Dive and surface use content-registered links, cover map changes, retain party and restore movement modes", async () => {
  const plugin = {
    id: "sea",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(api) {
      api.content.register("fieldLinks", "down", {
        map: "Lab",
        x: 2,
        y: 4,
        action: "dive",
        to: { map: "Under", x: 2, y: 4, dir: "up" },
      });
      api.content.register("fieldLinks", "up", {
        map: "Under",
        x: 2,
        y: 4,
        action: "surface",
        to: { map: "Lab", x: 2, y: 4, dir: "up" },
      });
    },
  };
  const s = adventure({
      maps: {
        Lab: fieldMap({ behavior: Array(30).fill(16) }),
        Under: fieldMap({ id: "Under", underwater: true }),
      },
      plugins: [plugin],
    }),
    g = s.game;
  g.state.flags.badgeMind = true;
  g.state.flags.fieldTraining = true;
  g.state.party[0].moves = [{ id: "dive", pp: 10, maxPP: 10 }];
  assert(g.movement.set("surf", g.world.map).ok);
  const uid = g.state.party[0].uid;
  assert.equal((await g.performFieldAction("dive")).ok, true);
  assert.equal(g.state.position.map, "Under");
  assert.equal(g.state.movement.mode, "dive");
  const saved = g.exportDocument();
  g.loadDocument(saved);
  assert.equal(g.state.movement.mode, "dive");
  assert.equal((await g.performFieldAction("surface")).ok, true);
  assert.equal(g.state.position.map, "Lab");
  assert.equal(g.state.movement.mode, "surf");
  assert.equal(g.state.party[0].uid, uid);
});
test("Waterfall climbs as grid steps, blocks ordinary surf ascent and checks the full route before animation", async () => {
  const behavior = Array(30).fill(16);
  behavior[17] = 19;
  behavior[12] = 19;
  const s = adventure({ maps: { Lab: fieldMap({ behavior }) } }),
    g = s.game;
  g.state.flags.fieldTraining = true;
  g.state.flags.badgeRain = true;
  g.state.party[0].moves = [{ id: "waterfall", pp: 15, maxPP: 15 }];
  g.movement.set("surf", g.world.map);
  assert.equal(g.move("up"), false);
  const steps = g.world.steps;
  assert.equal((await g.performFieldAction("waterfall")).ok, true);
  assert.equal(g.state.position.y, 1);
  assert.equal(g.world.steps - steps, 3);
  assert.equal(g.state.movement.mode, "surf");
  g.enter({ map: "Lab", x: 2, y: 4, dir: "up" });
  g.patchWorld([
    {
      kind: "object",
      map: "Lab",
      id: "blocked",
      spawn: true,
      changes: { x: 2, y: 1, actor: "BrendanNormal" },
    },
  ]);
  assert.equal((await g.performFieldAction("waterfall")).ok, false);
  assert.equal(g.state.position.y, 4);
});

function fishing(
  rod = "old",
  { rolls = [], hasEncounters = true, lead = {} } = {},
) {
  let time = 0;
  const session = new FishingSession({
    rules: gen3FishingRules(rod),
    roll: () => rolls.shift() ?? 0,
    now: () => time,
    hasEncounters,
    lead,
  });
  return {
    session,
    advance(ms) {
      time += ms;
      return session.tick();
    },
    bite() {
      time += 1000;
      session.tick();
      time += 5000;
      return session.tick();
    },
  };
}
test("Fishing has waiting, early-input failure, bite windows, no-table failure and exact timeout precedence", () => {
  const s = fishing();
  assert.equal(s.advance(1000).phase, "wait");
  assert.equal(s.session.press().result, "no-bite");
  const noTable = fishing("old", { hasEncounters: false });
  assert.equal(noTable.bite().result, "no-bite");
  const late = fishing();
  assert.equal(late.bite().phase, "bite");
  assert.equal(late.advance(600).result, "escaped");
  assert.equal(late.session.press().result, "escaped");
  const timely = fishing();
  timely.bite();
  assert.equal(timely.session.press().result, "caught");
});
test("Fishing rod rules require repeated rounds and lead suction cups changes bite odds without treating eggs as an ability owner", () => {
  const s = fishing("good", { rolls: [2, 0, 0, 0, 0] });
  s.bite();
  assert.equal(s.session.press().phase, "wait");
  s.advance(5000);
  assert.equal(s.session.press().phase, "wait");
  s.advance(5000);
  assert.equal(s.session.press().result, "caught");
  const cups = fishing("old", {
    rolls: [0, 0, 15],
    lead: { ability: "suction_cups" },
  });
  assert.equal(cups.bite().phase, "bite");
  const egg = fishing("old", {
    rolls: [0, 0, 1],
    lead: { ability: "suction_cups", egg: true },
  });
  assert.equal(egg.bite().result, "no-bite");
  const cancelled = fishing();
  cancelled.session.cancel();
  assert.equal(cancelled.advance(10000).result, "cancelled");
});
test("Fishing encounter tables select the correct rod and reject rod filters on other encounter areas", () => {
  const entries = [{ species: "zigzagoon", weight: 1, min: 2, max: 2 }],
    tables = new EncounterTableRegistry(
      {
        old: {
          map: "Route103",
          area: "fishing",
          rod: "old",
          rate: 180,
          entries,
        },
        super: {
          map: "Route103",
          area: "fishing",
          rod: "super",
          rate: 180,
          entries,
        },
      },
      base,
    );
  assert.equal(
    tables.select("Route103", "fishing", {}, { rod: "super" }).id,
    "super",
  );
  assert.equal(tables.select("Route103", "fishing", {}, { rod: "good" }), null);
  assert.throws(
    () =>
      new EncounterTableRegistry(
        {
          invalid: {
            map: "Route103",
            area: "land",
            rod: "old",
            rate: 180,
            entries,
          },
        },
        base,
      ),
  );
});
test("Successful fishing bypasses a second encounter probability roll and intimidation while preserving wild creation rules", () => {
  const rng = new Random(20),
    party = [createMonster("poochyena", 30, base, rng)];
  party[0].ability = "intimidate";
  const encounters = new EncounterService({
    db: base,
    rng,
    abilities: GEN3_ABILITIES,
    heldItems: GEN3_HELD_ITEMS,
  });
  for (let i = 0; i < 10; i++) {
    const mon = encounters.attempt({
      party,
      entries: [{ species: "zigzagoon", weight: 1, min: 2, max: 2 }],
      rate: 0,
      area: "fishing",
      checkRate: false,
      checkSelection: false,
      checkPermission: false,
    });
    assert.equal(mon.species, "zigzagoon");
    assert.equal(mon.level, 2);
  }
});
test("The public fishing command accepts concurrent reel input, launches one encounter after cleanup, and keeps the rod", async () => {
  let encounters = [],
    closed = 0;
  const plugin = {
    id: "pond",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(api) {
      api.content.register("encounters", "old", {
        map: "Lab",
        area: "fishing",
        rod: "old",
        rate: 0,
        entries: [{ species: "zigzagoon", min: 2, max: 2, weight: 1 }],
      });
    },
  };
  const s = adventure({
    plugins: [plugin],
    maps: { Lab: fieldMap({ behavior: Array(30).fill(16) }) },
    onWait(g) {
      if (g.fishing?.phase === "bite")
        void s.bus.execute("core.field.fishing-input", {});
    },
  });
  s.game.state.flags.oldRod = true;
  s.game.rng.int = () => 0;
  s.game.startBattle = (mon) => {
    assert.equal(s.game.actionBusy, false);
    encounters.push(mon);
  };
  s.game.ui.showFishing = () => {};
  s.game.ui.updateFishing = () => {};
  s.game.ui.closeFishing = () => closed++;
  const result = await s.bus.execute("core.field.action", {
    id: "fishing",
    input: JSON.stringify({ rod: "old" }),
  });
  assert.equal(result.fishing, "caught");
  assert.equal(encounters.length, 1);
  assert.equal(encounters[0].species, "zigzagoon");
  assert.equal(closed, 1);
  assert.equal(s.game.fishing, null);
  assert.equal(s.game.state.flags.oldRod, true);
  assert.equal(s.game.fieldDirector.active, false);
});
test("Public fishing can cancel without generating a monster, and map requirements prevent a land save with a diving mode", async () => {
  const s = adventure({
    maps: { Lab: fieldMap({ behavior: Array(30).fill(16) }) },
  });
  s.game.state.flags.oldRod = true;
  const seed = s.game.rng.seed;
  s.game.ui.showFishing = () => s.game.reelFishing({ cancel: true });
  const result = await s.game.performFieldAction("fishing", { rod: "old" });
  assert.equal(result.fishing, "cancelled");
  assert.notEqual(
    s.game.rng.seed,
    seed,
    "Starting the fishing session legitimately consumes the rounds roll",
  );
  s.game.state.movement.mode = "surf";
  assert(validateSave(s.game.state, s.db, s.catalog, s.host));
  s.game.state.movement.mode = "dive";
  assert.equal(validateSave(s.game.state, s.db, s.catalog, s.host), false);
});
test("Data-driven stories reuse their field scene, record action results and reject unsafe parallel actions before any flag write", async () => {
  const s = adventure({
      maps: {
        Lab: fieldMap({
          elements: [
            {
              id: "tree",
              kind: "cutTree",
              actor: "BrendanNormal",
              x: 2,
              y: 3,
              dir: "down",
            },
          ],
        }),
      },
    }),
    g = s.game;
  g.state.party[0].moves = [{ id: "cut", pp: 30, maxPP: 30 }];
  await g.runStory([
    { type: "flag", key: "badgeStone", value: true },
    { type: "fieldAction", id: "cut", variable: "treeCleared" },
    { type: "fieldAction", id: "cut", variable: "secondCut" },
  ]);
  assert.equal(g.state.story.variables.treeCleared, true);
  assert.equal(g.state.story.variables.secondCut, false);
  assert.equal(g.fieldDirector.active, false);
  assert.equal(g.actionBusy, false);
  await assert.rejects(
    g.runStory([
      { type: "flag", key: "illegal", value: true },
      {
        type: "parallel",
        commands: [
          { type: "fieldAction", id: "cut" },
          { type: "move", path: ["left"] },
        ],
      },
    ]),
    /cannot run in parallel/,
  );
  assert.equal(g.state.flags.illegal, undefined);
  await assert.rejects(
    g.runStory([{ type: "fieldAction", id: "missing" }]),
    /Invalid/,
  );
});
test("Plugins register a field action visual through the shared presentation registry; unknown cues and malformed links fail at startup", () => {
  const drawn = [];
  const plugin = {
    id: "visualfield",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(api) {
      const cue = api.presentation.effect("spark", {
        draw: (ctx, visual) => drawn.push(visual),
      });
      api.content.register("fieldActions", "spark", { ...definition, cue });
    },
  };
  const { host } = createEmeraldPlugins(base, [plugin]),
    registry = createEmeraldPresentation({ host });
  drawFieldAction(
    { save() {}, restore() {} },
    {
      cue: "visualfield:spark",
      phase: "effect",
      progress: 0.5,
      id: "visualfield:spark",
    },
    { x: 8, y: 9 },
    registry,
  );
  assert.equal(drawn[0].scope, "field");
  assert.equal(drawn[0].t, 0.5);
  assert(Object.isFrozen(drawn[0]));
  assert.throws(
    () =>
      createEmeraldPlugins(base, [
        {
          ...plugin,
          setup(api) {
            api.content.register("fieldActions", "missing", definition);
          },
        },
      ]),
    /Unknown field action cue/,
  );
  assert.throws(
    () =>
      createEmeraldPlugins(base, [
        {
          ...plugin,
          setup(api) {
            api.content.register("fieldLinks", "bad", {
              map: "Route101",
              x: 0,
              y: 0,
              action: "dive",
              to: { map: "Route101", x: 0, y: 0, dir: "up" },
            });
          },
        },
      ]),
    /wrong environment/,
  );
});

test("Cut and rock reset on connected entry without losing permanent changes or active-save progress", async () => {
  const s = adventure({
      maps: {
        Lab: fieldMap({
          connections: [{ direction: "right", map: "Next", offset: 0 }],
          elements: [
            {
              id: "tree",
              kind: "cutTree",
              actor: "BrendanNormal",
              x: 2,
              y: 3,
              dir: "down",
            },
            {
              id: "rock",
              kind: "breakableRock",
              actor: "BrendanNormal",
              x: 3,
              y: 3,
              dir: "down",
            },
          ],
        }),
        Next: fieldMap({
          id: "Next",
          connections: [{ direction: "left", map: "Lab", offset: 0 }],
        }),
      },
    }),
    g = s.game;
  g.state.flags.badgeStone = g.state.flags.badgeDynamo = true;
  g.state.party[0].moves = [
    { id: "cut", pp: 1, maxPP: 30 },
    { id: "rock_smash", pp: 1, maxPP: 15 },
  ];
  assert((await g.performFieldAction("cut")).ok);
  g.loadDocument(g.exportDocument());
  assert.equal(
    g.field.npcs.objects("Lab").some((n) => n.id === "tree"),
    false,
  );
  assert(g.move("right"));
  await g.timeline.wait(1000);
  g.field.tick(g.timeline.now());
  assert.equal(g.move("up"), false);
  assert((await g.performFieldAction("rock-smash")).ok);
  g.patchWorld([{ kind: "tile", map: "Lab", x: 0, y: 0, behavior: 2 }]);
  g.enter({ map: "Lab", x: 4, y: 4, dir: "right" });
  // Explicit entry already restores the visit; cut again to verify seamless connected re-entry.
  g.patchWorld([
    { kind: "object", map: "Lab", id: "tree", hidden: true, scope: "visit" },
  ]);
  assert(g.move("right"));
  await g.timeline.wait(1000);
  g.field.tick(g.timeline.now());
  assert.equal(g.state.position.map, "Next");
  assert(g.move("left"));
  await g.timeline.wait(1000);
  g.field.tick(g.timeline.now());
  assert.equal(g.state.position.map, "Lab");
  assert.deepEqual(
    g.field.npcs
      .objects("Lab")
      .map((n) => n.id)
      .sort(),
    ["rock", "tree"],
  );
  assert.equal(g.world.map.behavior[0], 2);
  assert.equal(g.transitions.busy, false);
});
test("Restored obstacles cannot occupy the landing cell; rejected entry leaves position and overlays unchanged", () => {
  const s = adventure({
      maps: {
        Lab: fieldMap({
          elements: [
            {
              id: "tree",
              kind: "cutTree",
              actor: "BrendanNormal",
              x: 2,
              y: 3,
              dir: "down",
            },
          ],
        }),
      },
    }),
    g = s.game;
  g.patchWorld([
    { kind: "object", map: "Lab", id: "tree", hidden: true, scope: "visit" },
  ]);
  const before = structuredClone(g.state.worldState),
    position = { ...g.state.position };
  assert.equal(g.enter({ map: "Lab", x: 2, y: 3, dir: "up" }), false);
  assert.deepEqual(g.state.position, position);
  assert.deepEqual(g.state.worldState, before);
  assert.equal(g.enter({ map: "Lab", x: 2, y: 4, dir: "up" }), true);
  assert.equal(g.field.npcs.objects("Lab")[0].id, "tree");
});

test("Map-visit observers see committed player location; blocked story entry stops subsequent rewards", async () => {
  const s = adventure(),
    g = s.game,
    events = [];
  s.host.events.on("core:world-visit", (e) =>
    events.push({ map: e.payload.map, position: { ...g.state.position } }),
  );
  assert(g.enter({ map: "Lab", x: 1, y: 2, dir: "right" }));
  assert.deepEqual(events[0].position, {
    map: "Lab",
    x: 1,
    y: 2,
    dir: "right",
    elevation: 0,
    previousElevation: 0,
  });
  g.patchWorld([
    {
      kind: "object",
      map: "Lab",
      id: "obstacle",
      spawn: true,
      changes: { x: 2, y: 2, actor: "ProfBirch" },
    },
  ]);
  await assert.rejects(
    g.runStory([
      { type: "teleport", position: { map: "Lab", x: 2, y: 2, dir: "down" } },
      { type: "flag", key: "afterBlockedEntry", value: true },
    ]),
    /destination cannot/,
  );
  assert.equal(g.state.flags.afterBlockedEntry, undefined);
  assert.equal(events.length, 1);
});
