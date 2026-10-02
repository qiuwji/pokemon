import test from "node:test";
import assert from "node:assert/strict";
import { battleFixture } from "./helpers/battle-fixture.js";
import { damage } from "../dist/engine/model.js";
const moves = Object.fromEntries(
  [
    "charge",
    "helping_hand",
    "follow_me",
    "destiny_bond",
    "grudge",
    "rage",
    "memento",
    "secret_power",
    "stockpile",
    "spit_up",
    "weather_ball",
    "hit",
  ].map((id) => [id, {}]),
);
for (const id of ["rage", "secret_power", "spit_up", "weather_ball", "hit"])
  moves[id] = { power: 30, chance: 100 };
test("Charge and Helping Hand multiply after critical and before type, and do not become Gen IV charge-defense boosts", () => {
  const { b, p, e, use, db } = battleFixture({ moves, format: "doubles" });
  use(b.homeSeat, "charge");
  const ally = b.roster
    .occupied()
    .find((s) => s.id !== b.homeSeat && !b.roster.isOpposing(s.id, b.homeSeat));
  use(ally.id, "helping_hand");
  assert.equal(b.conditions.get(b.homeSeat).stages.spd, undefined);
  const result = damage(
    p,
    e,
    { type: "electric", power: 30 },
    db,
    { int: () => 15 },
    {
      critical: true,
      modifier: (phase, value, c) =>
        phase === "base-damage"
          ? 5
          : b.traits.calculate(phase, value, {
              ...c,
              actorSeat: b.homeSeat,
              targetSeat: b.awaySeat,
            }),
    },
  );
  assert.equal(result.amount, 42);
  b.states.tick();
  assert(!b.states.lookup("helping_hand", b.homeSeat));
  assert(b.states.lookup("charge", b.homeSeat));
  b.states.tick();
  assert(!b.states.lookup("charge", b.homeSeat));
});
test("Follow Me overrides Lightning Rod for a single target, leaves spread targets intact and lasts one round", () => {
  const local = { ...moves, hit: { power: 30, type: "electric" } };
  const { b, e, er, use } = battleFixture({ moves: local, format: "doubles" });
  er.ability = "lightning_rod";
  use(b.awaySeat, "follow_me");
  const alternate = b.roster
    .opposing(b.homeSeat)
    .find((s) => s.id !== b.awaySeat);
  use(b.homeSeat, "hit", alternate.id);
  assert.equal(e.hp, e.stats.hp - 6);
  assert.equal(er.hp, er.stats.hp);
  const context = {
    actorSeat: b.homeSeat,
    move: { ...b.db.moves.hit, target: "opponents" },
    targetSeats: b.roster.opposing(b.homeSeat).map((s) => s.id),
  };
  b.traits.run("target-selection", context);
  assert.equal(context.targetSeats.length, 2);
  b.states.tick();
  assert(!b.states.lookup("follow_me", b.awaySeat));
});
test("Destiny Bond drains all newly fainted seats before outcomes; Grudge zeros the causal slot, and both clear before a prevented next attempt", () => {
  const first = battleFixture({ moves });
  first.p.hp = 6;
  first.use(first.b.homeSeat, "destiny_bond");
  first.use(first.b.awaySeat, "hit");
  first.b.outcomes.observe();
  assert.equal(first.e.hp, 0);
  assert(first.b.outcomes.defeated.has(first.p.uid));
  assert(first.b.outcomes.defeated.has(first.e.uid));
  assert.equal(first.b.ended, false);
  const second = battleFixture({ moves });
  second.p.hp = 6;
  second.use(second.b.homeSeat, "grudge");
  second.use(second.b.awaySeat, "hit");
  second.b.outcomes.observe();
  assert.equal(second.e.moves[0].pp, 0);
  const third = battleFixture({ moves });
  third.use(third.b.homeSeat, "destiny_bond");
  third.p.status = "sleep";
  third.p.sleep = 4;
  third.use(third.b.homeSeat, "hit");
  assert(!third.b.states.lookup("destiny_bond", third.b.homeSeat));
});
test("Rage boosts on actual hits only; Memento fails at both minimum stats, but still faints against protection; Secret Power uses terrain policy", () => {
  const { b, p, e, use } = battleFixture({ moves });
  use(b.homeSeat, "rage");
  use(b.awaySeat, "hit");
  assert.equal(b.conditions.get(b.homeSeat).stages.atk, 1);
  b.states.attach("substitute", b.homeSeat, { data: { hp: 20 } });
  use(b.awaySeat, "hit");
  assert.equal(b.conditions.get(b.homeSeat).stages.atk, 1);
  use(b.homeSeat, "charge");
  assert(!b.states.lookup("rage", b.homeSeat));
  b.environment.terrain = "long_grass";
  use(b.homeSeat, "secret_power");
  assert.equal(e.status, "sleep");
  b.conditions.get(b.awaySeat).stages = { atk: -6, spa: -6 };
  use(b.homeSeat, "memento");
  assert(p.hp > 0);
  b.conditions.get(b.awaySeat).protected = true;
  use(b.homeSeat, "memento");
  assert.equal(p.hp, 0);
});
test("Registered base multipliers reach the real formula for Spit Up and Weather Ball rather than changing power before integer rounding", () => {
  const { b, p, e, use, db, rng } = battleFixture({ moves });
  rng.int = () => 15;
  b.rules.damage = damage;
  use(b.homeSeat, "stockpile");
  use(b.homeSeat, "stockpile");
  use(b.homeSeat, "stockpile");
  const expected = damage(p, e, db.moves.spit_up, db, rng, {
      critical: false,
      baseMultiplier: 3,
    }).amount,
    hp = e.hp;
  use(b.homeSeat, "spit_up");
  assert.equal(e.hp, Math.max(0, hp - expected));
  const second = battleFixture({ moves });
  second.b.weather = { kind: "rain", turns: 5 };
  let options;
  second.b.rules.damage = (a, d, m, db, rng, opts) => {
    options = opts;
    return { amount: 1, type: 1 };
  };
  second.use(second.b.homeSeat, "weather_ball");
  assert.equal(options.baseMultiplier, 2);
  assert.equal(options.power, 30);
});
