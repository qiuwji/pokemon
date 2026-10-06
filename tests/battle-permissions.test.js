import test from "node:test";
import assert from "node:assert/strict";
import { session, manifest } from "./helpers/session.js";
import { createMonster } from "../src/engine/model.js";
import { Battle } from "../src/engine/battle.js";
import { GEN3_ABILITIES } from "../src/engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../src/engine/rules/gen3/held-items.js";
import { GEN3_GLOBAL_HOOKS } from "../src/engine/rules/gen3/global-rules.js";

function switchLock() {
  return manifest("perm-switch", (api) => {
    api.rules.register("hold", {
      phase: "switch-check",
      decide: (c) =>
        c.forced === false
          ? { kind: "deny", reason: "战术锁住。" }
          : { kind: "abstain" },
    });
  });
}
test("a plugin switch decision blocks a voluntary switch but not a forced replacement", async () => {
  const s = session([switchLock()]);
  const ally = createMonster("mudkip", 10, s.db, s.game.rng);
  s.game.state.party.push(ally);
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  const b = s.game.battle,
    lead = s.mon;
  const rejected = b.act({ kind: "switch", index: 1, seat: b.homeSeat });
  assert(rejected.some((e) => e.kind === "invalid"));
  assert.equal(b.roster.occupant(b.homeSeat).uid, lead.uid);
  lead.hp = 0;
  b.checkFaint();
  b.act({ kind: "switch", index: 1, seat: b.homeSeat });
  assert.equal(b.roster.occupant(b.homeSeat).uid, ally.uid);
});

test("a plugin defense decision can block or scale an incoming move", () => {
  const block = defenseBattle(session([manifest("perm-block", () => {})]), [
    { id: "g", phase: "defense-interaction", decide: () => ({ kind: "outcome", outcome: "block" }) },
  ]);
  const blocked = block.enemy,
    secure = blocked.hp;
  block.act({ kind: "move", index: 0, seat: block.homeSeat });
  assert.equal(blocked.hp, secure);

  const scale = defenseBattle(session([manifest("perm-scale", () => {})]), [
    {
      id: "g",
      phase: "defense-interaction",
      decide: () => ({
        kind: "outcome",
        outcome: { kind: "scaledDamage", numerator: 1, denominator: 2 },
      }),
    },
  ]);
  const target = scale.enemy,
    before = target.hp;
  scale.act({ kind: "move", index: 0, seat: scale.homeSeat });
  assert.equal(before - target.hp, 2);
});

test("defense scaledDamage also applies to fixed-damage moves", () => {
  const b = defenseBattle(session([manifest("perm-fixed", () => {})]), []);
  const c = {
    move: b.db.moves.tackle,
    definition: {},
    selfState: b.conditions.get(b.homeSeat),
    targetState: b.conditions.get(b.awaySeat),
    mon: b.roster.occupant(b.homeSeat),
    opponent: b.roster.occupant(b.awaySeat),
    actorSeat: b.homeSeat,
    targetSeat: b.awaySeat,
    fixedDamage: 10,
    damageScale: { kind: "scaledDamage", numerator: 1, denominator: 2 },
  };
  assert.equal(b.moves.damage.roll(c).amount, 5);
});

function defenseBattle(s, hooks) {
  const mon = s.mon,
    foe = createMonster("poochyena", 30, s.db, s.game.rng);
  mon.moves = [{ id: "tackle", pp: 20 }];
  foe.moves = [{ id: "tackle", pp: 20 }];
  const b = new Battle({
    party: [mon],
    enemyParty: [foe],
    db: s.db,
    bag: s.game.state.bag,
    rng: s.game.rng,
    trainer: true,
    items: s.game.items,
    ai: (battle, seat) => ({ kind: "move", seat, index: 0 }),
    rules: { damage: () => ({ amount: 5, type: 1, critical: false }), accuracy: () => true },
    traits: {
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
      hooks: [...GEN3_GLOBAL_HOOKS, ...hooks],
    },
  });
  const run = b.traits.run.bind(b.traits);
  b.traits.run = (phase, c) => {
    if (phase === "action") b.conditions.get(b.awaySeat).protected = true;
    return run(phase, c);
  };
  return b;
}

test("a defense decision can pass a protected target; default protection still blocks", () => {
  const pass = defenseBattle(session([manifest("perm-none", () => {})]), [
    { id: "g", phase: "defense-interaction", decide: () => ({ kind: "outcome", outcome: "pass" }) },
  ]);
  const foe = pass.enemy,
    before = foe.hp;
  pass.act({ kind: "move", index: 0, seat: pass.homeSeat });
  assert(foe.hp < before);

  const block = defenseBattle(session([manifest("perm-none2", () => {})]), []);
  const guarded = block.enemy,
    secure = guarded.hp;
  block.act({ kind: "move", index: 0, seat: block.homeSeat });
  assert.equal(guarded.hp, secure);
});

test("decide hooks are rejected on non-permission phases and for non-functions", () => {
  for (const definition of [
    { phase: "damage", decide: () => ({ kind: "abstain" }) },
    { phase: "switch-check", decide: 1 },
    { phase: "switch-check", decide: () => ({}), modify: (v) => v },
  ]) {
    const plugin = manifest("bad-rule", (api) =>
      api.rules.register("r", definition),
    );
    assert.throws(() => session([plugin]), /Invalid plugin rule/);
  }
});
