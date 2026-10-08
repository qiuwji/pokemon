import { loadContentSync } from "../tools/content-io.mjs";
import { createBag, fixtureInventory } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Random, createMonster } from "../src/engine/model.js";
import { createEmeraldPlugins } from "../src/packs/emerald/extensions.js";
import { createTrainerEncounter } from "../src/engine/trainer-encounters.js";
import { BattleStrategyRegistry } from "../src/engine/battle/strategy-registry.js";
import { EncounterTableRegistry } from "../src/engine/encounter-tables.js";
import { Battle } from "../src/engine/battle.js";
import { objectSchema } from "../src/engine/extensions/values.js";
import { opponentsView } from "../src/engine/battle/ai-observation.js";
import { manifest, session } from "./helpers/session.js";
const base = loadContentSync();
const plugin = (setup) => ({
  id: "ai-pack",
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: ["battle"],
  setup,
});
function compile(setup) {
  const { catalog, db } = createEmeraldPlugins(structuredClone(base), [
    plugin(setup),
  ]);
  return {
    catalog,
    db,
    strategies: new BattleStrategyRegistry(
      catalog.battleStrategies,
      catalog.creatureStrategies,
    ),
  };
}
function trainered(setup, level = 30) {
  const { catalog, db, strategies } = compile(setup);
  const rng = new Random(7),
    party = [createMonster("mudkip", level, db, rng)];
  const encounter = createTrainerEncounter(
    catalog.trainers["ai-pack:strategist"],
    {
      inventory: fixtureInventory(),
      party,
      bag: createBag({}),
      db,
      rng,
      strategies,
      attachments: catalog.battleAttachments,
    },
  );
  return {
    db,
    strategies,
    battle: new Battle({ ...encounter, party, bag: createBag({}), db, rng }),
  };
}

test("Two-layer scoring combines trainer and creature contributions and records an explanation", () => {
  const setup = (api) => {
    const trainer = api.content.register("battleStrategies", "flat", {
      version: 2,
      memory: objectSchema({}),
      score: (view) => ({
        scores: view.candidates.map((c) => ({
          candidateId: c.id,
          value: c.index === 1 ? 5 : 0,
          reasons: ["trainer"],
        })),
      }),
    });
    const creature = api.content.register("creatureStrategies", "prefer", {
      version: 1,
      memory: objectSchema({}),
      score: (view) => ({
        scores: view.candidates.map((c) => ({
          candidateId: c.id,
          value: c.index === 1 ? 50 : 0,
          reasons: ["creature"],
        })),
      }),
    });
    api.content.register("trainers", "strategist", {
      name: "Strategist",
      script: "ai-pack:strategist",
      prize: 10,
      ai: {
        trainer: { id: trainer },
        creature: { id: creature },
        information: "observed",
        choice: { mode: "best", band: 0 },
      },
      party: [{ species: "poochyena", level: 30, moves: ["tackle", "ember"] }],
    });
  };
  const { battle } = trainered(setup);
  const before = battle.rng.snapshot(),
    action = battle.aiRuntime.decideSeat(battle.awaySeat);
  assert.equal(action.kind, "move");
  assert.equal(action.index, 1);
  // Scoring never advances the gameplay RNG stream.
  assert.equal(battle.rng.snapshot(), before);
  const log = battle.aiRuntime.explanations();
  assert.equal(log.length, 1);
  assert.ok(log[0].chosenId.startsWith(`${battle.awaySeat}|m:1`));
  assert.deepEqual(
    log[0].rationale.filter((r) => r === "creature"),
    ["creature"],
  );
  // Repeated reads of the same decision return the identical action without resampling.
  assert.equal(battle.aiRuntime.decideSeat(battle.awaySeat).index, 1);
});

test("Creature memory is keyed by UID and initialised once", () => {
  const setup = (api) => {
    const trainer = api.content.register("battleStrategies", "flat", {
      version: 2,
      memory: objectSchema({}),
      score: () => ({ scores: [] }),
    });
    const creature = api.content.register("creatureStrategies", "memo", {
      version: 1,
      memory: objectSchema({ turn: { type: "integer" } }),
      score: (view) => ({
        scores: [],
        nextMemory: { turn: view.decisionRound },
      }),
    });
    api.content.register("trainers", "strategist", {
      name: "Strategist",
      script: "ai-pack:strategist",
      prize: 10,
      ai: {
        trainer: { id: trainer },
        creature: { id: creature },
        information: "observed",
        choice: { mode: "best", band: 0 },
      },
      party: [{ species: "poochyena", level: 30, moves: ["tackle"] }],
    });
  };
  const { battle } = trainered(setup);
  const uid = battle.roster.occupant(battle.awaySeat).uid;
  battle.aiRuntime.decideSeat(battle.awaySeat);
  assert.deepEqual(battle.aiRuntime.creatureMemory.get(uid), { turn: 1 });
  // A different creature never inherits the previous creature's memory.
  assert.equal(battle.aiRuntime.creatureMemory.size, 1);
});

test("observed projection never carries hidden opponent moves, ability or held item", () => {
  const make = (heldItem) => {
    const { catalog, db, strategies } = compile((api) => {
      const trainer = api.content.register("battleStrategies", "t", {
        version: 2,
        memory: objectSchema({}),
        score: () => ({ scores: [] }),
      });
      api.content.register("trainers", "strategist", {
        name: "S",
        script: "ai-pack:strategist",
        prize: 0,
        ai: { trainer: { id: trainer } },
        party: [{ species: "poochyena", level: 30, moves: ["tackle"] }],
      });
    });
    const rng = new Random(3),
      party = [createMonster("mudkip", 30, db, rng)];
    if (heldItem) party[0].heldItem = heldItem;
    const encounter = createTrainerEncounter(
      catalog.trainers["ai-pack:strategist"],
      {
        inventory: fixtureInventory(),
        party,
        bag: createBag({}),
        db,
        rng,
        strategies,
        attachments: catalog.battleAttachments,
      },
    );
    return new Battle({ ...encounter, party, bag: createBag({}), db, rng });
  };
  const plain = make(null),
    hidden = make("oran_berry");
  const observed = (b) => opponentsView(b, "opponent", { full: false }),
    full = (b) => opponentsView(b, "opponent", { full: true });
  assert.deepEqual(observed(plain), observed(hidden));
  assert.equal(observed(plain)[0].moves, undefined);
  assert.equal(observed(plain)[0].heldItem, undefined);
  assert.notEqual(full(plain)[0].heldItem, full(hidden)[0].heldItem);
  assert.ok(Array.isArray(full(plain)[0].moves));
});

test("Double-battle joint selection avoids duplicate bench switches", () => {
  const setup = (api) => {
    const trainer = api.content.register("battleStrategies", "joint", {
      version: 2,
      memory: objectSchema({}),
      score: () => ({ scores: [] }),
    });
    const creature = api.content.register("creatureStrategies", "switch", {
      version: 1,
      memory: objectSchema({}),
      score: (view) => ({
        scores: view.candidates.map((c) => ({
          candidateId: c.id,
          value: c.kind === "switch" ? 40 : 0,
        })),
      }),
    });
    api.content.register("trainers", "strategist", {
      name: "Doubles",
      script: "ai-pack:strategist",
      prize: 10,
      format: "doubles",
      ai: {
        trainer: { id: trainer },
        creature: { id: creature },
        choice: { mode: "best", band: 0 },
      },
      party: [
        { species: "poochyena", level: 30, moves: ["tackle"] },
        { species: "zigzagoon", level: 30, moves: ["tackle"] },
        { species: "wurmple", level: 30, moves: ["tackle"] },
      ],
    });
  };
  const { catalog, db, strategies } = compile(setup);
  const rng = new Random(5),
    party = [
      createMonster("mudkip", 30, db, rng),
      createMonster("treecko", 30, db, rng),
    ];
  const encounter = createTrainerEncounter(
    catalog.trainers["ai-pack:strategist"],
    {
      inventory: fixtureInventory(),
      party,
      bag: createBag({}),
      db,
      rng,
      strategies,
      attachments: catalog.battleAttachments,
    },
  );
  const battle = new Battle({
    ...encounter,
    party,
    bag: createBag({}),
    db,
    rng,
  });
  const seats = [...battle.roster.seats.values()]
    .filter((s) => s.controllerId === "opponent")
    .map((s) => s.id);
  assert.equal(seats.length, 2);
  const first = battle.aiRuntime.decideSeat(seats[0]);
  const second = battle.aiRuntime.decideSeat(seats[1]);
  // The single shared bench creature must never be sent to both seats.
  assert(!(first.kind === "switch" && second.kind === "switch"));
});

test("core.battle.ai-view reports recorded decisions without replaying them", async () => {
  const pack = manifest(
    "ai-pack",
    (api) => {
      const trainer = api.content.register("battleStrategies", "calm", {
        version: 2,
        memory: objectSchema({}),
        score: () => ({ scores: [] }),
      });
      const creature = api.content.register("creatureStrategies", "firm", {
        version: 1,
        memory: objectSchema({}),
        score: (view) => ({
          scores: view.candidates.map((c) => ({
            candidateId: c.id,
            value: 1,
            reasons: ["calm"],
          })),
        }),
      });
      api.content.register("trainers", "strategist", {
        name: "Strategist",
        script: "ai-pack:strategist",
        prize: 0,
        ai: {
          trainer: { id: trainer },
          creature: { id: creature },
          information: "full",
          choice: { mode: "best", band: 0 },
        },
        // Keep the query under test in an ongoing battle; random critical KOs otherwise start a story transition.
        party: [{ species: "poochyena", level: 20, moves: ["growl"] }],
      });
    },
    ["battle"],
  );
  const s = session([pack]);
  s.mon.moves = [{ id: "tackle", pp: 20 }];
  await s.bus.execute("core.battle.start", { trainerId: "ai-pack:strategist" });
  await s.bus.execute("core.battle.action", { kind: "move", index: 0 });
  const view = await s.bus.execute("core.battle.ai-view", {});
  assert.ok(Array.isArray(view) && view.length >= 1);
  assert.ok(view[0].chosenId);
  const again = await s.bus.execute("core.battle.ai-view", {});
  assert.deepEqual(again, view);
});

test("A configured wild encounter runs a creature-only strategy and keeps unimplemented effects unknown", () => {
  const { db, strategies } = compile((api) => {
    api.content.register("creatureStrategies", "wild", {
      version: 1,
      memory: objectSchema({}),
      score: (view) => ({
        scores: view.candidates.map((c) => ({
          candidateId: c.id,
          value: c.index === 1 ? 9 : 0,
          reasons: ["wild"],
        })),
      }),
    });
  });
  const rng = new Random(11),
    party = [createMonster("mudkip", 20, db, rng)],
    enemy = [createMonster("poochyena", 20, db, rng)];
  enemy[0].moves = [
    { id: "tackle", pp: 20 },
    { id: "ember", pp: 20 },
  ];
  const battle = new Battle({
    party,
    enemyParty: enemy,
    bag: createBag({}),
    db,
    rng,
    strategies,
    aiBindings: {
      opponent: {
        creature: { id: "ai-pack:wild" },
        information: "observed",
        choice: { mode: "best", band: 0 },
        variants: [],
      },
    },
  });
  const action = battle.aiRuntime.decideSeat(battle.awaySeat);
  assert.equal(action.kind, "move");
  assert.equal(action.index, 1);
});

test("AI state is deterministic for equal seeds and fully reversible through checkpoint", () => {
  const setup = (api) => {
    const trainer = api.content.register("battleStrategies", "stable", {
      version: 2,
      memory: objectSchema({}),
      score: () => ({ scores: [] }),
    });
    const creature = api.content.register("creatureStrategies", "mixed", {
      version: 1,
      memory: objectSchema({}),
      score: (view) => ({
        scores: view.candidates.map((c) => ({
          candidateId: c.id,
          value: c.index === 1 ? 4 : 2,
        })),
      }),
    });
    api.content.register("trainers", "strategist", {
      name: "Stable",
      script: "ai-pack:strategist",
      prize: 0,
      ai: {
        trainer: { id: trainer },
        creature: { id: creature },
        information: "observed",
        choice: { mode: "topBand", band: 4 },
      },
      party: [{ species: "poochyena", level: 30, moves: ["tackle", "ember"] }],
    });
  };
  const first = trainered(setup),
    second = trainered(setup),
    snapshot = first.battle.aiRuntime.snapshot();
  const a = first.battle.aiRuntime.decideSeat(first.battle.awaySeat),
    b = second.battle.aiRuntime.decideSeat(second.battle.awaySeat);
  assert.equal(a.index, b.index);
  assert.deepEqual(
    first.battle.aiRuntime.explanations(),
    second.battle.aiRuntime.explanations(),
  );
  assert.equal(first.battle.aiRuntime.explanations().length, 1);
  first.battle.aiRuntime.restore(snapshot);
  assert.equal(first.battle.aiRuntime.explanations().length, 0);
  assert.equal(first.battle.aiRuntime.creatureMemory.size, 0);
  assert.equal(first.battle.aiRuntime.teamMemory.size, 0);
});

test("A registered encounter table carries a wild creature ai through to the battle", () => {
  const { catalog, db, strategies } = compile((api) => {
    const creature = api.content.register("creatureStrategies", "wary", {
      version: 1,
      memory: objectSchema({}),
      score: (view) => ({
        scores: view.candidates.map((c) => ({
          candidateId: c.id,
          value: c.index === 1 ? 3 : 1,
        })),
      }),
    });
    api.content.register("encounters", "route101-ai", {
      map: "Route101",
      area: "land",
      rate: 20,
      ai: {
        creature: { id: creature },
        information: "observed",
        choice: { mode: "best", band: 0 },
      },
      entries: [{ species: "poochyena", weight: 1, min: 5, max: 5 }],
    });
  });
  const registry = new EncounterTableRegistry(catalog.encounters, catalog);
  const table = registry.table("ai-pack:route101-ai");
  assert.equal(table.ai.information, "observed");
  assert.equal(table.ai.creature.id, "ai-pack:wary");
  // The registered binding drives a wild battle with no trainer layer.
  const rng = new Random(21),
    party = [createMonster("mudkip", 20, db, rng)],
    enemy = [createMonster("poochyena", 20, db, rng)];
  enemy[0].moves = [
    { id: "tackle", pp: 20 },
    { id: "ember", pp: 20 },
  ];
  const battle = new Battle({
    party,
    enemyParty: enemy,
    bag: createBag({}),
    db,
    rng,
    strategies,
    aiBindings: { opponent: table.ai },
  });
  assert.equal(battle.aiRuntime.decideSeat(battle.awaySeat).index, 1);
});

test("An encounter table with an unknown wild strategy is rejected at startup", () => {
  assert.throws(() =>
    compile((api) => {
      api.content.register("encounters", "bad-ai", {
        map: "Route101",
        area: "land",
        rate: 20,
        ai: { creature: { id: "ai-pack:missing" } },
        entries: [{ species: "poochyena", weight: 1, min: 5, max: 5 }],
      });
    }),
  );
});
