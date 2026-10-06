import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { InventoryRegistry } from "../src/engine/inventory-registry.js";
import { InventoryService, emptyInventory } from "../src/engine/inventory.js";
import { GEN3_INVENTORY_POCKETS } from "../src/engine/rules/gen3/inventory.js";
import { ITEMS } from "../src/packs/emerald/items.js";
import { createEmeraldPlugins } from "../src/packs/emerald/extensions.js";

const definitions = {
  ordinary: {
    label: "普通",
    capacity: 3,
    stackLimit: 5,
    allowDuplicates: true,
  },
  unique: { label: "单堆", capacity: 2, stackLimit: 9, allowDuplicates: false },
};
const items = {
  potion: {},
  ball: {},
  berry: { pocket: "unique" },
  seed: { pocket: "unique" },
};
const registry = () =>
  new InventoryRegistry(definitions, { items, defaultPocket: "ordinary" });
const service = () => new InventoryService(registry());
const add = (item, count) => ({ kind: "add", item, count });
const remove = (item, count, slot) => ({
  kind: "remove",
  item,
  count,
  ...(slot ? { slot } : {}),
});
const ref = (index, item = "potion") => ({ pocket: "ordinary", index, item });
const slots = (...entries) => ({
  pockets: {
    ordinary: entries.map((entry) =>
      entry ? { item: entry[0], count: entry[1] } : null,
    ),
  },
});

test("Inventory policies are supplied by the pack, cloned and frozen; native pocket capacities match the reference", () => {
  const native = new InventoryRegistry(GEN3_INVENTORY_POCKETS, {
    items: ITEMS,
    defaultPocket: "items",
  });
  assert.deepEqual(
    Object.values(native.definitions).map((p) => p.capacity),
    [30, 30, 16, 64, 46],
  );
  assert.equal(native.get("berries").stackLimit, 999);
  assert.equal(native.get("machines").allowDuplicates, false);
  assert.equal(native.pocketOf("tm_focus_punch"), "machines");
  assert.equal(native.pocketOf("old_rod"), "key");
  assert.equal(native.pocketOf("blue_pokeblock"), "items"); // Demo item, not a native case instance.
  const supplied = structuredClone(definitions),
    r = new InventoryRegistry(supplied, { items, defaultPocket: "ordinary" });
  supplied.ordinary.capacity = 1;
  assert.equal(r.get("ordinary").capacity, 3);
  assert.throws(() => (r.get("ordinary").capacity = 1), TypeError);
});

test("Invalid pocket definitions and item references fail registration instead of becoming unrestricted storage", () => {
  for (const catalogs of [
    [[], {}],
    [null, {}],
    [definitions, []],
    [definitions, null],
    [definitions, { bad: null }],
  ])
    assert.throws(
      () =>
        new InventoryRegistry(catalogs[0], {
          items: catalogs[1],
          defaultPocket: "ordinary",
        }),
    );
  for (const change of [
    { capacity: 0 },
    { capacity: 1.5 },
    { stackLimit: -1 },
    { allowDuplicates: "yes" },
    { label: "" },
    { extra: true },
    { capacity: Number.MAX_SAFE_INTEGER },
  ])
    assert.throws(
      () =>
        new InventoryRegistry(
          { ordinary: { ...definitions.ordinary, ...change } },
          { items: {}, defaultPocket: "ordinary" },
        ),
    );
  assert.throws(
    () =>
      new InventoryRegistry(definitions, { items, defaultPocket: "missing" }),
    /Unknown inventory pocket/,
  );
  assert.throws(
    () =>
      new InventoryRegistry(definitions, {
        items: { item: { pocket: "missing" } },
        defaultPocket: "ordinary",
      }),
    /Unknown inventory pocket/,
  );
  assert.throws(() => registry().pocketOf("missing"), /Unknown inventory item/);
});

test("Slot validation rejects count dictionaries, sparse arrays, wrong pockets, zero stacks and forbidden duplicates", () => {
  const inventory = service();
  assert(inventory.validate(emptyInventory()));
  for (const state of [
    { potion: 1 },
    { pockets: {}, counts: {} },
    { pockets: [] },
    { pockets: { missing: [] } },
    { pockets: { ordinary: [null] } },
    { pockets: { ordinary: Array(3) } },
    slots(["potion", 0], null, null),
    slots(["potion", 6], null, null),
    slots(["berry", 1], null, null),
    {
      pockets: {
        unique: [
          { item: "berry", count: 1 },
          { item: "berry", count: 1 },
        ],
      },
    },
    { pockets: { unique: [{ item: "berry", count: 1, extra: true }, null] } },
  ])
    assert.throws(() => inventory.validate(state));
});

test("Addition fills existing partial stacks before empty slots and can span ordinary duplicates", () => {
  const inventory = service(),
    state = slots(["potion", 4], null, ["potion", 2]);
  const before = structuredClone(state),
    plan = inventory.prepare(state, [add("potion", 6)]);
  assert(plan.ok);
  assert.deepEqual(state, before);
  assert(inventory.commit(plan, state));
  assert.deepEqual(state, slots(["potion", 5], ["potion", 2], ["potion", 5]));
  assert.equal(inventory.quantity(state, "potion"), 12);
  assert.equal(inventory.quantity(state, "ball"), 0);
});

test("Full-pocket additions and multi-pocket batches fail atomically without filling part of an earlier stack", () => {
  const inventory = service(),
    state = slots(["potion", 4], ["ball", 5], ["ball", 5]);
  const before = structuredClone(state);
  assert.equal(inventory.prepare(state, [add("potion", 2)]).code, "full");
  assert.equal(
    inventory.apply(state, [add("berry", 1), add("potion", 2)]).code,
    "full",
  );
  assert.deepEqual(state, before);
  assert(inventory.apply(state, [remove("ball", 5), add("potion", 6)]).ok);
  assert.deepEqual(state, slots(["potion", 5], ["potion", 5], ["ball", 5]));
});

test("Single-stack pockets cannot spill into a second empty slot even when the container has room", () => {
  const inventory = service(),
    state = emptyInventory();
  assert.equal(inventory.apply(state, [add("berry", 10)]).code, "full");
  assert.deepEqual(state, emptyInventory());
  assert(inventory.apply(state, [add("berry", 8)]).ok);
  const before = structuredClone(state);
  assert.equal(inventory.apply(state, [add("berry", 2)]).code, "full");
  assert.deepEqual(state, before);
  assert(inventory.apply(state, [add("berry", 1), add("seed", 9)]).ok);
  assert.equal(inventory.quantity(state, "berry"), 9);
});

test("Removal prefers the selected matching slot then uses slot order, preserving fragments and clearing zero stacks", () => {
  const inventory = service(),
    state = slots(["potion", 3], ["potion", 4], ["potion", 2]);
  assert(inventory.apply(state, [remove("potion", 3, ref(2))]).ok);
  assert.deepEqual(state, slots(["potion", 2], ["potion", 4], null));
  assert(inventory.apply(state, [remove("potion", 3)]).ok);
  assert.deepEqual(state, slots(null, ["potion", 3], null));
  assert(inventory.apply(state, [remove("potion", 3)]).ok);
  assert.deepEqual(state, emptyInventory());
});

test("Insufficient quantities, stale selected slots and invalid operations leave the whole batch unchanged", () => {
  const inventory = service(),
    state = slots(["potion", 2], ["ball", 1], null),
    before = structuredClone(state);
  assert.equal(
    inventory.apply(state, [add("berry", 1), remove("potion", 3)]).code,
    "insufficient",
  );
  assert.equal(
    inventory.apply(state, [remove("potion", 1, ref(1))]).code,
    "stale-slot",
  );
  for (const op of [
    add("missing", 1),
    add("potion", 0),
    add("potion", -1),
    add("potion", 1.5),
    { ...add("potion", 1), extra: true },
    { ...add("potion", 1), slot: ref(0) },
    remove("potion", 1, ref(3)),
  ])
    assert.throws(() => inventory.prepare(state, [add("berry", 1), op]));
  assert.deepEqual(state, before);
});

test("Plan custody prevents forgery, replay, modified slots and replacement containers; exposed data cannot alter commits", () => {
  const inventory = service(),
    state = emptyInventory();
  const plan = inventory.prepare(state, [add("potion", 1)]);
  assert.throws(() => (plan.changes[0].after.count = 99), TypeError);
  assert.equal(inventory.commit(structuredClone(plan), state), false);
  assert(inventory.check(plan, state));
  assert(inventory.commit(plan, state));
  assert.equal(inventory.quantity(state, "potion"), 1);
  assert.equal(inventory.commit(plan, state), false);
  const changed = inventory.prepare(state, [add("potion", 1)]);
  state.pockets.ordinary[0].count = 2;
  assert.equal(inventory.commit(changed, state), false);
  const replacement = structuredClone(state),
    next = inventory.prepare(state, [add("ball", 1)]);
  assert.equal(inventory.commit(next, replacement), false);
  assert.equal(inventory.commit(next, state), false);
});

test("Slot-state reload keeps order and fragments; quantity projections and empty-pocket views remain detached", () => {
  const inventory = service(),
    state = slots(["potion", 1], null, ["potion", 2]);
  const restored = JSON.parse(JSON.stringify(state));
  assert(inventory.validate(restored));
  assert.deepEqual(inventory.view(restored), inventory.view(state));
  const view = inventory.view(restored);
  assert.equal(view.pockets.ordinary.used, 2);
  assert.equal(view.pockets.unique.slots.length, 2);
  assert.equal(view.counts.potion, 3);
  assert.throws(() => view.pockets.ordinary.slots[0].count++, TypeError);
  assert.throws(() => view.counts.potion++, TypeError);
  assert.deepEqual(restored, state);
  assert.equal(Object.hasOwn(restored, "counts"), false);
});

test("Native normal items can exceed 99 across slots while berries and machines preserve their single-stack limit", () => {
  const inventory = new InventoryService(
      new InventoryRegistry(GEN3_INVENTORY_POCKETS, {
        items: ITEMS,
        defaultPocket: "items",
      }),
    ),
    state = emptyInventory();
  assert(
    inventory.apply(state, [
      add("potion", 150),
      add("oran_berry", 999),
      add("tm_focus_punch", 99),
    ]).ok,
  );
  assert.equal(state.pockets.items[0].count, 99);
  assert.equal(state.pockets.items[1].count, 51);
  const before = structuredClone(state);
  assert.equal(inventory.apply(state, [add("oran_berry", 1)]).code, "full");
  assert.equal(inventory.apply(state, [add("tm_focus_punch", 1)]).code, "full");
  assert.deepEqual(state, before);
});

test("Plugins register custom pockets and items through the real catalog validator and reuse the same slot service", () => {
  const db = loadContentSync();
  const plugin = {
    id: "garden",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(api) {
      const pocket = api.content.register("inventoryPockets", "materials", {
        label: "材料",
        capacity: 2,
        stackLimit: 4,
        allowDuplicates: true,
      });
      api.content.register("items", "wood", {
        name: "木材",
        pocket,
        price: 0,
        contexts: [],
        target: "party",
        effects: [],
      });
    },
  };
  const { catalog } = createEmeraldPlugins(db, [plugin]);
  const inventory = new InventoryService(
      new InventoryRegistry(catalog.inventoryPockets, {
        items: catalog.items,
        defaultPocket: "items",
      }),
    ),
    state = emptyInventory();
  assert(inventory.apply(state, [add("garden:wood", 7)]).ok);
  assert.equal(inventory.view(state).pockets["garden:materials"].used, 2);
  assert.equal(inventory.apply(state, [add("garden:wood", 2)]).code, "full");
  assert.equal(inventory.quantity(state, "garden:wood"), 7);
  assert.throws(
    () =>
      createEmeraldPlugins(db, [
        {
          ...plugin,
          setup(api) {
            api.content.register("items", "wood", {
              name: "木材",
              pocket: "garden:missing",
              price: 0,
              contexts: [],
              target: "party",
              effects: [],
            });
          },
        },
      ]),
    /Unknown inventory pocket/,
  );
});

test("Authored initial stock uses the registered capacity; invalid stock is not a save migration path", () => {
  const inventory = service();
  assert.deepEqual(
    inventory.create({ potion: 7, berry: 0 }),
    slots(["potion", 5], ["potion", 2], null),
  );
  for (const stock of [
    null,
    [],
    { potion: -1 },
    { potion: 0.5 },
    { missing: 0 },
    { potion: 16 },
    { berry: 10 },
  ])
    assert.throws(() => inventory.create(stock));
  assert.throws(() => inventory.validate({ potion: 7 }));
});

test("A capacity preview is detached, frozen and never a committable plan", () => {
  const inventory = service(),
    state = inventory.create({ potion: 4 });
  const before = structuredClone(state),
    preview = inventory.preview(state, [add("potion", 4)]);
  assert(preview.ok);
  assert.throws(() => preview.changes[0].after.count++, TypeError);
  assert.equal(inventory.check(preview, state), false);
  assert.equal(inventory.commit(preview, state), false);
  assert.deepEqual(state, before);
  assert(inventory.apply(state, [add("potion", 4)]).ok);
  assert.equal(inventory.quantity(state, "potion"), 8);
});
