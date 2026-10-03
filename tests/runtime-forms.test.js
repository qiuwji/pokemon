import { createBag } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Battle } from "../dist/engine/battle.js";
import { createMonster, Random, calculateStats } from "../dist/engine/model.js";
import {
  CreatureFormRegistry,
  CreatureForms,
} from "../dist/engine/creatures/forms.js";
import { GEN3_ABILITIES } from "../dist/engine/rules/gen3/abilities.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const forms = {
  boost: {
    name: "强化形态",
    species: "treecko",
    scope: "battle",
    baseStats: { atk: 150, spe: 140 },
    types: ["grass", "dragon"],
    ability: "thick_fat",
    oncePerController: true,
  },
  world: {
    name: "旅行形态",
    species: "treecko",
    scope: "world",
    baseStats: { spe: 100 },
  },
};
function fixture({ hooks = [] } = {}) {
  const { db } = createEmeraldPlugins(base, []);
  db.moves = {
    ...db.moves,
    transform: { ...db.moves.tackle, effect: "transform", power: 0 },
    mimic: { ...db.moves.tackle, effect: "mimic", power: 0 },
  };
  const rng = new Random(61),
    p = createMonster("treecko", 30, db, rng),
    r = createMonster("mudkip", 30, db, rng),
    e = createMonster("zigzagoon", 30, db, rng);
  p.moves = [
    { id: "transform", pp: 20 },
    { id: "mimic", pp: 20 },
  ];
  e.moves = [
    { id: "tackle", pp: 20 },
    { id: "growl", pp: 20 },
  ];
  const b = new Battle({
    party: [p, r],
    enemyParty: [e],
    db,
    rng,
    bag: createBag({}),
    trainer: true,
    formDefinitions: forms,
    traits: { abilities: GEN3_ABILITIES, heldItems: {}, hooks },
    rules: {
      accuracy: () => true,
      critical: () => false,
      grantExperience: () => [],
    },
  });
  return { b, p, r, e, db, rng };
}
test("Battle form activation changes derived stats/types/ability without modifying base identity, costs no turn and enforces controller limit", () => {
  const { b, p } = fixture(),
    original = structuredClone(p);
  b.act({ kind: "form", form: "boost" });
  assert.equal(b.turn, 0);
  assert.equal(b.decisions.required().length, 1);
  assert.deepEqual(p, original);
  assert.equal(b.forms.effective(p).stats.hp, p.stats.hp);
  assert(b.speed(p, b.homeSeat) > p.stats.spe);
  assert.deepEqual(b.traits.types(b.homeSeat), ["grass", "dragon"]);
  assert.equal(b.traits.ability(b.homeSeat), "thick_fat");
  assert.equal(b.snapshot().combatants[0].monster.form, "boost");
  b.forms.restore(p);
  assert.equal(
    b.forms.canActivate(p, "boost", b.roster.owner(b.homeSeat).id),
    false,
  );
  b.finish("escaped");
  assert.deepEqual(p, original);
});
test("Transform copies effective combat stats, types, ability, IV and 5 PP moves; base moves and species survive switching", () => {
  const { b, p, e } = fixture(),
    stats = { ...p.stats },
    iv = { ...p.iv };
  b.executeMove(b.homeSeat, 0, { kind: "seat", id: b.awaySeat });
  const effective = b.forms.effective(p);
  assert.equal(p.species, "treecko");
  assert.equal(effective.species, "zigzagoon");
  assert.equal(effective.stats.atk, e.stats.atk);
  assert.equal(effective.stats.hp, stats.hp);
  assert.deepEqual(effective.iv, e.iv);
  assert.deepEqual(p.iv, iv);
  assert.equal(b.movesFor(b.homeSeat)[0].pp, 5);
  assert.equal(p.moves[0].pp, 19);
  const hp = e.hp;
  b.executeMove(b.homeSeat, 0, { kind: "seat", id: b.awaySeat });
  assert(e.hp < hp);
  assert.equal(b.movesFor(b.homeSeat)[0].pp, 4);
  b.actions.switch(b.homeSeat, 1);
  assert.equal(b.forms.records[p.uid], undefined);
  assert.equal(p.moves[0].id, "transform");
  assert.equal(p.moves[0].pp, 19);
});
test("Mimic uses temporary move slots with independent PP and restores after battle", () => {
  const { b, p } = fixture();
  b.executeMove(b.awaySeat, 0, { kind: "seat", id: b.homeSeat });
  b.executeMove(b.homeSeat, 1, { kind: "seat", id: b.awaySeat });
  assert.equal(b.movesFor(b.homeSeat)[1].id, "tackle");
  assert.equal(b.movesFor(b.homeSeat)[1].pp, 5);
  assert.equal(p.moves[1].id, "mimic");
  assert.equal(p.moves[1].pp, 19);
  b.finish("escaped");
  assert.equal(b.forms.records[p.uid], undefined);
  assert.equal(p.moves[1].id, "mimic");
});
test("World forms persist IDs and derive new stats after level changes; invalid saved references fail and custody reconciliation removes obsolete forms", () => {
  const { p, db } = fixture(),
    registry = new CreatureFormRegistry(forms, db, GEN3_ABILITIES, {}),
    records = {},
    service = new CreatureForms({ registry, records, creatures: () => [p] });
  assert(service.activate(p, "world"));
  const saved = JSON.parse(JSON.stringify(records));
  new CreatureForms({ registry, records: saved, creatures: () => [p] });
  p.level++;
  p.stats = calculateStats(p, db.species[p.species]);
  assert(service.effective(p).stats.spe > p.stats.spe);
  assert.throws(
    () =>
      new CreatureForms({
        registry,
        records: { [p.uid]: { id: "boost" } },
        creatures: () => [p],
      }),
    /saved creature form/,
  );
  p.species = "grovyle";
  service.reconcile();
  assert.deepEqual(records, {});
});
test("Form mutation faults roll back records, activation limits and base creature through the battle checkpoint", () => {
  let failed = true;
  const { b, p } = fixture({
    hooks: [
      {
        id: "fault",
        phase: "entry",
        apply: (c) => {
          if (
            c.battle.forms.records[c.battle.roster.occupant(c.actorSeat).uid] &&
            failed
          )
            throw new Error("form fault");
        },
      },
    ],
  });
  assert.throws(() => b.act({ kind: "form", form: "boost" }), /form fault/);
  assert.deepEqual(b.forms.records, {});
  assert.equal(b.forms.used.size, 0);
  failed = false;
  b.act({ kind: "form", form: "boost" });
  assert.equal(b.forms.records[p.uid].id, "boost");
});
