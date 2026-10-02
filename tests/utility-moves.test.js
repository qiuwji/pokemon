import test from "node:test";
import assert from "node:assert/strict";
import { battleFixture } from "./helpers/battle-fixture.js";
const moves = Object.fromEntries(
  [
    "conversion",
    "conversion_2",
    "camouflage",
    "role_play",
    "skill_swap",
    "trick",
    "recycle",
    "knock_off",
    "spite",
    "fake_out",
    "thaw_hit",
    "smellingsalt",
    "tri_attack",
    "teeter_dance",
    "curse",
    "magnitude",
    "weather_ball",
    "present",
    "hit",
  ].map((id) => [id, {}]),
);
for (const id of [
  "knock_off",
  "fake_out",
  "thaw_hit",
  "smellingsalt",
  "tri_attack",
  "magnitude",
  "weather_ball",
  "present",
  "hit",
])
  moves[id] = { power: 50, chance: 100 };
moves.hit.type = "water";
test("Type changes preserve creature identity and leave cleanup; Conversion 2 remembers landed type across turns", () => {
  const { b, p, use } = battleFixture({ moves });
  const uid = p.uid;
  use(b.homeSeat, "conversion");
  assert.deepEqual(b.traits.types(b.homeSeat), ["normal"]);
  b.environment.terrain = "sand";
  use(b.homeSeat, "camouflage");
  assert.deepEqual(b.traits.types(b.homeSeat), ["ground"]);
  use(b.awaySeat, "hit");
  b.turn++;
  use(b.homeSeat, "conversion_2");
  assert(["water", "grass", "dragon"].includes(b.traits.types(b.homeSeat)[0]));
  b.actions.switch(b.homeSeat, 1);
  b.actions.switch(b.homeSeat, 0);
  assert.deepEqual(b.traits.types(b.homeSeat), ["grass"]);
  assert.equal(p.uid, uid);
  assert(!b.actionLifecycle.landed.has(uid));
});
test("Role Play and Skill Swap restore original abilities; active form overrides also accept temporary abilities", () => {
  const { b, p, e, use } = battleFixture({ moves }),
    original = p.ability;
  use(b.homeSeat, "role_play");
  assert.equal(b.traits.ability(b.homeSeat), e.ability);
  b.actions.switch(b.homeSeat, 1);
  b.actions.switch(b.homeSeat, 0);
  assert.equal(p.ability, original);
  b.forms.overlay(p, { types: ["water"] }, { kind: "custom" });
  use(b.homeSeat, "skill_swap");
  assert.equal(b.traits.ability(b.homeSeat), "pickup");
  assert.equal(b.traits.ability(b.awaySeat), original);
  b.finish("win");
  assert.equal(p.ability, original);
  assert.equal(e.ability, "pickup");
  assert(!b.forms.records[p.uid]);
});
test("Consumed items are recyclable only within the current battle; Knock Off is temporary while Trick transfers ownership", () => {
  const { b, p, e, use } = battleFixture({ moves });
  p.heldItem = "oran_berry";
  b.equipment.consume(p, "oran_berry");
  use(b.homeSeat, "recycle");
  assert.equal(p.heldItem, "oran_berry");
  e.heldItem = "pecha_berry";
  use(b.homeSeat, "trick");
  assert.equal(p.heldItem, "pecha_berry");
  assert.equal(e.heldItem, "oran_berry");
  use(b.awaySeat, "knock_off");
  assert.equal(p.heldItem, null);
  use(b.homeSeat, "trick");
  assert.equal(p.heldItem, null);
  b.finish("win");
  assert.equal(p.heldItem, "pecha_berry");
  assert.equal(e.heldItem, "oran_berry");
  assert.equal(b.equipment.used.size, 0);
});
test("Magnitude uses one roll for spread targets, Weather Ball changes type, Present can heal even a Ghost target", () => {
  const { b, e, er, rng, use } = battleFixture({
    moves: { ...moves, magnitude: { ...moves.magnitude, target: "opponents" } },
    format: "doubles",
  });
  let rolls = 0;
  rng.int = (n) => {
    if (n === 100) rolls++;
    return 64;
  };
  use(b.homeSeat, "magnitude");
  assert.equal(rolls, 1);
  assert.equal(e.hp, e.stats.hp - 6);
  assert.equal(er.hp, er.stats.hp - 6);
  b.weather = { kind: "rain", turns: 5 };
  use(b.homeSeat, "weather_ball");
  assert.equal(
    b.recorder.events.findLast((r) => r.kind === "move").move.type,
    "water",
  );
  b.conditions.get(b.awaySeat).types = ["ghost"];
  e.hp = 1;
  rng.int = () => 230;
  use(b.homeSeat, "present");
  assert.equal(e.hp, 1 + Math.floor(e.stats.hp / 4));
  assert.equal(
    b.recorder.events.findLast((r) => r.kind === "move").move.successful,
    true,
  );
});
test("Fake Out is entry-limited, SmellingSalt cures paralysis, Spite uses the original 2–5 PP range and Ghost Curse costs HP", () => {
  const { b, p, e, use } = battleFixture({ moves });
  use(b.homeSeat, "fake_out");
  assert.equal(e.hp, e.stats.hp - 6);
  b.turn = 2;
  use(b.homeSeat, "fake_out");
  assert.equal(e.hp, e.stats.hp - 6);
  e.status = "paralysis";
  use(b.homeSeat, "smellingsalt");
  assert.equal(e.status, null);
  use(b.awaySeat, "hit");
  const pp = e.moves[0].pp;
  use(b.homeSeat, "spite");
  assert(e.moves[0].pp <= pp - 2 && e.moves[0].pp >= pp - 5);
  b.conditions.get(b.homeSeat).types = ["ghost"];
  const hp = p.hp;
  use(b.homeSeat, "curse");
  assert.equal(p.hp, hp - Math.floor(p.stats.hp / 2));
  const enemyHP = e.hp;
  b.states.tick();
  assert.equal(e.hp, enemyHP - Math.floor(e.stats.hp / 4));
});
