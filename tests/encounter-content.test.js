import { createBag, fixtureInventory } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Random, createMonster } from "../dist/engine/model.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { createTrainerEncounter } from "../dist/engine/trainer-encounters.js";
import { BattleStrategyRegistry } from "../dist/engine/battle/strategy-registry.js";
import { EncounterTableRegistry } from "../dist/engine/encounter-tables.js";
import { Battle } from "../dist/engine/battle.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { SceneGraph, GridMotion } from "../dist/engine/motion.js";
const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const plugin = (setup) => ({
  id: "trainer-pack",
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: ["battle"],
  setup,
});
const registration = (
  decide = (v) =>
    v.candidates.findIndex((a) => a.kind === "move" && a.index === 0),
) =>
  plugin((api) => {
    const strategy = api.content.register("battleStrategies", "first", {
      decide,
    });
    api.content.register("trainers", "researcher", {
      name: "Researcher",
      script: "trainer-pack:researcher",
      prize: 120,
      strategy,
      party: [
        {
          species: "zigzagoon",
          level: 2,
          moves: ["tackle"],
          heldItem: "oran_berry",
        },
        { species: "poochyena", level: 2, moves: ["tackle"] },
      ],
    });
    api.content.register("encounters", "laboratory", {
      map: "Route101",
      area: "land",
      rate: 20,
      requires: { flag: "researchReady" },
      entries: [{ species: "ralts", weight: 1, min: 3, max: 3 }],
    });
  });
test("Plugin trainer, policy and conditional encounter references resolve at startup without changing built-in content", () => {
  const { catalog, db } = createEmeraldPlugins(structuredClone(base), [
    registration(),
  ]);
  const rng = new Random(12),
    party = [createMonster("mudkip", 6, db, rng)],
    strategies = new BattleStrategyRegistry(catalog.battleStrategies);
  const encounter = createTrainerEncounter(
    catalog.trainers["trainer-pack:researcher"],
    {
      inventory: fixtureInventory(),
      party,
      bag: createBag({}),
      db,
      rng,
      strategies,
    },
  );
  assert.equal(encounter.enemyParty.length, 2);
  assert.equal(encounter.enemyParty[0].heldItem, "oran_berry");
  assert.deepEqual(encounter.enemyParty[0].moves, [
    { id: "tackle", pp: db.moves.tackle.pp },
  ]);
  const battle = new Battle({
    ...encounter,
    party,
    bag: createBag({}),
    db,
    rng,
  });
  assert.equal(battle.ai(battle, "away:0").index, 0);
  const tables = new EncounterTableRegistry(catalog.encounters, db);
  assert.equal(tables.select("Route101", "land", { flags: {} }), null);
  assert.equal(
    tables.select("Route101", "land", { flags: { researchReady: true } })
      .entries[0].species,
    "ralts",
  );
  assert.equal(
    tables.select("Route101", "water", { flags: { researchReady: true } }),
    null,
  );
  assert.equal(
    base.maps.Route101.encounters.some((e) => e.species === "ralts"),
    false,
  );
});
test("Invalid strategy/party/encounter references fail before producing a game", () => {
  for (const setup of [
    (api) =>
      api.content.register("trainers", "bad", {
        name: "Bad",
        script: "bad",
        prize: 0,
        strategy: "missing",
        party: [{ species: "mudkip", level: 2 }],
      }),
    (api) =>
      api.content.register("trainers", "bad", {
        name: "Bad",
        script: "bad",
        prize: 0,
        party: [{ species: "mudkip", level: 2, moves: ["missing"] }],
      }),
    (api) =>
      api.content.register("encounters", "bad", {
        map: "missing",
        area: "land",
        rate: 20,
        entries: [{ species: "mudkip", weight: 1, min: 2, max: 2 }],
      }),
  ])
    assert.throws(() =>
      createEmeraldPlugins(structuredClone(base), [plugin(setup)]),
    );
});
test("Policy receives frozen detached decisions and a bad choice rolls back the entire round and RNG", () => {
  const { catalog, db } = createEmeraldPlugins(structuredClone(base), [
    registration((v) => {
      assert(Object.isFrozen(v));
      assert(Object.isFrozen(v.candidates[0]));
      assert.throws(() => (v.snapshot.combatants[0].monster.hp = 0));
      return 999;
    }),
  ]);
  const rng = new Random(20),
    party = [createMonster("mudkip", 6, db, rng)];
  const encounter = createTrainerEncounter(
    catalog.trainers["trainer-pack:researcher"],
    {
      inventory: fixtureInventory(),
      party,
      bag: createBag({}),
      db,
      rng,
      strategies: new BattleStrategyRegistry(catalog.battleStrategies),
    },
  );
  const b = new Battle({ ...encounter, party, db, rng, bag: createBag({}) }),
    before = structuredClone(party),
    seed = rng.snapshot();
  assert.throws(
    () => b.act({ kind: "move", index: 0 }),
    /Invalid strategy choice/,
  );
  assert.deepEqual(party, before);
  assert.equal(rng.snapshot(), seed);
  assert.equal(b.turn, 0);
});
test("Public battle.start uses registered trainer, keeps battle alive for its bench and grants one default prize", async () => {
  const { catalog, db, host } = createEmeraldPlugins(structuredClone(base), [
    registration(),
  ]);
  const timeline = new Timeline({ now: () => 0, wait: async () => {} }),
    game = new EmeraldAdventure({
      db,
      catalog,
      plugins: host,
      timeline,
      transitions: new TransitionController(timeline),
      director: new BattleDirector(timeline),
      motion: new GridMotion(new SceneGraph(db.maps)),
      storage: { getItem: () => null, setItem() {} },
    });
  game.ui = {
    blocked: false,
    dialog: null,
    closeModal() {},
    say: async () => {},
    updateSide() {},
    resetBattleMenu() {},
    drawBattleHUD() {},
    announce() {},
    checkGrowth() {},
    extensions: { refresh() {} },
  };
  const { bus } = attachEmeraldExtensions(game, host);
  const lead = createMonster("mudkip", 100, db, game.rng);
  lead.moves = [{ id: "aerial_ace", pp: db.moves.aerial_ace.pp }];
  game.state.party.push(lead);
  game.state.flags.rescued = true;
  const money = game.state.money;
  assert(
    await bus.execute("core.battle.start", {
      trainerId: "trainer-pack:researcher",
    }),
  );
  const id = game.battle.trainerId;
  await bus.execute("core.battle.action", { kind: "move", index: 0 });
  assert(game.battle && !game.battle.ended);
  assert.equal(game.battle.enemyParty.filter((m) => m.hp > 0).length, 1);
  await bus.execute("core.battle.action", { kind: "move", index: 0 });
  await new Promise(setImmediate);
  assert.equal(game.battle, null);
  assert.equal(game.state.money, money + 120);
  assert.equal(
    game.state.story.rewards.filter((x) => x === `trainer.${id}.prize`).length,
    1,
  );
});
