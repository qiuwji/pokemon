import test from "node:test";
import assert from "node:assert/strict";
import { battleFixture } from "./helpers/battle-fixture.js";
import { BattleSession } from "../src/engine/battle-session.js";
import { Random, createMonster } from "../src/engine/model.js";
import { BattleStateRegistry } from "../src/engine/battle/state-registry.js";
import { objectSchema } from "../src/engine/extensions/values.js";
import { createEmeraldPlugins } from "../src/packs/emerald/extensions.js";
import { GEN3_REFERENCE_MOVES } from "../generated/engine/rules/gen3/reference-metadata.js";
const moves = { baton_pass: {}, hit: { power: 30 }, metronome: {} };
function fixture(options = {}) {
  const f = battleFixture({ ...options, moves });
  f.p.moves = [{ id: "baton_pass", pp: 20 }];
  f.e.moves = [{ id: "hit", pp: 20 }];
  f.p.stats.spe = 1000;
  f.e.stats.spe = 1;
  f.b.ai = (b, seat) => ({ kind: "move", seat, index: 0 });
  return f;
}
test("Human Baton Pass pauses the same round before the enemy, rejects unrelated commands, then transfers boosts before remaining attacks", () => {
  const { b, p, r, e, rng } = fixture();
  b.conditions.get(b.homeSeat).stages.atk = 2;
  b.act({ kind: "move", index: 0 });
  assert.equal(b.turn, 1);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(p.hp, p.stats.hp);
  assert.equal(r.hp, r.stats.hp);
  assert.equal(e.moves[0].pp, 20);
  assert.equal(b.rounds.queue.length, 1);
  assert.equal(b.rounds.running, true);
  assert.equal(b.snapshot().replacements[0].uid, p.uid);
  assert.deepEqual(
    b.decisions.required().map((s) => s.id),
    [b.homeSeat],
  );
  const seed = rng.snapshot();
  const invalid = b.act({ kind: "move", index: 0 });
  assert(invalid.some((e) => e.kind === "invalid"));
  assert.equal(rng.snapshot(), seed);
  b.act({ kind: "switch", index: 1 });
  assert.equal(b.turn, 1);
  assert.equal(b.player.uid, r.uid);
  assert.equal(b.conditions.get(b.homeSeat).stages.atk, 2);
  assert.equal(r.hp, r.stats.hp - 6);
  assert.equal(p.hp, p.stats.hp);
  assert.equal(e.moves[0].pp, 19);
  assert.equal(b.rounds.running, false);
  assert.equal(b.replacements.pending.size, 0);
});
test("Gen III handoff preserves specified volatiles and states, substitutes and source bindings but excludes statuses, attraction, Disable and Stockpile", () => {
  const { b, p, r, e } = fixture();
  b.rng.next = () => 0.99;
  Object.assign(b.conditions.get(b.homeSeat), {
    stages: { atk: 3 },
    confused: 3,
    focus: true,
    attractedTo: e.uid,
  });
  b.states.attach("substitute", b.homeSeat, { data: { hp: 20 } });
  b.states.attach("ingrain", b.homeSeat);
  b.states.attach("curse", b.homeSeat);
  b.states.attach("perish_song", b.homeSeat, { duration: 3 });
  b.states.attach("leech_seed", b.homeSeat, { sourceSeat: b.awaySeat });
  b.states.attach("disable", b.homeSeat, { data: { moveId: "hit" } });
  b.states.attach("stockpile", b.homeSeat, { data: { count: 2 } });
  b.states.attach("mean_look", b.homeSeat, { sourceSeat: b.awaySeat });
  b.states.attach("mean_look", b.awaySeat, { sourceSeat: b.homeSeat });
  b.states.attach("lock_on", b.awaySeat, {
    sourceSeat: b.homeSeat,
    duration: 1,
  });
  p.status = "burn";
  b.executeMove(b.homeSeat, 0);
  b.act({ kind: "switch", index: 1 });
  const state = b.conditions.get(b.homeSeat);
  assert.equal(state.stages.atk, 3);
  assert.equal(state.confused, 2);
  assert.equal(state.focus, true);
  assert.equal(state.attractedTo, undefined);
  assert.equal(r.status, null);
  assert.equal(p.status, "burn");
  assert.equal(b.states.lookup("substitute", b.homeSeat).data.hp, 20);
  assert.equal(b.states.lookup("perish_song", b.homeSeat).remaining, 3);
  for (const id of ["ingrain", "curse", "leech_seed", "mean_look"])
    assert(b.states.lookup(id, b.homeSeat));
  for (const id of ["disable", "stockpile"])
    assert(!b.states.lookup(id, b.homeSeat));
  assert.equal(b.states.lookup("mean_look", b.awaySeat).source.uid, r.uid);
  assert.equal(b.states.lookup("lock_on", b.awaySeat).source.uid, r.uid);
  assert.equal(b.states.lookup("lock_on", b.awaySeat).remaining, 2);
  assert(b.actions.prepare({ kind: "switch", index: 0 }).error); // rooted incoming creature cannot voluntarily leave
  b.actions.switch(b.homeSeat, 0);
  assert(!b.states.lookup("mean_look", b.awaySeat));
  assert(!b.states.lookup("lock_on", b.awaySeat));
});
test("No eligible reserve fails with PP payment; AI replaces immediately using its policy and never requests a human decision", () => {
  const f = fixture();
  f.r.hp = 0;
  f.b.executeMove(f.b.homeSeat, 0);
  assert.equal(f.b.replacements.pending.size, 0);
  assert.equal(f.p.moves[0].pp, 19);
  const a = fixture();
  a.e.moves = [{ id: "baton_pass", pp: 20 }];
  a.b.conditions.get(a.b.awaySeat).stages.def = 2;
  a.b.executeMove(a.b.awaySeat, 0);
  assert.equal(a.b.roster.occupant(a.b.awaySeat).uid, a.er.uid);
  assert.equal(a.b.conditions.get(a.b.awaySeat).stages.def, 2);
  assert.equal(a.b.replacements.pending.size, 0);
  assert.equal(
    a.b.actionLifecycle.lastMove(a.b.awaySeat, { successful: false }),
    null,
  );
  a.b.actions.switch(a.b.awaySeat, 0);
  assert.equal(
    a.b.actionLifecycle.lastMove(a.b.awaySeat, { successful: false }),
    null,
  );
});
test("A returning creature cannot reuse move history from its previous entry, while the bounded diagnostic action log remains available", () => {
  const { b, p } = fixture();
  p.moves = [{ id: "hit", pp: 20 }];
  b.executeMove(b.homeSeat, 0);
  assert.equal(b.actionLifecycle.lastMove(b.homeSeat), "hit");
  b.actions.switch(b.homeSeat, 1);
  b.actions.switch(b.homeSeat, 0);
  assert.equal(b.actionLifecycle.lastMove(b.homeSeat), null);
  assert(
    b.actionLifecycle.history.some(
      (r) => r.uid === p.uid && r.moveId === "hit",
    ),
  );
});
test("The Emerald runtime catalog includes all original moves, retains imported names and flags, and validates every effect at startup", () => {
  const { db: base } = fixture();
  const { db, catalog } = createEmeraldPlugins(
    structuredClone(base),
    [],
    (error) => {
      throw error;
    },
  );
  for (const id of Object.keys(GEN3_REFERENCE_MOVES)) assert(db.moves[id], id);
  assert.equal(db.moves.tackle.name, base.moves.tackle.name);
  assert(db.moves.growl.flags.includes("FLAG_MAGIC_COAT_AFFECTED"));
  assert.equal(db.moves.surf.effect, "surf");
  assert.equal(catalog.moves.baton_pass.effect, "baton_pass");
});
test("Doubles preserves every selected action and its original actor UID while waiting for one mid-round replacement", () => {
  const { b, p, r, e, er, db } = fixture({ format: "doubles" });
  const reserve = createMonster("ralts", 30, db, new Random(88));
  b.roster.owner(b.homeSeat).party.push(reserve);
  r.moves = [{ id: "hit", pp: 20 }];
  er.moves = [{ id: "hit", pp: 20 }];
  const ally = b.roster
    .occupied()
    .find(
      (s) => s.id !== b.homeSeat && !b.roster.isOpposing(s.id, b.homeSeat),
    ).id;
  b.act({ kind: "move", seat: b.homeSeat, index: 0 });
  assert.equal(b.turn, 0);
  b.act({ kind: "move", seat: ally, index: 0 });
  assert.equal(b.turn, 1);
  assert.equal(b.rounds.queue.length, 3);
  b.act({ kind: "switch", index: 2 });
  assert.equal(b.player.uid, reserve.uid);
  assert.equal(r.moves[0].pp, 19);
  assert.equal(e.moves[0].pp, 19);
  assert.equal(er.moves[0].pp, 19);
  assert.equal(p.hp, p.stats.hp);
  assert.equal(b.turn, 1);
});
test("A failure during replacement entry restores the original pending request and queue; retry neither repeats the selecting move nor consumes a second turn", () => {
  let fail = true;
  const { b, p, r, e, rng } = fixture({
    hooks: [
      {
        id: "entry-fault",
        phase: "switch-in",
        apply: () => {
          if (fail) throw new Error("entry fault");
        },
      },
    ],
  });
  b.act({ kind: "move", index: 0 });
  const seed = rng.snapshot();
  assert.throws(() => b.act({ kind: "switch", index: 1 }), /entry fault/);
  assert.equal(b.player.uid, p.uid);
  assert.equal(b.replacements.get(b.homeSeat).uid, p.uid);
  assert.equal(b.rounds.queue.length, 1);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(e.moves[0].pp, 20);
  assert.equal(rng.snapshot(), seed);
  assert.equal(b.turn, 1);
  fail = false;
  b.act({ kind: "switch", index: 1 });
  assert.equal(b.player.uid, r.uid);
  assert.equal(e.moves[0].pp, 19);
  assert.equal(b.turn, 1);
});
test("A resumed enemy rule failure rolls back the replacement, transferred sources, HP and the unfinished round together", () => {
  let fail = true;
  const { b, p, r, e } = fixture({
    hooks: [
      {
        id: "attack-fault",
        phase: "after-action",
        apply: (c) => {
          if (fail && c.actorSeat === c.battle.awaySeat)
            throw new Error("attack fault");
        },
      },
    ],
  });
  b.states.attach("mean_look", b.awaySeat, { sourceSeat: b.homeSeat });
  b.act({ kind: "move", index: 0 });
  assert.throws(() => b.act({ kind: "switch", index: 1 }), /attack fault/);
  assert.equal(b.player.uid, p.uid);
  assert.equal(r.hp, r.stats.hp);
  assert.equal(b.states.lookup("mean_look", b.awaySeat).source.uid, p.uid);
  assert.equal(b.rounds.queue.length, 1);
  assert.equal(e.moves[0].pp, 20);
  fail = false;
  b.act({ kind: "switch", index: 1 });
  assert.equal(r.hp, r.stats.hp - 6);
  assert.equal(b.states.lookup("mean_look", b.awaySeat).source.uid, r.uid);
});
test("Registered creature-scoped state can opt into handoff and rebinds to the new UID, while ordinary leave still removes it", () => {
  const { b, r } = fixture({
    states: {
      "demo:carry": {
        scope: "creature",
        schema: objectSchema(),
        clearOn: ["leave", "faint", "end"],
        transferOn: ["baton_pass"],
        hooks: [],
      },
    },
  });
  b.states.attach("demo:carry", b.homeSeat);
  b.executeMove(b.homeSeat, 0);
  b.act({ kind: "switch", index: 1 });
  assert.equal(b.states.lookup("demo:carry", b.homeSeat).anchor, r.uid);
  b.actions.switch(b.homeSeat, 0);
  assert(!b.states.lookup("demo:carry", b.homeSeat));
  assert.throws(
    () =>
      new BattleStateRegistry({
        bad: { scope: "seat", hooks: [], transferOn: "baton_pass" },
      }),
    /transfer/,
  );
});
test("The presentation session returns control for replacement, and a called Baton Pass uses the same request instead of owning another scheduler", async () => {
  const { b, p, r } = fixture();
  b.db.moves = {
    metronome: b.db.moves.metronome,
    baton_pass: b.db.moves.baton_pass,
    hit: b.db.moves.hit,
  };
  p.moves = [{ id: "metronome", pp: 20 }];
  const events = [];
  const session = new BattleSession({
    createBattle: () => b,
    director: {
      busy: false,
      reset() {},
      stage() {},
      play: async (e) => events.push(e.kind),
    },
    transitions: { busy: false, run: async (kind, fn) => fn() },
  });
  await session.start({ trainer: true });
  await session.act({ kind: "move", index: 0 });
  assert.equal(b.turn, 1);
  assert(b.replacements.get(b.homeSeat));
  assert.equal(session.busy, false);
  assert.equal(p.moves[0].pp, 19);
  await session.act({ kind: "switch", index: 1 });
  assert.equal(b.player.uid, r.uid);
  assert.equal(b.turn, 1);
  assert(events.includes("switch"));
});
