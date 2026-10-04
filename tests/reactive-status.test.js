import { loadContentSync } from "../tools/content-io.mjs";
import { createBag } from "./helpers/inventory-fixture.js";
import { GEN3_ABILITIES } from "../dist/engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../dist/engine/rules/gen3/held-items.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Battle } from "../dist/engine/battle.js";
import { Random, createMonster } from "../dist/engine/model.js";
import { validStatusValues } from "../dist/engine/creature-contract.js";
import { EffectRegistry } from "../dist/engine/effects.js";
const base = loadContentSync();
function fixture({ format = "singles", hooks = [] } = {}) {
  const effects = {
    hit: "hit",
    special: "hit",
    counter: "counter",
    mirror: "mirror_coat",
    revenge: "revenge",
    focus: "focus_punch",
    guard: "endure",
    protect: "protect",
  };
  const db = {
    ...base,
    moves: {
      ...base.moves,
      ...Object.fromEntries(
        Object.entries(effects).map(([id, effect]) => [
          id,
          {
            name: id,
            effect,
            type: id === "special" ? "water" : "normal",
            power: 40,
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
  const rng = new Random(312),
    make = (species) => createMonster(species, 30, db, rng);
  const p = make("treecko"),
    r = make("mudkip"),
    e = make("zigzagoon"),
    er = make("poochyena");
  const powers = [];
  const b = new Battle({
    party: [p, r],
    enemyParty: [e, er],
    format,
    db,
    rng,
    trainer: true,
    bag: createBag({}),
    traits: { hooks, abilities: GEN3_ABILITIES, heldItems: GEN3_HELD_ITEMS },
    rules: {
      accuracy: () => true,
      critical: () => false,
      damage: (a, d, move, db, rng, options) => {
        powers.push(options.power);
        return { amount: 6, type: 1, critical: false };
      },
      grantExperience: () => [],
    },
  });
  const use = (seat, id, target) => {
    b.roster.occupant(seat).moves = [{ id, pp: 20 }];
    b.executeMove(seat, 0, { kind: "seat", id: target });
  };
  return { b, p, r, e, er, use, powers };
}
test("Toxic persists as a major condition, increases with Gen III integer rounding, resets on switch and is cured by poison-family items", () => {
  const { b, p } = fixture();
  assert(b.applyStatus(b.homeSeat, "toxic", { sourceSeat: b.awaySeat }));
  assert(validStatusValues(p));
  const hp = p.hp,
    unit = Math.max(1, Math.floor(p.stats.hp / 16));
  b.statuses.residual(b.homeSeat);
  b.statuses.residual(b.homeSeat);
  assert.equal(p.hp, hp - unit * 3);
  b.actions.switch(b.homeSeat, 1);
  b.actions.switch(b.homeSeat, 0);
  assert.equal(p.status, "toxic");
  b.statuses.residual(b.homeSeat);
  assert.equal(p.hp, hp - unit * 4);
  b.moveEffects.operations.run([{ op: "cureStatus", status: "poison" }], {
    battle: b,
    target: p,
  });
  assert.equal(p.status, null);
  assert(validStatusValues(p));
  assert(!b.states.lookup("toxic_counter", b.homeSeat));
  const outside = structuredClone(p);
  outside.status = "toxic";
  assert.equal(
    new EffectRegistry().run([{ op: "cureStatus", status: "poison" }], {
      target: outside,
    })[0],
    true,
  );
});
test("Toxic prevention, Immunity entry cure and Synchronize use the poison family; poisonous berries also cure Toxic", () => {
  const { b, p, e } = fixture();
  p.ability = "immunity";
  assert(!b.applyStatus(b.homeSeat, "toxic", { sourceSeat: b.awaySeat }));
  p.status = "toxic";
  b.traits.enter(b.homeSeat);
  assert.equal(p.status, null);
  p.ability = "synchronize";
  assert(b.applyStatus(b.homeSeat, "toxic", { sourceSeat: b.awaySeat }));
  assert.equal(e.status, "poison");
  b.statuses.clear(p);
  p.heldItem = "pecha_berry";
  assert(b.applyStatus(b.homeSeat, "toxic", { sourceSeat: b.awaySeat }));
  assert.equal(p.status, null);
  assert.equal(p.heldItem, null);
});
test("Counter and Mirror Coat target the factual attacker in doubles and distinguish physical/special impacts", () => {
  const { b, p, e, er, use } = fixture({ format: "doubles" });
  const foes = b.roster.opposing(b.homeSeat),
    actual = foes[1].id;
  use(actual, "hit", b.homeSeat);
  const hp = er.hp,
    otherHP = e.hp;
  use(b.homeSeat, "counter", foes[0].id);
  assert.equal(er.hp, hp - 12);
  assert.equal(e.hp, otherHP);
  const record = b.recorder.events.findLast((event) => event.kind === "move");
  assert.deepEqual(
    record.move.targetResults.map((r) => r.seatId),
    [actual],
  );
  use(actual, "special", b.homeSeat);
  const next = er.hp;
  use(b.homeSeat, "mirror", foes[0].id);
  assert.equal(er.hp, next - 12);
  b.turn++;
  use(b.homeSeat, "counter", actual);
  assert.equal(er.hp, next - 12);
  assert(p.hp > 0);
});
test("Substitute damage does not enable retaliation; Revenge doubles only for its attacker and Focus Punch loses focus after real damage", () => {
  const { b, p, e, use, powers } = fixture();
  b.states.attach("substitute", b.homeSeat, { data: { hp: 20 } });
  use(b.awaySeat, "hit", b.homeSeat);
  assert.equal(b.actionLifecycle.damageFor(b.homeSeat), null);
  const hp = e.hp;
  use(b.homeSeat, "counter", b.awaySeat);
  assert.equal(e.hp, hp);
  b.states.remove(b.states.lookup("substitute", b.homeSeat).key);
  use(b.awaySeat, "hit", b.homeSeat);
  use(b.homeSeat, "revenge", b.awaySeat);
  assert.equal(powers.at(-1), 80);
  const after = e.hp;
  use(b.homeSeat, "focus", b.awaySeat);
  assert.equal(e.hp, after);
  b.turn++;
  use(b.homeSeat, "focus", b.awaySeat);
  assert.equal(e.hp, after - 6);
  assert(p.hp > 0);
});
test("Endure keeps 1 HP for direct damage only and expires; repeated Protect can fail; impact ledgers roll back with a failed rule", () => {
  const { b, p, use } = fixture();
  p.hp = 3;
  use(b.homeSeat, "guard", b.awaySeat);
  use(b.awaySeat, "hit", b.homeSeat);
  assert.equal(p.hp, 1);
  b.states.tick();
  assert(!b.states.lookup("endure", b.homeSeat));
  p.status = "poison";
  b.statuses.residual(b.homeSeat);
  assert.equal(p.hp, 0);
  const second = fixture();
  second.use(second.b.homeSeat, "protect", second.b.awaySeat);
  second.b.conditions.get(second.b.homeSeat).protected = false;
  second.b.rng.int = () => 65535;
  second.use(second.b.homeSeat, "protect", second.b.awaySeat);
  assert.equal(second.b.conditions.get(second.b.homeSeat).protected, false);
  const third = fixture({
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
  third.p.moves = [{ id: "hit", pp: 20 }];
  const hp = third.e.hp;
  assert.throws(() => third.b.act({ kind: "move", index: 0 }), /fault/);
  assert.equal(third.b.actionLifecycle.received.size, 0);
  assert.equal(third.e.hp, hp);
});
