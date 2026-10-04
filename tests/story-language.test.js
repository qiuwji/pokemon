import { loadContentSync } from "../tools/content-io.mjs";
import { createBag } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { ConditionQueries } from "../dist/engine/condition-queries.js";
import {
  matchesCondition,
  validateCondition,
} from "../dist/engine/conditions.js";
import {
  changeStoryVariable,
  validStoryVariables,
} from "../dist/engine/story-variables.js";
import { CommandRunner } from "../dist/engine/commands.js";
import { StoryEngine } from "../dist/engine/story.js";
import { findWatchingTrainer } from "../dist/engine/field-triggers.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
const compare = (id, value, op = "eq", input = {}) => ({
  compare: { query: { id, input }, op, value },
});
test("Story queries compare inventory, party, money and variables; invalid schemas fail before execution", () => {
  const s = {
    money: 500,
    bag: createBag({ potion: 2 }),
    party: [{ species: "mudkip" }, { egg: true, species: "mudkip" }],
    position: { map: "Meadow", x: 2, y: 1 },
    story: { completed: [], rewards: [] },
  };
  changeStoryVariable(s.story, {
    name: "puzzle.count",
    operation: "add",
    value: 1,
  });
  assert(
    matchesCondition(
      {
        all: [
          compare("money", 500, "gte"),
          compare("itemCount", 2, "eq", { item: "potion" }),
          compare("partyCount", 1),
          compare("variable", 1, "eq", { name: "puzzle.count" }),
        ],
      },
      s,
    ),
  );
  assert.throws(() => validateCondition(compare("typo", 1)), /query/);
  assert.throws(
    () => validateCondition(compare("money", "500", "gte")),
    /comparison/,
  );
  assert.throws(() =>
    changeStoryVariable(s.story, {
      name: "puzzle.count",
      operation: "add",
      value: Infinity,
    }),
  );
  assert.equal(s.story.variables["puzzle.count"], 1);
  assert.equal(validStoryVariables({ x: { bad: true } }), false);
});
test("Choice, nested conditions and sequence select only the chosen branch; entire tree validates first", async () => {
  const log = [],
    runner = new CommandRunner(
      { write: (c) => log.push(c.value) },
      { testCondition: (c) => c.ok, choose: async () => "open" },
    );
  const command = {
    type: "choice",
    name: "Gate",
    prompt: "Open?",
    cancel: "leave",
    options: [
      {
        id: "open",
        label: "Open",
        commands: [
          {
            type: "if",
            condition: { ok: true },
            then: [{ type: "write", value: "opened" }],
            else: [{ type: "write", value: "wrong" }],
          },
        ],
      },
      { id: "leave", label: "Leave", commands: [] },
    ],
  };
  await runner.run([command]);
  assert.deepEqual(log, ["opened"]);
  const bad = structuredClone(command);
  bad.options[1].commands = [{ type: "typo" }];
  await assert.rejects(
    runner.run([{ type: "write", value: "partial" }, bad]),
    /Unknown/,
  );
  assert.deepEqual(log, ["opened"]);
  bad.options[1].commands = [];
  bad.cancel = "missing";
  assert.throws(() => runner.validate([bad]), /cancellation/);
});
test("Region triggers respect bounds, prerequisites and once-only completion", () => {
  const engine = new StoryEngine([
    {
      id: "gate",
      trigger: "step",
      once: true,
      where: { map: "Meadow", x: 2, y: 3, width: 2, height: 1 },
      build: () => [{ type: "wait", ms: 1 }],
    },
  ]);
  const s = {
    story: { completed: [], rewards: [] },
    position: { map: "Meadow", x: 1, y: 3 },
  };
  assert.equal(engine.resolve("step", s).length, 0);
  s.position.x = 2;
  assert.equal(engine.resolve("step", s).length, 2);
  s.story.completed.push("gate");
  assert.equal(engine.resolve("step", s).length, 0);
  assert.throws(
    () =>
      new StoryEngine([
        {
          id: "bad",
          trigger: "step",
          where: { map: "Meadow", x: 0, y: 0, width: 0, height: 1 },
          build: () => [],
        },
      ]),
    /region|where/,
  );
});
test("Trainer sight uses facing/range, collision and blockers without moving actors", () => {
  const m = {
    id: "Meadow",
    width: 5,
    height: 5,
    blocks: Array(25).fill(0),
    behavior: Array(25).fill(0),
    connections: [],
    warps: [],
  };
  const trainer = {
      id: "watcher",
      trainerId: "t",
      x: 2,
      y: 1,
      dir: "down",
      sightRange: 3,
    },
    p = { map: "Meadow", x: 2, y: 4, dir: "up" };
  const context = {
    maps: { Meadow: m },
    position: p,
    objects: () => [trainer],
  };
  assert.equal(findWatchingTrainer(context), trainer);
  assert.equal(trainer.y, 1);
  assert.equal(p.y, 4);
  m.blocks[12] = 1024;
  assert.equal(findWatchingTrainer(context), null);
  m.blocks[12] = 0;
  assert.equal(
    findWatchingTrainer({
      ...context,
      objects: () => [trainer, { id: "rock", x: 2, y: 3 }],
    }),
    null,
  );
  assert.equal(
    findWatchingTrainer({ ...context, eligible: () => false }),
    null,
  );
  trainer.dir = "up";
  assert.equal(findWatchingTrainer(context), null);
});
test("Data-only plugin story and custom readonly query execute choices through UI and persist progress", async () => {
  const base = loadContentSync();
  const plugin = {
    id: "story-demo",
    version: "1.0.0",
    dataVersion: 1,
    apiVersion: 1,
    permissions: [],
    setup(api) {
      api.content.register("conditionQueries", "enough-money", {
        schema: { type: "object", properties: {}, additionalProperties: false },
        read: (s) => {
          assert(Object.isFrozen(s));
          return s.money >= 100;
        },
      });
      api.story.register("gate", {
        trigger: "step",
        once: true,
        where: { map: "LittlerootTown", x: 5, y: 8, width: 1, height: 1 },
        requires: compare("story-demo:enough-money", true),
        commands: [
          {
            type: "choice",
            name: "Gate",
            prompt: "Open?",
            variable: "gate.choice",
            cancel: "leave",
            options: [
              {
                id: "open",
                label: "Open",
                commands: [
                  {
                    type: "setVariable",
                    name: "gate.count",
                    operation: "add",
                    value: 1,
                  },
                  { type: "reward", id: "gate.open", money: 20 },
                ],
              },
              { id: "leave", label: "Leave", commands: [] },
            ],
          },
        ],
      });
    },
  };
  const { db, catalog, host } = createEmeraldPlugins(base, [plugin]);
  let raw;
  const timeline = new Timeline({ now: () => 0, wait: async () => {} }),
    game = new EmeraldAdventure({
      db,
      catalog,
      plugins: host,
      storage: { getItem: () => null, setItem: (_, v) => (raw = v) },
      timeline,
      transitions: new TransitionController(timeline),
      director: new BattleDirector(timeline),
      motion: new GridMotion(new SceneGraph(db.maps)),
    });
  game.state.position = { map: "LittlerootTown", x: 5, y: 8, dir: "down" };
  game.bindField();
  game.ui = {
    blocked: false,
    dialog: null,
    updateSide() {},
    choose: async (name, prompt, options, cancel) => {
      assert.equal(cancel, "leave");
      return options[0].id;
    },
  };
  const scene = game.story.resolve("step", game.state);
  assert.equal(scene[0].type, "choice");
  const money = game.state.money;
  await game.runStory(scene);
  game.save();
  assert.equal(game.state.money, money + 20);
  assert.equal(game.state.story.variables["gate.choice"], "open");
  assert(game.state.story.completed.includes("story-demo:gate"));
  assert(validateSave(JSON.parse(raw).state, db, catalog, host));
  const before = structuredClone(game.state.story);
  game.ui.choose = async () => "invalid";
  await assert.rejects(game.runStory([scene[0]]), /choice result/);
  assert.deepEqual(game.state.story, before);
});
