import test from "node:test";
import assert from "node:assert/strict";
import { battleFixture } from "./helpers/battle-fixture.js";
import { MoveEffectRegistry } from "../src/engine/move-effects.js";
import { GEN3_REFERENCE_MOVES } from "../generated/engine/rules/gen3/reference-metadata.js";
const moves = {
  sleep_talk: {},
  snore: { power: 40, chance: 100, sound: true },
  metronome: {},
  assist: {},
  sketch: {},
  rollout: { power: 30 },
  uproar: { power: 50, sound: true },
  triple_kick: { power: 10 },
  hit: { power: 30 },
  charge: { effect: "solar_beam", power: 120 },
  thaw_hit: { power: 50 },
};
test("Sleep Talk allows sleep, excludes charge moves, ignores called PP, and applies availability rules without another readiness pass", () => {
  const { b, p, e } = battleFixture({ moves });
  p.status = "sleep";
  p.sleep = 5;
  p.moves = [
    { id: "sleep_talk", pp: 20 },
    { id: "hit", pp: 0 },
    { id: "charge", pp: 20 },
  ];
  b.executeMove(b.homeSeat, 0);
  assert.equal(p.sleep, 4);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(p.moves[1].pp, 0);
  assert.equal(e.hp, e.stats.hp - 6);
  assert.equal(b.actionLifecycle.lastMove(b.homeSeat), "sleep_talk");
  b.states.attach("disable", b.homeSeat, { data: { moveId: "hit" } });
  const hp = e.hp;
  b.executeMove(b.homeSeat, 0);
  assert.equal(e.hp, hp);
  assert.equal(p.moves[0].pp, 18);
  assert.equal(b.events.findLast(event => event.kind === "move").move.successful, false);
});
test("Snore fails awake with PP payment, works asleep, and thawing moves can act through freeze", () => {
  const { b, p, e, use } = battleFixture({ moves });
  use(b.homeSeat, "snore");
  assert.equal(e.hp, e.stats.hp);
  assert.equal(p.moves[0].pp, 19);
  p.status = "sleep";
  p.sleep = 2;
  b.executeMove(b.homeSeat, 0);
  assert.equal(e.hp, e.stats.hp - 6);
  assert.equal(b.conditions.get(b.awaySeat).flinched, true);
  p.status = "freeze";
  b.rng.next = () => 0.99;
  use(b.homeSeat, "thaw_hit");
  assert.equal(p.status, null);
  assert.equal(e.hp, e.stats.hp - 12);
});
test("Assist considers non-egg party members even when fainted or statused and called charge continues without spending their PP", () => {
  const { b, p, r, e } = battleFixture({ moves });
  p.moves = [{ id: "assist", pp: 20 }];
  r.hp = 0;
  r.status = "burn";
  r.moves = [
    { id: "charge", pp: 3 },
    { id: "sleep_talk", pp: 10 },
  ];
  b.executeMove(b.homeSeat, 0);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(r.moves[0].pp, 3);
  assert.equal(e.hp, e.stats.hp);
  assert.equal(b.actionLifecycle.locked(b.homeSeat).moveId, "charge");
  b.moves.execute(b.actionLifecycle.continuation(b.homeSeat));
  assert.equal(e.hp, e.stats.hp - 6);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(r.moves[0].pp, 3);
  r.egg = { steps: 1 };
  b.executeMove(b.homeSeat, 0);
  assert.equal(e.hp, e.stats.hp - 6);
});
test("Metronome uses original IDs, excludes forbidden and plugin-only moves and reports called success", () => {
  const { b, p, e } = battleFixture({ moves });
  b.db.moves = {
    metronome: b.db.moves.metronome,
    tackle: GEN3_REFERENCE_MOVES.tackle,
    custom: b.db.moves.hit,
  };
  p.moves = [{ id: "metronome", pp: 20 }];
  b.executeMove(b.homeSeat, 0);
  assert.equal(e.hp, e.stats.hp - 6);
  assert.equal(p.moves[0].pp, 19);
  assert(b.events.some((e) => e.move?.id === "tackle"));
  assert(!b.events.some((e) => e.move?.id === "custom"));
});
test("A called Mirror Move can delegate again through the common bounded caller without an extra PP or readiness payment", () => {
  const { b, p, e } = battleFixture({ moves });
  b.db.moves = { metronome: b.db.moves.metronome, mirror_move: GEN3_REFERENCE_MOVES.mirror_move, hit: b.db.moves.hit };
  e.moves = [{ id: "hit", pp: 20 }];
  b.executeMove(b.awaySeat, 0);
  p.moves = [{ id: "metronome", pp: 20 }];
  b.executeMove(b.homeSeat, 0);
  assert.equal(e.hp, e.stats.hp - 6);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(e.moves[0].pp, 19);
});
test("Sketch copies a printed unsuccessful move permanently with full PP, rejects transformed users, and survives battle cleanup", () => {
  const { b, p, e } = battleFixture({
    moves,
    rules: { accuracy: () => false },
  });
  e.moves = [{ id: "hit", pp: 20 }];
  p.moves = [{ id: "sketch", pp: 1 }];
  b.executeMove(b.awaySeat, 0);
  b.executeMove(b.homeSeat, 0);
  assert.deepEqual(p.moves, [{ id: "hit", pp: 20 }]);
  b.finish("escaped");
  assert.equal(p.moves[0].id, "hit");
  const second = battleFixture({ moves });
  second.p.moves = [{ id: "sketch", pp: 20 }];
  second.e.moves = [{ id: "hit", pp: 20 }];
  second.b.executeMove(second.b.awaySeat, 0);
  second.b.forms.overlay(
    second.p,
    { ability: "overgrow" },
    { kind: "transform" },
  );
  second.b.executeMove(second.b.homeSeat, 0);
  assert.equal(second.p.moves[0].id, "sketch");
});
test("Rollout doubles through five actions, Defense Curl doubles once more, misses release the lock and continuation does not pay PP", () => {
  const powers = [];
  const { b, p } = battleFixture({
    moves,
    rules: {
      damage: (a, d, m, db, rng, options) => {
        powers.push(options.power);
        return { amount: 1, type: 1, critical: false };
      },
    },
  });
  p.moves = [{ id: "rollout", pp: 20 }];
  b.states.attach("defense_curl", b.homeSeat);
  b.executeMove(b.homeSeat, 0);
  while (b.actionLifecycle.locked(b.homeSeat))
    b.moves.execute(b.actionLifecycle.continuation(b.homeSeat));
  assert.deepEqual(powers, [60, 120, 240, 480, 960]);
  assert.equal(p.moves[0].pp, 19);
  b.executeMove(b.homeSeat, 0);
  b.rules.accuracy = () => false;
  b.moves.execute(b.actionLifecycle.continuation(b.homeSeat));
  assert.equal(b.actionLifecycle.locked(b.homeSeat), null);
  assert.equal(p.moves[0].pp, 18);
});
test("Triple Kick checks every hit and uses independent 10/20/30 powers, stopping at the first later miss", () => {
  const powers = [];
  let checks = 0;
  const { b, p, e } = battleFixture({
    moves,
    rules: {
      accuracy: () => ++checks !== 3,
      damage: (a, d, m, db, rng, options) => {
        powers.push(options.power);
        return { amount: 2, type: 1, critical: false };
      },
    },
  });
  p.moves = [{ id: "triple_kick", pp: 20 }];
  b.executeMove(b.homeSeat, 0);
  assert.deepEqual(powers, [10, 20]);
  assert.equal(checks, 3);
  assert.equal(e.hp, e.stats.hp - 4);
  assert.equal(p.moves[0].pp, 19);
  assert.deepEqual(
    b.events.filter((e) => e.kind === "hurt").map((e) => e.hit),
    [1, 2],
  );
});
test("Uproar shares its repeated-action timer, wakes sleepers, blocks new sleep, exempts Soundproof and clears at completion", () => {
  const { b, p, e, er } = battleFixture({ moves, format: "doubles" });
  p.moves = [{ id: "uproar", pp: 20 }];
  e.status = "sleep";
  e.sleep = 5;
  er.status = "sleep";
  er.sleep = 5;
  er.ability = "soundproof";
  b.executeMove(b.homeSeat, 0, { kind: "seat", id: b.awaySeat });
  assert(b.actionLifecycle.locked(b.homeSeat));
  b.states.tick();
  assert.equal(e.status, null);
  assert.equal(er.status, "sleep");
  assert.equal(b.applyStatus(b.awaySeat, "sleep"), false);
  while (b.actionLifecycle.locked(b.homeSeat))
    b.moves.execute(b.actionLifecycle.continuation(b.homeSeat));
  b.states.tick();
  assert(!b.states.lookup("uproar", b.homeSeat));
  assert.equal(p.moves[0].pp, 19);
  assert.equal(b.applyStatus(b.awaySeat, "sleep"), true);
});
test("Called moves and permanent Sketch changes roll back with the existing journal; internal call depth cannot be supplied by a player", () => {
  const { b, p, r, e, rng } = battleFixture({
    moves,
    hooks: [
      {
        id: "fault",
        phase: "after-action",
        apply: () => {
          throw new Error("fault");
        },
      },
    ],
  });
  p.moves = [{ id: "assist", pp: 20 }];
  r.moves = [{ id: "hit", pp: 2 }];
  const seed = rng.snapshot();
  const prepared = b.actions.prepare({
    kind: "move",
    index: 0,
    callDepth: 100,
  });
  assert.equal(prepared.callDepth, undefined);
  assert.throws(() => b.act({ kind: "move", index: 0 }), /fault/);
  assert.equal(p.moves[0].pp, 20);
  assert.equal(r.moves[0].pp, 2);
  assert.equal(e.hp, e.stats.hp);
  assert.equal(rng.snapshot(), seed);
  assert.equal(b.actionLifecycle.history.length, 0);
  p.moves = [{ id: "sketch", pp: 20 }];
  b.actionLifecycle.record({ seat: b.awaySeat }, "hit", false);
  assert.throws(() => b.act({ kind: "move", index: 0 }), /fault/);
  assert.deepEqual(p.moves, [{ id: "sketch", pp: 20 }]);
});
test("New move policies are validated and reference metadata keeps all 354 moves, sounds and interception flags", () => {
  assert.equal(Object.keys(GEN3_REFERENCE_MOVES).length, 354);
  assert.equal(GEN3_REFERENCE_MOVES.uproar.sound, true);
  assert(GEN3_REFERENCE_MOVES.growl.flags.includes("magic_coat_affected"));
  assert(GEN3_REFERENCE_MOVES.swords_dance.flags.includes("snatch_affected"));
  for (const definition of [
    { hitPowers: [] },
    { hitPowers: [0] },
    { usableAsleep: "yes" },
    { requiresUserStatus: "happy" },
    {
      action: {
        kind: "repeat",
        minTurns: 2,
        maxTurns: 3,
        stopOnFailure: "yes",
      },
    },
  ])
    assert.throws(
      () => new MoveEffectRegistry({ definitions: { bad: definition } }),
    );
});
