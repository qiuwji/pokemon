import { loadContentSync } from "../tools/content-io.mjs";
import { createBag, fixtureInventory } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Battle } from "../src/engine/battle.js";
import { Random, createMonster } from "../src/engine/model.js";
import { createTrainerEncounter } from "../src/engine/trainer-encounters.js";
import { TRAINERS } from "../src/packs/emerald/trainers.js";
const db = loadContentSync();
function config() {
  const rng = new Random(1);
  return {
    party: [createMonster("mudkip", 7, db, rng)],
    enemy: createMonster("zigzagoon", 4, db, rng),
    trainer: true,
    db,
    rng,
    bag: createBag({}),
    inventory: fixtureInventory(),
  };
}
test("Invalid custom AI requests fail explicitly before PP or turn settlement", () => {
  const c = config(),
    b = new Battle({
      ...c,
      ai: () => ({ kind: "move", seat: "away:0", index: 999 }),
    });
  assert.throws(() => b.act({ kind: "move", index: 0 }), /Invalid AI/);
  assert.equal(b.turn, 0);
  assert.equal(c.party[0].moves[0].pp, db.moves[c.party[0].moves[0].id].pp);
});
test("User-or-selected includes self, unknown formats and duplicate content sides fail preflight", () => {
  const c = config(),
    b = new Battle(c);
  assert(
    b.targeting.validate(
      "home:0",
      { effect: "hit", target: "user-or-selected" },
      { kind: "seat", id: "home:0" },
    ),
  );
  assert.throws(() => new Battle({ ...config(), format: "triple" }), /format/);
  const trainer = {
      ...TRAINERS.freeForAll,
      rivals: [{ ...TRAINERS.freeForAll.rivals[0], id: "away" }],
    },
    seed = c.rng.seed;
  assert.throws(() => createTrainerEncounter(trainer, c), /rival ID/);
  assert.equal(c.rng.seed, seed);
});
