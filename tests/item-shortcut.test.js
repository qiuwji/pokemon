import {
  fixtureInventory,
  inventoryQuantity,
  setQuantity,
} from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ItemShortcutService,
  validItemShortcut,
} from "../dist/engine/item-shortcut.js";
import { createItemService } from "../dist/engine/items.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { createEmeraldCommandFacade } from "../dist/packs/emerald/command-facade.js";
import { createBagInterface } from "../dist/packs/emerald/bag-interface.js";
import { PACK } from "../dist/packs/emerald/pack.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import { createMonster } from "../dist/engine/model.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { BrowserInput } from "../dist/adapters/browser-input.js";
import { BEHAVIOR } from "../dist/engine/terrain.js";
const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const kit = {
  name: "Kit",
  price: 0,
  contexts: ["field"],
  target: "field",
  effects: [],
  registerable: true,
  actions: [
    { id: "red", fieldAction: "paint" },
    { id: "blue", fieldAction: "paint" },
  ],
};
function service() {
  let selection = null,
    quantity = 1,
    usable = false,
    calls = [];
  const events = [];
  const shortcuts = new ItemShortcutService({
    items: { kit },
    selection: () => selection,
    quantity: () => quantity,
    setSelection: (value) => {
      selection = value;
    },
    inspect: () => ({ ok: usable, reason: "Away from the target" }),
    perform: async (item, action) => {
      calls.push([item, action]);
      return { ok: true };
    },
    emit: (type, payload) => events.push([type, payload]),
  });
  return {
    shortcuts,
    events,
    calls,
    quantity: (value) => {
      quantity = value;
    },
    usable: (value) => {
      usable = value;
    },
  };
}
function fixture({
  plugins = [],
  records = new Map(),
  onWait = () => {},
} = {}) {
  const data = {
    ...base,
    maps: {
      ...base.maps,
      Lab: {
        ...base.maps.Route101,
        id: "Lab",
        width: 5,
        height: 6,
        blocks: Array(30).fill(3 << 12),
        behavior: Array(30).fill(0),
        npcs: [],
        elements: [],
        connections: [],
        warps: [],
        signs: [],
      },
    },
  };
  let now = 0,
    game;
  const compiled = createEmeraldPlugins(data, plugins);
  const timeline = new Timeline({
    now: () => now,
    wait: async (ms) => {
      now += ms;
      onWait(game);
    },
  });
  game = new EmeraldAdventure({
    ...compiled,
    plugins: compiled.host,
    timeline,
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(compiled.db.maps)),
    storage: {
      getItem: (key) => records.get(key) ?? null,
      setItem: (key, value) => records.set(key, value),
    },
  });
  game.attachUI({ blocked: false, dialog: null, updateSide() {}, toast() {} });
  if (!game.saveProtected && !game.state.party.length)
    game.state.party = [createMonster("mudkip", 10, game.db, game.rng)];
  if (!game.saveProtected && !game.lastSave)
    game.enter({ map: "Lab", x: 2, y: 4, dir: "up" });
  const { bus } = attachEmeraldExtensions(game, compiled.host);
  return { game, bus, records, ...compiled };
}

test("Shortcut identity validates current content and explicit null without accepting unknown fields or consumer items", () => {
  assert(validItemShortcut(null, { kit }));
  assert(validItemShortcut({ item: "kit", action: "blue" }, { kit }));
  for (const selection of [
    undefined,
    false,
    [],
    {},
    { item: "kit" },
    { item: "missing", action: "red" },
    { item: "kit", action: "missing" },
    { item: "kit", action: "red", input: {} },
    { item: "kit", action: 0 },
  ])
    assert.equal(validItemShortcut(selection, { kit }), false);
  assert.equal(
    validItemShortcut({ item: "potion", action: "use" }, ITEMS),
    false,
  );
  assert.throws(() =>
    createItemService(
      { potion: { ...ITEMS.potion, registerable: true } },
      fixtureInventory({ potion: { ...ITEMS.potion, registerable: true } }),
    ),
  );
  assert.throws(() =>
    createItemService(
      { kit: { ...kit, registerable: "yes" } },
      fixtureInventory({ kit: { ...kit, registerable: "yes" } }),
    ),
  );
});
test("Registration is independent of current usability, does not consume inventory, is idempotent and publishes detached facts", () => {
  const s = service();
  assert(s.shortcuts.register("kit", "blue").ok);
  assert.equal(s.shortcuts.view().usable, false);
  assert.equal(s.shortcuts.view().owned, true);
  assert.equal(s.calls.length, 0);
  assert.equal(s.events.length, 1);
  assert.equal(s.events[0][0], "core:item-registration");
  assert(Object.isFrozen(s.events[0][1].selection));
  assert.throws(() => {
    s.events[0][1].selection.action = "red";
  }, TypeError);
  s.shortcuts.setSelection({ action: "blue", item: "kit" });
  assert(s.shortcuts.register("kit", "blue").ok);
  assert.equal(s.events.length, 1);
  s.quantity(0);
  assert.equal(s.shortcuts.register("kit", "red").ok, false);
  assert.equal(s.shortcuts.view().selection.action, "blue");
});
test("Activation queries current rules, runs only the chosen binding and keeps the registered item on ordinary denial", async () => {
  const s = service();
  assert.equal((await s.shortcuts.use()).ok, false);
  s.shortcuts.register("kit", "red");
  assert.equal((await s.shortcuts.use()).ok, false);
  assert.equal(s.shortcuts.view().selection.action, "red");
  s.usable(true);
  assert((await s.shortcuts.use()).ok);
  assert.deepEqual(s.calls, [["kit", "red"]]);
  s.shortcuts.register("kit", "blue");
  assert((await s.shortcuts.use()).ok);
  assert.deepEqual(s.calls.at(-1), ["kit", "blue"]);
});
test("Read-only lookup never clears a missing item; first activation clears it once and does not invoke an action", async () => {
  const s = service();
  s.shortcuts.register("kit", "red");
  s.quantity(0);
  assert.equal(s.shortcuts.view().owned, false);
  assert.equal(s.shortcuts.view().selection.item, "kit");
  assert.equal(s.events.length, 1);
  assert.equal((await s.shortcuts.use()).ok, false);
  assert.equal(s.shortcuts.view().selection, null);
  assert.equal(s.events[1][1].cause, "missing-item");
  assert.equal((await s.shortcuts.use()).ok, false);
  assert.equal(s.events.length, 2);
  assert.equal(s.calls.length, 0);
});
test("Native bicycle registration runs through the command bus, preserves RNG and inventory, and follows fresh state after restore", async () => {
  const s = fixture(),
    g = s.game,
    events = [];
  s.host.events.on("core:item-registration", (value) => events.push(value));
  setQuantity(g.state.bag, "mach_bike", 1);
  assert(
    s.bus.executeSync(
      "core.item.register",
      { item: "mach_bike", action: "use" },
      "ui",
    ).ok,
  );
  assert.equal(g.state.movement.mode, "walk");
  const before = g.rng.seed,
    saved = g.exportDocument();
  assert.equal(saved.version, 11);
  g.loadDocument(saved);
  assert.deepEqual(g.registeredItemView().selection, {
    item: "mach_bike",
    action: "use",
  });
  assert((await s.bus.execute("core.item.shortcut", {}, "ui")).ok);
  assert.equal(g.state.movement.mode, "mach-bike");
  assert.equal(g.rng.seed, before);
  assert.equal(inventoryQuantity(g.state.bag, "mach_bike"), 1);
  assert.equal(g.actionBusy, false);
  assert((await g.useRegisteredItem()).ok);
  assert.equal(g.state.movement.mode, "walk");
  assert(s.bus.executeSync("core.item.unregister", {}, "ui").ok);
  assert.equal(g.registeredItemView().selection, null);
  assert.equal(events.length, 2);
});
test("A rod can be registered away from water, then its same shortcut rechecks shore elevation and starts the owned fishing session", async () => {
  const s = fixture({
      onWait(game) {
        if (game.fishing) game.reelFishing({ cancel: true });
      },
    }),
    g = s.game;
  setQuantity(g.state.bag, "old_rod", 1);
  assert(g.registerItem("old_rod", "use").ok);
  assert.equal(g.registeredItemView().usable, false);
  assert.equal((await g.useRegisteredItem()).ok, false);
  assert.equal(g.state.registeredItem.item, "old_rod");
  g.patchWorld([
    {
      kind: "tile",
      map: "Lab",
      x: 2,
      y: 3,
      behavior: BEHAVIOR.POND_WATER,
      block: 1 << 12,
    },
  ]);
  assert(g.registeredItemView().usable);
  const result = await g.useRegisteredItem();
  assert.equal(result.fishing, "cancelled");
  assert.equal(inventoryQuantity(g.state.bag, "old_rod"), 1);
  const other = fixture({ records: s.records });
  assert.deepEqual(
    other.game.registeredItemView().selection,
    g.state.registeredItem,
  );
  assert.equal(other.game.registeredItemView().usable, true);
});
test("Menus, dialogue, battles and story locks cannot start a shortcut or overwrite the registered selection", async () => {
  const { game: g, bus } = fixture();
  setQuantity(g.state.bag, "mach_bike", 1);
  g.registerItem("mach_bike", "use");
  const before = structuredClone(g.state);
  g.ui.blocked = true;
  await assert.rejects(
    () => bus.execute("core.item.shortcut", {}, "network"),
    /busy/,
  );
  assert.equal((await g.useRegisteredItem()).ok, false);
  g.ui.blocked = false;
  g.storyBusy = true;
  assert.equal(g.unregisterItem().ok, false);
  assert.equal((await g.useRegisteredItem()).ok, false);
  g.storyBusy = false;
  g.combat.battle = {};
  assert.equal(g.registerItem("old_rod", "use").ok, false);
  assert.equal((await g.useRegisteredItem()).ok, false);
  g.combat.battle = null;
  g.ui.dialog = {};
  await assert.rejects(
    () => bus.execute("core.item.shortcut", {}, "network"),
    /busy/,
  );
  assert.equal((await g.useRegisteredItem()).ok, false);
  assert.equal(g.unregisterItem().ok, false);
  g.ui.dialog = null;
  assert.deepEqual(g.state, before);
});
test("Current saves require shortcut identity; stale quantity is preserved until use, while old envelopes and bad references are rejected", async () => {
  const s = fixture(),
    g = s.game;
  setQuantity(g.state.bag, "mach_bike", 1);
  g.registerItem("mach_bike", "use");
  const document = g.exportDocument();
  for (const selection of [
    undefined,
    { item: "mach_bike", action: "typo" },
    { item: "potion", action: "use" },
  ]) {
    const invalid = structuredClone(document.state);
    invalid.registeredItem = selection;
    assert.equal(validateSave(invalid, g.db, s.catalog, s.host), false);
  }
  const old = { ...document, version: 8 };
  assert.throws(() => g.loadDocument(old));
  const stale = structuredClone(document);
  setQuantity(stale.state.bag, "mach_bike", 0);
  assert(validateSave(stale.state, g.db, s.catalog, s.host));
  g.loadDocument(stale);
  const snapshots = s.bus.executeSync("core.query", {});
  assert.equal(snapshots.registeredItem.owned, false);
  assert.equal(g.state.registeredItem.item, "mach_bike");
  assert.equal((await g.useRegisteredItem()).ok, false);
  assert.equal(g.state.registeredItem, null);
  assert.equal(
    JSON.parse([...s.records.values()].at(-1)).state.registeredItem,
    null,
  );
});
function plugin(permissions = ["useItem"], capture = () => {}) {
  return {
    id: "brush",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions,
    setup(api) {
      capture(api);
      const fieldAction = api.content.register("fieldActions", "paint", {
        name: "Paint",
        duration: 100,
        cue: "field-cut",
        menu: false,
        allowed: (c) => c.bag["brush:kit"] > 0,
        target: (c) => c.position,
        plan: (c, target, input) => ({
          kind: "world",
          operations: [
            {
              kind: "tile",
              map: target.map,
              x: 1,
              y: 1,
              behavior: input.color,
            },
          ],
        }),
        schema: {
          type: "object",
          properties: { color: { type: "integer", enum: [1, 2] } },
          required: ["color"],
          additionalProperties: false,
        },
      });
      api.content.register("items", "kit", {
        ...kit,
        actions: kit.actions.map((entry, index) => ({
          ...entry,
          fieldAction,
          input: { color: index + 1 },
        })),
      });
    },
  };
}
test("A content plugin registers a chosen action, controls it through authorized commands and retains dependency identity even at zero quantity", async () => {
  let api;
  const p = plugin(undefined, (value) => {
    api = value;
  });
  const s = fixture({ plugins: [p] }),
    g = s.game;
  setQuantity(g.state.bag, "brush:kit", 1);
  assert(
    (
      await api.commands.dispatch("core.item.register", {
        item: "brush:kit",
        action: "blue",
      })
    ).ok,
  );
  const frozen = api.query().registeredItem;
  assert(Object.isFrozen(frozen.selection));
  assert.equal(frozen.selection.action, "blue");
  assert((await api.commands.dispatch("core.item.shortcut", {})).ok);
  assert.equal(g.world.map.behavior[6], 2);
  assert.equal(inventoryQuantity(g.state.bag, "brush:kit"), 1);
  setQuantity(g.state.bag, "brush:kit", 0);
  g.save();
  assert(g.state.contentDependencies.includes("brush"));
  const raw = [...s.records.values()].at(-1);
  const unloaded = fixture({ records: s.records });
  assert.equal(unloaded.game.saveProtected, true);
  assert.equal(unloaded.game.saveStore.lastIssue.code, "missing_dependency");
  unloaded.game.save();
  assert.equal([...s.records.values()].at(-1), raw);
});
test("A plugin without useItem may read the shortcut but cannot register, clear or activate it", async () => {
  let api;
  const s = fixture({
      plugins: [
        plugin([], (value) => {
          api = value;
        }),
      ],
    }),
    g = s.game;
  setQuantity(g.state.bag, "brush:kit", 1);
  g.registerItem("brush:kit", "red");
  const before = structuredClone(g.state);
  for (const [id, input] of [
    ["core.item.register", { item: "brush:kit", action: "blue" }],
    ["core.item.unregister", {}],
    ["core.item.shortcut", {}],
  ])
    await assert.rejects(() => api.commands.dispatch(id, input));
  assert.equal(api.query().registeredItem.selection.action, "red");
  assert.deepEqual(g.state, before);
});
test("Bag registration selects a plugin sub-action, does not use it, and toggles the same registered action off", () => {
  const s = fixture({ plugins: [plugin()] }),
    g = s.game;
  setQuantity(g.state.bag, "brush:kit", 1);
  let buttons = [],
    options;
  const root = {
    querySelectorAll(selector) {
      const key = selector
        .slice(6, -1)
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return buttons.filter((button) => key in button.dataset);
    },
  };
  const ui = createBagInterface(createEmeraldCommandFacade(g, s.bus), {
    root,
    modal(_name, body, settings) {
      options = settings;
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
    updateSide() {},
    sound() {},
    escapeHTML: String,
  });
  ui.showBag();
  root
    .querySelectorAll("[data-register-item]")
    .find((button) => button.dataset.registerItem === "brush:kit")
    .onclick();
  assert.equal(options.type, "item-registration");
  root
    .querySelectorAll("[data-register-action]")
    .find((button) => button.dataset.registerAction === "blue")
    .onclick();
  assert.equal(g.state.registeredItem.action, "blue");
  assert.equal(g.world.map.behavior[6], 0);
  root
    .querySelectorAll("[data-register-item]")
    .find((button) => button.dataset.registerItem === "brush:kit")
    .onclick();
  root
    .querySelectorAll("[data-register-action]")
    .find((button) => button.dataset.registerAction === "blue")
    .onclick();
  assert.equal(g.state.registeredItem, null);
});
test("Browser Select maps C and touch once, respects focus/modifiers/locks, and disposes its listeners", async () => {
  const doc = new EventTarget(),
    win = new EventTarget(),
    select = new EventTarget();
  let typing = false,
    calls = 0,
    cleared = 0;
  Object.assign(doc, {
    querySelector: () => select,
    querySelectorAll: () => [],
    closest: () => (typing ? {} : null),
  });
  const game = {
    busy: false,
    battle: null,
    resetFieldInput() {
      cleared++;
    },
    handleFieldInput() {},
    async useRegisteredItem() {
      calls++;
      return { ok: false, reason: "Register first" };
    },
    save() {},
  };
  const messages = [],
    ui = { blocked: false, toast: (text) => messages.push(text) };
  const input = new BrowserInput({ document: doc, window: win, game, ui });
  const key = (extra = {}) => {
    const event = new Event("keydown", { cancelable: true });
    Object.assign(event, { key: "c", repeat: false, ...extra });
    doc.dispatchEvent(event);
    return event;
  };
  assert.equal(key().defaultPrevented, true);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(messages[0], "Register first");
  key({ repeat: true });
  key({ ctrlKey: true });
  key({ metaKey: true });
  typing = true;
  key();
  typing = false;
  ui.blocked = true;
  key();
  ui.blocked = false;
  game.busy = true;
  key();
  game.busy = false;
  assert.equal(calls, 1);
  select.dispatchEvent(new Event("click"));
  await Promise.resolve();
  assert.equal(calls, 2);
  assert.equal(cleared, 2);
  input.destroy();
  key();
  select.dispatchEvent(new Event("click"));
  await Promise.resolve();
  assert.equal(calls, 2);
});

test("Native consumable stock survives metadata merging while machines and key items remain unavailable for purchase", () => {
  const { game: g } = fixture();
  for (const id of ["potion", "super_potion", "antidote"])
    assert(g.canBuyItem(id));
  assert.equal(g.canBuyItem("pokeball"), false);
  g.state.flags.pokedex = true;
  assert(g.canBuyItem("pokeball"));
  const money = g.state.money;
  assert(g.buyItem("potion"));
  assert.equal(inventoryQuantity(g.state.bag, "potion"), 1);
  assert.equal(g.state.money, money - ITEMS.potion.price);
  for (const id of ["mach_bike", "acro_bike", "old_rod", "hm_surf", "tm_toxic"])
    assert.equal(g.canBuyItem(id), false);
});
