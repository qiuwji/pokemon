import { emptyFieldEffects } from "../dist/engine/field-effects.js";
import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
  setQuantity,
} from "./helpers/inventory-fixture.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import { emptyWeather } from "../dist/engine/weather.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Random, createMonster } from "../dist/engine/model.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import { validCreatureValues } from "../dist/engine/creature-contract.js";
import { createItemService, ItemService } from "../dist/engine/items.js";
import { EffectRegistry } from "../dist/engine/effects.js";
import { CREATION_POLICY } from "../dist/engine/rule-policy.js";
const db = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const state = () => ({
  weather: emptyWeather(),
  registeredItem: null,
  facilities: { nextId: 1, results: [] },
  fieldEffects: emptyFieldEffects(),
  position: { map: "LittlerootTown", x: 10, y: 10, dir: "up" },
  party: [createMonster("mudkip", 5, db, new Random(4))],
  box: [],
  bag: createBag({ potion: 1 }),
  flags: {},
  money: 3000,
  seen: ["mudkip"],
  caught: ["mudkip"],
  story: { completed: [], rewards: [] },
});
test("Save validates all six stats, IV/EV budgets, personality/nature, primary status and pending custody references", () => {
  const base = state();
  assert(validateSave(base, db));
  for (const change of [
    (m) => (m.iv.atk = 32),
    (m) => (m.iv.hp = -1),
    (m) => (m.ev.atk = 256),
    (m) => Object.keys(m.ev).forEach((k) => (m.ev[k] = 100)),
    (m) => (m.stats.spa = NaN),
    (m) => delete m.stats.def,
    (m) => (m.nature = 25),
    (m) => (m.personality = 0x100000000),
    (m) => (m.status = "typo"),
    (m) => {
      m.status = "sleep";
      m.sleep = 0;
    },
    (m) => (m.pendingMoves = ["missing"]),
    (m) => (m.growthCompanions = ["missing"]),
    (m) => (m.evolutionSkipped = 6),
  ]) {
    const copy = structuredClone(base);
    change(copy.party[0]);
    assert.equal(validateSave(copy, db), false);
  }
  const missing = structuredClone(base);
  setQuantity(missing.bag, "missing", 1);
  assert(!validateSave(missing, db));
  setQuantity(missing.bag, "missing", 0);
  assert(validateSave(missing, db));
});
test("Curing sleep atomically removes its timer; custom item results reject unknown status and protected-field additions", () => {
  const mon = state().party[0];
  mon.status = "sleep";
  mon.sleep = 3;
  mon.hp--;
  const bag = createBag({ heal: 1 });
  const service = createItemService(
    {
      heal: {
        ...ITEMS.potion,
        effects: [{ op: "cureStatus", status: "sleep" }],
      },
    },
    fixtureInventory({
      heal: {
        ...ITEMS.potion,
        effects: [{ op: "cureStatus", status: "sleep" }],
      },
    }),
  );
  assert(
    service.use({ id: "heal", bag, party: [mon], index: 0, context: "field" })
      .ok,
  );
  assert.equal(mon.status, null);
  assert.equal(mon.sleep, undefined);
  assert(validCreatureValues(mon));
  for (const mutate of [
    (m) => (m.status = "typo"),
    (m) => {
      m.status = "sleep";
      m.sleep = 99;
    },
    (m) => (m.extra = undefined),
    (m) => delete m.iv,
  ]) {
    const registry = new EffectRegistry({
        custom: (c) => {
          mutate(c.target);
          return true;
        },
      }),
      item = new ItemService(
        { potion: { ...ITEMS.potion, effects: [{ op: "custom" }] } },
        registry,
        fixtureInventory({
          potion: { ...ITEMS.potion, effects: [{ op: "custom" }] },
        }),
      ),
      target = structuredClone(mon),
      stock = createBag({ potion: 1 });
    assert.throws(() =>
      item.prepare({
        id: "potion",
        bag: stock,
        party: [target],
        index: 0,
        context: "field",
      }),
    );
    assert.deepEqual(target, mon);
    assert.equal(inventoryQuantity(stock, "potion"), 1);
  }
});
test("Invalid injected creation policy restores seeded randomness and returns no creature", () => {
  const rng = new Random(73),
    seed = rng.snapshot();
  assert.throws(() =>
    createMonster("mudkip", 5, db, rng, {
      rules: { ...CREATION_POLICY, individualValue: () => 32 },
    }),
  );
  assert.equal(rng.snapshot(), seed);
});
test("Invalid writes and unsupported versions preserve source text until explicit replacement", async () => {
  const { SaveStore } = await import("../dist/engine/save-store.js");
  let raw = JSON.stringify({ version: 6, state: state() });
  const original = raw,
    store = new SaveStore(
      { getItem: () => raw, setItem: (key, value) => (raw = value) },
      "demo",
      (s) => validateSave(s, db),
      7,
    );
  assert.equal(store.load(), null);
  assert.equal(store.lastIssue.code, "unsupported_version");
  assert.equal(raw, original);
  const invalid = state();
  invalid.party[0].iv.hp = 99;
  assert.throws(() => store.save(invalid));
  assert.equal(raw, original);
});
