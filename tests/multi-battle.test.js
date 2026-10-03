import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
} from "./helpers/inventory-fixture.js";
import { createItemService } from "../dist/engine/items.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Battle } from "../dist/engine/battle.js";
import { Random, createMonster } from "../dist/engine/model.js";
import { teamRoster } from "../dist/engine/battle/roster.js";
import {
  createTrainerEncounter,
  TRAINERS,
} from "../dist/packs/emerald/trainers.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { Timeline } from "../dist/engine/timeline.js";
const db = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
function setup({ reserve = false, rules = {}, effects = {} } = {}) {
  const rng = new Random(87),
    party = ["mudkip", "treecko", ...(reserve ? ["torchic"] : [])].map((id) =>
      createMonster(id, 10, db, rng),
    ),
    enemyParty = [
      "zigzagoon",
      "poochyena",
      ...(reserve ? ["wurmple"] : []),
    ].map((id) => createMonster(id, 4, db, rng));
  for (const [i, m] of [...party, ...enemyParty].entries()) {
    m.moves = [{ id: "tackle", pp: 35 }];
    m.stats.spe = 100 - i * 10;
  }
  const b = new Battle({
    items: createItemService(ITEMS, fixtureInventory(ITEMS)),
    party,
    enemyParty,
    trainer: true,
    format: "doubles",
    db,
    rng,
    bag: createBag({ potion: 1 }),
    effects,
    rules: {
      accuracy: () => true,
      critical: () => false,
      damage: () => ({ amount: 1, type: 1, critical: false }),
      grantExperience: () => [],
      ...rules,
    },
  });
  return { b, party, enemyParty, rng };
}
const move = (seat, id, index = 0) => ({
  kind: "move",
  seat,
  index,
  ...(id ? { target: { kind: "seat", id } } : {}),
});
test("All human seats choose before the round advances; each queued actor executes exactly once", () => {
  const { b, party, enemyParty, rng } = setup(),
    seed = rng.seed;
  const first = b.act(move("home:0", "away:0"));
  assert.equal(first[0].kind, "choice");
  assert.equal(b.turn, 0);
  assert.equal(rng.seed, seed);
  assert.equal(party[0].moves[0].pp, 35);
  assert.equal(enemyParty[0].moves[0].pp, 35);
  assert.deepEqual(b.snapshot().decision, {
    required: ["home:1"],
    queued: ["home:0"],
  });
  const events = b
    .act(move("home:1", "away:1"))
    .filter((e) => e.kind === "move");
  assert.equal(b.turn, 1);
  assert.equal(events.length, 4);
  assert.equal(new Set(events.map((e) => e.actorUid)).size, 4);
  assert.equal(new Set(events.map((e) => e.actionId)).size, 4);
  assert([...party, ...enemyParty].every((m) => m.moves[0].pp === 34));
  assert.deepEqual(b.snapshot().decision.queued, []);
});
test("Invalid second action preserves the first; cancel discards only unexecuted choices without consuming RNG", () => {
  const { b, rng, party } = setup();
  b.act(move("home:0", "away:0"));
  const seed = rng.seed;
  assert.equal(b.act(move("home:0", "away:1"))[0].kind, "invalid");
  assert.equal(b.act(move("home:1", "missing"))[0].kind, "invalid");
  assert.equal(b.decisions.pending.size, 1);
  assert.equal(rng.seed, seed);
  b.act({ kind: "cancel" });
  assert.equal(b.decisions.pending.size, 0);
  assert.equal(b.turn, 0);
  assert.equal(rng.seed, seed);
  assert.equal(party[0].moves[0].pp, 35);
});
test("Spread status hits every opposing seat, spends PP once, and self-protection affects only its seat", () => {
  const { b, party } = setup({
    rules: { damage: () => ({ amount: 0, type: 1, critical: false }) },
  });
  party[0].moves = [{ id: "growl", pp: 40 }];
  party[1].moves = [{ id: "protect", pp: 10 }];
  b.act(move("home:0"));
  const events = b.act(move("home:1"));
  assert.equal(party[0].moves[0].pp, 39);
  assert.equal(b.conditions.get("away:0").stages.atk, -1);
  assert.equal(b.conditions.get("away:1").stages.atk, -1);
  assert.equal(b.conditions.get("home:1").protected, true);
  assert.equal(b.conditions.get("home:0").protected, false);
  assert.deepEqual(
    events.find((e) => e.kind === "move" && e.actorSeat === "home:0")
      .targetSeats,
    ["away:0", "away:1"],
  );
});
test("A target fainted by an earlier action redirects an enemy-targeted attack and skips its own queued action", () => {
  const { b, party, enemyParty } = setup({
    rules: {
      damage: (actor) => ({
        amount: party.includes(actor) ? 999 : 1,
        type: 1,
        critical: false,
      }),
    },
  });
  b.act(move("home:0", "away:0"));
  const events = b.act(move("home:1", "away:0"));
  assert.equal(enemyParty[0].hp, 0);
  assert.equal(enemyParty[1].hp, 0);
  assert.equal(b.result, "win");
  assert.equal(events.filter((e) => e.kind === "move").length, 2);
  assert.equal(events.filter((e) => e.kind === "faint").length, 2);
});
test("Both opponents faint together, one reserve enters once and the other seat becomes empty", () => {
  const { b, party, enemyParty } = setup({
    reserve: true,
    rules: {
      damage: (actor) => ({
        amount: party.includes(actor) ? 999 : 0,
        type: 1,
        critical: false,
      }),
    },
  });
  party[0].moves = [{ id: "earthquake", pp: 10 }];
  // Avoid the ally by using a data-defined opponent spread for this synthetic move.
  const custom = structuredClone(db);
  custom.moves.earthquake.target = "opponents";
  b.db = custom;
  b.act(move("home:0"));
  const events = b.act(move("home:1", "away:0"));
  assert.equal(b.ended, false);
  assert.equal(b.roster.occupant("away:0").uid, enemyParty[2].uid);
  assert.equal(b.roster.occupant("away:1"), null);
  assert.equal(
    events.filter((e) => e.kind === "switch" && e.targetSeat.startsWith("away"))
      .length,
    1,
  );
  assert.equal(enemyParty[2].moves[0].pp, 35);
});
test("Every human forced replacement is completed before a new round; occupied and reserved allies cannot be selected twice", () => {
  const { b, party, enemyParty, rng } = setup({ reserve: true });
  assert.equal(
    b.act({ kind: "switch", seat: "home:0", index: 1 })[0].kind,
    "invalid",
  );
  b.act({ kind: "switch", seat: "home:0", index: 2 });
  assert.equal(
    b.act({ kind: "switch", seat: "home:1", index: 2 })[0].kind,
    "invalid",
  );
  b.act({ kind: "cancel" });
  party[0].hp = 0;
  party[1].hp = 0;
  b.checkFaint();
  b.outcomes.vacancies();
  const seed = rng.seed;
  b.act({ kind: "switch", seat: "home:0", index: 2 });
  assert.equal(b.turn, 0);
  assert.equal(rng.seed, seed);
  assert.equal(b.roster.occupant("home:1"), null);
  assert.deepEqual(
    b.decisions.required().map((s) => s.id),
    ["home:0"],
  );
  assert(enemyParty.every((m) => m.moves[0].pp === 35));
});
test("Shared inventory reservations reject overspending; two valid items cannot commit stale HP drafts", () => {
  const { b, party } = setup();
  party[0].hp = 1;
  party[1].hp = 1;
  b.act({ kind: "item", seat: "home:0", item: "potion", index: 0 });
  assert.equal(
    b.act({ kind: "item", seat: "home:1", item: "potion", index: 1 })[0].kind,
    "invalid",
  );
  assert.equal(inventoryQuantity(b.bag, "potion"), 1);
  b.act(move("home:1", "away:1"));
  assert.equal(inventoryQuantity(b.bag, "potion"), 0);
  assert(party[0].hp > 1);
});
test("Friendly single-target attacks are legal, but do not redirect to enemies when an ally target is lost", () => {
  const { b, party } = setup({
    rules: { damage: () => ({ amount: 999, type: 1, critical: false }) },
  });
  b.act(move("home:0", "home:1"));
  const events = b.act(move("home:1", "away:0"));
  assert.equal(party[1].hp, 0);
  assert(!events.some((e) => e.kind === "move" && e.actorUid === party[1].uid));
});
test("Multi-target damage passes generation-III spread policy while all-others damage includes allies", () => {
  const contexts = [];
  const { b, party } = setup({
    rules: {
      damage: (a, d, m, db, rng, c) => {
        contexts.push({ uid: d.uid, spread: c.spread });
        return { amount: 1, type: 1, critical: false };
      },
    },
  });
  party[0].moves = [{ id: "earthquake", pp: 10 }];
  b.act(move("home:0"));
  b.act(move("home:1", "away:0"));
  assert.equal(
    contexts.filter((c) => c.uid === party[1].uid).length >= 1,
    true,
  );
  assert.equal(party[0].moves[0].pp, 9);
  assert(contexts.every((c) => c.spread === 1));
});
test("Two independent human controllers on one alliance share the scheduler and keep their own inventory/party", () => {
  const { party, enemyParty, rng } = setup();
  const topology = teamRoster(
    [party[0]],
    enemyParty,
    createBag({ potion: 0 }),
    1,
  );
  topology.sides[0].controllers.push({
    id: "partner",
    kind: "human",
    party: [party[1]],
    bag: createBag({ potion: 1 }),
  });
  topology.sides[0].seats.push({ id: "partner:0", controllerId: "partner" });
  const b = new Battle({
    items: createItemService(ITEMS, fixtureInventory(ITEMS)),
    topology,
    trainer: true,
    db,
    rng,
  });
  b.act(move("home:0", "away:0"));
  assert.equal(b.commandSeat, "partner:0");
  assert.equal(b.party[0].uid, party[1].uid);
  assert.equal(inventoryQuantity(b.bag, "potion"), 1);
  b.act(move("partner:0", "away:0"));
  assert.equal(b.turn, 1);
});
test("Three alliances continue after one opposing team is eliminated and settle only the last surviving alliance", () => {
  const { party, enemyParty, rng } = setup();
  const topology = teamRoster(party, enemyParty, createBag(), 2);
  const third = createMonster("ralts", 4, db, rng);
  third.moves = [{ id: "tackle", pp: 35 }];
  topology.sides.push({
    id: "third",
    allianceId: "third",
    controllers: [{ id: "third-owner", kind: "ai", party: [third] }],
    seats: [{ id: "third:0", controllerId: "third-owner" }],
  });
  const b = new Battle({
    items: createItemService(ITEMS, fixtureInventory(ITEMS)),
    topology,
    trainer: true,
    db,
    rng,
  });
  enemyParty.forEach((m) => (m.hp = 0));
  b.checkFaint();
  b.outcomes.vacancies();
  assert.equal(b.ended, false);
  third.hp = 0;
  b.checkFaint();
  assert.equal(b.result, "win");
  assert.equal(b.winner, "home");
});
test("Multi-side renderer carries every seat and animates only the named target without modifying snapshots", async () => {
  const { b } = setup();
  const timeline = new Timeline({ now: () => 0, wait: async () => {} }),
    director = new BattleDirector(timeline);
  director.reset(b.snapshot());
  b.act(move("home:0", "away:0"));
  const events = b.act(move("home:1", "away:1"));
  for (const event of events) await director.play(event);
  const frame = director.sample();
  assert.equal(frame.combatants.length, 4);
  assert.equal(frame.actors.length, 4);
  assert.equal(frame.layout.size, 4);
  const before = structuredClone(events);
  frame.combatants[0].monster.hp = 0;
  assert.deepEqual(events, before);
});
test("Doubles and free-for-all content construct valid encounters and reject missing partners before consuming RNG", () => {
  const { party, rng } = setup();
  const seed = rng.seed;
  assert.throws(
    () =>
      createTrainerEncounter(TRAINERS.doubles, {
        inventory: fixtureInventory(),
        party: [party[0]],
        bag: createBag({}),
        db,
        rng,
      }),
    /两位/,
  );
  assert.equal(rng.seed, seed);
  for (const trainer of [TRAINERS.doubles, TRAINERS.freeForAll]) {
    const encounter = createTrainerEncounter(trainer, {
      inventory: fixtureInventory(),
      party,
      bag: createBag({}),
      db,
      rng,
    });
    const b = new Battle({
      items: createItemService(ITEMS, fixtureInventory(ITEMS)),
      ...encounter,
      party,
      db,
      rng,
    });
    assert.equal(b.roster.seats.size, trainer.rivals ? 6 : 4);
  }
});
