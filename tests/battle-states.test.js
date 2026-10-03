import { createBag } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Battle } from "../dist/engine/battle.js";
import { Random, createMonster } from "../dist/engine/model.js";
import { GEN3_ABILITIES } from "../dist/engine/rules/gen3/abilities.js";
import { GEN3_GLOBAL_HOOKS } from "../dist/engine/rules/gen3/global-rules.js";
import { objectSchema } from "../dist/engine/extensions/values.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
const original = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const skill = (effect, power = 0, target = "self") => ({
  name: effect,
  type: "normal",
  power,
  accuracy: 0,
  pp: 20,
  priority: 0,
  effect,
  chance: 0,
  target,
});
function fixture({
  states = {},
  hooks = [],
  effects = {},
  damage = () => ({ amount: 6, type: 1, critical: false }),
} = {}) {
  const db = {
      ...original,
      moves: {
        ...original.moves,
        sub: skill("substitute"),
        wall: skill("reflect"),
        taunt: skill("taunt", 0, "selected"),
        hit: skill("hit", 50, "selected"),
      },
    },
    rng = new Random(321);
  const p = createMonster("treecko", 30, db, rng),
    r = createMonster("mudkip", 30, db, rng),
    e = createMonster("zigzagoon", 30, db, rng),
    er = createMonster("poochyena", 30, db, rng);
  p.moves = [
    { id: "sub", pp: 20 },
    { id: "wall", pp: 20 },
    { id: "hit", pp: 20 },
  ];
  e.moves = [
    { id: "taunt", pp: 20 },
    { id: "hit", pp: 20 },
  ];
  const b = new Battle({
    party: [p, r],
    enemyParty: [e, er],
    db,
    rng,
    trainer: true,
    bag: createBag({}),
    states,
    effects,
    traits: {
      abilities: GEN3_ABILITIES,
      heldItems: {},
      hooks: [...GEN3_GLOBAL_HOOKS, ...hooks],
    },
    rules: {
      damage,
      accuracy: () => true,
      critical: () => false,
      grantExperience: () => [],
    },
  });
  return { b, p, r, e, er, db, rng };
}
test("Scoped states distinguish creature, seat, side and field; stacks, exclusions and lifecycles are battle-owned", () => {
  const def = (scope) => ({
    scope,
    duration: 2,
    schema: objectSchema(),
    hooks: [],
    clearOn: scope === "seat" ? ["leave", "faint", "end"] : ["end"],
  });
  const { b, p } = fixture({
    states: {
      pet: def("creature"),
      pose: def("seat"),
      team: def("side"),
      sky: def("field"),
      a: { ...def("seat"), stack: "add", maxStacks: 2, excludes: ["pose"] },
    },
  });
  for (const id of ["pet", "pose", "team", "sky"])
    assert(b.states.attach(id, b.homeSeat));
  assert(b.states.attach("a", b.homeSeat));
  assert.equal(b.states.lookup("pose", b.homeSeat), undefined);
  b.states.attach("a", b.homeSeat);
  b.states.attach("a", b.homeSeat);
  assert.equal(b.states.lookup("a", b.homeSeat).stacks, 2);
  assert.equal(b.states.lookup("pet", b.homeSeat).anchor, p.uid);
  b.actions.switch(b.homeSeat, 1);
  assert.equal(b.states.lookup("a", b.homeSeat), undefined);
  assert.equal(b.states.lookup("pet", b.homeSeat), undefined);
  assert(b.states.lookup("team", b.homeSeat));
  assert(b.states.lookup("sky", b.awaySeat));
  b.actions.switch(b.homeSeat, 0);
  assert(b.states.lookup("pet", b.homeSeat));
  b.states.tick();
  assert.equal(b.states.lookup("pet", b.homeSeat).remaining, 1);
  b.states.tick();
  assert.equal(b.states.view().length, 0);
  b.states.attach("sky", b.homeSeat);
  b.finish("escaped");
  assert.equal(b.states.instances.size, 0);
  const second = fixture();
  assert.equal(second.b.states.instances.size, 0);
});
test("Substitute costs one quarter HP, absorbs without spillover, blocks status and resets on switching", () => {
  const { b, p, e } = fixture(),
    cost = Math.floor(p.stats.hp / 4);
  b.executeMove(b.homeSeat, 0);
  const hp = p.hp;
  assert.equal(hp, p.stats.hp - cost);
  assert.equal(b.states.lookup("substitute", b.homeSeat).data.hp, cost);
  assert.equal(
    b.applyStatus(b.homeSeat, "poison", {
      sourceSeat: b.awaySeat,
      sourceKind: "move",
    }),
    false,
  );
  while (b.states.lookup("substitute", b.homeSeat)) {
    b.executeMove(b.awaySeat, 1, { kind: "seat", id: b.homeSeat });
    assert.equal(p.hp, hp);
  }
  b.executeMove(b.awaySeat, 1, { kind: "seat", id: b.homeSeat });
  assert.equal(p.hp, hp - 6);
  p.hp = p.stats.hp;
  b.executeMove(b.homeSeat, 0);
  b.actions.switch(b.homeSeat, 1);
  assert.equal(b.states.lookup("substitute", b.homeSeat), undefined);
  assert(e.hp > 0);
});
test("Reflect protects the side, survives switching, ignores critical hits and expires after five ticks; taunt blocks queued status moves", () => {
  const { b, p } = fixture();
  b.executeMove(b.homeSeat, 1);
  assert.equal(
    b.traits.calculate("screen", 30, {
      actorSeat: b.awaySeat,
      targetSeat: b.homeSeat,
      move: { type: "normal" },
      critical: false,
    }),
    15,
  );
  assert.equal(
    b.traits.calculate("screen", 30, {
      actorSeat: b.awaySeat,
      targetSeat: b.homeSeat,
      move: { type: "normal" },
      critical: true,
    }),
    30,
  );
  b.actions.switch(b.homeSeat, 1);
  assert(b.states.lookup("reflect", b.homeSeat));
  for (let i = 0; i < 5; i++) b.states.tick();
  assert.equal(b.states.lookup("reflect", b.homeSeat), undefined);
  b.actions.switch(b.homeSeat, 0);
  b.executeMove(b.awaySeat, 0, { kind: "seat", id: b.homeSeat });
  assert.equal(b.moveAvailable(b.homeSeat, 0), false);
  assert.equal(b.moveAvailable(b.homeSeat, 2), true);
  const pp = p.moves[0].pp;
  b.executeMove(b.homeSeat, 0);
  assert.equal(b.states.lookup("substitute", b.homeSeat), undefined);
  assert.equal(p.moves[0].pp, pp - 1);
  b.states.tick();
  b.states.tick();
  assert(b.moveAvailable(b.homeSeat, 0));
});
test("A rule fault restores state instances, source identities, PP and seeded RNG alongside the original battle", () => {
  let fail = false;
  const { b, p, rng } = fixture({
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
  const seed = rng.snapshot(),
    hp = p.hp,
    pp = p.moves[0].pp;
  fail = true;
  assert.throws(() => b.act({ kind: "move", index: 0 }), /fault/);
  assert.equal(b.states.instances.size, 0);
  assert.equal(b.states.sequence, 0);
  assert.equal(p.hp, hp);
  assert.equal(p.moves[0].pp, pp);
  assert.equal(rng.snapshot(), seed);
});
test("Plugin battle states use frozen rule views and registered operations, without adding battle-loop branches", () => {
  const plugin = {
    id: "state-demo",
    version: "1.0.0",
    dataVersion: 1,
    apiVersion: 1,
    permissions: [],
    setup(api) {
      api.content.register("battleStates", "boost", {
        scope: "seat",
        duration: 3,
        schema: objectSchema(),
        hooks: [
          {
            role: "actor",
            phase: "power",
            modify: (value, c) => {
              assert(Object.isFrozen(c.battleState));
              return value * c.battleState.stacks * 2;
            },
          },
        ],
      });
    },
  };
  const { catalog } = createEmeraldPlugins(original, [plugin]);
  const { b } = fixture({ states: catalog.battleStates });
  b.states.attach("state-demo:boost", b.homeSeat);
  assert.equal(
    b.traits.calculate("power", 20, {
      actorSeat: b.homeSeat,
      targetSeat: b.awaySeat,
      move: { type: "normal", power: 20 },
    }),
    40,
  );
  assert.throws(
    () =>
      fixture({
        effects: {
          invalid: { primary: [{ op: "applyBattleState", id: "missing" }] },
        },
      }),
    /Unknown battle state/,
  );
});
