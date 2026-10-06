import { loadContentSync } from "../tools/content-io.mjs";
import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
} from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Battle } from "../src/engine/battle.js";
import { createMonster, Random, damage } from "../src/engine/model.js";
import { GEN3_ABILITIES } from "../src/engine/rules/gen3/abilities.js";
import {
  GEN3_HELD_ITEMS,
  HOLD_EFFECTS,
} from "../src/engine/rules/gen3/held-items.js";
import { RulePipeline } from "../src/engine/rule-pipeline.js";
import { EffectRegistry } from "../src/engine/effects.js";
import { EquipmentService } from "../src/engine/equipment.js";
const db = loadContentSync();
function setup({
  ability = "overgrow",
  enemyAbility = "pickup",
  heldItem = null,
  enemyItem = null,
  moves = ["tackle"],
  enemyMoves = ["growl"],
  enemyReserve = false,
  rules = {},
} = {}) {
  const rng = new Random(44),
    p = createMonster("treecko", 15, db, rng),
    e = createMonster("zigzagoon", 15, db, rng),
    reserve = createMonster("mudkip", 15, db, rng);
  Object.assign(p, {
    ability,
    heldItem,
    moves: moves.map((id) => ({ id, pp: db.moves[id].pp })),
  });
  Object.assign(e, {
    ability: enemyAbility,
    heldItem: enemyItem,
    moves: enemyMoves.map((id) => ({ id, pp: db.moves[id].pp })),
  });
  p.stats.spe = 100;
  e.stats.spe = 10;
  const b = new Battle({
    party: [p, reserve],
    enemyParty: enemyReserve
      ? [e, createMonster("poochyena", 15, db, rng)]
      : [e],
    db,
    rng,
    bag: createBag({}),
    trainer: true,
    rules: {
      accuracy: () => true,
      critical: () => false,
      grantExperience: () => [],
      ...rules,
    },
  });
  return { b, p, e, reserve, rng };
}
test("Rule pipeline validates IDs, phases, deterministic ordering, removal and non-finite modifiers", () => {
  const p = new RulePipeline(new EffectRegistry()),
    seen = [];
  const remove = p.register({
    id: "first",
    phase: "contact",
    priority: 0,
    apply: () => seen.push(1),
  });
  p.register({
    id: "second",
    phase: "contact",
    priority: -1,
    apply: () => seen.push(2),
  });
  p.run("contact", {});
  assert.deepEqual(seen, [2, 1]);
  remove();
  p.run("contact", {});
  assert.deepEqual(seen, [2, 1, 2]);
  assert.throws(
    () => p.register({ id: "second", phase: "contact", apply: () => {} }),
    /Invalid/,
  );
  assert.throws(
    () => p.register({ id: "bad", phase: "contcat", apply: () => {} }),
    /Invalid/,
  );
  p.register({ id: "nan", phase: "power", modify: () => NaN });
  assert.throws(() => p.calculate("power", 1, {}), /Non-finite/);
});
test("Entry intimidate, stage immunity and natural cure use the same seat lifecycle", () => {
  const { b, p, reserve } = setup({
    ability: "natural_cure",
    enemyAbility: "intimidate",
  });
  assert.equal(b.conditions.get("home:0").stages.atk, -1);
  p.status = "poison";
  b.conditions.get("home:0").stages.atk = -4;
  b.act({ kind: "switch", index: 1 });
  assert.equal(p.status, null);
  assert.equal(b.player.uid, reserve.uid);
  assert.equal(b.conditions.get("home:0").stages.atk || 0, -1);
  const clear = setup({ ability: "clear_body", enemyAbility: "intimidate" });
  assert.equal(clear.b.conditions.get("home:0").stages.atk || 0, 0);
});
test("Absorption heals once without damage, critical immunity overrides critical policy and pressure charges PP", () => {
  const absorb = setup({ moves: ["water_gun"], enemyAbility: "water_absorb" });
  absorb.e.hp = 1;
  absorb.b.executeMove("home:0", 0);
  assert.equal(absorb.e.hp, 1 + Math.floor(absorb.e.stats.hp / 4));
  assert.equal(absorb.p.moves[0].pp, 24);
  const armor = setup({
    enemyAbility: "battle_armor",
    rules: {
      critical: () => true,
      damage: (a, d, m, db, rng, c) => {
        assert.equal(c.critical, false);
        return { amount: 1, type: 1 };
      },
    },
  });
  armor.b.executeMove("home:0", 0);
  const pressure = setup({ enemyAbility: "pressure" });
  pressure.b.executeMove("home:0", 0);
  assert.equal(pressure.p.moves[0].pp, 33);
});
test("Contact feedback happens per successful hit; immunity produces no contact effects", () => {
  const { b, p, e } = setup({
    enemyAbility: "rough_skin",
    moves: ["double_kick"],
    rules: { damage: () => ({ amount: 1, type: 1 }) },
  });
  const hp = p.hp;
  b.executeMove("home:0", 0);
  assert.equal(e.hp, e.stats.hp - 2);
  assert.equal(p.hp, hp - 2 * Math.max(1, Math.floor(p.stats.hp / 16)));
  const immune = setup({ enemyAbility: "levitate", moves: ["mud_slap"] });
  const before = immune.e.hp;
  immune.b.executeMove("home:0", 0);
  assert.equal(immune.e.hp, before);
});
test("Status immunity, synchronize and immediately consumed cure berries cannot recurse", () => {
  const immune = setup({ enemyAbility: "limber" });
  assert.equal(
    immune.b.applyStatus("away:0", "paralysis", { sourceSeat: "home:0" }),
    false,
  );
  const reflect = setup({ enemyAbility: "synchronize" });
  reflect.b.applyStatus("away:0", "burn", { sourceSeat: "home:0" });
  assert.equal(reflect.p.status, "burn");
  assert.equal(reflect.e.status, "burn");
  assert.equal(reflect.b.events.filter((e) => e.kind === "status").length, 2);
  const berry = setup({ enemyAbility: "synchronize", heldItem: "rawst_berry" });
  berry.b.applyStatus("away:0", "burn", { sourceSeat: "home:0" });
  assert.equal(berry.p.status, null);
  assert.equal(berry.p.heldItem, null);
  assert.equal(berry.e.status, "burn");
});
test("Multi-hit HP berries consume exactly once, leftovers stay held and fainted holders never heal", () => {
  const { b, e } = setup({
    enemyItem: "oran_berry",
    moves: ["double_kick"],
    rules: { damage: () => ({ amount: 1, type: 1 }) },
  });
  e.hp = Math.floor(e.stats.hp / 2);
  const hp = e.hp;
  b.executeMove("home:0", 0);
  assert.equal(e.hp, hp + 8);
  assert.equal(e.heldItem, null);
  assert.equal(b.events.filter((x) => x.kind === "item").length, 1);
  const leftovers = setup({ heldItem: "leftovers" });
  leftovers.p.hp = 1;
  leftovers.b.rounds.residuals();
  assert.equal(
    leftovers.p.hp,
    1 + Math.max(1, Math.floor(leftovers.p.stats.hp / 16)),
  );
  assert.equal(leftovers.p.heldItem, "leftovers");
  leftovers.p.hp = 0;
  leftovers.b.rounds.residuals();
  assert.equal(leftovers.p.hp, 0);
});
test("Choice band locks the selected move, replacement resets it, shell bell heals once per action", () => {
  const { b, p } = setup({
    heldItem: "choice_band",
    moves: ["tackle", "pound"],
  });
  b.act({ kind: "move", index: 0 });
  const seed = b.rng.seed,
    pp = p.moves[1].pp;
  assert.equal(b.act({ kind: "move", index: 1 })[0].kind, "invalid");
  assert.equal(b.rng.seed, seed);
  assert.equal(p.moves[1].pp, pp);
  b.act({ kind: "switch", index: 1 });
  assert.equal(b.conditions.get("home:0").choiceMove, undefined);
  const shell = setup({
    heldItem: "shell_bell",
    moves: ["double_kick"],
    rules: { damage: () => ({ amount: 8, type: 1 }) },
  });
  shell.p.hp = 1;
  shell.b.executeMove("home:0", 0);
  assert.equal(shell.p.hp, 3);
});
test("Rock head blocks ordinary recoil, liquid ooze reverses drains and both use dedicated check phases", () => {
  const rock = setup({
    ability: "rock_head",
    moves: ["take_down"],
    rules: { damage: () => ({ amount: 6, type: 1 }) },
  });
  const hp = rock.p.hp;
  rock.b.executeMove("home:0", 0);
  assert.equal(rock.p.hp, hp);
  const ooze = setup({
    enemyAbility: "liquid_ooze",
    moves: ["absorb"],
    rules: { damage: () => ({ amount: 6, type: 1 }) },
  });
  const prior = ooze.p.hp;
  ooze.b.executeMove("home:0", 0);
  assert.equal(ooze.p.hp, prior - 3);
});
test("Numeric ability and held item rules compose once, and model direct callers use the same ability definitions", () => {
  const { b, p, e } = setup({ ability: "huge_power", heldItem: "choice_band" }),
    c = {
      actorSeat: "home:0",
      targetSeat: "away:0",
      stat: "atk",
      move: db.moves.tackle,
    };
  assert.equal(b.traits.calculate("attack", 10, c), 30);
  const fixed = { int: () => 15 };
  const huge = damage(p, e, db.moves.tackle, db, fixed).amount;
  p.ability = "pickup";
  assert(huge > damage(p, e, db.moves.tackle, db, fixed).amount);
});
test("Weather entry, suppression and residual exclusions respect living seats", () => {
  const { b, p, e } = setup({ ability: "rain_dish", enemyAbility: "drizzle" });
  assert.equal(b.traits.weather(), "rain");
  p.hp = 1;
  b.rounds.residuals();
  assert(p.hp > 1);
  e.ability = "cloud_nine";
  assert.equal(b.traits.weather(), null);
  e.hp = 0;
  assert.equal(b.traits.weather(), "rain");
});
test("Equipment swaps atomically by UID, supports box members and rejects missing inventory", () => {
  const { p, reserve } = setup(),
    state = {
      party: [p],
      box: [reserve],
      bag: createBag({ oran_berry: 1, leftovers: 1 }),
    },
    service = new EquipmentService(GEN3_HELD_ITEMS, fixtureInventory());
  assert(service.equip(state, p.uid, "oran_berry").ok);
  assert(service.equip(state, p.uid, "leftovers").ok);
  assert.equal(inventoryQuantity(state.bag, "oran_berry"), 1);
  const before = structuredClone(state);
  assert.equal(service.equip(state, reserve.uid, "leftovers").ok, false);
  assert.deepEqual(state, before);
  assert(service.equip(state, p.uid, null).ok);
  assert(service.equip(state, reserve.uid, "leftovers").ok);
});
test("Canonical metadata covers 76 used Gen III abilities and every 66 held effect type explicitly", () => {
  assert.equal(Object.keys(GEN3_ABILITIES).length, 76);
  assert.equal(Object.keys(HOLD_EFFECTS).length, 66);
  assert.equal(
    Object.values(GEN3_HELD_ITEMS).filter((d) => d.holdEffect !== "none")
      .length,
    70,
  );
  for (const d of [
    ...Object.values(GEN3_ABILITIES),
    ...Object.values(HOLD_EFFECTS),
  ]) {
    assert(Array.isArray(d.hooks));
    assert(["implemented", "pending", "pending-domain"].includes(d.coverage));
  }
});

test("A failing extension after damage restores creature identities, PP, HP, inventory, turn and seeded RNG", () => {
  const { b, p, e, rng } = setup();
  const before = {
    p: structuredClone(p),
    e: structuredClone(e),
    seed: rng.seed,
  };
  b.traits.pipeline.register({
    id: "test:fault",
    phase: "after-hit",
    apply: () => {
      throw new Error("rule failure");
    },
  });
  assert.throws(() => b.act({ kind: "move", index: 0 }), /rule failure/);
  assert.equal(b.player, p);
  assert.equal(b.enemy, e);
  assert.deepEqual(p, before.p);
  assert.deepEqual(e, before.e);
  assert.equal(rng.seed, before.seed);
  assert.equal(b.turn, 0);
  assert.equal(b.decisions.pending.size, 0);
});
