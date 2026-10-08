import { loadContentSync } from "../tools/content-io.mjs";
import { createBag, fixtureInventory } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Random, createMonster } from "../src/engine/model.js";
import { createEmeraldPlugins } from "../src/game/emerald/assembly/extensions.js";
import { createTrainerEncounter } from "../src/engine/trainer-encounters.js";
import { BattleStrategyRegistry } from "../src/engine/battle/strategy-registry.js";
import { objectSchema } from "../src/engine/extensions/values.js";
import {
  validateScoreResult,
  validateJointScores,
  validateChoice,
  SCORE_LIMIT,
} from "../src/engine/battle/strategy-contract.js";
const base = loadContentSync();
const plugin = (setup) => ({
  id: "strategy-pack",
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: ["battle"],
  setup,
});
const compile = (setup) =>
  createEmeraldPlugins(structuredClone(base), [plugin(setup)]);
const scoreAll = () => (view) => ({
  scores: view.candidates.map((c) => ({
    candidateId: c.id,
    value: 1,
    reasons: ["attack"],
  })),
});

test("Trainer v2 and creature strategies register, inherit and bind by UID without touching the Monster", () => {
  const { catalog, db } = compile((api) => {
    const trainer = api.content.register("battleStrategies", "aggressive", {
      version: 2,
      parameters: objectSchema(
        { focus: { type: "string", enum: ["attack", "wall"] } },
        ["focus"],
      ),
      memory: objectSchema(),
      score: scoreAll(),
    });
    const setup = api.content.register("creatureStrategies", "setup-first", {
      version: 1,
      score: scoreAll(),
    });
    const fallback = api.content.register("creatureStrategies", "fallback", {
      version: 1,
      score: scoreAll(),
    });
    api.content.register("trainers", "duo", {
      name: "Duo",
      script: "strategy-pack:duo",
      prize: 10,
      ai: {
        trainer: { id: trainer, parameters: { focus: "attack" } },
        creature: { id: fallback },
        information: "observed",
        choice: { mode: "topBand", band: 5 },
      },
      party: [
        {
          species: "zigzagoon",
          level: 5,
          moves: ["tackle"],
          ai: { id: setup },
        },
        { species: "poochyena", level: 5, moves: ["tackle"] },
      ],
    });
  });
  const strategies = new BattleStrategyRegistry(
    catalog.battleStrategies,
    catalog.creatureStrategies,
  );
  assert(strategies.isV2("strategy-pack:aggressive"));
  assert(strategies.hasCreature("strategy-pack:setup-first"));
  const rng = new Random(3),
    party = [createMonster("mudkip", 6, db, rng)];
  const encounter = createTrainerEncounter(
    catalog.trainers["strategy-pack:duo"],
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
  const controller = encounter.topology.sides[1].controllers[0];
  assert.equal(controller.ai.trainer.id, "strategy-pack:aggressive");
  assert.deepEqual(controller.ai.trainer.parameters, { focus: "attack" });
  assert.equal(controller.ai.information, "observed");
  assert.deepEqual(controller.ai.choice, { mode: "topBand", band: 5 });
  const [first, second] = encounter.enemyParty.map((m) => m.uid);
  assert.equal(controller.ai.creatures[first].id, "strategy-pack:setup-first");
  assert.equal(controller.ai.creatures[second].id, "strategy-pack:fallback");
  // The binding lives on the controller, never on the persistent creature data.
  assert.equal("ai" in encounter.enemyParty[0], false);
  assert.equal(controller.strategy, "random");
});

test("Legacy strategies and the built-in random/tactical policies stay available", () => {
  const { catalog } = compile((api) => {
    api.content.register("battleStrategies", "first", { decide: () => 0 });
  });
  const strategies = new BattleStrategyRegistry(
    catalog.battleStrategies,
    catalog.creatureStrategies,
  );
  assert(strategies.has("random"));
  assert(strategies.has("tactical"));
  assert(strategies.has("strategy-pack:first"));
  assert.equal(strategies.isV2("strategy-pack:first"), false);
  assert.equal(typeof strategies.definition("strategy-pack:first").decide, "function");
});

test("Invalid strategy and binding declarations fail before a game is produced", () => {
  const cases = [
    (api) => api.content.register("battleStrategies", "no-score", { version: 2 }),
    (api) =>
      api.content.register("battleStrategies", "future", {
        version: 3,
        score: scoreAll(),
      }),
    (api) =>
      api.content.register("creatureStrategies", "wrong-version", {
        version: 2,
        score: scoreAll(),
      }),
    (api) => {
      const trainer = api.content.register("battleStrategies", "t", {
        version: 2,
        score: scoreAll(),
      });
      api.content.register("trainers", "both", {
        name: "Both",
        script: "s",
        prize: 0,
        strategy: "random",
        ai: { trainer: { id: trainer } },
        party: [{ species: "mudkip", level: 2 }],
      });
    },
    (api) => {
      const creature = api.content.register("creatureStrategies", "c", {
        version: 1,
        score: scoreAll(),
      });
      api.content.register("trainers", "orphan", {
        name: "Orphan",
        script: "s",
        prize: 0,
        party: [{ species: "mudkip", level: 2, ai: { id: creature } }],
      });
    },
    (api) =>
      api.content.register("trainers", "unknown-trainer-ref", {
        name: "U",
        script: "s",
        prize: 0,
        ai: { trainer: { id: "strategy-pack:missing" } },
        party: [{ species: "mudkip", level: 2 }],
      }),
    (api) =>
      api.content.register("trainers", "variants", {
        name: "V",
        script: "s",
        prize: 0,
        ai: {
          variants: Array.from({ length: 9 }, () => ({
            attachments: [{ id: "missing" }],
          })),
        },
        party: [{ species: "mudkip", level: 2 }],
      }),
    (api) =>
      api.content.register("trainers", "wide-variant", {
        name: "W",
        script: "s",
        prize: 0,
        ai: { variants: [{ attachments: [{ id: "a" }, { id: "b" }, { id: "c" }] }] },
        party: [{ species: "mudkip", level: 2 }],
      }),
    (api) =>
      api.content.register("trainers", "unknown-attachment", {
        name: "A",
        script: "s",
        prize: 0,
        ai: { variants: [{ attachments: [{ id: "nope" }] }] },
        party: [{ species: "mudkip", level: 2 }],
      }),
    (api) =>
      api.content.register("trainers", "bad-choice", {
        name: "C",
        script: "s",
        prize: 0,
        ai: { choice: { mode: "best", band: 5 } },
        party: [{ species: "mudkip", level: 2 }],
      }),
    (api) =>
      api.content.register("trainers", "bad-params", {
        name: "P",
        script: "s",
        prize: 0,
        ai: { trainer: { id: "strategy-pack:known", parameters: { nope: 1 } } },
        party: [{ species: "mudkip", level: 2 }],
      }),
  ];
  const compileWithKnown = (setup) =>
    compile((api) => {
      api.content.register("battleStrategies", "known", {
        version: 2,
        parameters: objectSchema({ focus: { type: "string" } }, ["focus"]),
        score: scoreAll(),
      });
      setup(api);
    });
  for (const setup of cases) assert.throws(() => compileWithKnown(setup), /./);
});

test("Async strategy callbacks are rejected as soon as they are invoked", () => {
  const { catalog } = compile((api) => {
    api.content.register("creatureStrategies", "slow", {
      version: 1,
      score: async () => ({ scores: [] }),
    });
  });
  assert.throws(
    () => catalog.creatureStrategies["strategy-pack:slow"].score({ candidates: [] }),
    /synchronous|Promise/i,
  );
});

test("Score results enforce candidate membership, bounds, reasons and memory schema", () => {
  const ids = new Set(["a", "b"]);
  assert.deepEqual(
    validateScoreResult(
      { scores: [{ candidateId: "a", value: 5, reasons: ["x"] }] },
      ids,
      objectSchema(),
    ),
    { scores: [{ candidateId: "a", value: 5, reasons: ["x"] }], nextMemory: undefined },
  );
  assert.throws(() => validateScoreResult({ scores: "no" }, ids, objectSchema()));
  assert.throws(() =>
    validateScoreResult({ scores: [{ candidateId: "z", value: 1 }] }, ids, objectSchema()),
  );
  assert.throws(() =>
    validateScoreResult(
      { scores: [{ candidateId: "a", value: 1 }, { candidateId: "a", value: 2 }] },
      ids,
      objectSchema(),
    ),
  );
  assert.throws(() =>
    validateScoreResult(
      { scores: [{ candidateId: "a", value: SCORE_LIMIT + 1 }] },
      ids,
      objectSchema(),
    ),
  );
  assert.throws(() =>
    validateScoreResult({ scores: [{ candidateId: "a", value: NaN }] }, ids, objectSchema()),
  );
  assert.throws(() =>
    validateScoreResult(
      { scores: [{ candidateId: "a", value: 1, reasons: Array(9).fill("r") }] },
      ids,
      objectSchema(),
    ),
  );
  assert.throws(() =>
    validateScoreResult(
      { scores: [{ candidateId: "a", value: 1, reasons: ["x".repeat(81)] }] },
      ids,
      objectSchema(),
    ),
  );
  assert.throws(() =>
    validateScoreResult({ scores: [], nextMemory: { turn: 1 } }, ids, objectSchema()),
  );
  assert.throws(() => validateScoreResult({ scores: [], extra: 1 }, ids, objectSchema()));
  const memory = objectSchema({ turn: { type: "integer" } }, ["turn"]);
  assert.deepEqual(
    validateScoreResult({ scores: [], nextMemory: { turn: 2 } }, ids, memory).nextMemory,
    { turn: 2 },
  );
  assert.throws(() =>
    validateScoreResult({ scores: [], nextMemory: { turn: "x" } }, ids, memory),
  );
});

test("Joint scoring and choice policy enforce their own boundaries", () => {
  assert.deepEqual(validateJointScores([], new Set()), []);
  assert.throws(() => validateJointScores([{ proposalId: "p", value: 1 }], new Set(["q"])));
  assert.throws(() =>
    validateJointScores(
      [{ proposalId: "p", value: 1 }, { proposalId: "p", value: 2 }],
      new Set(["p"]),
    ),
  );
  assert.throws(() =>
    validateJointScores([{ proposalId: "p", value: SCORE_LIMIT + 1 }], new Set(["p"])),
  );
  assert.deepEqual(validateChoice(undefined), { mode: "best", band: 0 });
  assert.throws(() => validateChoice({ mode: "best", band: 5 }));
  assert.throws(() => validateChoice({ mode: "nope" }));
  assert.throws(() => validateChoice({ mode: "topBand", band: -1 }));
  assert.deepEqual(validateChoice({ mode: "topBand", band: 3 }), {
    mode: "topBand",
    band: 3,
  });
});
