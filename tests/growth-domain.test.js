import { loadContentSync } from "../tools/content-io.mjs";
import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
  setQuantity,
} from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Random, createMonster } from "../dist/engine/model.js";
import { GEN3_ABILITIES as abilities } from "../dist/engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS as heldItems } from "../dist/engine/rules/gen3/held-items.js";
import { FriendshipService } from "../dist/engine/growth/friendship.js";
import { HatchService } from "../dist/engine/growth/hatching.js";
import { EvolutionService } from "../dist/engine/growth/evolution.js";
import { BreedingService } from "../dist/engine/growth/breeding.js";
import { DaycareService } from "../dist/engine/growth/daycare.js";
const original = loadContentSync();
const rng = new Random(671);
const mon = (id = "treecko", level = 20) =>
  createMonster(id, level, original, rng);
const services = { abilities, heldItems };
test("Soothe Bell floors positive friendship before location/Luxury bonuses and never magnifies losses", () => {
  const m = mon();
  m.friendship = 99;
  m.heldItem = "soothe_bell";
  const f = new FriendshipService(services);
  assert.equal(
    f.change(m, "level", { sameLocation: true, luxuryBall: true }).delta,
    9,
  );
  assert.equal(m.friendship, 108);
  assert.equal(f.change(m, "faint").delta, -1);
  m.friendship = 255;
  assert.equal(f.change(m, "walk").delta, 0);
  m.egg = {};
  assert.equal(f.change(m, "level").delta, 0);
  assert.throws(() => f.change(m, "unknown"), /Unknown/);
});
for (const ability of ["magma_armor", "flame_body"])
  test(`${ability} halves egg cycles on the saved clock without stacking`, () => {
    const m = mon(),
      other = mon("torchic"),
      egg = mon();
    m.ability = other.ability = ability;
    egg.egg = { cycles: 2, ready: false, parents: [m.uid, other.uid] };
    const h = new HatchService(services),
      clock = { hatchTick: 0 };
    h.advance(clock, [m, other, egg], 254);
    assert.equal(egg.egg.cycles, 2);
    h.advance(clock, [m, other, egg]);
    assert.equal(egg.egg.cycles, 0);
    assert.equal(egg.egg.ready, false);
    const saved = structuredClone(clock);
    assert.deepEqual(h.advance(saved, [m, other, egg], 256), [egg.uid]);
    assert(egg.egg.ready);
    const uid = egg.uid;
    assert.equal(h.hatch(egg).uid, uid);
    assert.equal(egg.friendship, 120);
    assert.equal(h.hatch(egg), null);
  });
test("Malformed egg clocks fail before mutating a clock or a different egg", () => {
  const a = mon(),
    b = mon();
  a.egg = { cycles: 2, parents: [] };
  b.egg = { cycles: -1, parents: [] };
  const clock = { hatchTick: 254 },
    before = structuredClone(clock);
  assert.throws(
    () => new HatchService(services).advance(clock, [a, b]),
    /Invalid egg/,
  );
  assert.deepEqual(clock, before);
  assert.equal(a.egg.cycles, 2);
});
test("Everstone prevents level, item and trade evolution; cancellation is idempotent and keeps UID/HP", () => {
  const m = mon(),
    party = [m],
    bag = createBag({}),
    service = new EvolutionService({
      inventory: fixtureInventory(),
      db: original,
      ...services,
    });
  m.hp = 0;
  m.heldItem = "everstone";
  assert.equal(service.prepare(m, { party, bag }), null);
  m.heldItem = null;
  const plan = service.prepare(m, { party, bag });
  assert(plan);
  assert.equal(service.commit(plan, { cancel: true }).cancelled, true);
  assert.equal(service.commit(plan).ok, false);
  assert.equal(service.prepare(m, { party, bag }), null);
  m.level++;
  const next = service.prepare(m, { party, bag });
  assert.equal(service.commit(next).ok, true);
  assert.equal(m.species, "grovyle");
  assert.equal(m.uid, plan.uid);
  assert.equal(m.hp, 0);
});
for (const item of [
  "dragon_scale",
  "up_grade",
  "metal_coat",
  "kings_rock",
  "deep_sea_tooth",
  "deep_sea_scale",
])
  test(`${item} participates in a trade condition and consumes only after a valid evolution commit`, () => {
    const m = mon();
    m.heldItem = item;
    const db = {
      ...original,
      evolutions: {
        treecko: [
          {
            id: "trade",
            trigger: "trade",
            to: "grovyle",
            consumeHeld: true,
            conditions: [{ type: "heldItem", id: item }],
          },
        ],
      },
    };
    const e = new EvolutionService({
        inventory: fixtureInventory(),
        db,
        ...services,
      }),
      plan = e.prepare(m, { trigger: "trade" });
    assert(plan);
    assert.equal(m.heldItem, item);
    assert.equal(e.commit(plan, { cancel: true }).ok, true);
    assert.equal(m.heldItem, item);
    const next = e.prepare(m, { trigger: "trade" });
    assert.equal(e.commit(next).ok, true);
    assert.equal(m.heldItem, null);
    assert.equal(m.species, "grovyle");
  });
test("Level, friendship/time, stat, personality and beauty conditions compose through a reusable registry", () => {
  const m = mon();
  m.friendship = 220;
  m.beauty = 171;
  m.personality = 6 << 16;
  m.stats.atk = m.stats.def;
  const rules = [
    {
      id: "compound",
      trigger: "level",
      to: "grovyle",
      conditions: [
        { type: "level", value: 20 },
        { type: "friendship", value: 220 },
        { type: "time", period: "night" },
        { type: "statCompare", left: "atk", right: "def", relation: "eq" },
        { type: "personality", min: 5, max: 9 },
        { type: "beauty", value: 170 },
      ],
    },
  ];
  const e = new EvolutionService({
    inventory: fixtureInventory(),
    db: { ...original, evolutions: { treecko: rules } },
    ...services,
  });
  assert.equal(e.prepare(m, { hour: 12 }), null);
  m.friendship = 219;
  assert.equal(e.prepare(m, { hour: 2 }), null);
  m.friendship = 220;
  const plan = e.prepare(m, { hour: 2 });
  assert(plan);
  assert.equal(e.commit(plan).ok, true);
});
test("Item evolution uses a stale-safe one-use plan and does not mutate inventory during query or cancellation", () => {
  const m = mon(),
    bag = createBag({ leaf_stone: 2 }),
    db = {
      ...original,
      evolutions: {
        treecko: [
          {
            id: "stone",
            trigger: "item",
            to: "grovyle",
            conditions: [{ type: "item", id: "leaf_stone" }],
          },
        ],
      },
    };
  const e = new EvolutionService({
    inventory: fixtureInventory(),
    db,
    ...services,
  });
  const p = e.prepare(m, { trigger: "item", item: "leaf_stone", bag });
  assert(p);
  assert.equal(inventoryQuantity(bag, "leaf_stone"), 2);
  setQuantity(bag, "leaf_stone", 1);
  assert.equal(e.commit(p).ok, false);
  assert.equal(m.species, "treecko");
  const q = e.prepare(m, { trigger: "item", item: "leaf_stone", bag });
  assert.equal(e.commit(q).ok, true);
  assert.equal(inventoryQuantity(bag, "leaf_stone"), 0);
  assert.equal(e.commit(q).ok, false);
});
test("Breeding validates compatibility and all offspring move references before consuming RNG", () => {
  const a = mon(),
    b = mon();
  a.gender = "♀";
  b.gender = "♂";
  a.originalTrainer = "one";
  b.originalTrainer = "two";
  const random = new Random(12),
    service = new BreedingService({ db: original, rng: random });
  assert.equal(service.compatibility(a, b), 70);
  b.originalTrainer = "one";
  assert.equal(service.compatibility(a, b), 50);
  b.species = "mudkip";
  assert.equal(service.compatibility(a, b), 20);
  b.gender = "♀";
  const seed = random.seed;
  assert.throws(() => service.create(a, b), /Incompatible/);
  assert.equal(random.seed, seed);
  b.gender = "♂";
  const db = structuredClone(original);
  db.species.treecko.eggMoves = ["unknown"];
  const invalid = new BreedingService({ db, rng: random });
  assert.throws(() => invalid.create(a, b), /offspring/);
  assert.equal(random.seed, seed);
});
test("Egg creation inherits father egg/TM moves, shared level moves and female Everstone nature; HP and DEF quirks are explicit", () => {
  const db = structuredClone(original);
  db.species.treecko.eggMoves = ["crunch"];
  db.species.treecko.machineMoves = ["earthquake"];
  const a = mon(),
    b = mon();
  a.gender = "♀";
  b.gender = "♂";
  a.nature = 3;
  a.heldItem = "everstone";
  a.moves = [{ id: "absorb", pp: 20 }];
  b.moves = ["crunch", "earthquake", "absorb"].map((id) => ({
    id,
    pp: db.moves[id].pp,
  }));
  Object.assign(a.iv, { hp: 1, atk: 2, def: 3, spe: 4, spa: 5, spd: 6 });
  Object.assign(b.iv, { hp: 21, atk: 22, def: 23, spe: 24, spa: 25, spd: 26 });
  const random = new Random(11);
  random.int = () => 0;
  random.next = () => 0;
  const egg = new BreedingService({ db, rng: random }).create(a, b);
  assert.equal(egg.level, 5);
  assert.equal(egg.nature, 3);
  assert.equal(egg.iv.hp, 1);
  assert.equal(egg.iv.atk, 2);
  assert.deepEqual(
    egg.moves.map((m) => m.id),
    ["leer", "crunch", "earthquake", "absorb"],
  );
  assert.deepEqual(egg.egg.parents, [a.uid, b.uid]);
  assert.equal(egg.heldItem, null);
  assert.equal(a.heldItem, "everstone");
});
test("Ditto compatibility, incense offspring, paired variants and a held-item special move use species definitions", () => {
  const db = structuredClone(original);
  db.species.ditto = { ...db.species.zigzagoon, eggGroups: ["ditto"] };
  db.species.treecko.offspring = {
    incense: { item: "sea_incense", without: "torchic" },
    specialMove: { item: "light_ball", move: "crunch" },
  };
  const a = mon(),
    b = mon("zigzagoon");
  a.gender = "♂";
  b.gender = "—";
  b.species = "ditto";
  const random = new Random(17),
    breeding = new BreedingService({ db, rng: random });
  assert.equal(breeding.compatibility(a, b), 20);
  assert.equal(breeding.compatibility(b, { ...b, uid: "second-ditto" }), 0);
  assert.equal(breeding.create(a, b).species, "torchic");
  b.heldItem = "sea_incense";
  a.heldItem = "light_ball";
  const egg = breeding.create(a, b);
  assert.equal(egg.species, "treecko");
  assert(egg.moves.some((m) => m.id === "crunch"));
  db.species.treecko.offspring = { variants: ["torchic"] };
  random.int = () => 0;
  assert.equal(breeding.create(a, b).species, "treecko");
});
test("Daycare keeps one pending egg, never duplicates collection, preserves living party and charges on withdrawal", () => {
  const a = mon("treecko", 5),
    b = mon("treecko", 5),
    guard = mon("mudkip", 10);
  a.gender = "♀";
  b.gender = "♂";
  const party = [a, b, guard],
    state = { slots: [], egg: null, steps: 0 },
    random = new Random(1);
  random.int = () => 0;
  const service = new DaycareService({
    state,
    db: original,
    breeding: new BreedingService({ db: original, rng: random }),
  });
  assert.equal(service.deposit(party, a.uid).ok, true);
  assert.equal(service.deposit(party, b.uid).ok, true);
  assert.equal(service.deposit(party, guard.uid).ok, false);
  service.advance(255);
  assert(state.egg);
  const eggUID = state.egg.uid;
  service.advance(256);
  assert.equal(state.egg.uid, eggUID);
  assert.equal(service.collect(party).ok, true);
  assert.equal(service.collect(party).ok, false);
  assert.equal(party.filter((m) => m.uid === eggUID).length, 1);
  const wallet = { money: 0 };
  assert.equal(service.withdraw(party, a.uid, wallet).ok, false);
  wallet.money = 10000;
  assert.equal(service.withdraw(party, a.uid, wallet).ok, true);
  assert(a.level > 5);
  assert.equal(a.hp, a.stats.hp);
  assert.equal(a.species, "treecko");
});
