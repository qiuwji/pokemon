import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
  setQuantity,
} from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ItemActionService,
  validateItemActions,
} from "../dist/engine/item-actions.js";
import { FieldActionRegistry } from "../dist/engine/field-actions.js";
import { createItemService } from "../dist/engine/items.js";
import { objectSchema } from "../dist/engine/extensions/values.js";
import { Battle } from "../dist/engine/battle.js";
import { createMonster } from "../dist/engine/model.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { createEmeraldCommandFacade } from "../dist/packs/emerald/command-facade.js";
import { createBagInterface } from "../dist/packs/emerald/bag-interface.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { BEHAVIOR } from "../dist/engine/terrain.js";
const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const action = {
  name: "Paint",
  duration: 100,
  cue: "field-cut",
  menu: false,
  schema: objectSchema({ color: { type: "integer", minimum: 1, maximum: 2 } }, [
    "color",
  ]),
  allowed: () => true,
  target: (c) => c.position,
  plan: (c, target, input) => ({
    kind: "world",
    operations: [
      { kind: "tile", map: target.map, x: 1, y: 1, behavior: input.color },
    ],
  }),
};
const item = {
  name: "Paint kit",
  price: 0,
  holdable: false,
  shopStock: false,
  contexts: ["field"],
  target: "field",
  effects: [],
  actions: [
    { id: "red", fieldAction: "paint", input: { color: 1 } },
    { id: "blue", fieldAction: "paint", input: { color: 2 } },
  ],
};
function fixture({ plugins = [], map = {}, onWait = () => {} } = {}) {
  let now = 0,
    game,
    saved = null;
  const lab = {
    ...base.maps.Route101,
    id: "Lab",
    width: 5,
    height: 6,
    blocks: Array(30).fill(0),
    behavior: Array(30).fill(0),
    warps: [],
    connections: [],
    npcs: [],
    signs: [],
    elements: [],
    ...map,
  };
  const compiled = createEmeraldPlugins(
    { ...base, maps: { ...base.maps, Lab: lab } },
    plugins,
  );
  const timeline = new Timeline({
    now: () => now,
    wait: async (ms) => {
      now += ms;
      onWait(game, ms);
    },
  });
  game = new EmeraldAdventure({
    ...compiled,
    plugins: compiled.host,
    storage: {
      getItem: () => saved,
      setItem: (_, value) => {
        saved = value;
      },
    },
    timeline,
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(compiled.db.maps)),
  });
  game.attachUI({ blocked: false, dialog: null, updateSide() {}, toast() {} });
  game.state.party = [createMonster("mudkip", 10, game.db, game.rng)];
  game.enter({ map: "Lab", x: 2, y: 4, dir: "up" });
  const { bus } = attachEmeraldExtensions(game, compiled.host);
  return { game, bus, ...compiled, saved: () => saved };
}

test("Item action bindings validate field targets, schemas, duplicate names and registered references before startup", () => {
  const registry = new FieldActionRegistry({ paint: action });
  assert.equal(validateItemActions({ kit: item }, registry).get("kit").size, 2);
  for (const change of [
    { target: "party" },
    { contexts: ["battle"] },
    { effects: [{ op: "capture", bonus: 1 }] },
    { actions: [] },
    { actions: [item.actions[0], item.actions[0]] },
    { actions: [{ id: "red", fieldAction: "typo" }] },
    { actions: [{ id: "red", fieldAction: "paint", input: { color: 3 } }] },
    { actions: [{ ...item.actions[0], command: "anything" }] },
    { actions: [{ ...item.actions[0], input: { color: 1, extra: true } }] },
  ])
    assert.throws(() =>
      validateItemActions({ kit: { ...item, ...change } }, registry),
    );
});
test("Item actions retain immutable declared inputs, recheck ownership, respect domain denial and never consume key items", async () => {
  const definition = structuredClone(item),
    registry = new FieldActionRegistry({ paint: action });
  let quantity = 1,
    allowed = true,
    calls = 0;
  const service = new ItemActionService({
    items: { kit: definition },
    registry,
    quantity: () => quantity,
    inspect: (id, input) => {
      assert.equal(id, "paint");
      assert(Object.isFrozen(input));
      return { ok: allowed };
    },
    perform: async (id, input) => {
      calls++;
      return { ok: true, color: input.color };
    },
  });
  definition.actions[0].input.color = 2;
  assert.equal((await service.perform("kit", "red")).color, 1);
  assert.equal(quantity, 1);
  quantity = 0;
  assert.equal((await service.perform("kit", "red")).ok, false);
  quantity = 1;
  allowed = false;
  assert.equal((await service.perform("kit", "blue")).ok, false);
  assert.equal((await service.perform("kit", "undeclared")).ok, false);
  assert.equal((await service.perform("unknown", "red")).ok, false);
  assert.equal(calls, 1);
});
test("Ordinary consumable use cannot consume an action item; battles have no hidden potion or ball content", () => {
  const s = fixture();
  const definitions = { kit: item },
    bag = createBag({ kit: 1 });
  assert.equal(
    createItemService(definitions, fixtureInventory(definitions)).use({
      id: "kit",
      bag,
      party: s.game.state.party,
      index: 0,
      context: "field",
    }).ok,
    false,
  );
  assert.equal(inventoryQuantity(bag, "kit"), 1);
  const battle = new Battle({
    db: s.db,
    rng: s.game.rng,
    party: s.game.state.party,
    enemy: createMonster("zigzagoon", 5, s.db, s.game.rng),
    bag: createBag({ potion: 1, pokeball: 1 }),
    items: createItemService({}, fixtureInventory()),
  });
  const mon = battle.party[0];
  mon.hp = 1;
  assert.equal(
    battle.act({ kind: "item", item: "potion", index: 0 })[0].kind,
    "invalid",
  );
  assert.equal(battle.act({ kind: "potion" })[0].kind, "invalid");
  assert.equal(inventoryQuantity(battle.bag, "potion"), 1);
});
test("Research and old bicycle flags grant no capability; each actual bicycle has distinct inventory ownership", async () => {
  const { game: g, bus } = fixture();
  g.state.flags = {
    ...g.state.flags,
    bike: true,
    fieldTraining: true,
    oldRod: true,
  };
  assert.equal(g.fieldCapabilities().surf, false);
  assert.equal(g.fieldCapabilities().fly, false);
  assert.equal(g.setMovementMode("mach-bike").ok, false);
  assert.equal(
    (
      await bus.execute("core.item.action", {
        item: "mach_bike",
        action: "use",
      })
    ).ok,
    false,
  );
  assert.equal(typeof g.claimFieldEquipment, "undefined");
  assert.equal(bus.definition("core.movement.equipment"), undefined);
  setQuantity(g.state.bag, "mach_bike", 1);
  assert.equal(g.setMovementMode("acro-bike").ok, false);
  assert.equal(g.setMovementMode("mach-bike").ok, true);
  assert.equal(g.fieldCapabilities()["acro-bike"], false);
  assert.equal(inventoryQuantity(g.state.bag, "mach_bike"), 1);
});
test("A bicycle bag command plays the existing field scene, toggles riding, preserves facing and RNG, and survives save reload", async () => {
  const s = fixture(),
    g = s.game;
  setQuantity(g.state.bag, "mach_bike", 1);
  const seed = g.rng.seed,
    position = { ...g.state.position };
  assert.equal(
    (
      await s.bus.execute(
        "core.item.action",
        { item: "mach_bike", action: "use" },
        "ui",
      )
    ).ok,
    true,
  );
  assert.equal(g.state.movement.mode, "mach-bike");
  assert.equal(inventoryQuantity(g.state.bag, "mach_bike"), 1);
  assert.deepEqual(g.state.position, position);
  assert.equal(g.rng.seed, seed);
  assert.equal(g.actionBusy, false);
  assert.equal(g.fieldDirector.active, false);
  assert(s.saved());
  const document = g.exportDocument();
  g.loadDocument(document);
  assert.equal(g.state.movement.mode, "mach-bike");
  assert.equal((await g.performItemAction("mach_bike", "use")).ok, true);
  assert.equal(g.state.movement.mode, "walk");
  assert.equal(inventoryQuantity(g.state.bag, "mach_bike"), 1);
});
test("Native cycling metadata permits an indoor cave and forbids a building; explicit custom map policy overrides the header", async () => {
  const s = fixture();
  assert.equal(s.db.maps.OldaleTown_Mart.allowBike, false);
  const cave = { ...base.maps.Route101, indoor: true };
  const { emeraldDatabase } = await import("../dist/packs/emerald/database.js");
  assert.equal(
    emeraldDatabase({ ...base, maps: { GraniteCave_1F: cave } }).maps
      .GraniteCave_1F.allowBike,
    true,
  );
  const indoor = fixture({ map: { indoor: true, allowBike: true } }).game;
  setQuantity(indoor.state.bag, "acro_bike", 1);
  assert.equal(indoor.setMovementMode("acro-bike").ok, true);
  const forbidden = fixture({ map: { allowBike: false } }).game;
  setQuantity(forbidden.state.bag, "mach_bike", 1);
  assert.equal(
    (await forbidden.performItemAction("mach_bike", "use")).ok,
    false,
  );
});
test("Rails and cycling-road rules cannot be bypassed by either the item command or direct movement command", async () => {
  const { game: g, bus } = fixture();
  setQuantity(g.state.bag, "acro_bike", 1);
  assert.equal(g.setMovementMode("acro-bike").ok, true);
  for (const rail of [
    BEHAVIOR.VERTICAL_RAIL,
    BEHAVIOR.HORIZONTAL_RAIL,
    BEHAVIOR.ISOLATED_VERTICAL_RAIL,
    BEHAVIOR.ISOLATED_HORIZONTAL_RAIL,
  ]) {
    g.patchWorld([{ kind: "tile", map: "Lab", x: 2, y: 4, behavior: rail }]);
    assert.equal((await g.performItemAction("acro_bike", "use")).ok, false);
    assert.equal(
      bus.executeSync("core.movement.mode", { mode: "walk" }).ok,
      false,
    );
    assert.equal(g.state.movement.mode, "acro-bike");
  }
  g.patchWorld([{ kind: "tile", map: "Lab", x: 2, y: 4, behavior: 0 }]);
  g.state.flags.cyclingRoad = true;
  assert.equal((await g.performItemAction("acro_bike", "use")).ok, false);
  g.state.flags.cyclingRoad = false;
  assert.equal((await g.performItemAction("acro_bike", "use")).ok, true);
});
test("Inventory changes during item choreography invalidate the shared field plan and release scene locks", async () => {
  let changed = false;
  const { game: g } = fixture({
    onWait(game) {
      if (!changed && game.actionBusy) {
        changed = true;
        setQuantity(game.state.bag, "mach_bike", 0);
      }
    },
  });
  setQuantity(g.state.bag, "mach_bike", 1);
  assert.equal((await g.performItemAction("mach_bike", "use")).ok, false);
  assert.equal(g.state.movement.mode, "walk");
  assert.equal(g.actionBusy, false);
  assert.equal(g.fieldDirector.active, false);
  assert.equal(g.actionDirector.sample(), null);
});
test("Fishing uses the corresponding rod inventory, retains the rod, and rejects underwater, waterfalls and blocked water", async () => {
  const behavior = Array(30).fill(0);
  behavior[17] = BEHAVIOR.POND_WATER;
  const { game: g } = fixture({
    map: {
      behavior,
      blocks: Array(30)
        .fill(1 << 12)
        .map((b, index) => (index === 22 ? 3 << 12 : b)),
    },
    onWait(game) {
      if (game.fishing) game.reelFishing({ cancel: true });
    },
  });
  g.state.flags.oldRod = true;
  assert.equal(g.inspectFieldAction("fishing", { rod: "old" }).ok, false);
  setQuantity(g.state.bag, "old_rod", 1);
  assert.equal(g.inspectFieldAction("fishing", { rod: "good" }).ok, false);
  assert.equal((await g.performItemAction("old_rod", "use")).ok, true);
  assert.equal(inventoryQuantity(g.state.bag, "old_rod"), 1);
  g.patchWorld([
    { kind: "tile", map: "Lab", x: 2, y: 3, behavior: BEHAVIOR.WATERFALL },
  ]);
  assert.equal(g.inspectFieldAction("fishing", { rod: "old" }).ok, false);
  g.patchWorld([
    {
      kind: "tile",
      map: "Lab",
      x: 2,
      y: 3,
      behavior: BEHAVIOR.POND_WATER,
      block: 1 << 10,
    },
  ]);
  assert.equal(g.inspectFieldAction("fishing", { rod: "old" }).ok, false);
  const underwater = fixture({ map: { underwater: true, behavior } }).game;
  setQuantity(underwater.state.bag, "old_rod", 1);
  assert.equal(
    underwater.inspectFieldAction("fishing", { rod: "old" }).ok,
    false,
  );
});
test("Save validation rejects unowned active bicycles and retains inventory-backed modes through restore", () => {
  const s = fixture(),
    g = s.game;
  setQuantity(g.state.bag, "mach_bike", 1);
  g.setMovementMode("mach-bike");
  assert(validateSave(g.state, g.db, s.catalog, s.host));
  const invalid = structuredClone(g.state);
  setQuantity(invalid.bag, "mach_bike", 0);
  assert.equal(validateSave(invalid, g.db, s.catalog, s.host), false);
  assert.throws(() =>
    g.loadDocument({ ...g.exportDocument(), state: invalid }),
  );
  assert.equal(inventoryQuantity(g.state.bag, "mach_bike"), 1);
  assert.equal(g.state.movement.mode, "mach-bike");
});
test("Plugin content composes a new key item with a registered field action and the existing bag, command and world overlay", async () => {
  let api,
    frozen = false;
  const plugin = {
    id: "kit",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: ["useItem"],
    setup(value) {
      api = value;
      const fieldAction = api.content.register("fieldActions", "paint", {
        ...action,
        allowed(c) {
          frozen = Object.isFrozen(c.bag);
          return c.bag["kit:brush"] > 0;
        },
      });
      api.content.register("items", "brush", {
        ...item,
        actions: item.actions.map((binding) => ({ ...binding, fieldAction })),
      });
    },
  };
  const s = fixture({ plugins: [plugin] }),
    g = s.game;
  setQuantity(g.state.bag, "kit:brush", 1);
  let buttons = [],
    html = "",
    updates = 0;
  const root = {
    querySelectorAll(selector) {
      const key = selector
        .slice(6, -1)
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return buttons.filter((b) => key in b.dataset);
    },
  };
  const ui = createBagInterface(createEmeraldCommandFacade(g, s.bus), {
    root,
    modal(_title, body) {
      html = body;
      buttons = [
        ...body.matchAll(/<button[^>]*data-([\w-]+)="([^"]*)"[^>]*>/g),
      ].map((m) => ({
        dataset: {
          [m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())]: m[2],
        },
        disabled: m[0].includes("disabled"),
      }));
    },
    closeModal() {},
    showMenu() {},
    partyCard() {},
    toast() {},
    updateSide() {
      updates++;
    },
    sound() {},
    escapeHTML: String,
  });
  ui.showBag();
  const brush = root
    .querySelectorAll("[data-item]")
    .find((b) => b.dataset.item === "kit:brush");
  assert.equal(brush.disabled, false);
  brush.onclick();
  assert(html.includes('data-item-action="blue"'));
  root
    .querySelectorAll("[data-item-action]")
    .find((b) => b.dataset.itemAction === "blue")
    .onclick();
  // UI callback schedules one async scene; allow its command to settle.
  for (let i = 0; i < 30; i++) await Promise.resolve();
  assert.equal(g.world.map.behavior[6], 2);
  assert.equal(inventoryQuantity(g.state.bag, "kit:brush"), 1);
  assert(frozen);
  assert(updates > 0);
  assert.equal(
    (
      await api.commands.dispatch("core.item.action", {
        item: "kit:brush",
        action: "red",
      })
    ).ok,
    true,
  );
  assert.equal(g.world.map.behavior[6], 1);
  const saved = g.exportDocument();
  g.loadDocument(saved);
  assert.equal(g.world.map.behavior[6], 1);
  assert.equal(inventoryQuantity(g.state.bag, "kit:brush"), 1);
  const invalid = {
    ...plugin,
    id: "badkit",
    setup(api) {
      api.content.register("items", "brush", {
        ...item,
        actions: [{ id: "use", fieldAction: "typo" }],
      });
    },
  };
  assert.throws(() => createEmeraldPlugins(base, [invalid]));
});

test("Gen III fishing distinguishes shore elevations, surfable water and bridge edges without consuming RNG", async () => {
  const { gen3CanFish } = await import("../dist/engine/rules/gen3/fishing.js");
  const shore = {
    mode: "walk",
    underwater: false,
    elevation: 3,
    cell: { behavior: BEHAVIOR.POND_WATER, collision: 0, elevation: 1 },
  };
  assert(gen3CanFish(shore));
  for (const change of [
    { elevation: 4 },
    { cell: { ...shore.cell, elevation: 3 } },
    { cell: { ...shore.cell, elevation: 0 } },
    { cell: { ...shore.cell, collision: 1 } },
    { cell: { ...shore.cell, behavior: BEHAVIOR.WATERFALL } },
    { cell: { ...shore.cell, behavior: BEHAVIOR.HOT_SPRINGS } },
  ])
    assert.equal(gen3CanFish({ ...shore, ...change }), false);
  const surf = { ...shore, mode: "surf", elevation: 1 };
  assert(gen3CanFish(surf));
  assert(
    gen3CanFish({
      ...surf,
      cell: {
        ...surf.cell,
        behavior: BEHAVIOR.BRIDGE_OVER_POND_LOW,
        collision: 1,
      },
    }),
  );
  assert.equal(
    gen3CanFish({ ...surf, cell: { ...surf.cell, behavior: 0x7a } }),
    false,
  );
  assert.equal(gen3CanFish({ ...surf, mode: "dive" }), false);
});

test("Public item queries expose declared actions and permissionless plugins cannot submit an item command", async () => {
  let api;
  const plugin = {
    id: "viewer",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(value) {
      api = value;
    },
  };
  const { game: g, bus } = fixture({ plugins: [plugin] });
  setQuantity(g.state.bag, "mach_bike", 1);
  const view = bus.executeSync("core.query", {}, "ui");
  assert.deepEqual(
    view.itemActions.mach_bike.map((a) => ({ id: a.id, ok: a.ok })),
    [{ id: "use", ok: true }],
  );
  assert.equal(view.itemActions.acro_bike, undefined);
  await assert.rejects(() =>
    api.commands.dispatch("core.item.action", {
      item: "mach_bike",
      action: "use",
    }),
  );
  assert.equal(g.state.movement.mode, "walk");
  assert.equal(inventoryQuantity(g.state.bag, "mach_bike"), 1);
});
