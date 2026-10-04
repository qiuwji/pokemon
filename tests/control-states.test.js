import { loadContentSync } from "../tools/content-io.mjs";
import { createBag } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Battle } from "../dist/engine/battle.js";
import { Random, createMonster } from "../dist/engine/model.js";
const base = loadContentSync();
function fixture() {
  const names = [
    "disable",
    "encore",
    "torment",
    "mean_look",
    "lock_on",
    "wish",
    "yawn",
    "ingrain",
    "leech_seed",
    "nightmare",
    "perish_song",
    "safeguard",
    "spikes",
    "rapid_spin",
    "hit",
  ];
  const db = {
    ...base,
    moves: {
      ...base.moves,
      ...Object.fromEntries(
        names.map((id) => [
          id,
          {
            name: id,
            effect: id,
            type: "normal",
            power: ["hit", "rapid_spin"].includes(id) ? 40 : 0,
            accuracy: 100,
            pp: 20,
            priority: 0,
            chance: 0,
            target: "selected",
          },
        ]),
      ),
    },
  };
  const rng = new Random(321),
    make = (s) => createMonster(s, 30, db, rng);
  const p = make("treecko"),
    r = make("mudkip"),
    e = make("zigzagoon"),
    er = make("poochyena");
  const b = new Battle({
    party: [p, r],
    enemyParty: [e, er],
    trainer: true,
    db,
    rng,
    bag: createBag({}),
    rules: {
      accuracy: () => true,
      critical: () => false,
      damage: () => ({ amount: 6, type: 1, critical: false }),
      grantExperience: () => [],
    },
  });
  const use = (seat, id) => {
    b.roster.occupant(seat).moves = [{ id, pp: 20 }];
    b.executeMove(seat, 0, {
      kind: "seat",
      id: seat === b.homeSeat ? b.awaySeat : b.homeSeat,
    });
  };
  return { b, p, r, e, er, use };
}
test("Disable, Encore and Torment share eligibility and queued-action settlement, without history leaking across replacements", () => {
  const { b, p, e, use } = fixture();
  use(b.homeSeat, "hit");
  p.moves.push({ id: "wish", pp: 20 });
  use(b.awaySeat, "disable");
  assert(!b.moveAvailable(b.homeSeat, 0));
  assert(b.moveAvailable(b.homeSeat, 1));
  b.states.remove(b.states.lookup("disable", b.homeSeat).key);
  use(b.awaySeat, "encore");
  assert(b.moveAvailable(b.homeSeat, 0));
  assert(!b.moveAvailable(b.homeSeat, 1));
  const enemyHP = e.hp;
  b.executeMove(b.homeSeat, 1, { kind: "seat", id: b.awaySeat });
  assert.equal(e.hp, enemyHP - 6);
  assert.equal(p.moves[1].pp, 20);
  assert.equal(p.moves[0].pp, 18);
  b.states.remove(b.states.lookup("encore", b.homeSeat).key);
  use(b.awaySeat, "torment");
  assert(!b.moveAvailable(b.homeSeat, 0));
  b.actions.switch(b.homeSeat, 1);
  assert.equal(b.actionLifecycle.lastMove(b.homeSeat), null);
});
test("Mean Look clears when its source leaves; Wish stays with the seat and heals its current recipient", () => {
  const { b, p, r, use } = fixture();
  use(b.awaySeat, "mean_look");
  const permission = {
    actorSeat: b.homeSeat,
    targetSeat: b.homeSeat,
    allowed: true,
  };
  b.traits.run("switch-check", permission);
  assert.equal(permission.allowed, false);
  b.actions.switch(b.awaySeat, 1);
  assert(!b.states.lookup("mean_look", b.homeSeat));
  use(b.homeSeat, "wish");
  b.actions.switch(b.homeSeat, 1);
  r.hp = 1;
  b.states.tick();
  assert.equal(r.hp, 1);
  b.states.tick();
  assert.equal(r.hp, 1 + Math.floor(r.stats.hp / 2));
  assert.equal(p.hp, p.stats.hp);
});
test("Yawn respects prevention and two ticks; Leech Seed drains to the source seat and Rapid Spin removes seed and hazards", () => {
  const { b, p, r, e, use } = fixture();
  use(b.awaySeat, "yawn");
  b.states.tick();
  assert.equal(p.status, null);
  b.states.tick();
  assert.equal(p.status, "sleep");
  p.status = null;
  use(b.homeSeat, "safeguard");
  use(b.awaySeat, "yawn");
  assert(!b.states.lookup("yawn", b.homeSeat));
  b.actions.switch(b.homeSeat, 1);
  use(b.awaySeat, "leech_seed");
  e.hp = 1;
  const hp = r.hp,
    amount = Math.floor(r.stats.hp / 8);
  b.states.tick();
  assert.equal(r.hp, hp - amount);
  assert.equal(e.hp, 1 + amount);
  use(b.awaySeat, "spikes");
  use(b.homeSeat, "rapid_spin");
  assert(!b.states.lookup("leech_seed", b.homeSeat));
  assert(!b.states.lookup("spikes", b.homeSeat));
});
test("Spikes applies once before entry traits, scales by layers, survives switching; Perish Song clears on leave and kills after four ticks", () => {
  const { b, p, r, e, er, use } = fixture();
  for (let i = 0; i < 3; i++) use(b.awaySeat, "spikes");
  const hp = r.hp;
  b.actions.switch(b.homeSeat, 1);
  assert.equal(r.hp, hp - Math.floor(r.stats.hp / 4));
  assert.equal(b.states.lookup("spikes", b.homeSeat).stacks, 3);
  use(b.homeSeat, "perish_song");
  b.actions.switch(b.awaySeat, 1);
  assert(!b.states.lookup("perish_song", b.awaySeat));
  for (let i = 0; i < 3; i++) b.states.tick();
  assert(r.hp > 0);
  b.states.tick();
  assert.equal(r.hp, 0);
  assert.equal(b.ended, false);
  assert.equal(p.hp, p.stats.hp);
  assert.equal(er.hp, er.stats.hp);
  assert(e.hp > 0);
});
test("Lock On bypasses accuracy and concealment only for the source, but protection still blocks", () => {
  const { b, p, e, use } = fixture();
  use(b.homeSeat, "lock_on");
  b.rules.accuracy = () => false;
  b.actionLifecycle.locks.set(b.awaySeat, {
    actor: e.uid,
    hidden: "air",
    kind: "charge",
  });
  const hp = e.hp;
  use(b.homeSeat, "hit");
  assert.equal(e.hp, hp - 6);
  b.conditions.get(b.awaySeat).protected = true;
  use(b.homeSeat, "hit");
  assert.equal(e.hp, hp - 6);
  assert(p.hp > 0);
});
