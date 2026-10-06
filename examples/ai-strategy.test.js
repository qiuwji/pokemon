import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
import { createBag } from "../tests/helpers/inventory-fixture.js";
import { loadContentSync } from "../tools/content-io.mjs";
import { createMonster, Random } from "../src/engine/model.js";
import { createEmeraldPlugins } from "../src/packs/emerald/extensions.js";
import { BattleStrategyRegistry } from "../src/engine/battle/strategy-registry.js";
import { Battle } from "../src/engine/battle.js";
import { objectSchema } from "../src/engine/extensions/values.js";

// A two-layer AI: the trainer strategy owns the controller (resource use, switches), the creature
// strategy owns one individual's action preference. Both are content; the host does the rest.
const strategyPack = manifest(
  "ai-demo",
  (api) => {
    const trainer = api.content.register("battleStrategies", "steady", {
      version: 2,
      memory: objectSchema({}),
      // Prefer spending an item only when a creature is hurt; otherwise stay neutral.
      score: (view) => ({
        scores: view.candidates
          .filter((c) => c.kind === "item" || c.kind === "switch")
          .map((c) => ({ candidateId: c.id, value: 10, reasons: ["controller" ] })),
      }),
    });
    const creature = api.content.register("creatureStrategies", "second", {
      version: 1,
      memory: objectSchema({}),
      score: (view) => ({
        scores: view.candidates.map((c) => ({
          candidateId: c.id,
          value: c.index === 1 ? 5 : 0,
          reasons: ["prefers-second-move"],
        })),
      }),
    });
    api.content.register("trainers", "duelist", {
      name: "Duelist",
      script: "ai-demo:duelist",
      prize: 0,
      ai: {
        trainer: { id: trainer },
        creature: { id: creature },
        information: "observed",
        choice: { mode: "best", band: 0 },
      },
      party: [{ species: "poochyena", level: 5, moves: ["tackle", "ember"] }],
    });
  },
  ["battle"],
);

test("singles: creature preference and trainer policy combine through the public battle commands", async () => {
  const s = session([strategyPack]);
  s.mon.moves = [{ id: "tackle", pp: 20 }];
  await s.bus.execute("core.battle.start", { trainerId: "ai-demo:duelist" });
  await s.bus.execute("core.battle.action", { kind: "move", index: 0 });
  const view = await s.bus.execute("core.battle.ai-view", {});
  assert.ok(view.length >= 1);
  assert.match(view[0].chosenId, /m:1/);
  assert.deepEqual(
    view[0].rationale.filter((r) => r === "prefers-second-move"),
    ["prefers-second-move"],
  );
});

const wildPack = manifest(
  "ai-wild-demo",
  (api) => {
    api.content.register("creatureStrategies", "wary", {
      version: 1,
      memory: objectSchema({}),
      score: (view) => ({
        scores: view.candidates.map((c) => ({
          candidateId: c.id,
          value: c.index === 1 ? 3 : 1,
          reasons: ["wary"],
        })),
      }),
    });
  },
  ["battle"],
);

test("wild: a configured encounter carries a creature-only strategy without a trainer layer", () => {
  const base = loadContentSync();
  const { catalog, db } = createEmeraldPlugins(structuredClone(base), [
    wildPack,
  ]);
  const strategies = new BattleStrategyRegistry(
      catalog.battleStrategies,
      catalog.creatureStrategies,
    ),
    rng = new Random(9),
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
        creature: { id: "ai-wild-demo:wary" },
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
