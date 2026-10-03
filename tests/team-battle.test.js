import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
} from "./helpers/inventory-fixture.js";
import { createItemService } from "../dist/engine/items.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import { emptyWeather } from "../dist/engine/weather.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Battle } from "../dist/engine/battle.js";
import { BattleRoster, duelRoster } from "../dist/engine/battle/roster.js";
import { Random, createMonster } from "../dist/engine/model.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { Timeline } from "../dist/engine/timeline.js";
import { BattleSession } from "../dist/engine/battle-session.js";
import { TRAINERS, createTrainerTeam } from "../dist/packs/emerald/trainers.js";
import { battleOutcome } from "../dist/packs/emerald/story.js";
import {
  emptyStoryProgress,
  grantReward,
  completeEvent,
} from "../dist/engine/story.js";
const db = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
function setup(overrides = {}) {
  const rng = new Random(1234);
  const party = [
    createMonster("mudkip", 10, db, rng),
    createMonster("treecko", 10, db, rng),
  ];
  const enemies = [
    createMonster("zigzagoon", 4, db, rng),
    createMonster("poochyena", 4, db, rng),
  ];
  for (const mon of [...party, ...enemies])
    mon.moves = [{ id: "tackle", pp: 35 }];
  for (const mon of party) mon.stats.spe = 100;
  for (const mon of enemies) mon.stats.spe = 10;
  const awards = [];
  const battle = new Battle({
    items: createItemService(ITEMS, fixtureInventory(ITEMS)),
    party,
    enemyParty: enemies,
    bag: createBag({ potion: 2, pokeball: 2 }),
    db,
    rng,
    trainer: true,
    rules: {
      accuracy: () => true,
      critical: () => false,
      damage: (actor) => ({
        amount: party.includes(actor) ? 999 : 1,
        type: 1,
        critical: false,
      }),
      experienceAward: () => 100,
      experienceFinal: ({ amount }) => amount, // Fixed reward policy isolates participation from trainer bonuses.
      grantExperience: (mon, amount) => {
        mon.exp += amount;
        awards.push({ uid: mon.uid, amount });
        return [];
      },
      ...overrides,
    },
  });
  return { battle, rng, party, enemies, awards };
}
test("Trainer defeat is party-based: each faint awards once, replacement waits until the round ends", () => {
  const { battle: b, party, enemies, awards } = setup();
  const hp = party[0].hp,
    firstPP = enemies[0].moves[0].pp,
    nextPP = enemies[1].moves[0].pp;
  b.conditions.get(b.seatId(1)).stages.def = 4;
  b.conditions.get(b.seatId(1)).confused = 4;
  const events = b.act({ kind: "move", index: 0 });
  assert.equal(b.ended, false);
  assert.equal(b.enemy.uid, enemies[1].uid);
  assert.equal(party[0].hp, hp);
  assert.equal(enemies[0].moves[0].pp, firstPP);
  assert.equal(enemies[1].moves[0].pp, nextPP);
  assert.equal(events.filter((e) => e.kind === "move").length, 1);
  assert.equal(events.at(-1).kind, "switch");
  assert.equal(events.at(-1).targetUid, enemies[1].uid);
  assert.equal(
    events.find((e) => e.kind === "faint").targetUid,
    enemies[0].uid,
  );
  assert.deepEqual(b.conditions.get(b.seatId(1)).stages, {});
  assert.equal(b.conditions.get(b.seatId(1)).confused, 0);
  assert.deepEqual(
    events.at(-1).sides.map((s) => s.remaining),
    [2, 1],
  );
  b.checkFaint();
  assert.equal(awards.length, 1);
  b.act({ kind: "move", index: 0 });
  assert.equal(b.result, "win");
  assert.equal(awards.length, 2);
  const seed = b.rng.seed;
  assert.deepEqual(b.act({ kind: "move", index: 0 }), []);
  b.checkFaint();
  assert.equal(awards.length, 2);
  assert.equal(b.rng.seed, seed);
});
test("Experience participation belongs to each opponent encounter, identified by creature UID", () => {
  const { battle: b, party, awards } = setup();
  b.act({ kind: "switch", index: 1 });
  b.act({ kind: "move", index: 0 });
  assert.deepEqual(awards, [
    { uid: party[0].uid, amount: 50 },
    { uid: party[1].uid, amount: 50 },
  ]);
  b.act({ kind: "move", index: 0 });
  assert.deepEqual(awards.at(-1), { uid: party[1].uid, amount: 100 });
  assert.equal(awards.length, 3);
});
test("Voluntary switching consumes a turn; forced replacement consumes neither turn nor RNG", () => {
  const {
    battle: b,
    party,
    rng,
  } = setup({ damage: () => ({ amount: 999, type: 1, critical: false }) });
  const event = b.act({ kind: "switch", index: 1 });
  assert.equal(b.turn, 1);
  assert.equal(party[1].hp, 0);
  assert.equal(b.ended, false);
  assert(event.some((e) => e.kind === "faint" && e.targetUid === party[1].uid));
  const seed = rng.seed,
    enemyPP = b.enemy.moves[0].pp;
  b.act({ kind: "switch", index: 0 });
  assert.equal(b.player.uid, party[0].uid);
  assert.equal(b.turn, 1);
  assert.equal(rng.seed, seed);
  assert.equal(b.enemy.moves[0].pp, enemyPP);
});
test("Invalid actions are side-effect free and do not reuse the previous action ID", () => {
  const { battle: b, rng } = setup();
  b.act({ kind: "switch", index: 1 });
  for (const action of [
    { kind: "switch", index: 1 },
    { kind: "switch", index: -1 },
    { kind: "move", index: 999 },
    { kind: "move", index: 0, actor: "stale-uid" },
    { kind: "move", index: 0, target: { kind: "seat", id: "home:0" } },
    { kind: "invented" },
    { kind: "item", item: "pokeball" },
    { kind: "run" },
  ]) {
    const before = structuredClone({
      turn: b.turn,
      party: b.party,
      enemies: b.enemyParty,
      bag: b.bag,
      seed: rng.seed,
    });
    const result = b.act(action);
    assert.equal(result.length, 1);
    assert.equal(result[0].kind, "invalid");
    assert.equal(result[0].actionId, null);
    assert.deepEqual(
      {
        turn: b.turn,
        party: b.party,
        enemies: b.enemyParty,
        bag: b.bag,
        seed: rng.seed,
      },
      before,
    );
  }
});
test("Residual damage completes before the opponent reserve enters; capture remains forbidden after replacement", () => {
  const { battle: b, enemies } = setup({
    damage: () => ({ amount: 0, type: 1, critical: false }),
  });
  enemies[0].hp = 1;
  enemies[0].status = "poison";
  const events = b.act({ kind: "move", index: 0 });
  assert.equal(b.enemy.uid, enemies[1].uid);
  assert.equal(enemies[1].hp, enemies[1].stats.hp);
  assert.equal(enemies[1].status, null);
  assert.equal(events.at(-1).kind, "switch");
  const count = inventoryQuantity(b.bag, "pokeball"),
    turn = b.turn;
  assert.equal(b.act({ kind: "item", item: "pokeball" })[0].kind, "invalid");
  assert.equal(inventoryQuantity(b.bag, "pokeball"), count);
  assert.equal(b.turn, turn);
});
test("Simultaneous fainting leaves reserves available; exhaustion of both teams follows the explicit loss policy", () => {
  for (const reserves of [true, false]) {
    const { battle: b, party, enemies } = setup();
    if (!reserves) {
      party[1].hp = 0;
      enemies[1].hp = 0;
    }
    party[0].hp = 1;
    enemies[0].hp = 1;
    party[0].moves = [{ id: "take_down", pp: 20 }];
    const events = b.act({ kind: "move", index: 0 });
    assert.equal(party[0].hp, 0);
    assert.equal(enemies[0].hp, 0);
    assert.equal(events.filter((e) => e.kind === "faint").length, 2);
    if (reserves) {
      assert.equal(b.ended, false);
      assert.equal(b.enemy.uid, enemies[1].uid);
      assert.equal(b.act({ kind: "move", index: 0 })[0].kind, "invalid");
      b.act({ kind: "switch", index: 1 });
      assert.equal(b.player.uid, party[1].uid);
    } else assert.equal(b.result, "loss");
  }
});
test("Paralysis action check uses its own rule, independently of thawing", () => {
  const { battle: b, party } = setup({ paralysisChance: 1, thawChance: 0 });
  party[0].status = "paralysis";
  const pp = party[0].moves[0].pp;
  const events = b.act({ kind: "move", index: 0 });
  assert.equal(party[0].moves[0].pp, pp);
  assert(events.some((e) => e.text.includes("因麻痹无法行动")));
  assert(!events.some((e) => e.kind === "move" && e.actorUid === party[0].uid));
});
test("Domain events contain detached seat collections and stable IDs, with only presentation fields", () => {
  const { battle: b, enemies } = setup();
  const events = b.act({ kind: "move", index: 0 });
  const hurt = events.find((e) => e.kind === "hurt");
  assert.equal(hurt.actionId, "action:1");
  assert.equal(hurt.actorUid, b.player.uid);
  assert.equal(hurt.targetUid, enemies[0].uid);
  for (const e of events) {
    assert(!("player" in e));
    assert(!("enemy" in e));
    assert(!("side" in e));
    for (const v of e.combatants) {
      assert(!("moves" in v.monster));
      assert(!("iv" in v.monster));
    }
  }
  assert(events.every((e, i) => !i || e.sequence > events[i - 1].sequence));
  const captured = structuredClone(hurt);
  b.act({ kind: "move", index: 0 });
  assert.deepEqual(hurt, captured);
  hurt.combatants[0].monster.stats.hp = 999;
  assert.notEqual(b.player.stats.hp, 999);
});
test("Topology expresses doubles, shared controllers, multiple controllers and three alliances without changing UID", () => {
  const { party, enemies } = setup();
  const def = duelRoster(party, enemies, createBag());
  def.sides[0].seats.push({ id: "home:1", controllerId: "trainer" });
  def.sides[1].seats.push({ id: "away:1", controllerId: "opponent" });
  const third = createMonster("ralts", 4, db, new Random(999));
  def.sides.push({
    id: "third",
    allianceId: "third",
    controllers: [{ id: "third-owner", kind: "ai", party: [third] }],
    seats: [{ id: "third:0", controllerId: "third-owner" }],
  });
  const roster = new BattleRoster(def);
  assert.equal(roster.seats.size, 5);
  assert.equal(roster.opposing("home:0").length, 3);
  assert.equal(roster.target("home:0", { kind: "side", id: "away" }).length, 2);
  assert.equal(roster.target("home:0", { kind: "field" }).length, 5);
  assert.equal(roster.target("home:0", { kind: "self" })[0].id, "home:0");
  assert.equal(roster.canReplace("home:0", 1), false);
  assert.equal(roster.occupant("home:1").uid, party[1].uid);
  const independent = duelRoster([party[0]], enemies, createBag());
  independent.sides[0].controllers.push({
    id: "partner",
    kind: "human",
    party: [party[1]],
  });
  independent.sides[0].seats.push({ id: "partner:0", controllerId: "partner" });
  assert.equal(new BattleRoster(independent).living("home").length, 2);
});
test("Topology validation rejects duplicate UIDs, bad targets and double occupation before any external mutation", () => {
  const { party, enemies } = setup();
  const def = duelRoster(party, enemies, createBag()),
    before = structuredClone(def);
  const roster = new BattleRoster(def);
  assert.throws(() => roster.target("missing", { kind: "field" }), /Unknown/);
  assert.throws(
    () => roster.target("home:0", { kind: "side", id: "missing" }),
    /Unknown/,
  );
  assert.throws(
    () => roster.target("home:0", { kind: "seat", id: "missing" }),
    /Unknown/,
  );
  assert.throws(() => roster.replace("home:0", 0), /Invalid/);
  assert.deepEqual(def, before);
  const dup = structuredClone(def);
  dup.sides[1].controllers[0].party[0].uid = party[0].uid;
  assert.throws(() => new BattleRoster(dup), /UID/);
  const double = structuredClone(def);
  double.sides[0].seats.push({
    id: "home:1",
    controllerId: "trainer",
    index: 0,
  });
  assert.throws(() => new BattleRoster(double), /occupant/);
});
test("Enemy replacement animation releases the enemy silhouette and preserves team HUD metadata", async () => {
  const { battle: b, enemies } = setup();
  const director = new BattleDirector(
    new Timeline({ now: () => 0, wait: async () => {} }),
  );
  director.reset(b.snapshot());
  const events = b.act({ kind: "move", index: 0 });
  for (const e of events) await director.play(e);
  assert.equal(director.sample().actors[1].opacity, 1);
  assert.equal(director.sample().view.enemy.uid, enemies[1].uid);
  assert.equal(director.view.sides[1].remaining, 1);
  b.act({ kind: "move", index: 0 });
  for (const e of b.events) await director.play(e);
  assert.equal(director.sample().actors[1].opacity, 0);
});
test("Trainer content validates the complete team before creating any creature or consuming RNG", () => {
  const rng = new Random(4),
    seed = rng.seed;
  assert.throws(
    () =>
      createTrainerTeam(
        {
          ...TRAINERS.youngster,
          party: [
            { species: "mudkip", level: 5 },
            { species: "missing", level: 4 },
          ],
        },
        db,
        rng,
      ),
    /Invalid/,
  );
  assert.equal(rng.seed, seed);
  const team = createTrainerTeam(TRAINERS.youngster, db, rng);
  assert.equal(team.length, 2);
  assert(team.every((m) => Object.values(m.iv).every((v) => v === 0)));
});
test("Practice prize is committed once after the full win; rematches do not grant another reward", () => {
  const s = {
    flags: { rescued: true },
    story: emptyStoryProgress(),
    bag: createBag({}),
    money: 3000,
  };
  assert.equal(
    battleOutcome(s, { script: "practice", result: null }, db).length,
    0,
  );
  const commands = battleOutcome(s, { script: "practice", result: "win" }, db);
  for (const c of commands) {
    if (c.type === "reward")
      grantReward(s, c, { inventory: fixtureInventory() });
    if (c.type === "completeEvent") completeEvent(s, c.id);
  }
  assert.equal(s.money, 3160);
  assert.equal(s.flags.practiceWon, true);
  assert(
    !battleOutcome(s, { script: "practice", result: "win" }, db).some(
      (c) => c.type === "reward",
    ),
  );
});
test("Invalid battle construction precedes transition, and result plans are not created twice on exit retry", async () => {
  let transitions = 0;
  const session = new BattleSession({
    director: { busy: false },
    transitions: {
      busy: false,
      run: async () => {
        transitions++;
      },
    },
    createBattle: () => {
      throw new Error("invalid topology");
    },
  });
  await assert.rejects(session.start({}), /invalid topology/);
  assert.equal(transitions, 0);
  assert.equal(session.busy, false);
  assert.equal(session.battle, null);
  let results = 0,
    fail = true,
    commits = 0;
  const ended = new BattleSession({
    director: { busy: false, reset: () => {} },
    transitions: {
      busy: false,
      run: async (_, commit) => {
        if (fail) throw new Error("exit failed");
        commit();
      },
    },
    onResult: () => {
      results++;
      return { commit: () => commits++ };
    },
  });
  ended.battle = { ended: true, act: () => [] };
  await assert.rejects(ended.act({}), /exit failed/);
  fail = false;
  await ended.act({});
  assert.equal(results, 1);
  assert.equal(commits, 1);
  assert.equal(ended.battle, null);
});

test("Save validation rejects missing or duplicated creature identities and missing story ledger", async () => {
  const { validateSave } = await import(
    "../dist/packs/emerald/save-contract.js"
  );
  const { party } = setup();
  const state = {
    position: { map: "Route101", x: 16, y: 9, dir: "up" },
    party,
    box: [],
    flags: {},
    bag: createBag({}),
    money: 3000,
    seen: [],
    caught: [],
    story: emptyStoryProgress(),
  };
  state.weather = emptyWeather();
  state.registeredItem = null;
  assert(validateSave(state, db));
  state.box.push(structuredClone(party[0]));
  assert.equal(validateSave(state, db), false);
  state.box = [];
  delete party[0].uid;
  assert.equal(validateSave(state, db), false);
  party[0].uid = "new-id";
  delete state.story;
  assert.equal(validateSave(state, db), false);
});
