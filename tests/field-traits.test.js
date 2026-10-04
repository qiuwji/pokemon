import { loadContentSync } from "../tools/content-io.mjs";
import { createBag } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { EncounterService } from "../dist/engine/encounters.js";
import { PartyTraits } from "../dist/engine/rules/party-traits.js";
import { GEN3_ABILITIES } from "../dist/engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../dist/engine/rules/gen3/held-items.js";
import { experienceDistribution } from "../dist/engine/experience.js";
import {
  createMonster,
  Random,
  grantExperience,
  damage,
} from "../dist/engine/model.js";
import { Battle } from "../dist/engine/battle.js";
const db = loadContentSync();
const creationRng = new Random(1);
const mon = (species = "treecko", level = 10) =>
  createMonster(species, level, db, creationRng);
const traits = (party) =>
  new PartyTraits({
    party,
    abilities: GEN3_ABILITIES,
    heldItems: GEN3_HELD_ITEMS,
  });
test("Lead traits and held items compose field encounter probability without touching HP or PP", () => {
  const p = mon();
  p.ability = "stench";
  p.heldItem = "cleanse_tag";
  const before = structuredClone(p);
  assert.equal(traits([p]).calculate("encounter-rate", 96, p), 32);
  assert.deepEqual(p, before);
  p.ability = "illuminate";
  assert.equal(traits([p]).calculate("encounter-rate", 96, p), 128);
});
test("Encounter tables validate before RNG, low-level deterrents reject and repel uses the first living non-egg", () => {
  let calls = 0;
  const rng = {
    seed: 0,
    int: (n) => {
      calls++;
      return 0;
    },
    next: () => 0,
  };
  const service = new EncounterService({
      db,
      rng,
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
    }),
    p = mon();
  const entries = [{ species: "zigzagoon", min: 2, max: 3, weight: 100 }];
  assert.throws(
    () =>
      service.attempt({
        party: [p],
        entries: [{ ...entries[0], species: "missing" }],
        rate: 100,
      }),
    /table/,
  );
  assert.equal(calls, 0);
  p.ability = "keen_eye";
  assert.equal(service.attempt({ party: [p], entries, rate: 100 }), null);
  p.ability = "overgrow";
  assert.equal(
    service.attempt({ party: [p], entries, rate: 100, repel: true }),
    null,
  );
});
test("Wild generation applies synchronize, cute charm, level boosts and registered held rarity", () => {
  const rng = { seed: 0, int: (n) => 0, next: () => 0.5 };
  const service = new EncounterService({
      db,
      rng,
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
    }),
    p = mon();
  p.ability = "synchronize";
  p.nature = 21;
  const options = {
    party: [p],
    entries: [{ species: "zigzagoon", min: 2, max: 4, weight: 100 }],
    rate: 100,
  };
  assert.equal(service.attempt(options).nature, 21);
  p.ability = "pressure";
  assert.equal(service.attempt(options).level, 4);
  p.ability = "cute_charm";
  p.gender = "♀";
  rng.int = (n) => (n === 3 ? 1 : 0);
  assert.equal(service.attempt(options).gender, "♂");
  p.ability = "compound_eyes";
  assert.equal(
    traits([p]).calculate("wild-held-rarity", 5, p, { rarity: "rare" }),
    20,
  );
});
test("Type-attracting abilities select a uniform matching slot before regular weighted fallback", () => {
  const custom = structuredClone(db);
  custom.species.ralts.types = ["steel"];
  let called = 0;
  const rng = {
    seed: 0,
    int: (n) => {
      called++;
      return 0;
    },
    next: () => 0.5,
  };
  const service = new EncounterService({
      db: custom,
      rng,
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
    }),
    p = mon();
  p.ability = "magnet_pull";
  const m = service.attempt({
    party: [p],
    entries: [
      { species: "zigzagoon", min: 2, max: 2, weight: 99 },
      { species: "ralts", min: 2, max: 2, weight: 1 },
    ],
    rate: 100,
  });
  assert.equal(m.species, "ralts");
  assert(called > 0);
});
test("Pickup uses Emerald level tiers, skips existing held items and eggs, and every resulting item is holdable", () => {
  for (let level = 1; level <= 100; level += 10) {
    for (const roll of [0, 30, 40, 50, 60, 70, 80, 90, 94, 98, 99]) {
      const p = mon("zigzagoon", level),
        service = new EncounterService({
          db,
          rng: { int: (n) => (n === 100 ? roll : 0) },
          abilities: GEN3_ABILITIES,
          heldItems: GEN3_HELD_ITEMS,
        });
      service.afterBattle([p]);
      assert(GEN3_HELD_ITEMS[p.heldItem], `${level}:${roll}:${p.heldItem}`);
      const item = p.heldItem;
      service.afterBattle([p]);
      assert.equal(p.heldItem, item);
      p.heldItem = null;
      p.egg = { cycles: 1 };
      service.afterBattle([p]);
      assert.equal(p.heldItem, null);
    }
  }
});
test("EXP SHARE splits before personal bonuses, and a benched holder receives EVs with Macho Brace policy", () => {
  const a = mon(),
    b = mon("mudkip");
  b.heldItem = "exp_share";
  const distribution = experienceDistribution({
    party: [a, b],
    participants: new Set([a.uid]),
    total: 101,
    isShare: (m) => m.heldItem === "exp_share",
  });
  assert.deepEqual(
    distribution.map((r) => r.amount),
    [50, 50],
  );
  a.heldItem = "exp_share";
  assert.deepEqual(
    experienceDistribution({
      party: [a, b],
      participants: new Set([a.uid]),
      total: 100,
      isShare: (m) => m.heldItem === "exp_share",
    }).map((r) => r.amount),
    [75, 25],
  );
  b.heldItem = "lucky_egg";
  assert.equal(traits([a, b]).calculate("experience-modifier", 50, b), 75);
  b.heldItem = "macho_brace";
  const ev = traits([a, b]).calculate("ev-modifier", 1, b);
  grantExperience(b, 1, db.species.zigzagoon, db, { evMultiplier: ev });
  assert.equal(b.ev.spe, 2);
});
test("Integer damage order applies spread before the +2 base addition, and Guts replaces burn reduction", () => {
  const a = mon(),
    d = mon("zigzagoon"),
    rng = { int: () => 15 };
  Object.assign(a, {
    level: 50,
    ability: "pickup",
    stats: { ...a.stats, atk: 100 },
    status: null,
  });
  d.stats.def = 100;
  assert.equal(
    damage(a, d, db.moves.tackle, db, rng, { spread: 0.5 }).amount,
    9,
  );
  a.status = "burn";
  assert.equal(damage(a, d, db.moves.tackle, db, rng).amount, 9);
  a.ability = "guts";
  assert.equal(damage(a, d, db.moves.tackle, db, rng).amount, 25);
});
test("Forecast types and form are projected and weather suppression reverses them without changing species", () => {
  const custom = structuredClone(db);
  custom.species.castform = {
    ...custom.species.treecko,
    types: ["normal"],
    abilities: ["forecast"],
  };
  const p = mon(),
    e = mon("zigzagoon");
  p.species = "castform";
  p.ability = "forecast";
  e.ability = "drizzle";
  const b = new Battle({
    party: [p],
    enemy: e,
    db: custom,
    rng: new Random(1),
    bag: createBag({}),
  });
  let view = b.snapshot().combatants[0].monster;
  assert.deepEqual(view.types, ["water"]);
  assert.equal(view.form, "rainy");
  e.ability = "cloud_nine";
  view = b.snapshot().combatants[0].monster;
  assert.deepEqual(view.types, ["normal"]);
  assert.equal(view.form, "normal");
  assert.equal(p.species, "castform");
});
test("Trace executes copied entry rules and restores the original ability when leaving", () => {
  const p = mon(),
    e = mon("zigzagoon"),
    reserve = mon("mudkip");
  p.ability = "trace";
  e.ability = "drizzle";
  const b = new Battle({
    party: [p, reserve],
    enemy: e,
    db,
    rng: new Random(1),
    bag: createBag({}),
    trainer: true,
  });
  assert.equal(p.ability, "drizzle");
  assert.equal(b.traits.weather(), "rain");
  b.actions.switch("home:0", 1);
  assert.equal(p.ability, "trace");
});
