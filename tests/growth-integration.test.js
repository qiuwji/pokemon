import { loadContentSync } from "../tools/content-io.mjs";
import { emptyEncounterTickets } from "../src/engine/encounter-tickets.js";
import { emptyFieldEffects } from "../src/engine/field-effects.js";
import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
  setQuantity,
} from "./helpers/inventory-fixture.js";
import { emptyWeather } from "../src/engine/weather.js";
import { emptyFacilities } from "../src/engine/facilities.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Random, createMonster } from "../src/engine/model.js";
import { GEN3_ABILITIES as abilities } from "../src/engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS as heldItems } from "../src/engine/rules/gen3/held-items.js";
import { GrowthSession } from "../src/engine/growth/session.js";
import { EvolutionService } from "../src/engine/growth/evolution.js";
import { BreedingService } from "../src/engine/growth/breeding.js";
import { DaycareService } from "../src/engine/growth/daycare.js";
import { TradeService } from "../src/engine/growth/trading.js";
import { applyNutrition } from "../src/engine/growth/nutrition.js";
import { GrowthDirector } from "../src/presentation/growth-director.js";
import { Timeline } from "../src/engine/timeline.js";
import { ItemService, createItemService } from "../src/engine/items.js";
import { EffectRegistry } from "../src/engine/effects.js";
import { PartyStorageService } from "../src/engine/party-storage.js";
import { BattleRoster, duelRoster } from "../src/engine/battle/roster.js";
import { learnPendingMove } from "../src/engine/party.js";
import { validateSave } from "../src/packs/emerald/save-contract.js";
import { ITEMS } from "../src/packs/emerald/items.js";
const db = loadContentSync();
const rng = new Random(3947),
  mon = (id = "treecko", level = 5) => createMonster(id, level, db, rng);
const evolution = (data = db) =>
  new EvolutionService({
    inventory: fixtureInventory(),
    db: data,
    abilities,
    heldItems,
  });
function state(party) {
  return {
    party,
    box: [],
    bag: createBag({}),
    flags: { rescued: true },
    money: 3000,
    seen: [],
    caught: [],
    playerGender: "male",
    playerName: "训练家",
    position: { map: "LittlerootTown", x: 10, y: 10, dir: "down" },
    story: { completed: [], rewards: [] },
    friendshipSteps: 0,
    growth: { hatchTick: 0 },
    daycare: { slots: [], egg: null, steps: 0 },
    tradePartner: [],
  };
}

test("Imported evolution content includes all branching methods in the slice and validates references", () => {
  const service = evolution();
  assert.equal(service.definitions.eevee.length, 5);
  assert.equal(service.definitions.wurmple.length, 2);
  assert.equal(service.definitions.tyrogue.length, 3);
  assert.equal(service.definitions.clamperl.length, 2);
  assert.equal(service.definitions.nincada[0].extra, "shedinja");
});

test("Emerald Nincada creates a genderless 1-HP Shedinja with a free party slot, without requiring or consuming a ball", () => {
  const m = mon("nincada", 20),
    party = [m],
    bag = createBag({ pokeball: 0 }),
    service = evolution();
  const result = service.commit(service.prepare(m, { party, bag }));
  assert(result.ok);
  assert.equal(m.species, "ninjask");
  assert.equal(party.length, 2);
  const extra = party[1];
  assert.equal(extra.species, "shedinja");
  assert.equal(extra.gender, "—");
  assert.equal(extra.stats.hp, 1);
  assert.equal(extra.hp, 1);
  assert.equal(inventoryQuantity(bag, "pokeball"), 0);
  assert.notEqual(extra.uid, m.uid);
  assert.equal(extra.heldItem, null);
  const fullMon = mon("nincada", 20),
    full = [fullMon, ...Array.from({ length: 5 }, () => mon())];
  assert(service.commit(service.prepare(fullMon, { party: full, bag })).ok);
  assert.equal(full.length, 6);
});

test("Evolution companion inherits post-evolution move choices without a species-specific branch", () => {
  const m = mon("nincada", 20),
    party = [m];
  m.moves = ["scratch", "harden", "tackle", "sand_attack"].map((id) => ({
    id,
    pp: db.moves[id].pp,
  }));
  const service = evolution(),
    result = service.commit(service.prepare(m, { party, bag: createBag({}) }));
  assert(result.ok);
  assert(m.pendingMoves.length);
  assert.deepEqual(m.growthCompanions, [party[1].uid]);
  while (m.pendingMoves.length)
    assert(learnPendingMove(m, 0, db, { companions: party }));
  assert.deepEqual(party[1].moves, m.moves);
  assert.equal(m.growthCompanions, undefined);
});

test("Personality, stat comparison, time, beauty and item conditions select actual original species", () => {
  const service = evolution();
  const worm = mon("wurmple", 7);
  worm.personality = 3 << 16;
  assert.equal(service.prepare(worm).to, "silcoon");
  worm.personality = 8 << 16;
  assert.equal(service.prepare(worm).to, "cascoon");
  const baby = mon("tyrogue", 20);
  baby.stats.atk = 20;
  baby.stats.def = 10;
  assert.equal(service.prepare(baby).to, "hitmonlee");
  baby.stats.def = 30;
  assert.equal(service.prepare(baby).to, "hitmonchan");
  baby.stats.def = 20;
  assert.equal(service.prepare(baby).to, "hitmontop");
  const eevee = mon("eevee", 10);
  eevee.friendship = 220;
  assert.equal(service.prepare(eevee, { hour: 13 }).to, "espeon");
  assert.equal(service.prepare(eevee, { hour: 3 }).to, "umbreon");
  assert.equal(
    service.prepare(eevee, {
      trigger: "item",
      item: "water_stone",
      bag: createBag({ water_stone: 1 }),
    }).to,
    "vaporeon",
  );
  const fish = mon("feebas", 20);
  fish.beauty = 169;
  assert.equal(service.prepare(fish), null);
  fish.beauty = 170;
  assert.equal(service.prepare(fish).to, "milotic");
});

test("Daycare's second deposit owns the production clock and deposited moves remain unchanged until withdrawal", () => {
  const a = mon("treecko"),
    b = mon("treecko"),
    guard = mon("mudkip");
  a.gender = "♀";
  b.gender = "♂";
  const s = state([a, b, guard]),
    random = new Random(55);
  random.int = () => 0;
  const service = new DaycareService({
    state: s.daycare,
    db,
    breeding: new BreedingService({ db, rng: random }),
  });
  service.deposit(s.party, a.uid);
  service.advance(254);
  const before = structuredClone(a);
  service.deposit(s.party, b.uid);
  service.advance(1);
  assert.equal(s.daycare.egg, null);
  assert.deepEqual(a, before);
  service.advance(254);
  assert(s.daycare.egg);
  assert.equal(b.level, 5);
  assert.deepEqual(
    b.moves,
    db.species.treecko.learnset
      .filter((v) => v.level <= 5)
      .slice(-4)
      .map((v) => ({ id: v.move, pp: db.moves[v.move].pp })),
  );
  assert(service.preview(s.daycare.slots[0]).mon.level > 5);
  assert(service.withdraw(s.party, a.uid, s).ok);
  assert(a.level > 5);
});

test("Daycare and hatch failure restores clocks, friendship, egg cycles and seeded random state together", () => {
  const a = mon(),
    s = state([a]),
    random = new Random(88);
  s.friendshipSteps = 127;
  s.daycare.slots = [{ mon: mon("treecko"), steps: 10, initialLevel: 5 }];
  const session = new GrowthSession({
    inventory: fixtureInventory(),
    state: s,
    db,
    rng: random,
    abilities,
    heldItems,
  });
  session.hatching.advance = () => {
    throw new Error("broken extension");
  };
  const before = structuredClone(s),
    seed = random.snapshot();
  assert.throws(() => session.advance(), /broken extension/);
  assert.deepEqual(s, before);
  assert.equal(random.snapshot(), seed);
});

test("Everstone-inherited nature agrees with personality, derived gender and ability", () => {
  const a = mon("marill"),
    b = mon("ditto");
  a.gender = "♀";
  b.heldItem = "everstone";
  b.nature = 24;
  const random = new Random(347);
  const natural = random.int.bind(random);
  random.int = (max) => (max === 2 ? 0 : natural(max));
  const egg = new BreedingService({ db, rng: random }).create(a, b);
  assert.equal(egg.nature, 24);
  assert.equal(egg.personality % 25, 24);
  const spec = db.species[egg.species];
  assert.equal(
    egg.ability,
    spec.abilities[egg.personality & 1] || spec.abilities[0],
  );
});

test("An egg cannot occupy a battle seat, become a replacement, or count as a usable storage guard", () => {
  const a = mon(),
    egg = mon("mudkip"),
    enemy = mon("zigzagoon");
  egg.egg = { cycles: 1, ready: false, parents: ["a", "b"] };
  const roster = new BattleRoster(duelRoster([egg, a], [enemy], createBag()));
  assert.equal(roster.occupant("home:0"), a);
  assert.equal(roster.bench("home:0").length, 0);
  const s = state([a, egg]);
  s.box.push(mon());
  s.box[0].hp = 0;
  const storage = new PartyStorageService();
  assert.equal(storage.deposit(s, 0), false);
  assert.equal(storage.exchange(s, 0, 0), false);
  assert.equal(
    createItemService(ITEMS, fixtureInventory(ITEMS)).prepare({
      id: "blue_pokeblock",
      bag: createBag({ blue_pokeblock: 1 }),
      party: [egg],
      index: 0,
      context: "field",
    }).ok,
    false,
  );
});

test("Trade swaps stable identities, resets non-egg friendship and supports held-item evolution on the received party", () => {
  const a = mon(),
    b = createMonster("clamperl", 20, db, rng, {
      originalTrainer: "researcher",
    });
  b.heldItem = "deep_sea_tooth";
  b.friendship = 200;
  const partyA = [a],
    partyB = [b],
    trade = new TradeService({ db });
  const result = trade.exchange({
    partyA,
    partyB,
    uidA: a.uid,
    uidB: b.uid,
    trainerA: "player",
    trainerB: "researcher",
  });
  assert(result.ok);
  assert.equal(partyA[0], b);
  assert.equal(partyB[0], a);
  assert.equal(b.friendship, 70);
  assert(b.traded);
  const service = evolution();
  const plan = service.prepare(b, {
    trigger: "trade",
    party: partyA,
    bag: createBag({}),
  });
  assert.equal(plan.to, "huntail");
  assert(service.commit(plan).ok);
  assert.equal(b.heldItem, null);
  assert.equal(b.uid, result.receivedA);
  assert.equal(
    trade.exchange({
      partyA,
      partyB,
      uidA: a.uid,
      uidB: b.uid,
      trainerA: "player",
      trainerB: "researcher",
    }).ok,
    false,
  );
});

test("Evolution faults during staged move learning leave the live creature, inventory and plan reusable", () => {
  const data = structuredClone(db),
    m = mon("eevee", 10),
    bag = createBag({ water_stone: 1 }),
    service = evolution(data);
  service.prepare(m, {
    trigger: "item",
    item: "water_stone",
    bag,
  });
  data.species.vaporeon.learnset.push({ level: 10, move: "missing" });
  m.moves = m.moves.slice(0, 1);
  // Refresh the plan after changing the source creature, then fault only target content.
  const current = service.prepare(m, {
      trigger: "item",
      item: "water_stone",
      bag,
    }),
    snapshot = structuredClone(m);
  assert.throws(() => service.commit(current));
  assert.deepEqual(m, snapshot);
  assert.equal(inventoryQuantity(bag, "water_stone"), 1);
  data.species.vaporeon.learnset.pop();
  assert(service.commit(current).ok);
  assert.equal(inventoryQuantity(bag, "water_stone"), 0);
});

test("Pokeblock taste rounds ten percent to nearest, fullness persists and rejected feeding preserves inventory", () => {
  const a = mon("feebas");
  a.nature = 15;
  assert(applyNutrition(a, { flavors: { beauty: 15 }, feel: 20 }));
  assert.equal(a.beauty, 17);
  assert.equal(a.sheen, 20);
  const items = createItemService(ITEMS, fixtureInventory(ITEMS)),
    bag = createBag({ blue_pokeblock: 1 });
  a.hp = 0;
  assert(
    items.use({
      id: "blue_pokeblock",
      bag,
      party: [a],
      index: 0,
      context: "field",
    }).ok,
  );
  assert.equal(a.beauty, 39);
  assert.equal(inventoryQuantity(bag, "blue_pokeblock"), 0);
  a.sheen = 255;
  setQuantity(bag, "blue_pokeblock", 1);
  assert.equal(
    items.use({
      id: "blue_pokeblock",
      bag,
      party: [a],
      index: 0,
      context: "field",
    }).ok,
    false,
  );
  assert.equal(inventoryQuantity(bag, "blue_pokeblock"), 1);
});

test("Item drafts protect deep fields and issuer-owned plans reject forged, stale or cross-inventory commits", () => {
  const a = mon(),
    items = createItemService(ITEMS, fixtureInventory(ITEMS)),
    bag = createBag({ potion: 2 });
  a.hp--;
  const plan = items.prepare({
    id: "potion",
    bag,
    party: [a],
    index: 0,
    context: "field",
  });
  assert.equal(items.commit({ ...plan }, bag, "potion"), false);
  assert.equal(items.commit(plan, createBag({ potion: 2 }), "potion"), false);
  a.friendship++;
  assert.equal(items.commit(plan, bag, "potion"), false);
  assert.equal(inventoryQuantity(bag, "potion"), 2);
  const mutate = (c) => {
    c.target.moves[0].pp--;
    return true;
  };
  const bad = new ItemService(
    {
      hack: {
        name: "hack",
        price: 1,
        contexts: ["field"],
        target: "party",
        effects: [{ op: "hack" }],
      },
    },
    new EffectRegistry({ hack: mutate }),
    fixtureInventory({
      hack: {
        name: "hack",
        price: 1,
        contexts: ["field"],
        target: "party",
        effects: [{ op: "hack" }],
      },
    }),
  );
  const before = structuredClone(a);
  assert.throws(
    () =>
      bad.prepare({
        id: "hack",
        bag: createBag({ hack: 1 }),
        party: [a],
        index: 0,
        context: "field",
      }),
    /protected field moves/,
  );
  assert.deepEqual(a, before);
});

test("Growth presentation commits once under its white cover and clears locks when domain validation fails", async () => {
  let time = 0,
    count = 0;
  const timeline = new Timeline({
      now: () => time,
      wait: async (ms) => {
        time += ms;
      },
    }),
    director = new GrowthDirector({ timeline });
  const result = await director.play({
    kind: "hatch",
    from: "egg",
    to: "treecko",
    commit: () => {
      assert.equal(director.sample().phase, "covered");
      count++;
      return { ok: true };
    },
  });
  assert(result.ok);
  assert.equal(count, 1);
  assert.equal(director.busy, false);
  await assert.rejects(
    director.play({
      kind: "evolution",
      from: "eevee",
      to: "vaporeon",
      commit: () => ({ ok: false, reason: "stale" }),
    }),
    /stale/,
  );
  assert.equal(director.busy, false);
});

test("Save owns daycare and trade identities, keeps egg clocks, and rejects duplicated custody or invalid eggs", () => {
  const s = state([mon()]);
  s.facilities = emptyFacilities();
  s.fieldEffects = emptyFieldEffects();
  s.encounters = emptyEncounterTickets();
  s.appearances = { revision: 0, records: {} };
  s.daycare.slots = [{ mon: mon("mudkip"), steps: 254, initialLevel: 5 }];
  const egg = mon();
  egg.egg = {
    cycles: 0,
    ready: true,
    parents: [s.party[0].uid, s.daycare.slots[0].mon.uid],
  };
  s.daycare.egg = egg;
  s.tradePartner.push(mon("eevee"));
  s.growth.hatchTick = 255;
  s.weather = emptyWeather();
  s.registeredItem = null;
  assert(validateSave(s, db));
  s.box.push(s.daycare.slots[0].mon);
  assert.equal(validateSave(s, db), false);
  s.box = [];
  egg.egg.cycles = -1;
  assert.equal(validateSave(s, db), false);
});

test("A failed post-trade evolution restores both parties, identities, friendship and RNG", async () => {
  const { EmeraldAdventure } = await import(
    "../src/packs/emerald/adventure.js"
  );
  const { TransitionController } = await import("../src/engine/timeline.js");
  const { BattleDirector } = await import(
    "../src/presentation/battle-director.js"
  );
  const { GridMotion } = await import("../src/engine/motion.js");
  const { SceneGraph } = await import("../src/engine/motion.js");
  const timeline = new Timeline({ now: () => 0, wait: async () => {} });
  const game = new EmeraldAdventure({
    db,
    timeline,
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(db.maps)),
    storage: { getItem: () => null, setItem() {} },
  });
  game.ui = { blocked: false, updateSide() {}, toast() {} };
  game.state.flags.pokedex = true;
  game.enter({
    map: "LittlerootTown_ProfessorBirchsLab",
    x: 9,
    y: 9,
    dir: "up",
  });
  game.state.party.push(mon());
  game.prepareTradePartner();
  const ours = game.state.party[0],
    theirs = game.state.tradePartner[0],
    before = structuredClone(game.state),
    seed = game.rng.snapshot();
  game.growthDirector.play = async ({ kind, commit }) => {
    if (kind === "evolution") {
      game.rng.next();
      throw new Error("presentation fault");
    }
    return commit();
  };
  assert.equal((await game.performTrade(ours.uid, theirs.uid)).ok, false);
  before.randomSeed = seed; // A final save persists the restored generator position.
  assert.deepEqual(game.state, before);
  assert.equal(game.state.party[0], ours);
  assert.equal(game.state.tradePartner[0], theirs);
  assert.equal(game.rng.snapshot(), seed);
  assert.equal(game.busy, false);
});
