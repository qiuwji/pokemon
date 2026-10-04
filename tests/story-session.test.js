import test from "node:test";
import assert from "node:assert/strict";
import { session, manifest } from "./helpers/session.js";
import { StoryCatalog } from "../dist/engine/story-catalog.js";
import {
  StorySession,
  validStorySession,
} from "../dist/engine/story-session.js";
import { DEFAULT_CONDITION_QUERIES } from "../dist/engine/condition-queries.js";

function program(commands, suffix = "demo") {
  let id;
  const plugin = manifest(`story-${suffix}`, (api) => {
    id = api.story.registerBundle("chapter", {
      version: 1,
      scripts: { entry: { durable: true, commands } },
      entries: {
        start: {
          trigger: "interact",
          selector: { objectId: "session-guide" },
          script: "entry",
          once: true,
        },
      },
    }).scripts.entry;
  });
  const s = session([plugin]);
  return {
    ...s,
    id,
    plugin,
    begin: () =>
      s.game.runStory(
        s.game.story.resolve("interact", s.game.state, {
          object: { id: "session-guide" },
        }),
      ),
  };
}

test("Stable story checkpoints survive a failed presentation and reload without replaying domain rewards", async () => {
  const s = program([
      { node: "gift", type: "reward", id: "story-demo:gift", money: 50 },
      { node: "save", type: "checkpoint" },
      { node: "say", type: "dialog", name: "向导", lines: ["下一段剧情。"] },
      {
        node: "finish",
        type: "flag",
        key: "story-demo:chapterFinished",
        value: true,
      },
    ]),
    before = s.game.state.money;
  s.game.ui.say = async () => {
    throw new Error("screen gone");
  };
  await assert.rejects(s.begin(), /screen gone/);
  assert.equal(s.game.state.money, before + 50);
  assert.equal(s.game.state.story.session.cursor, s.id + "/say");
  assert(!s.game.storyBusy);
  const saved = JSON.parse(s.game.saveStore.raw());
  assert.equal(saved.state.story.session.cursor, s.id + "/say");
  s.game.loadDocument(saved);
  s.game.ui.say = async () => {};
  await s.game.resumeStory();
  assert.equal(s.game.state.money, before + 50);
  assert.equal(s.game.state.story.session, null);
  assert(s.game.state.flags["story-demo:chapterFinished"]);
  assert(s.game.state.story.completed.includes("story-demo:chapter.start"));
});

test("A story battle transfers control and automatically continues only its confirmed result branch", async () => {
  const s = program(
    [
      {
        node: "battle",
        type: "battle",
        species: "zigzagoon",
        level: 2,
        onResult: {
          win: [
            {
              node: "win",
              type: "flag",
              key: "story-battle:sessionWon",
              value: true,
            },
          ],
          loss: [
            {
              node: "loss",
              type: "flag",
              key: "story-battle:sessionLost",
              value: true,
            },
          ],
          escaped: [],
          caught: [],
        },
      },
      {
        node: "after",
        type: "dialog",
        name: "向导",
        lines: ["战斗结束，接着出发吧。"],
      },
    ],
    "battle",
  );
  await s.begin();
  assert(s.game.battle);
  assert.equal(s.game.state.story.session.status, "battle");
  assert(!s.game.state.flags["story-battle:sessionWon"]);
  assert.throws(() => s.game.exportDocument(), /剧情战斗/);
  const checkpoint = JSON.parse(s.game.saveStore.raw());
  assert.equal(checkpoint.state.story.session.status, "ready");
  s.game.battle.enemy.hp = 1; // Arrange damage boundary; victory and continuation use the real action pipeline.
  for (let i = 0; i < 10 && s.game.battle; i++)
    await s.game.turn({ kind: "move", index: 0 });
  await s.settle();
  assert.equal(s.game.battle, null);
  assert(s.game.state.flags["story-battle:sessionWon"]);
  assert(!s.game.state.flags["story-battle:sessionLost"]);
  assert.equal(s.game.state.story.session, null);
  assert.equal(s.dialogs.at(-1).name, "向导");
});

test("Battle receipts are correlated, duplicate delivery is inert and unexpected outcomes do not advance state", async () => {
  const catalog = new StoryCatalog(
    [
      {
        id: "test:chapter",
        version: 1,
        scripts: {
          entry: {
            durable: true,
            commands: [
              {
                node: "fight",
                type: "battle",
                species: "zigzagoon",
                level: 2,
                onResult: { win: [{ node: "end", type: "wait", ms: 0 }] },
              },
            ],
          },
        },
      },
    ],
    { queries: DEFAULT_CONDITION_QUERIES },
  );
  const progress = {};
  const runtime = new StorySession({
    catalog,
    checkpoint: async () => {},
    startBattle: async () => true,
  });
  await runtime.run(() => progress, { id: "test:chapter.entry" });
  const before = structuredClone(progress),
    token = progress.session.token;
  assert.equal(runtime.battleResult(progress, "wrong", "win"), false);
  assert.deepEqual(progress, before);
  assert.throws(
    () => runtime.battleResult(progress, token, "loss"),
    /Unhandled/,
  );
  assert.deepEqual(progress, before);
  assert(runtime.battleResult(progress, token, "win"));
  assert.equal(runtime.battleResult(progress, token, "win"), false);
});

test("Unknown saved cursor, removed plugin and missing stable IDs are rejected before resuming effects", async () => {
  const s = program(
    [{ node: "say", type: "dialog", name: "", lines: ["hello"] }],
    "validation",
  );
  s.game.ui.say = async () => {
    throw new Error("pause");
  };
  await assert.rejects(s.begin(), /pause/);
  const document = s.game.exportDocument();
  assert(document.state.contentDependencies.includes("story-validation"));
  const broken = structuredClone(document);
  broken.state.story.session.cursor = "unknown";
  assert.throws(() => s.game.loadDocument(broken), /Invalid save/);
  assert.throws(() => session().game.loadDocument(document), /存档需要插件/);
  const invalid = program(
    [{ type: "reward", id: "story-invalid:bad", money: 100 }],
    "invalid",
  );
  const before = invalid.game.state.money;
  await assert.rejects(invalid.begin(), /Stable story node required/);
  assert.equal(invalid.game.state.money, before);
});

test("Execution budget failures leave a valid save-shaped record rather than writing an out-of-range counter", async () => {
  const catalog = new StoryCatalog(
    [
      {
        id: "test:budget",
        version: 1,
        scripts: {
          entry: {
            durable: true,
            commands: [{ node: "end", type: "wait", ms: 0 }],
          },
        },
      },
    ],
    { queries: DEFAULT_CONDITION_QUERIES },
  );
  const progress = {
    session: {
      script: "test:budget.entry",
      input: {},
      cursor: "test:budget.entry/end",
      status: "ready",
      steps: 10000,
    },
  };
  const runtime = new StorySession({ catalog });
  await assert.rejects(
    runtime.run(() => progress),
    /budget/,
  );
  assert(validStorySession(progress.session));
  assert.equal(progress.session.steps, 10000);
});

test("A suspended durable script cannot leak into trailing commands, and waiting battle documents cannot load", async () => {
  const s = program(
    [
      {
        node: "fight",
        type: "battle",
        species: "zigzagoon",
        level: 2,
        onResult: { win: [], loss: [], caught: [], escaped: [] },
      },
    ],
    "suspend",
  );
  await s.game.runStory([
    { type: "script", id: s.id },
    { type: "flag", key: "mustNotRun", value: true },
  ]);
  assert(s.game.battle);
  assert(!s.game.state.flags.mustNotRun);
  const checkpoint = JSON.parse(s.game.saveStore.raw());
  checkpoint.state.story.session = structuredClone(s.game.state.story.session);
  assert.throws(
    () => session([s.plugin]).game.loadDocument(checkpoint),
    /Invalid save/,
  );
});

test("Parallel result branches claim resources and durable programs reject suspension inside parallel tracks", async () => {
  const { CommandRunner } = await import("../dist/engine/commands.js");
  const runner = new CommandRunner(
    { reward: () => {}, move: () => {} },
    { resources: (c) => (c.type === "move" ? [c.actor] : []) },
  );
  assert.throws(
    () =>
      runner.validate([
        {
          type: "parallel",
          commands: [
            {
              type: "reward",
              onResult: { ok: [{ type: "move", actor: "guide" }] },
            },
            { type: "move", actor: "guide" },
          ],
        },
      ]),
    /Parallel story conflict/,
  );
  const catalog = new StoryCatalog([
    {
      id: "test:parallel",
      version: 1,
      scripts: {
        entry: {
          durable: true,
          commands: [
            {
              type: "parallel",
              node: "tracks",
              commands: [{ type: "checkpoint", node: "save" }],
            },
          ],
        },
      },
    },
  ]);
  assert.throws(
    () => catalog.program("test:parallel.entry", {}),
    /suspension cannot run in parallel/,
  );
});

test("A moved scene actor is restored at the saved stable checkpoint before resumed dialogue", async () => {
  const s = program(
    [
      {
        node: "stage",
        type: "scene",
        position: { map: "LittlerootTown", x: 8, y: 10, dir: "up" },
        actors: [
          {
            id: "guide",
            x: 8,
            y: 9,
            actor: "Boy1",
            dir: "down",
            name: "向导",
            kind: "talk",
          },
        ],
      },
      { node: "walk", type: "move", actor: "guide", path: ["right"] },
      { node: "save", type: "checkpoint" },
      { node: "say", type: "dialog", name: "向导", lines: ["在这里继续。"] },
    ],
    "actors",
  );
  s.game.ui.say = async () => {
    throw new Error("leave page");
  };
  await assert.rejects(s.begin(), /leave page/);
  const document = JSON.parse(s.game.saveStore.raw());
  assert.equal(document.state.story.session.actors[0].x, 9);
  s.game.loadDocument(document);
  let restored;
  s.game.ui.say = async () => {
    restored = s.game.fieldDirector.snapshotActors()[0];
  };
  await s.game.resumeStory();
  assert.equal(restored.x, 9);
  assert.equal(restored.id, "guide");
  assert(!s.game.fieldDirector.active);
});

test("Losing a session-owned trainer battle does not grant its victory prize", async () => {
  const s = program(
    [
      {
        node: "fight",
        type: "battle",
        trainerId: "youngster",
        onResult: {
          win: [],
          loss: [
            {
              node: "loss",
              type: "flag",
              key: "story-defeat:lost",
              value: true,
            },
          ],
        },
      },
    ],
    "defeat",
  );
  s.mon.hp = 1;
  const before = s.game.state.money;
  const index = s.mon.moves.findIndex((move) => move.id === "growl");
  assert(index >= 0);
  await s.begin();
  for (let i = 0; i < 30 && s.game.battle; i++)
    await s.game.turn({ kind: "move", index });
  await s.settle();
  assert.equal(s.game.battle, null);
  assert(s.game.state.flags["story-defeat:lost"]);
  assert.equal(s.game.state.money, before);
  assert(!s.game.state.story.rewards.includes("trainer.youngster.prize"));
});

for (const failure of ["receipt", "commit"]) {
  test(`Story battle ${failure} failure returns to a saveable node without advancing or retaining partial rewards`, async () => {
    const s = program([{
      node: "fight", type: "battle", species: "zigzagoon", level: 2,
      onResult: { win: [], loss: [], caught: [], escaped: [] },
    }], `recover-${failure}`);
    await s.begin();
    const waiting = s.game.state.story.session, cursor = waiting.cursor;
    if (failure === "receipt") waiting.token = "wrong-receipt";
    else s.game.applications.battle.resultPlan = () => ({ commit: () => {
      s.game.state.money += 50;
      s.game.state.story.rewards.push("partial-result");
      throw new Error("result commit rejected");
    } });
    const money = s.game.state.money, rewards = [...s.game.state.story.rewards];
    s.game.battle.finish("win");
    await assert.rejects(s.bus.execute("core.battle.action", { kind: "run" }), /receipt rejected|commit rejected/);
    assert.equal(s.game.battle, null);
    assert.equal(s.game.state.story.session.status, "ready");
    assert.equal(s.game.state.story.session.cursor, cursor);
    assert.equal(s.game.state.story.session.token, undefined);
    assert.equal(s.game.state.money, money);
    assert.deepEqual(s.game.state.story.rewards, rewards);
    assert.doesNotThrow(() => s.game.exportDocument());
    s.game.save();
    assert.equal(JSON.parse(s.game.saveStore.raw()).state.story.session.status, "ready");
    await s.game.resumeStory();
    assert(s.game.battle);
  });
}
