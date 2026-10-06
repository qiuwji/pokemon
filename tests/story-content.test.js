import test from "node:test";
import assert from "node:assert/strict";
import { StoryCatalog } from "../src/engine/story-catalog.js";
import { StoryEngine } from "../src/engine/story.js";
import { dialogueDescription } from "../src/engine/dialogue.js";
import { resolveDialogue, textRuns } from "../src/engine/dialogue-content.js";
import { DEFAULT_CONDITION_QUERIES } from "../src/engine/condition-queries.js";
import {
  choiceOptions,
  validateChoicePolicy,
} from "../src/engine/story-choice.js";
import { ChoiceDOM } from "../src/adapters/choice-dom.js";
import { DialogueDOM } from "../src/adapters/dialogue-dom.js";
import { createTextEffects } from "../src/presentation/text-effects.js";
import { layoutDocument } from "./helpers/layout-document.js";
import {
  session,
  manifest,
  objectSchema,
} from "./helpers/session.js";
import { validateSave } from "../src/packs/emerald/save-contract.js";

test("Story bundle binds an exact NPC, calls a parameterized script and persists dialogue without touching app imports", async () => {
  let exported;
  const plugin = manifest("bundle-demo", (api) => {
    exported = api.story.registerBundle("garden", {
      version: 1,
      dialogues: {
        welcome: {
          name: "向导",
          bindings: {
            who: { query: { id: "playerName" } },
            gift: { param: "amount" },
          },
          lines: [
            { name: "研究员", text: "你好 [b]{{who}}[/b]，礼物是 {{gift}}。" },
            { name: "助手", text: "准备好了！" },
          ],
        },
      },
      scripts: {
        reward: {
          parameters: objectSchema(
            { amount: { type: "integer", minimum: 1 } },
            ["amount"],
          ),
          commands: [
            {
              type: "reward",
              id: "bundle-demo:gift",
              money: { $param: "amount" },
            },
            { type: "dialog", dialogue: "welcome" },
          ],
        },
        arrival: {
          commands: [{ type: "call", script: "reward", input: { amount: 20 } }],
        },
      },
      entries: {
        guide: {
          trigger: "interact",
          selector: { objectId: "guide" },
          script: "arrival",
        },
      },
    });
  });
  const s = session([plugin]),
    before = s.game.state.money;
  assert.equal(exported.scripts.arrival, "bundle-demo:garden.arrival");
  assert.deepEqual(
    s.game.story.resolve("interact", s.game.state, {
      object: { id: "another" },
    }),
    [],
  );
  await s.game.runStory(
    s.game.story.resolve("interact", s.game.state, { object: { id: "guide" } }),
  );
  assert.equal(s.game.state.money, before + 20);
  assert.equal(s.dialogs[0].lines[0].name, "研究员");
  assert.match(s.game.dialogueHistory()[0].lines[0].text, /训练家.*20/);
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.game.dialogueHistory().length, 1);
  assert(Object.isFrozen(s.game.dialogueHistory()[0]));
});

test("Missing dialogue/script references and recursive calls are rejected with content identity", () => {
  const create = (commands) =>
    new StoryCatalog(
      [{ id: "demo:area", version: 1, scripts: { entry: { commands } } }],
      { queries: DEFAULT_CONDITION_QUERIES },
    );
  assert.throws(
    () => create([{ type: "call", script: "typo" }]),
    /Unknown story script: demo:area.typo/,
  );
  assert.throws(
    () => create([{ type: "dialog", dialogue: "typo" }]),
    /Unknown story dialogue/,
  );
  assert.throws(
    () => create([{ type: "call", script: "entry" }]),
    /Story call cycle/,
  );
});

test("Priority is independent of registration order and equal-priority overlapping entrances fail explicitly", () => {
  const a = {
    id: "a",
    trigger: "interact",
    priority: 1,
    build: () => [{ type: "wait", ms: 1 }],
  };
  const b = {
    id: "b",
    trigger: "interact",
    priority: 2,
    build: () => [{ type: "wait", ms: 2 }],
  };
  const state = { story: { completed: [], rewards: [] } };
  assert.deepEqual(
    new StoryEngine([a, b]).resolve("interact", state),
    new StoryEngine([b, a]).resolve("interact", state),
  );
  assert.throws(
    () =>
      new StoryEngine([a, { ...b, priority: 1 }]).resolve("interact", state),
    /Ambiguous story trigger: a, b/,
  );
});

test("Shorthand nesting and literal interpolation cannot inject styles or arbitrary object expressions", () => {
  const definition = {
    name: "博士",
    bindings: { name: { param: "name" } },
    lines: ["[color=#ff0000][b]{{name}}[/b][/color][pause=20]好了"],
  };
  const resolved = resolveDialogue(definition, {
    parameters: { name: "[effect=evil]玩家[/effect]" },
  });
  const d = dialogueDescription(resolved);
  assert.equal(d.lines[0].runs[0].effect, undefined);
  assert.equal(d.lines[0].runs[0].bold, true);
  assert.equal(d.lines[0].runs[1].pauseMs, 20);
  assert.throws(() => textRuns("[b]坏[/color]"), /Unbalanced/);
  assert.throws(() => textRuns("{{secret}}"), /Unknown dialogue binding/);
  assert.throws(
    () =>
      dialogueDescription({
        name: "",
        lines: [
          { portrait: { src: "assets/../secret.png", alt: "" }, text: "hello" },
        ],
      }),
    /portrait/,
  );
});

test("Portrait, per-line speaker and expression update with safe DOM nodes and retain reduced-motion control", () => {
  const doc = layoutDocument(),
    container = doc.createElement("div");
  const view = new DialogueDOM({
    document: doc,
    container,
    effects: createTextEffects(),
    now: () => 0,
    request: () => 1,
    cancel: () => {},
    reducedMotion: () => true,
  });
  const d = dialogueDescription({
    name: "博士",
    lines: [
      {
        name: "助手",
        portrait: { src: "assets/mudkip-front.png", alt: "开心" },
        expression: "happy",
        text: "你好",
      },
    ],
  });
  view.show(d.name, d.lines[0], d);
  assert.equal(container.children[0].tagName, "IMG");
  assert.equal(container.children[1].textContent, "助手");
  assert.equal(container.children[1].getAttribute("data-expression"), "happy");
  assert(view.complete);
  view.hide();
  assert.equal(container.children.length, 0);
});

test("Choice policies filter visibility, explain disabled items and reject impossible defaults", () => {
  const command = {
      name: "",
      prompt: "",
      default: "leave",
      options: [
        { id: "hidden", label: "隐藏", visibleWhen: { flag: "secret" } },
        {
          id: "buy",
          label: "购买",
          enabledWhen: { flag: "rich" },
          disabledReason: "钱不够",
        },
        { id: "leave", label: "离开" },
      ],
    },
    state = { flags: {} };
  validateChoicePolicy(command, new Set(), DEFAULT_CONDITION_QUERIES);
  const choices = choiceOptions(command, state, DEFAULT_CONDITION_QUERIES);
  assert.deepEqual(
    choices.map((o) => o.id),
    ["buy", "leave"],
  );
  assert(choices[0].disabled);
  assert.equal(choices[0].disabledReason, "钱不够");
  assert.throws(
    () =>
      choiceOptions(
        { ...command, default: "buy" },
        state,
        DEFAULT_CONDITION_QUERIES,
      ),
    /default unavailable/,
  );
  assert.throws(
    () =>
      validateChoicePolicy(
        { ...command, timeoutMs: 0 },
        new Set(),
        DEFAULT_CONDITION_QUERIES,
      ),
    /timeout/,
  );
});

test("Choice DOM shares click/default input, disabled controls stay inert and cancellation invalidates late clock callbacks", () => {
  const doc = layoutDocument(),
    container = doc.createElement("div"),
    selected = [],
    queued = [];
  let now = 0;
  const clock = {
    now: () => now,
    request: (fn) => {
      queued.push(fn);
      return queued.length;
    },
    cancel: () => {},
  };
  const view = new ChoiceDOM({
    document: doc,
    container,
    clock,
    onSelect: (id) => {
      selected.push(id);
      view.dispose();
    },
    onError: (error) => {
      throw error;
    },
  });
  view.mount(
    "选择",
    [
      { id: "locked", label: "不能选", disabled: true },
      { id: "yes", label: "好" },
    ],
    { default: "yes", timeoutMs: 50 },
  );
  container.querySelectorAll("button")[0].onclick();
  assert.equal(selected.length, 0);
  now = 50;
  queued[0]();
  assert.deepEqual(selected, ["yes"]);
  queued[0]();
  assert.equal(selected.length, 1);
});

test("Oldale native data handles full inventory, retry and repeat interaction without a false reward claim", async () => {
  const s = session();
  const add = s.game.inventory.prepare(s.game.state.bag, [
    {
      kind: "add",
      item: "potion",
      count:
        s.catalog.inventoryPockets.items.capacity *
        s.catalog.inventoryPockets.items.stackLimit,
    },
  ]);
  assert(s.game.inventory.commit(add, s.game.state.bag));
  assert(s.game.enter({ map: "OldaleTown", x: 13, y: 15, dir: "up" }));
  await s.game.flushStoryQueue(); await s.settle();
  const context = { object: { kind: "giftPotion" } };
  await s.game.runStory(
    s.game.story.resolve("interact", s.game.state, context),
  );
  assert(!s.game.state.flags.potionGift);
  assert.match(s.dialogs.at(-1).lines[0].runs[0].text, /背包/);
  const remove = s.game.inventory.prepare(s.game.state.bag, [
    { kind: "remove", item: "potion", count: 1 },
  ]);
  assert(s.game.inventory.commit(remove, s.game.state.bag));
  assert(s.game.enter({ map: "OldaleTown", x:13, y:15, dir:"up" }));
  await s.game.flushStoryQueue(); await s.settle();
  await s.game.runStory(
    s.game.story.resolve("interact", s.game.state, context),
  );
  assert(s.game.state.flags.potionGift);
  const count = s.game.itemQuantity("potion");
  await s.game.runStory(
    s.game.story.resolve("interact", s.game.state, context),
  );
  assert.equal(s.game.itemQuantity("potion"), count);
  assert(validateSave(s.game.state, s.game.db, s.game.catalog, s.game.plugins));
});

test("Native signs use explicit script data and unimplemented signs are visibly pending", async () => {
  const s = session(),
    map = s.db.maps.LittlerootTown,
    sign = map.signs[0];
  await s.game.runStory(
    s.game.story.resolve("interact", s.game.state, {
      object: { ...sign, kind: "sign" },
    }),
  );
  assert(s.dialogs[0].lines[0].runs);
  await s.game.runStory(
    s.game.story.resolve("interact", s.game.state, {
      object: { kind: "sign", script: "MissingLabel" },
    }),
  );
  assert.match(s.dialogs.at(-1).lines[0].runs[0].text, /尚未转写/);
});

test("Registered story bundles cannot write another owner's flags, variables or reward ledger", () => {
  for (const command of [
    { type: "flag", key: "rescued", value: true },
    { type: "setVariable", name: "core.progress", value: 1 },
    { type: "reward", id: "foreign:gift", money: 20 },
    { type: "reward", id: "owned:gift", flags: { rescued: true } },
  ]) {
    assert.throws(
      () =>
        session([
          manifest("owned", (api) =>
            api.story.registerBundle("area", {
              version: 1,
              scripts: { entry: { commands: [command] } },
            }),
          ),
        ]),
      /Story state namespace denied/,
    );
  }
});

test("Map arrival is queued until field control is available and state projections rebuild without mutating content", async () => {
  const s = session([
    manifest("arrival-demo", (api) => {
      api.content.register("mapExtensions", "guide", {
        map: "LittlerootTown",
        elements: [
          {
            id: "arrival-demo:guide",
            x: 8,
            y: 9,
            actor: "Boy1",
            dir: "down",
            kind: "talk",
            name: "向导",
            text: "",
            movement: { mode: "still", rangeX: 0, rangeY: 0 },
          },
        ],
      });
      api.story.registerBundle("area", {
        version: 1,
        projections: [
          {
            map: "LittlerootTown",
            objectId: "arrival-demo:guide",
            requires: { flag: "arrival-demo:departed" },
            changes: { hidden: true },
          },
        ],
        scripts: {
          welcome: {
            commands: [{ type: "dialog", name: "向导", lines: ["进入小镇。"] }],
          },
        },
        entries: {
          welcome: {
            trigger: "mapEnter",
            selector: { map: "LittlerootTown", reason: "travel" },
            script: "welcome",
          },
        },
      });
    }),
  ]);
  s.game.enter({ map: "LittlerootTown", x: 8, y: 10, dir: "up" });
  s.game.ui.blocked = true;
  await s.game.flushStoryQueue();
  assert.equal(s.dialogs.length, 0);
  s.game.ui.blocked = false;
  await s.game.flushStoryQueue();
  assert.equal(s.dialogs.length, 1);
  await s.game.flushStoryQueue();
  assert.equal(s.dialogs.length, 1);
  assert(
    s.game
      .baseWorldObjects("LittlerootTown")
      .some((o) => o.id === "arrival-demo:guide"),
  );
  s.game.state.flags["arrival-demo:departed"] = true;
  assert(
    !s.game
      .baseWorldObjects("LittlerootTown")
      .some((o) => o.id === "arrival-demo:guide"),
  );
  assert(
    s.db.maps.LittlerootTown.elements.some(
      (o) => o.id === "arrival-demo:guide",
    ),
  );
});

test("Structured runs interpolate literal scalars and malformed templates fail while constructing their catalog", () => {
  const resolved = resolveDialogue(
    {
      name: "{{who}}",
      bindings: { who: { param: "who" } },
      lines: [{ runs: [{ text: "你好 {{who}}", color: "#ff0000" }] }],
    },
    { parameters: { who: "[b]助手[/b]" } },
  );
  assert.equal(
    dialogueDescription(resolved).lines[0].runs[0].text,
    "你好 [b]助手[/b]",
  );
  assert.throws(
    () =>
      new StoryCatalog([
        {
          id: "test:bad",
          version: 1,
          dialogues: { bad: { name: "", lines: ["[b]missing"] } },
        },
      ]),
    /Unbalanced/,
  );
});

test("Dialogue history trims oldest confirmed entries within both persistence limits", async () => {
  const { recordDialogue, validDialogueHistory } = await import(
    "../src/engine/dialogue-history.js"
  );
  const progress = {};
  for (let i = 0; i < 140; i++)
    recordDialogue(
      progress,
      dialogueDescription({ name: "", lines: [String(i)] }),
    );
  assert.equal(progress.history.length, 128);
  assert.equal(progress.history[0].lines[0].text, "12");
  for (let i = 0; i < 9; i++)
    recordDialogue(
      progress,
      dialogueDescription({
        name: "",
        lines: ["a".repeat(4096), "b".repeat(4096)],
      }),
    );
  assert.equal(progress.history.length, 8);
  assert(validDialogueHistory(progress.history));
});

test("The rival's Poké Ball still reads after the first meeting", async () => {
  const s = session();
  const g = s.game, map = "LittlerootTown_MaysHouse_2F";
  g.state.playerGender = "male";
  const ball = { id: "neighbor.ball", map, kind: "talk", name: "精灵球", x: 5, y: 4 };
  g.state.flags.neighborMet = false;
  assert(
    JSON.stringify(g.story.resolve("interact", g.state, { map, object: ball })).includes("meet.male"),
    "the ball triggers the first meeting before it is read",
  );
  g.state.flags.neighborMet = true;
  await g.runStory(g.story.resolve("interact", g.state, { map, object: ball }));
  await s.settle();
  const lines = s.dialogs.at(-1).lines.flatMap((l) =>
    typeof l === "string" ? [l] : l.runs.map((r) => r.text),
  );
  assert.match(lines.join(""), /精灵球/);
});

test("Every imported sign resolves to a real script instead of the untranslated fallback", () => {
  const s = session();
  for (const map of Object.keys(s.db.maps))
    for (const sign of s.db.maps[map].signs || [])
      for (const gender of ["male", "female"]) {
        s.game.state.playerGender = gender;
        const commands = s.game.story.resolve("interact", s.game.state, {
          map,
          object: { map, script: sign.script, kind: "sign", x: sign.x, y: sign.y },
        });
        assert(
          !JSON.stringify(commands).includes("common.interactions.2"),
          `${map} ${sign.script} (${gender}) falls back to the untranslated sign text`,
        );
      }
});
