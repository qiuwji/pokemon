import test from "node:test";
import assert from "node:assert/strict";
import { battleFixture } from "./helpers/battle-fixture.js";
import { damage } from "../src/engine/model.js";
import { MoveEffectRegistry } from "../src/engine/move-effects.js";
import {
  BattleApplication,
  BATTLE_PORTS,
} from "../src/packs/emerald/application/battle-application.js";
import { liveApplicationPorts } from "../src/packs/emerald/application/ports.js";
const moves = {
  magic_coat: {},
  snatch: {},
  growl: { effect: "attack_down" },
  swords_dance: { effect: "attack_up_2", target: "self" },
  restore_hp: { target: "self" },
  hit: { power: 30 },
  beat_up: { power: 10, type: "dark" },
  kick: { effect: "recoil_if_miss", power: 70, type: "fighting" },
  pay_day: { power: 40 },
};
test("Magic Coat consumes one guard and reflects onto the selecting actor while charging only the original PP", () => {
  const { b, p, e, use } = battleFixture({ moves });
  use(b.awaySeat, "magic_coat");
  use(b.homeSeat, "growl");
  assert.equal(b.conditions.get(b.homeSeat).stages.atk, -1);
  assert.equal(b.conditions.get(b.awaySeat).stages.atk, undefined);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(e.moves[0].pp, 19);
  assert(!b.states.lookup("magic_coat", b.awaySeat));
  const reflected = b.events.findLast((e) => e.move?.id === "growl");
  assert.equal(reflected.actorUid, e.uid);
  assert.equal(reflected.targetUid, p.uid);
  assert.equal(b.actionLifecycle.lastMove(b.homeSeat), "growl");
});
test("A Pressure source reduces the reflecting guard's own PP, including a content-defined alias of Magic Coat", () => {
  const { b, p, e } = battleFixture({
    moves: { ...moves, alias_coat: { effect: "magic_coat" } },
  });
  p.ability = "pressure";
  e.moves = [{ id: "alias_coat", pp: 20 }];
  b.executeMove(b.awaySeat, 0);
  p.moves = [{ id: "growl", pp: 20 }];
  b.executeMove(b.homeSeat, 0);
  assert.equal(e.moves[0].pp, 18);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(b.conditions.get(b.homeSeat).stages.atk, -1);
});
test("Consumed reflection guards bound a double bounce and explicit custom flags can opt out of reference flags", () => {
  const { b, p, e, use } = battleFixture({ moves });
  use(b.homeSeat, "magic_coat");
  use(b.awaySeat, "magic_coat");
  use(b.homeSeat, "growl");
  assert.equal(b.conditions.get(b.awaySeat).stages.atk, -1);
  assert.equal(b.conditions.get(b.homeSeat).stages.atk, undefined);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(e.moves[0].pp, 19);
  assert(!b.states.lookup("magic_coat", b.homeSeat));
  assert(!b.states.lookup("magic_coat", b.awaySeat));
  use(b.awaySeat, "magic_coat");
  b.db.moves.growl.flags = [];
  use(b.homeSeat, "growl");
  assert.equal(b.conditions.get(b.awaySeat).stages.atk, -2);
  assert(b.states.lookup("magic_coat", b.awaySeat));
});
test("Snatch processes guards in action order, permits Gen III chained stealing and charges guard PP from a Pressure source", () => {
  const { b, p, e, er, use } = battleFixture({ moves, format: "doubles" });
  const other = b.roster
    .opposing(b.homeSeat)
    .find((s) => s.id !== b.awaySeat).id;
  use(other, "snatch");
  use(b.awaySeat, "snatch");
  b.turnOrder = [other, b.awaySeat, b.homeSeat];
  er.ability = "pressure";
  use(b.homeSeat, "swords_dance");
  assert.equal(b.conditions.get(other).stages.atk, undefined);
  assert.equal(b.conditions.get(b.homeSeat).stages.atk, undefined);
  assert.equal(b.conditions.get(b.awaySeat).stages.atk, 2);
  assert.equal(p.moves[0].pp, 19);
  assert.equal(er.moves[0].pp, 19);
  assert.equal(e.moves[0].pp, 18);
  assert(!b.states.lookup("snatch", b.awaySeat));
  const moved = b.events.findLast((e) => e.move?.id === "swords_dance");
  assert.equal(moved.actorUid, e.uid);
  assert.equal(moved.targetUid, e.uid);
});
test("Interception guards fail when acting last and expire after the round; unflagged attacks are unaffected", () => {
  const { b, e, use } = battleFixture({ moves });
  b.turnOrder = [b.awaySeat, b.homeSeat];
  use(b.homeSeat, "snatch");
  assert(!b.states.lookup("snatch", b.homeSeat));
  b.turnOrder = [];
  use(b.awaySeat, "magic_coat");
  use(b.homeSeat, "hit");
  assert.equal(e.hp, e.stats.hp - 6);
  assert(b.states.lookup("magic_coat", b.awaySeat));
  b.states.tick();
  assert(!b.states.lookup("magic_coat", b.awaySeat));
});
test("Beat Up uses healthy non-egg party base Attack and level, target base Defense, and typeless individual critical/random impacts", () => {
  const { b, p, r, e, use, db } = battleFixture({
    moves,
    rules: { critical: () => true },
  });
  const targetDefense = db.species[e.species].stats.def;
  b.forms.overlay(e, { types: ["psychic"], stats: { def: 500 } });
  p.status = null;
  r.status = null;
  b.rng.int = () => 15;
  b.states.attach("helping_hand", b.homeSeat);
  const expected = [p, r].map((mon) => {
    const base =
      Math.floor(
        Math.floor(
          (db.species[mon.species].stats.atk *
            10 *
            (Math.floor((mon.level * 2) / 5) + 2)) /
            targetDefense,
        ) / 50,
      ) + 2;
    return Math.floor((base * 15) / 10) * 2;
  });
  const hp = e.hp;
  use(b.homeSeat, "beat_up");
  assert.equal(e.hp, hp - expected.reduce((a, v) => a + v, 0));
  assert.deepEqual(
    b.events.filter((e) => e.memberUid).map((e) => e.memberUid),
    [p.uid, r.uid],
  );
  assert.equal(p.moves[0].pp, 19);
  r.status = "burn";
  const before = b.events.length;
  use(b.homeSeat, "beat_up");
  assert.equal(b.events.slice(before).filter((e) => e.memberUid).length, 1);
});
test("Missed kick computes Gen III would-be damage/2 capped at target maxHP/2, without attacking target or its Substitute", () => {
  const { b, p, e, use } = battleFixture({
    moves,
    rules: { accuracy: () => false, damage },
  });
  b.rng.int = () => 15;
  b.states.attach("substitute", b.awaySeat, { data: { hp: 20 } });
  const expected = damage(
    p,
    e,
    { ...b.db.moves.kick, id: "kick" },
    b.db,
    b.rng,
    {
      critical: false,
      modifier: (phase, value, c) =>
        b.traits.calculate(phase, value, {
          ...c,
          actorSeat: b.homeSeat,
          targetSeat: b.awaySeat,
        }),
    },
  ).amount;
  const hp = p.hp;
  use(b.homeSeat, "kick");
  assert.equal(
    p.hp,
    hp -
      Math.min(
        Math.floor(e.stats.hp / 2),
        Math.max(1, Math.floor(expected / 2)),
      ),
  );
  assert.equal(e.hp, e.stats.hp);
  assert.equal(b.states.lookup("substitute", b.awaySeat).data.hp, 20);
  assert.equal(p.moves[0].pp, 19);
});
test("Crash skips type immunity and previews Endure/Focus Band survival without consuming Substitute or modifying the target", () => {
  const { b, p, e, use } = battleFixture({
    moves,
    rules: {
      accuracy: () => false,
      damage: () => ({ amount: 80, type: 1, critical: false }),
    },
  });
  e.hp = 11;
  b.states.attach("endure", b.awaySeat);
  use(b.homeSeat, "kick");
  assert.equal(p.hp, p.stats.hp - 5);
  b.states.remove(b.states.lookup("endure", b.awaySeat).key);
  e.heldItem = "focus_band";
  b.rng.next = () => 0;
  use(b.homeSeat, "kick");
  assert.equal(p.hp, p.stats.hp - 10);
  assert.equal(e.hp, 11);
  assert.equal(e.heldItem, "focus_band");
  b.rules.damage = () => ({ amount: 80, type: 0, critical: false });
  const hp = p.hp;
  use(b.homeSeat, "kick");
  assert.equal(p.hp, hp);
});
test("Pay Day accrues player-side level*5, saturates original coin storage, settles only a win and respects money multipliers", () => {
  const { b, p, use } = battleFixture({ moves });
  use(b.awaySeat, "pay_day");
  assert.equal(b.spoils.coins, 0);
  use(b.homeSeat, "pay_day");
  assert.equal(b.spoils.coins, p.level * 5);
  b.spoils.coins = 65530;
  use(b.homeSeat, "pay_day");
  assert.equal(b.spoils.coins, 65535);
  b.prizeMultiplier = 2;
  b.finish("win");
  assert.equal(b.spoils.reward, 131070);
  b.finish("win");
  assert.equal(
    b.events.filter((e) => e.kind === "money" && e.amount).length,
    1,
  );
  for (const result of ["loss", "escaped", "caught"]) {
    const f = battleFixture({ moves });
    f.use(f.b.homeSeat, "pay_day");
    f.b.finish(result);
    assert.equal(f.b.spoils.reward, 0);
  }
});
test("Application payout commits once independently of trainer/story rewards and preserves the configured currency cap", () => {
  const { b, use } = battleFixture({ moves });
  use(b.homeSeat, "pay_day");
  b.finish("win");
  const state = { money: 999990, party: [] };
  const values = { state, story: { resolve: () => [] } };
  const application = new BattleApplication(
    liveApplicationPorts((name) => values[name], BATTLE_PORTS),
  );
  application.encounterService = () => ({ afterBattle() {} });
  const plan = application.resultPlan(b);
  plan.commit();
  assert.equal(state.money, 999999);
  plan.commit();
  assert.equal(state.money, 999999);
});
test("Interception metadata rejects malformed flags at registration before they can break an action", () => {
  const registry = new MoveEffectRegistry();
  for (const flags of [
    "snatch_affected",
    ["unknown"],
    ["snatch_affected", "snatch_affected"],
  ])
    assert.throws(
      () => registry.validateMoves({ sample: { effect: "hit", flags } }),
      /flags/,
    );
  registry.validateMoves({
    sample: { effect: "hit", flags: ["snatch_affected"] },
  });
  registry.validateMoves({
    bitmask: { effect: "hit", flags: 8 },
    importedZero: { effect: "protect", flags: ["0"] },
    importedNamed: {
      effect: "attack_down",
      flags: ["FLAG_MAGIC_COAT_AFFECTED"],
    },
  });
});
test("Interception ownership, coin storage and per-hit mutations all roll back after a registered rule fault", () => {
  const { b, p, e, rng } = battleFixture({
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
  // Guards are attached before the checked action, and must survive its failed journal.
  b.states.attach("magic_coat", b.awaySeat);
  p.moves = [{ id: "growl", pp: 20 }];
  const seed = rng.snapshot();
  assert.throws(() => b.act({ kind: "move", index: 0 }), /fault/);
  assert(b.states.lookup("magic_coat", b.awaySeat));
  assert.equal(b.conditions.get(b.homeSeat).stages.atk, undefined);
  assert.equal(p.moves[0].pp, 20);
  assert.equal(rng.snapshot(), seed);
  p.moves = [{ id: "pay_day", pp: 20 }];
  assert.throws(() => b.act({ kind: "move", index: 0 }), /fault/);
  assert.equal(b.spoils.coins, 0);
  assert.equal(e.hp, e.stats.hp);
});
