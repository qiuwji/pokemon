import { loadContentSync } from "../tools/content-io.mjs";
import { emptyEncounterTickets } from "../dist/engine/encounter-tickets.js";
import { emptyFieldEffects } from "../dist/engine/field-effects.js";
import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
} from "./helpers/inventory-fixture.js";
import { emptyWeather } from "../dist/engine/weather.js";
import { emptyFacilities } from "../dist/engine/facilities.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Random, createMonster } from "../dist/engine/model.js";
import { Battle } from "../dist/engine/battle.js";
import { EffectRegistry } from "../dist/engine/effects.js";
import { MoveEffectRegistry } from "../dist/engine/move-effects.js";
import { createItemService } from "../dist/engine/items.js";
import {
  StoryEngine,
  emptyStoryProgress,
  grantReward,
  completeEvent,
} from "../dist/engine/story.js";
import {
  matchesCondition,
  validateCondition,
} from "../dist/engine/conditions.js";
import { SaveStore } from "../dist/engine/save-store.js";
import { CommandRunner } from "../dist/engine/commands.js";
import { NPCSystem } from "../dist/engine/npcs.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import { validateSave } from "../dist/packs/emerald/pack.js";
import {
  EMERALD_STORY,
  interaction,
  battleOutcome,
} from "../dist/packs/emerald/story.js";
const db = loadContentSync();
function setup(options = {}) {
  const rng = new Random(123);
  const player = createMonster("mudkip", 5, db, rng);
  const enemy = createMonster("zigzagoon", 3, db, rng);
  const bag = createBag({
    potion: 2,
    super_potion: 2,
    antidote: 2,
    pokeball: 2,
    great_ball: 2,
  });
  const battle = new Battle({
    party: [player],
    enemy,
    bag,
    db,
    rng,
    items: createItemService(ITEMS, fixtureInventory(ITEMS)),
    ...options,
  });
  return { rng, player, enemy, bag, battle };
}
const state = () => ({
  position: { map: "LittlerootTown", x: 10, y: 10, dir: "up" },
  party: [],
  box: [],
  flags: {},
  bag: createBag({ potion: 0, pokeball: 0 }),
  money: 3000,
  seen: [],
  caught: [],
  story: emptyStoryProgress(),
});

test("Reusable story dependencies gate branches and completion; cyclic/missing dependencies reject", () => {
  const events = [
    {
      id: "forest.key",
      trigger: "interact",
      once: true,
      build: () => [{ type: "dialog", lines: ["Found key"] }],
    },
    {
      id: "tower.door",
      trigger: "interact",
      after: ["forest.key"],
      requires: { any: [{ flag: "key" }, { event: "forest.key" }] },
      build: () => [{ type: "move", actor: "player", path: ["up"] }],
    },
  ];
  const engine = new StoryEngine(events, [
    { id: "tower", title: "Explore", requires: { event: "forest.key" } },
  ]);
  const s = state();
  assert.equal(engine.quest(s), null);
  const first = engine.resolve("interact", s);
  assert.equal(first.at(-1).id, "forest.key");
  assert(!s.story.completed.length);
  completeEvent(s, first.at(-1).id);
  assert.equal(engine.resolve("interact", s)[0].type, "move");
  assert.equal(engine.quest(s).id, "tower");
  assert.throws(
    () => new StoryEngine([{ ...events[0], after: ["missing"] }]),
    /unknown prerequisite/,
  );
  assert.throws(
    () => new StoryEngine([{ ...events[0], after: ["tower.door"] }, events[1]]),
    /cycle/,
  );
  assert.throws(() => new StoryEngine([events[0], events[0]]), /Duplicate/);
  assert.throws(
    () => new StoryEngine([{ ...events[0], requires: { event: "missing" } }]),
    /unknown event/,
  );
  assert.throws(
    () => validateCondition({ flag: "key", falg: "wrong" }),
    /unknown condition field/,
  );
  assert(
    matchesCondition(
      { all: [{ not: { flag: "missing" } }, { event: "forest.key" }] },
      s,
    ),
  );
});

test("Emerald story selection is pure; committed rival reward unlocks the Pokédex gift", () => {
  const s = state();
  s.flags = { rescued: true, rivalWon: true };
  const before = structuredClone(s);
  assert.deepEqual(interaction(s, { kind: "professor" }, "lab"), []);
  const result = battleOutcome(s, { result: "win", script: "rival" }, db);
  assert.equal(result[0].type, "reward");
  assert.deepEqual(s, before);
  completeEvent(s, "rival.victory");
  assert.deepEqual(interaction(s, { kind: "professor" }, "lab"), []);
  grantReward(s, result[0], { inventory: fixtureInventory(), items: ITEMS });
  const gift = interaction(s, { kind: "professor" }, "lab");
  assert.equal(gift.find((c) => c.type === "reward").items.pokeball, 5);
  assert.equal(EMERALD_STORY.quest(s).id, "pokedex");
});

test("Reward commits atomically, is idempotent, persists ledger, rejects malformed partial gifts", () => {
  const s = state();
  const reward = {
    id: "chapter.1",
    money: 500,
    items: { potion: 2 },
    flags: { opened: true },
  };
  assert(
    grantReward(s, reward, { inventory: fixtureInventory(), items: ITEMS }),
  );
  assert(
    !grantReward(s, reward, { inventory: fixtureInventory(), items: ITEMS }),
  );
  assert.equal(s.money, 3500);
  assert.equal(inventoryQuantity(s.bag, "potion"), 2);
  assert.deepEqual(s.story.rewards, ["chapter.1"]);
  const before = structuredClone(s);
  assert.throws(
    () =>
      grantReward(
        s,
        { id: "bad", money: 999, items: { potion: 3, typo: 1 } },
        { inventory: fixtureInventory(), items: ITEMS },
      ),
    /Invalid reward item/,
  );
  assert.deepEqual(s, before);
  assert.throws(
    () =>
      grantReward(
        s,
        { id: "bad", flags: { stage: {} } },
        { inventory: fixtureInventory() },
      ),
    /Invalid reward flag/,
  );
  assert.deepEqual(s, before);
});

test("A dialogue failure after reward can replay without duplicate money or items", async () => {
  const s = state();
  let fail = true;
  const runner = new CommandRunner({
    reward: (c) =>
      grantReward(s, c, { inventory: fixtureInventory(), items: ITEMS }),
    dialog: () => {
      if (fail) throw new Error("presentation failed");
    },
  });
  const commands = [
    { type: "reward", id: "gift", money: 300, items: { potion: 1 } },
    { type: "dialog" },
  ];
  await assert.rejects(runner.run(commands), /presentation failed/);
  fail = false;
  await runner.run(commands);
  assert.equal(s.money, 3300);
  assert.equal(inventoryQuantity(s.bag, "potion"), 1);
});

test("Current development save contract rejects older versions without mutating their data", () => {
  const s = state();
  s.facilities = emptyFacilities();
  s.fieldEffects = emptyFieldEffects();
  s.encounters = emptyEncounterTickets();
  s.appearances = { revision: 0, records: {} };
  s.weather = emptyWeather();
  s.registeredItem = null;
  s.party = [createMonster("mudkip", 5, db, new Random(1))];
  const old = { version: 2, savedAt: 1, state: s };
  const before = structuredClone(old);
  const store = new SaveStore({}, "demo", (x) => validateSave(x, db), 3);
  assert.equal(store.decode(old), null);
  assert.deepEqual(store.decode({ ...old, version: 3 }).state, s);
  assert.equal(store.decode({ ...old, version: 4 }), null);
  assert.deepEqual(old, before);
});

test("Field items use effects, reject dead/full/wrong targets, and stale/double commits do not consume", () => {
  const { player, bag } = setup();
  const service = createItemService(ITEMS, fixtureInventory(ITEMS));
  const use = (id) =>
    service.use({ id, bag, party: [player], index: 0, context: "field" });
  assert(!use("potion").ok);
  assert.equal(inventoryQuantity(bag, "potion"), 2);
  player.hp = 1;
  assert(use("super_potion").ok);
  assert.equal(player.hp, player.stats.hp);
  assert.equal(inventoryQuantity(bag, "super_potion"), 1);
  player.status = "poison";
  assert(use("antidote").ok);
  assert.equal(player.status, null);
  assert.equal(inventoryQuantity(bag, "antidote"), 1);
  assert(!use("antidote").ok);
  assert(!use("great_ball").ok);
  player.hp = 0;
  assert(!use("potion").ok);
  player.hp = 1;
  const plan = service.prepare({
    id: "potion",
    bag,
    party: [player],
    index: 0,
    context: "field",
  });
  player.hp = 2;
  assert(!service.commit(plan, bag, "potion"));
  assert.equal(inventoryQuantity(bag, "potion"), 2);
  player.hp = 1;
  assert(service.commit(plan, bag, "potion"));
  assert(!service.commit(plan, bag, "potion"));
  assert.equal(inventoryQuantity(bag, "potion"), 1);
});

test("New data-only item composes healing and curing through the same operations", () => {
  const { player } = setup();
  const definitions = {
    remedy: {
      name: "Remedy",
      price: 1,
      contexts: ["field"],
      target: "party",
      effects: [
        { op: "restoreHP", amount: 7 },
        { op: "cureStatus", status: "any" },
      ],
    },
  };
  const service = createItemService(definitions, fixtureInventory(definitions));
  player.hp = 1;
  player.status = "burn";
  const bag = createBag({ remedy: 1 });
  assert(
    service.use({
      id: "remedy",
      bag,
      party: [player],
      index: 0,
      context: "field",
    }).ok,
  );
  assert.equal(player.hp, 8);
  assert.equal(player.status, null);
  assert.equal(inventoryQuantity(bag, "remedy"), 0);
  assert.throws(
    () =>
      createItemService(
        {
          wrong: {
            ...definitions.remedy,
            effects: [{ op: "restoreHPP", amount: 7 }],
          },
        },
        fixtureInventory({
          wrong: {
            ...definitions.remedy,
            effects: [{ op: "restoreHPP", amount: 7 }],
          },
        }),
      ),
    /items.wrong.effects\[0\]/,
  );
  assert.throws(
    () => new EffectRegistry().validate([{ op: "toString" }]),
    /unknown operation/,
  );
});

test("Invalid battle item and depleted move leave turn, HP, PP and RNG unchanged", () => {
  const { rng, player, enemy, bag, battle } = setup();
  const before = {
    seed: rng.seed,
    player: structuredClone(player),
    enemy: structuredClone(enemy),
    bag: { ...bag },
  };
  assert.equal(
    battle.act({ kind: "item", item: "antidote", index: 0 })[0].kind,
    "invalid",
  );
  assert.equal(battle.turn, 0);
  assert.equal(rng.seed, before.seed);
  assert.deepEqual(player, before.player);
  assert.deepEqual(enemy, before.enemy);
  assert.deepEqual(bag, before.bag);
  player.moves[0].pp = 0;
  battle.act({ kind: "move", index: 0 });
  assert.equal(battle.turn, 0);
  assert.equal(rng.seed, before.seed);
  battle.act({ kind: "item" });
  assert.equal(inventoryQuantity(bag, "potion"), 2);
});

test("Successful battle medicine consumes one turn; all capture items share restrictions and bonus rule", () => {
  let attacks = 0;
  const { battle, player, enemy, bag } = setup({
    rules: {
      accuracy: () => true,
      damage: () => {
        attacks++;
        return { amount: 1, type: 1 };
      },
    },
  });
  enemy.moves = [{ id: "tackle", pp: 35 }];
  player.status = "poison";
  const events = battle.act({ kind: "item", item: "antidote", index: 0 });
  assert.equal(player.status, null);
  assert.equal(inventoryQuantity(bag, "antidote"), 1);
  assert.equal(battle.turn, 1);
  assert.equal(attacks, 1);
  assert(events.some((e) => e.kind === "heal"));
  let bonus;
  const caught = setup({
    rules: {
      captureCheck: (mon, species, rng, value) => {
        bonus = value;
        return { caught: true, shakes: 4 };
      },
    },
  });
  caught.battle.act({ kind: "item", item: "great_ball" });
  assert.equal(bonus, 1.5);
  assert.equal(inventoryQuantity(caught.bag, "great_ball"), 1);
  assert.equal(caught.battle.result, "caught");
  for (const options of [{ trainer: true }, { script: "rescue" }]) {
    const blocked = setup(options);
    const seed = blocked.rng.seed;
    assert.equal(
      blocked.battle.act({ kind: "item", item: "great_ball" })[0].kind,
      "invalid",
    );
    assert.equal(inventoryQuantity(blocked.bag, "great_ball"), 2);
    assert.equal(blocked.rng.seed, seed);
    assert.equal(blocked.battle.turn, 0);
  }
});

test("Effect names and descriptors validate before battle; unsupported moves do not spend PP", () => {
  const bad = structuredClone(db);
  bad.moves.tackle.effect = "hitt";
  assert.throws(() => setup({ db: bad }), /moves.tackle.effect.*hitt/);
  assert.throws(
    () =>
      new MoveEffectRegistry({
        definitions: {
          bad: {
            primary: [{ op: "stages", target: "self", changes: { attack: 1 } }],
          },
        },
      }),
    /invalid stage/,
  );
  const effects = new MoveEffectRegistry({
    definitions: {
      deliberately_unavailable: { supported: false, reason: "Not implemented" },
    },
  });
  const local = structuredClone(db);
  local.moves.unavailable = {
    ...local.moves.taunt,
    effect: "deliberately_unavailable",
  };
  const { battle, player, rng } = setup({ db: local, effects });
  player.moves[0] = { id: "unavailable", pp: local.moves.unavailable.pp };
  const seed = rng.seed;
  assert.equal(battle.act({ kind: "move", index: 0 })[0].kind, "invalid");
  assert.equal(player.moves[0].pp, local.moves.unavailable.pp);
  assert.equal(battle.turn, 0);
  assert.equal(rng.seed, seed);
});

test("A custom move definition uses existing operations without changing battle orchestration", () => {
  const local = structuredClone(db);
  local.moves.custom = {
    name: "Resolve",
    effect: "resolve",
    power: 0,
    accuracy: 100,
    priority: 0,
    type: "normal",
    chance: 0,
    pp: 10,
  };
  const registry = new MoveEffectRegistry({
    definitions: {
      resolve: {
        target: "self",
        primary: [
          { op: "stages", target: "self", changes: { atk: 2, spe: 1 } },
        ],
      },
    },
  });
  const { battle, player } = setup({ db: local, effects: registry });
  player.moves = [{ id: "custom", pp: 10 }];
  battle.conditions.get(battle.seatId(1)).protected = true;
  battle.executeMove(0, 0);
  assert.equal(battle.stages[0].atk, 2);
  assert.equal(battle.stages[0].spe, 1);
  assert.equal(player.moves[0].pp, 9);
});

test("Move phases preserve drain, recoil immunity, false swipe and bide setup", () => {
  const { battle, player, enemy } = setup({
    rules: { damage: () => ({ amount: 8, type: 1 }), accuracy: () => true },
  });
  player.moves = [{ id: "absorb", pp: 10 }];
  player.hp = 1;
  battle.executeMove(0, 0);
  assert.equal(player.hp, 5);
  enemy.hp = 2;
  player.moves[0] = { id: "false_swipe", pp: 10 };
  battle.executeMove(0, 0);
  assert.equal(enemy.hp, 1);
  player.moves[0] = { id: "bide", pp: 10 };
  battle.executeMove(0, 0);
  assert.deepEqual(battle.bide[0], { turns: 2, damage: 0 });
  assert.equal(enemy.hp, 1);
  const immune = setup({
    rules: { damage: () => ({ amount: 0, type: 0 }), accuracy: () => true },
  });
  immune.player.moves = [{ id: "take_down", pp: 10 }];
  const hp = immune.player.hp;
  immune.battle.executeMove(0, 0);
  assert.equal(immune.player.hp, hp);
});

test("Fury Cutter power modifications survive phase execution and snapshots exclude private data", () => {
  const powers = [];
  const { battle, player, enemy } = setup({
    rules: {
      damage: (a, d, m, db, rng, o) => {
        powers.push(o.power);
        return { amount: 1, type: 1 };
      },
      accuracy: () => true,
    },
  });
  player.moves = [{ id: "fury_cutter", pp: 10 }];
  battle.executeMove(0, 0);
  battle.executeMove(0, 0);
  assert.deepEqual(powers, [
    db.moves.fury_cutter.power,
    db.moves.fury_cutter.power * 2,
  ]);
  const event = battle.events[0];
  const [home, away] = event.combatants.map((v) => v.monster);
  const hp = away.hp;
  enemy.hp = 0;
  enemy.stats.hp = 999;
  assert.equal(away.hp, hp);
  assert.notEqual(away.stats.hp, 999);
  assert.equal(home.iv, undefined);
  assert.equal(home.moves, undefined);
  assert.equal(home.stats.atk, undefined);
});

test("Monster creation policy is injectable and NPC caches belong to a disposable session", () => {
  const mon = createMonster("mudkip", 5, db, new Random(1), {
    trainer: true,
    rules: { individualValue: () => 31, nature: () => 3 },
  });
  assert(Object.values(mon.iv).every((v) => v === 31));
  assert.equal(mon.nature, 3);
  let definitions = [
    { id: "npc", x: 1, y: 1, dir: "down", movement: { mode: "still" } },
  ];
  const first = new NPCSystem(db.maps, () => definitions),
    second = new NPCSystem(db.maps, () => definitions);
  first.objects("Route101")[0].x = 8;
  assert.equal(second.objects("Route101")[0].x, 1);
  definitions = [];
  first.objects("Route101");
  assert.equal(first.states.size, 0);
  second.clear();
  assert.equal(second.states.size, 0);
  assert.equal(second.scene, null);
});
