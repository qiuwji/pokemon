import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { session } from "../examples/helpers/session.js";
import { createMonster, Random } from "../dist/engine/model.js";
import { interaction, battleOutcome } from "../dist/packs/emerald/story.js";
import { objectsFor } from "../dist/packs/emerald/pack.js";
import { assertPackContent } from "../dist/packs/emerald/content.js";
import { TRAINERS, trainerRewardId } from "../dist/packs/emerald/trainers.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import {
  TriggersApplication,
  TRIGGERS_PORTS,
} from "../dist/packs/emerald/application/triggers-application.js";
import { liveApplicationPorts } from "../dist/packs/emerald/application/ports.js";

function fill(s, partyCount, boxCount) {
  while (s.game.state.party.length < partyCount)
    s.game.state.party.push(createMonster("mudkip", 10, s.db, s.game.rng));
  while (s.game.state.box.length < boxCount)
    s.game.state.box.push(createMonster("zigzagoon", 5, s.db, s.game.rng));
}
function addItem(s, item, count) {
  const plan = s.game.inventory.prepare(s.game.state.bag, [
    { kind: "add", item, count },
  ]);
  assert.equal(plan.ok, true, plan.reason);
  assert(s.game.inventory.commit(plan, s.game.state.bag));
}
const valid = (s) =>
  validateSave(s.game.exportDocument().state, s.db, s.catalog, s.host);

test("Story capture rejects full storage without changing custody, Pokédex, RNG or a valid save", async () => {
  const s = session();
  fill(s, 6, 200);
  const monster = createMonster("ralts", 5, s.db, new Random(321));
  const before = structuredClone(s.game.state),
    seed = s.game.rng.seed;
  await assert.rejects(
    s.game.runStory([{ type: "captureMonster", monster }]),
    /Capture storage unavailable/,
  );
  assert.deepEqual(s.game.state, before);
  assert.equal(s.game.rng.seed, seed);
  assert.equal(s.game.storyBusy, false);
  assert(valid(s));
});

for (const [partyCount, boxCount, destination] of [
  [6, 199, "box"],
  [5, 200, "party"],
]) {
  test(`Story capture uses the last ${destination} slot and duplicate delivery does not exceed limits`, async () => {
    const s = session();
    fill(s, partyCount, boxCount);
    const monster = createMonster("ralts", 5, s.db, new Random(322));
    const commands = [{ type: "captureMonster", monster }];
    await s.game.runStory(commands);
    await s.game.runStory(commands);
    const received = s.game.state[destination].filter(
      (m) => m.uid === monster.uid,
    );
    assert.equal(received.length, 1);
    assert.notEqual(received[0], monster);
    assert.equal(
      s.game.state[destination].length,
      destination === "box" ? 200 : 6,
    );
    assert(s.game.state.caught.includes("ralts"));
    assert(valid(s));
  });
}

test("Full storage blocks native wild capture before item cost, turn or RNG even with a permissive capture rule", async () => {
  const s = session();
  fill(s, 6, 200);
  addItem(s, "pokeball", 1);
  const enemy = createMonster("ralts", 5, s.db, s.game.rng);
  await s.game.startBattle(enemy, {
    rules: {
      canCapture: () => true,
      captureCheck: () => ({ caught: true, shakes: 3 }),
    },
  });
  const before = structuredClone(s.game.state),
    seed = s.game.rng.seed,
    turn = s.game.battle.turn;
  await s.bus.execute("core.battle.action", { kind: "item", item: "pokeball" });
  assert.equal(s.game.battle.turn, turn);
  assert.equal(s.game.battle.result, null);
  assert.equal(s.game.rng.seed, seed);
  assert.deepEqual(s.game.state, before);
  assert.equal(s.game.inventory.quantity(s.game.state.bag, "pokeball"), 1);
  assert(valid(s));
});

test("Native capture commits custody before dialogue; a failed capture announcement cannot lose the monster", async (t) => {
  const s = session();
  fill(s, 6, 199);
  addItem(s, "pokeball", 1);
  const enemy = createMonster("ralts", 5, s.db, s.game.rng);
  await s.game.startBattle(enemy, {
    rules: { captureCheck: () => ({ caught: true, shakes: 3 }) },
  });
  const errors = [];
  t.mock.method(console, "error", (error) => errors.push(error));
  s.game.ui.say = async () => {
    throw new Error("capture announcement failed");
  };
  await s.bus.execute("core.battle.action", { kind: "item", item: "pokeball" });
  await s.settle();
  assert.equal(s.game.battle, null);
  assert.equal(s.game.state.box.length, 200);
  assert.equal(s.game.state.box.filter((m) => m.uid === enemy.uid).length, 1);
  assert.equal(s.game.inventory.quantity(s.game.state.bag, "pokeball"), 0);
  assert(s.game.state.caught.includes("ralts"));
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /announcement failed/);
  assert(valid(s));
  const document = s.game.exportDocument();
  s.game.loadDocument(document);
  assert.equal(s.game.state.box.filter((m) => m.uid === enemy.uid).length, 1);
});

test("Interrupted rival victory cannot lock the Pokédex gift; the durable reward survives save/reload", async () => {
  const s = session(),
    before = s.game.state.money;
  s.game.ui.say = async () => {
    throw new Error("rival dialogue failed");
  };
  const commands = battleOutcome(
    s.game.state,
    { script: "rival", result: "win" },
    s.db,
  );
  await assert.rejects(s.game.runStory(commands), /rival dialogue failed/);
  assert.equal(s.game.state.money, before + 300);
  assert.equal(s.game.state.flags.rivalWon, true);
  assert(s.game.state.story.rewards.includes("rival.prize"));
  assert(!s.game.state.story.completed.includes("rival.victory"));
  assert(valid(s));
  s.game.loadDocument(s.game.exportDocument());
  s.game.ui.say = async () => {};
  const gift = interaction(s.game.state, { kind: "professor" }, "研究所");
  assert(gift.length > 0);
  await s.game.runStory(gift);
  assert.equal(s.game.state.flags.pokedex, true);
  assert.equal(s.game.inventory.quantity(s.game.state.bag, "pokeball"), 5);
  assert.equal(s.game.state.money, before + 300);
  const report = interaction(s.game.state, { kind: "professor" }, "研究所");
  assert.equal(
    report.some((c) => c.type === "reward"),
    false,
  );
  await s.game.runStory(report);
  assert.equal(s.game.inventory.quantity(s.game.state.bag, "pokeball"), 5);
  assert(valid(s));
});

test("Full ball pocket rejects the Pokédex reward atomically and freeing space allows the same interaction to retry", async () => {
  const s = session();
  await s.game.runStory(
    battleOutcome(s.game.state, { script: "rival", result: "win" }, s.db),
  );
  addItem(s, "pokeball", 16 * 99);
  const before = structuredClone(s.game.state);
  await assert.rejects(
    s.game.runStory(interaction(s.game.state, { kind: "professor" }, "研究所")),
  );
  assert(s.game.state.story.history.length > before.story.history.length);
  assert.deepEqual(
    {
      ...s.game.state,
      story: { ...s.game.state.story, history: before.story.history },
    },
    before,
  );
  assert(!s.game.state.flags.pokedex);
  assert(!s.game.state.story.completed.includes("professor.pokedex"));
  assert(
    s.game.inventory.commit(
      s.game.inventory.prepare(s.game.state.bag, [
        { kind: "remove", item: "pokeball", count: 5 },
      ]),
      s.game.state.bag,
    ),
  );
  await s.game.runStory(
    interaction(s.game.state, { kind: "professor" }, "研究所"),
  );
  assert.equal(s.game.state.flags.pokedex, true);
  assert.equal(
    s.game.inventory.quantity(s.game.state.bag, "pokeball"),
    16 * 99,
  );
  assert(valid(s));
});

test("Loss settlement handles an empty party and rejects a non-finite calculation before touching money", async () => {
  const s = session(),
    money = s.game.state.money;
  const party = s.game.state.party;
  s.game.state.party = [];
  await s.game.runStory([{ type: "lossPenalty" }]);
  assert.equal(s.game.state.money, money);
  s.game.state.party = party;
  await s.game.runStory([{ type: "lossPenalty" }]);
  assert.equal(s.game.state.money, money - party[0].level * 8);
  const previous = s.game.state.money,
    level = party[0].level;
  party[0].level = NaN;
  await assert.rejects(
    s.game.runStory([{ type: "lossPenalty" }]),
    /Invalid loss currency/,
  );
  assert.equal(s.game.state.money, previous);
  party[0].level = level;
  assert(valid(s));
});

test("Mother binds by original local identity and uses original coordinates/facing; custom practice NPCs explicitly declare behavior", () => {
  const s = session(),
    map = "LittlerootTown_BrendansHouse_1F";
  const mother = objectsFor({ ...s.game.state, position: { map } }, s.db).find(
    (o) => o.kind === "healMom",
  );
  assert.deepEqual(
    [mother.x, mother.y, mother.dir, mother.movement.rangeX],
    [2, 6, "right", 0],
  );
  const modified = loadContentSync();
  modified.maps[map].npcs.find((o) => o.local_id === mother.sourceLocalId).x =
    3;
  assert.equal(
    objectsFor({ ...s.game.state, position: { map } }, modified).find(
      (o) => o.kind === "healMom",
    ).x,
    3,
  );
  const arenas = objectsFor(
    { ...s.game.state, position: { map: "Route101" } },
    s.db,
  ).filter((o) => o.kind === "arena");
  assert.equal(arenas.length, 2);
  assert(
    arenas.every(
      (o) =>
        o.movement.mode === "still" &&
        o.movement.rangeX === 0 &&
        o.movement.rangeY === 0,
    ),
  );
});

test("Missing or ambiguous native NPC bindings fail in content validation rather than silently standing still", () => {
  for (const edit of [
    (db) => {
      db.maps.LittlerootTown.npcs = db.maps.LittlerootTown.npcs.filter(
        (o) => o.x !== 16 || o.y !== 10,
      );
    },
    (db) => {
      db.maps.LittlerootTown.npcs.push(
        structuredClone(
          db.maps.LittlerootTown.npcs.find((o) => o.x === 16 && o.y === 10),
        ),
      );
    },
    (db) => {
      db.maps.LittlerootTown_BrendansHouse_1F.npcs.find(
        (o) => o.local_id === "LOCALID_PLAYERS_HOUSE_1F_MOM",
      ).local_id = "typo";
    },
  ]) {
    const db = loadContentSync();
    edit(db);
    assert.throws(() => assertPackContent(db), /Native NPC binding failed/);
  }
});

for (const id of ["youngster", "doubles", "freeForAll"]) {
  test(`Trainer ${id} victory writes the same prize identity used by sight eligibility and does not pay twice`, async () => {
    const s = session(),
      money = s.game.state.money;
    const result = {
      trainerId: id,
      script: TRAINERS[id].script,
      result: "win",
    };
    await s.game.runStory(battleOutcome(s.game.state, result, s.db));
    assert(s.game.state.story.rewards.includes(trainerRewardId(id)));
    assert.equal(s.game.state.money, money + TRAINERS[id].prize);
    await s.game.runStory(battleOutcome(s.game.state, result, s.db));
    assert.equal(s.game.state.money, money + TRAINERS[id].prize);
    assert(valid(s));
  });
}

test("Practice trainer sight triggers before victory and stops after the actual story prize is received", async () => {
  const s = session();
  s.game.enter({ map: "Route101", x: 16, y: 9, dir: "up" });
  const npc = s.game.field.npcs
    .objects("Route101")
    .find((o) => o.trainerId === "youngster");
  npc.dir = "down";
  npc.sightRange = 2;
  const scenes = [],
    attempts = [];
  const values = {
    state: s.game.state,
    field: s.game.field,
    world: s.game.world,
    story: s.game.story,
    storyBusy: false,
    trainerDefinitions: s.game.trainerDefinitions,
    save: () => s.game.save(),
    playStory: (commands) => scenes.push(commands),
    encounterStep: (cell) => attempts.push(cell),
  };
  const triggers = new TriggersApplication(
    liveApplicationPorts((name) => values[name], TRIGGERS_PORTS),
  );
  triggers.step(s.game.world.cell(16, 9));
  assert.equal(scenes.length, 1);
  assert.equal(
    scenes[0].find((c) => c.type === "battle").trainerId,
    "youngster",
  );
  await s.game.runStory(
    battleOutcome(
      s.game.state,
      { trainerId: "youngster", script: "practice", result: "win" },
      s.db,
    ),
  );
  triggers.step(s.game.world.cell(16, 9));
  assert.equal(scenes.length, 1);
  assert.equal(attempts.length, 1);
});
