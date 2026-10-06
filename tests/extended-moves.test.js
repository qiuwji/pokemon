import { loadContentSync } from "../tools/content-io.mjs";
import { createBag } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Battle } from "../src/engine/battle.js";
import { createMonster, Random } from "../src/engine/model.js";
import { MoveEffectRegistry } from "../src/engine/move-effects.js";
import { GEN3_ABILITIES } from "../src/engine/rules/gen3/abilities.js";
import { createEmeraldPlugins } from "../src/packs/emerald/extensions.js";
const base = loadContentSync();
const move = (effect, power = 0, type = "normal") => ({
  name: effect,
  effect,
  power,
  type,
  accuracy: 0,
  pp: 20,
  priority: 0,
  chance: 0,
  target: "selected",
});
function setup(extra = {}) {
  const { db } = createEmeraldPlugins(base, []);
  db.moves = { ...db.moves, ...extra };
  const rng = new Random(412),
    p = createMonster("treecko", 30, db, rng),
    e = createMonster("zigzagoon", 30, db, rng);
  p.moves = Object.keys(extra).map((id) => ({ id, pp: 20 }));
  e.moves = [{ id: "tackle", pp: 20 }];
  const b = new Battle({
    party: [p],
    enemyParty: [e],
    db,
    rng,
    bag: createBag({}),
    trainer: true,
    traits: { abilities: GEN3_ABILITIES, heldItems: {}, hooks: [] },
    rules: {
      accuracy: () => true,
      critical: () => false,
      grantExperience: () => [],
    },
  });
  return { b, p, e, rng };
}
const execute = (b, index) =>
  b.executeMove(b.homeSeat, index, { kind: "seat", id: b.awaySeat });
test("Former imported disabled effects are registered; typo effects remain rejected", () => {
  const effects = new MoveEffectRegistry();
  for (const id of [
    "mirror_move",
    "endeavor",
    "swagger",
    "taunt",
    "flail",
    "belly_drum",
    "mist",
    "stockpile",
    "swallow",
    "spit_up",
    "flinch_minimize_hit",
    "nature_power",
    "imprison",
    "future_sight",
  ])
    assert(effects.supports(id), id);
  assert.throws(() => effects.get("swager"), /Unknown/);
});
test("Endeavor and fixed damage bypass formula multipliers but preserve type immunity and fail if user HP is higher", () => {
  const { b, p, e } = setup({
    endeavor: move("endeavor"),
    dragon: move("dragon_rage", 1, "dragon"),
    night: move("level_damage", 1, "ghost"),
  });
  p.hp = 10;
  execute(b, 0);
  assert.equal(e.hp, 10);
  execute(b, 0);
  assert(b.events.some((e) => e.kind === "failed"));
  e.hp = e.stats.hp;
  execute(b, 1);
  assert.equal(e.hp, e.stats.hp - 40);
  const hp = e.hp;
  execute(b, 2);
  assert.equal(e.hp, hp);
});
test("Belly Drum HP cost and Swagger boost/confusion obey domain permissions", () => {
  const { b, p } = setup({
    drum: move("belly_drum"),
    swagger: move("swagger"),
  });
  const hp = p.hp;
  execute(b, 0);
  assert.equal(p.hp, hp - Math.floor(p.stats.hp / 2));
  assert.equal(b.conditions.get(b.homeSeat).stages.atk, 6);
  execute(b, 1);
  assert.equal(b.conditions.get(b.awaySeat).stages.atk, 2);
  assert(b.conditions.get(b.awaySeat).confused > 0);
});
test("Stockpile caps at three without Gen IV stat boosts; Swallow and Spit Up consume it", () => {
  const { b, p, e } = setup({
    stock: move("stockpile"),
    swallow: move("swallow"),
    spit: move("spit_up", 100),
  });
  for (let i = 0; i < 4; i++) execute(b, 0);
  assert.equal(b.states.lookup("stockpile", b.homeSeat).data.count, 3);
  assert.deepEqual(b.conditions.get(b.homeSeat).stages, {});
  p.hp = 1;
  execute(b, 1);
  assert.equal(p.hp, p.stats.hp);
  assert.equal(b.states.lookup("stockpile", b.homeSeat), undefined);
  execute(b, 0);
  execute(b, 2);
  assert(e.hp < e.stats.hp);
  assert.equal(b.states.lookup("stockpile", b.homeSeat), undefined);
});
test("Registered power preparation uses Gen III HP thresholds, friendship, IV bits and target weight", () => {
  const { b, p, e } = setup({
    flail: move("flail", 1),
    hidden: move("hidden_power", 1),
    weight: move("low_kick", 1),
  });
  const ops = b.moveEffects.operations,
    c = {
      mon: p,
      opponent: e,
      battle: b,
      power: 1,
      move: { type: "normal" },
      actorSeat: b.homeSeat,
      targetSeat: b.awaySeat,
    };
  p.hp = 1;
  ops.run([{ op: "variablePower", mode: "flail" }], c);
  assert.equal(c.power, 200);
  p.friendship = 255;
  ops.run([{ op: "variablePower", mode: "return" }], c);
  assert.equal(c.power, 102);
  for (const k of Object.keys(p.iv)) p.iv[k] = 31;
  ops.run([{ op: "hiddenPower" }], c);
  assert.equal(c.power, 70);
  assert.equal(c.move.type, "dark");
  ops.run([{ op: "variablePower", mode: "weight" }], c);
  assert.equal(c.power, 40);
});
test("Nature Power calls the terrain move with one PP payment; Imprison blocks shared moves while owner remains in battle", () => {
  const { b, p, e } = setup({
    nature: move("nature_power"),
    imprison: move("imprison"),
    tackle: base.moves.tackle,
  });
  execute(b, 0);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(e.status, "paralysis");
  execute(b, 1);
  assert.equal(b.moveAvailable(b.awaySeat, 0), false);
  b.states.clear("leave", b.homeSeat);
  assert.equal(b.moveAvailable(b.awaySeat, 0), true);
});
