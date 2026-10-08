import { loadContentSync } from "../tools/content-io.mjs";
import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
  setQuantity,
} from "./helpers/inventory-fixture.js";
import { createItemService } from "../src/engine/items.js";
import { ITEMS } from "../src/packs/emerald/items.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Battle } from "../src/engine/battle.js";
import { createMonster, Random } from "../src/engine/model.js";
import { BattleStrategyRegistry } from "../src/engine/battle/strategy-registry.js";
import { createEmeraldPlugins } from "../src/game/emerald/assembly/extensions.js";
import { analyzeCandidate } from "../src/engine/battle/analysis.js";
const base = loadContentSync();
function fixture(definitions = {}) {
  const { db } = createEmeraldPlugins(base, []),
    rng = new Random(66),
    p = createMonster("treecko", 30, db, rng),
    e = createMonster("zigzagoon", 30, db, rng);
  e.moves = [
    { id: "tackle", pp: 20 },
    { id: "ember", pp: 20 },
  ];
  const strategies = new BattleStrategyRegistry(definitions);
  const b = new Battle({
    items: createItemService(ITEMS, fixtureInventory()),
    party: [p],
    enemyParty: [e],
    db,
    rng,
    bag: createBag({}),
    trainer: true,
    ai: (battle, seat) => strategies.decide(battle, seat),
  });
  b.roster.owner(b.awaySeat).strategy = "tactical";
  return { b, p, e, rng, strategies };
}
test("Tactical AI considers type, estimated damage and knockout; estimation consumes no gameplay RNG or state", () => {
  const { b, rng, strategies } = fixture(),
    before = rng.snapshot(),
    state = b.snapshot();
  const observation = analyzeCandidate(b, {
    kind: "move",
    seat: b.awaySeat,
    index: 1,
    target: { kind: "seat", id: b.homeSeat },
  });
  assert.equal(observation.targets[0].type, 2);
  assert.equal(rng.snapshot(), before);
  assert.deepEqual(b.snapshot(), state);
  rng.next();
  const expected = rng.snapshot();
  rng.restore(before);
  const action = strategies.decide(b, b.awaySeat);
  assert.equal(action.index, 1);
  assert.equal(rng.snapshot(), expected);
});
test("Custom strategy receives legal item candidates and frozen analyses, while battle owns item cost and commit", () => {
  const { b, e, strategies } = fixture({
    medic: {
      decide: (view) => {
        assert(Object.isFrozen(view.analyses[0]));
        return view.candidates.findIndex(
          (a) => a.kind === "item" && a.item === "potion",
        );
      },
    },
  });
  b.roster.owner(b.awaySeat).strategy = "medic";
  setQuantity(b.roster.owner(b.awaySeat).bag, "potion", 1);
  e.hp = 1;
  const action = strategies.decide(b, b.awaySeat);
  assert.equal(action.kind, "item");
  assert.equal(e.hp, 1);
  assert.equal(inventoryQuantity(b.roster.owner(b.awaySeat).bag, "potion"), 1);
  b.actions.item(action);
  assert.equal(inventoryQuantity(b.roster.owner(b.awaySeat).bag, "potion"), 0);
  assert.equal(e.hp, 21);
});
