import { loadContentSync } from "../tools/content-io.mjs";
import { createBag } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { GEN3_ABILITIES } from "../dist/engine/rules/gen3/abilities.js";
import { Battle } from "../dist/engine/battle.js";
import { BattleSession } from "../dist/engine/battle-session.js";
import { Random, createMonster } from "../dist/engine/model.js";
import { MoveEffectRegistry } from "../dist/engine/move-effects.js";
const base = loadContentSync();
const skill = (effect, power = 50, type = "normal", target = "selected") => ({
  name: effect,
  type,
  power,
  accuracy: 100,
  pp: 20,
  priority: 0,
  effect,
  chance: 0,
  target,
});
function fixture({ move = "beam", hooks = [], format = "singles" } = {}) {
  const db = {
      ...base,
      moves: {
        ...base.moves,
        beam: skill("solar_beam", 120, "grass"),
        dig: skill("semi_invulnerable", 60, "ground"),
        future: skill("future_sight", 80, "psychic"),
        rampage: skill("rampage"),
        recharge: skill("recharge"),
        mirror: skill("mirror_move", 0),
        hit: skill("hit", 50),
        pass: skill("defense_up", 0, "normal", "self"),
      },
    },
    rng = new Random(302);
  // Non-native move IDs still use an explicitly registered action policy.
  const effects = new MoveEffectRegistry({
    definitions: {
      demo_dig: { action: { kind: "charge", hidden: "underground" } },
    },
  });
  db.moves.dig.effect = "demo_dig";
  const p = createMonster("treecko", 30, db, rng),
    e = createMonster("zigzagoon", 30, db, rng),
    r = createMonster("mudkip", 30, db, rng),
    er = createMonster("poochyena", 30, db, rng);
  p.moves = [
    { id: move, pp: 20 },
    { id: "hit", pp: 20 },
  ];
  e.moves = [
    { id: "pass", pp: 20 },
    { id: "hit", pp: 20 },
  ];
  r.moves = [{ id: "hit", pp: 20 }];
  const b = new Battle({
    party: [p, r],
    enemyParty: [e, er],
    db,
    rng,
    trainer: true,
    format,
    bag: createBag({}),
    effects,
    ai: (battle, seat) => ({ kind: "move", seat, index: 0 }),
    traits: { abilities: GEN3_ABILITIES, heldItems: {}, hooks },
    rules: {
      damage: () => ({ amount: 5, type: 1, critical: false }),
      accuracy: () => true,
      critical: () => false,
      grantExperience: () => [],
    },
  });
  return { b, p, e, r, er, rng, db };
}
test("Charge consumes PP once, locks choice, continues automatically, and clears concealment; sun skips solar charge", () => {
  const { b, p, e } = fixture({ move: "dig" });
  const hp = e.hp;
  b.act({ kind: "move", index: 0, target: { kind: "seat", id: b.awaySeat } });
  assert.equal(e.hp, hp);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(b.decisions.required().length, 0);
  assert.equal(b.actionLifecycle.hidden(b.homeSeat), "underground");
  b.advance();
  assert.equal(e.hp, hp - 5);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(b.actionLifecycle.locked(b.homeSeat), null);
  assert.equal(b.actionLifecycle.hidden(b.homeSeat), null);
  const sunny = fixture();
  sunny.b.weather = { kind: "sun", turns: null };
  sunny.b.act({ kind: "move", index: 0 });
  assert.equal(sunny.e.hp, sunny.e.stats.hp - 5);
  assert.equal(sunny.b.actionLifecycle.locked(sunny.b.homeSeat), null);
});
test("Concealed targets reject ordinary attacks and configured attacks hit; switch/faint clears locks", () => {
  const { b, p } = fixture({ move: "dig" });
  b.act({ kind: "move", index: 0 });
  const hp = p.hp;
  b.executeMove(b.awaySeat, 1, { kind: "seat", id: b.homeSeat });
  assert.equal(p.hp, hp);
  b.moveEffects.definitions.hit.hitsHidden = ["underground"];
  b.executeMove(b.awaySeat, 1, { kind: "seat", id: b.homeSeat });
  assert.equal(p.hp, hp - 5);
  b.actions.switch(b.homeSeat, 1);
  assert.equal(b.actionLifecycle.locked(b.homeSeat), null);
});
test("Repeat action locks for bounded turns with one PP charge; recharge owns one otherwise empty action", () => {
  const { b, p } = fixture({ move: "rampage" });
  b.act({ kind: "move", index: 0 });
  let rounds = 1;
  while (b.actionLifecycle.locked(b.homeSeat)) {
    b.advance();
    rounds++;
    assert(rounds <= 3);
  }
  assert(rounds >= 2);
  assert.equal(p.moves[0].pp, 19);
  assert(b.conditions.get(b.homeSeat).confused > 0);
  const recharge = fixture({ move: "recharge" });
  recharge.b.act({ kind: "move", index: 0 });
  assert.equal(
    recharge.b.actionLifecycle.locked(recharge.b.homeSeat).kind,
    "recharge",
  );
  const hp = recharge.e.hp;
  recharge.b.advance();
  assert.equal(recharge.e.hp, hp);
  assert.equal(recharge.p.moves[0].pp, 19);
  assert(recharge.b.events.some((e) => e.kind === "wait"));
});
test("Delayed attacks resolve on the third turn against the seat replacement and retain the original source UID", () => {
  const { b, p, e, er } = fixture({ move: "future" }),
    source = p.uid;
  b.act({ kind: "move", index: 0 });
  assert.equal(e.hp, e.stats.hp);
  assert.equal(b.actionLifecycle.delayed.length, 1);
  b.actions.switch(b.awaySeat, 1);
  b.actions.switch(b.homeSeat, 1);
  b.act({ kind: "move", index: 0 });
  assert.equal(er.hp, er.stats.hp - 5); // ordinary hit only on second turn
  const hp = er.hp;
  b.act({ kind: "move", index: 0 });
  const event = b.events.find((e) => e.delayedId);
  assert(event);
  assert.equal(event.targetUid, er.uid);
  assert.equal(event.actorUid, source);
  assert.equal(b.actionLifecycle.delayed.length, 0);
  assert(er.hp <= hp - 9);
});
test("Only one delayed attack per target is allowed; scheduled work and history roll back with failed rules", () => {
  let fail = false;
  const { b, p, rng } = fixture({
    move: "future",
    hooks: [
      {
        id: "fault",
        phase: "after-action",
        apply: () => {
          if (fail) throw new Error("fault");
        },
      },
    ],
  });
  const seed = rng.snapshot();
  fail = true;
  assert.throws(() => b.act({ kind: "move", index: 0 }), /fault/);
  assert.equal(p.moves[0].pp, 20);
  assert.equal(b.actionLifecycle.delayed.length, 0);
  assert.equal(b.actionLifecycle.history.length, 0);
  assert.equal(rng.snapshot(), seed);
  fail = false;
  b.act({ kind: "move", index: 0 });
  b.act({ kind: "move", index: 0 });
  assert.equal(b.actionLifecycle.delayed.length, 1);
  assert(b.events.some((e) => e.kind === "failed"));
  b.finish("escaped");
  assert.equal(b.actionLifecycle.delayed.length, 0);
});
test("Move replacement reads bounded history and spends only the selecting move PP", () => {
  const { b, p, e } = fixture({ move: "mirror" });
  b.executeMove(b.awaySeat, 1, { kind: "seat", id: b.homeSeat });
  const hp = e.hp;
  b.executeMove(b.homeSeat, 0, { kind: "seat", id: b.awaySeat });
  assert.equal(e.hp, hp - 5);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(b.actionLifecycle.lastMove(b.awaySeat), "hit");
  assert(b.events.some((e) => e.kind === "move" && e.move.id === "hit"));
});
test("Session presents automatic charge continuation without another player command; state lifecycle ticks exactly once", async () => {
  const { b, p } = fixture();
  const phases = [];
  const events = [];
  const session = new BattleSession({
    createBattle: () => b,
    director: {
      busy: false,
      reset() {},
      stage() {},
      play: async (e) => events.push(e.kind),
    },
    transitions: { busy: false, run: async (_, fn) => fn() },
  });
  await session.start({ trainer: true });
  await session.act({ kind: "move", index: 0 });
  assert.equal(b.turn, 2);
  assert.equal(p.moves[0].pp, 19);
  assert(events.includes("charge"));
  assert.equal(b.decisions.required().length, 1);
  // Lifecycle routing is compiled during construction, so a separate registered definition tests it.
  const c = fixture({
    hooks: [
      {
        id: "life",
        phase: "state-tick",
        apply: (context) => phases.push(context.battleStateKey),
      },
    ],
  });
  c.b.states.attach("reflect", c.b.homeSeat);
  c.b.states.tick();
  assert.equal(phases.length, 1);
});
