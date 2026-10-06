import test from "node:test";
import assert from "node:assert/strict";
import { dialogueDescription } from "../src/engine/dialogue.js";
import {
  compileDialogueLine,
  sampleDialogue,
  DialoguePlayer,
} from "../src/presentation/dialogue-player.js";
import {
  createTextEffects,
  TextEffectRegistry,
} from "../src/presentation/text-effects.js";
import { DialogueDOM } from "../src/adapters/dialogue-dom.js";
import { createUIShell } from "../src/packs/emerald/ui-shell.js";
import { layoutDocument } from "./helpers/layout-document.js";
import { session, manifest } from "./helpers/session.js";
function clockPort() {
  let time = 0,
    id = 0;
  const callbacks = new Map(),
    discarded = [];
  return {
    now: () => time,
    request: (fn) => {
      callbacks.set(++id, fn);
      return id;
    },
    cancel: (key) => {
      if (callbacks.has(key)) discarded.push(callbacks.get(key));
      callbacks.delete(key);
    },
    step(ms) {
      time += ms;
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((fn) => fn(time));
    },
    get pending() {
      return callbacks.size;
    },
    get discarded() {
      return discarded;
    },
  };
}
function shellFixture(plugins = [], reducedMotion = () => false) {
  const s = session(plugins),
    doc = layoutDocument(),
    clock = clockPort();
  doc.defaultView.requestAnimationFrame = clock.request;
  doc.defaultView.cancelAnimationFrame = clock.cancel;
  const ui = createUIShell(s.game, {
    document: doc,
    dialogueClock: clock,
    reducedMotion,
  });
  s.game.attachUI(ui);
  return { ...s, ui, doc, clock };
}
const line = (runs, speed = 10, mode = "typewriter") => {
  const d = dialogueDescription({
    name: "博士",
    lines: [{ runs }],
    speed,
    mode,
  });
  return compileDialogueLine(d.lines[0], d);
};
test("Pure dialogue sampling preserves grapheme clusters and exact leading/interior/trailing pause boundaries", () => {
  const track = line([
    { pauseMs: 20 },
    { text: "你👩‍👩‍👧‍👦a\u0301" },
    { pauseMs: 30 },
    { text: "好" },
    { pauseMs: 20 },
  ]);
  assert.equal(track.glyphs.length, 4);
  assert.equal(track.text, "你👩‍👩‍👧‍👦a\u0301好");
  assert.equal(sampleDialogue(track, 29).visible, 0);
  assert.equal(sampleDialogue(track, 30).visible, 1);
  assert.equal(sampleDialogue(track, 50).visible, 3);
  assert.equal(sampleDialogue(track, 89).visible, 3);
  assert.equal(sampleDialogue(track, 90).visible, 4);
  assert.equal(sampleDialogue(track, 109).complete, false);
  assert.equal(sampleDialogue(track, 110).complete, true);
  assert.deepEqual(sampleDialogue(track, 40), sampleDialogue(track, 40));
  assert(Object.isFrozen(track.glyphs));
  assert.throws(() => sampleDialogue(track, NaN), /clock/);
});
test("Instant/reduced-motion/skip reveal all text and pauses; a new line starts clean and invalid clocks fail", () => {
  const track = line([{ text: "你好" }, { pauseMs: 5000 }]),
    p = new DialoguePlayer();
  p.start(track, 100);
  assert.equal(p.sample(100).complete, false);
  p.skip();
  assert.equal(p.sample(100).visible, 2);
  assert.equal(p.sample(100).complete, true);
  p.start(track, 200);
  assert.equal(p.sample(100).visible, 0);
  assert.equal(p.sample(200, { reducedMotion: true }).complete, true);
  assert.equal(
    sampleDialogue(line([{ text: "你好" }], 10, "instant"), 0).visible,
    2,
  );
  p.stop();
  assert.throws(() => p.sample(200), /inactive/);
  assert.throws(() => p.start(track, Infinity), /clock/);
});
test("Structured dialogue rejects invalid speed/shape/markup style/pauses before an effect callback runs", () => {
  const base = { name: "博士", lines: ["你好"] };
  for (const changes of [
    { speed: -1 },
    { speed: NaN },
    { speed: 1.2 },
    { mode: "auto" },
    { lines: [] },
    { lines: [{ runs: [{ pauseMs: 5001 }] }] },
    { lines: [{ runs: [{ text: "hello", color: "url(x)" }] }] },
    { lines: [{ runs: [{ text: "hello", parameters: { x: 1 } }] }] },
    { lines: [{ runs: [{ text: "hello", html: "<b>" }] }] },
  ])
    assert.throws(
      () => dialogueDescription({ ...base, ...changes }),
      /dialogue/,
    );
  assert.equal(dialogueDescription({ ...base, speed: 0 }).mode, "instant");
});
test("Text effects are registered pure samples, bounded, synchronous and centrally disabled for reduced motion", () => {
  const fx = createTextEffects();
  assert.deepEqual(
    fx.sample(
      "dialogue.shake",
      {},
      { elapsedMs: 100, index: 0, reducedMotion: true },
    ),
    { x: 0, y: 0, opacity: 1 },
  );
  assert.deepEqual(
    fx.sample("dialogue.blink", {}, { elapsedMs: 100, index: 0 }),
    fx.sample("dialogue.blink", {}, { elapsedMs: 100, index: 0 }),
  );
  assert.throws(() => fx.effect("new", { sample: () => ({}) }), /Invalid/);
  for (const sample of [
    () => ({ x: 9 }),
    () => ({ opacity: 2 }),
    () => ({ color: "red" }),
    async () => ({}),
  ]) {
    const r = new TextEffectRegistry().effect("bad", { sample });
    assert.throws(() => r.sample("bad", {}, { elapsedMs: 10, index: 0 }));
  }
});
test("DOM player safely creates text, types without layout rewrites, shows confirmation only after complete and ignores cancelled callbacks", () => {
  const doc = layoutDocument(),
    clock = clockPort(),
    container = doc.getElementById("dialogue"),
    view = new DialogueDOM({
      document: doc,
      container,
      effects: createTextEffects(),
      ...clock,
    });
  const d = dialogueDescription({
    name: "<script>",
    lines: ["<img>"],
    speed: 10,
  });
  view.show(d.name, d.lines[0], d);
  const nodes = container.children[1].children;
  assert.equal(container.children[0].textContent, "<script>");
  assert.equal(nodes[0].textContent, "<");
  assert.equal(nodes[0].style.visibility, "hidden");
  assert.equal(container.children[2].hidden, true);
  clock.step(20);
  assert.equal(nodes[1].style.visibility, "visible");
  assert.equal(nodes[2].style.visibility, "hidden");
  assert.equal(container.children[1].children, nodes);
  view.skip();
  assert.equal(clock.pending, 0);
  assert.equal(container.children[2].hidden, false);
  assert(nodes.every((n) => n.style.visibility === "visible"));
  const stale = clock.discarded.at(-1);
  view.show(
    "new",
    dialogueDescription({ name: "new", lines: ["新"] }).lines[0],
    { speed: 10 },
  );
  stale();
  assert.equal(container.children[0].textContent, "new");
  view.hide();
  assert.equal(clock.pending, 0);
  assert.equal(container.hidden, true);
});
test("Shared shell uses first confirm to reveal, second to advance; final acknowledgement resolves once and clears animation", async () => {
  const s = shellFixture();
  let count = 0,
    resolved = false;
  const promise = s.ui.say("博士", ["第一句", "第二句"], () => count++, {
    speed: 100,
  });
  promise.then(() => (resolved = true));
  assert(s.ui.blocked);
  assert.equal(s.clock.pending, 1);
  s.ui.nextDialogue();
  await Promise.resolve();
  assert.equal(s.ui.dialog.index, 0);
  assert.equal(resolved, false);
  assert.equal(s.clock.pending, 0);
  s.ui.nextDialogue();
  assert.equal(s.ui.dialog.index, 1);
  assert.equal(s.clock.pending, 1);
  s.ui.back();
  assert.equal(s.ui.dialog.index, 1);
  s.ui.back();
  await promise;
  assert.equal(count, 1);
  assert.equal(s.ui.dialog, null);
  assert.equal(s.ui.blocked, false);
  assert.equal(s.clock.pending, 0);
  s.ui.nextDialogue();
  assert.equal(count, 1);
});
test("Timed shell advances only after actual display duration and reader announcement stays complete", async () => {
  const s = shellFixture(),
    promise = s.ui.say(
      "博士",
      [{ runs: [{ text: "你" }, { pauseMs: 100 }, { text: "好" }] }],
      null,
      { speed: 10 },
    );
  assert.equal(s.doc.getElementById("announcer").textContent, "你好");
  s.clock.step(10);
  assert(s.ui.dialog);
  s.clock.step(100);
  assert(s.ui.dialog);
  s.clock.step(10);
  assert.equal(s.clock.pending, 0);
  s.ui.nextDialogue();
  await promise;
  assert.equal(s.ui.blocked, false);
});
test("Dialogue disposal and replacement reject the old wait, stop effects and prevent stale visual writes", async () => {
  const s = shellFixture(),
    first = s.ui.say(
      "博士",
      [{ runs: [{ text: "抖动", effect: "dialogue.shake" }] }],
      null,
      { speed: 10 },
    ),
    rejected = assert.rejects(first, /disposed/);
  s.clock.step(10);
  s.ui.disposeDialogue();
  const stale = [...s.clock.discarded];
  await rejected;
  assert.equal(s.clock.pending, 0);
  assert.equal(s.ui.dialog, null);
  const second = s.ui.say("新句", ["新句"], null, { mode: "instant" });
  stale.forEach((fn) => fn());
  s.ui.nextDialogue();
  await second;
  assert.equal(s.ui.blocked, false);
});
test("Reduced motion displays immediately, suppresses text animation loop and still waits for acknowledgement", async () => {
  const s = shellFixture([], () => true);
  let done = false;
  const p = s.ui.say("博士", [
    { runs: [{ text: "安全", effect: "dialogue.blink" }, { pauseMs: 5000 }] },
  ]);
  p.then(() => (done = true));
  assert.equal(s.clock.pending, 0);
  assert.equal(s.ui.dialog.index, 0);
  assert.equal(done, false);
  s.ui.nextDialogue();
  await p;
  assert.equal(done, true);
});
test("Registered plugin text samples receive frozen parameters and cannot submit core commands from a read-only callback", async () => {
  let denied;
  const p = manifest(
    "speech",
    (a) => {
      a.presentation.textEffect("float", {
        sample: (_, c) => {
          assert(Object.isFrozen(c));
          denied = a.commands.dispatch("core.save.write", {}).then(
            () => null,
            (e) => e,
          );
          return { y: Math.sin(c.elapsedMs / 100) };
        },
      });
    },
    ["save"],
  );
  const s = shellFixture([p]),
    promise = s.ui.say(
      "博士",
      [{ runs: [{ text: "文字", effect: "speech:float" }] }],
      null,
      { speed: 10 },
    );
  s.clock.step(10);
  assert.match((await denied).message, /read-only callback/);
  s.ui.nextDialogue();
  s.ui.nextDialogue();
  await promise;
  assert.equal(s.clock.pending, 0);
});
test("Whole story preflight rejects bad dialogue/effect parameters before any reward and forwards speed through the real application", async () => {
  const s = shellFixture(),
    before = structuredClone(s.game.state);
  await assert.rejects(
    s.game.runStory([
      { type: "reward", id: "before-dialogue", money: 20 },
      { type: "dialog", name: "博士", lines: ["hi"], speed: -1 },
    ]),
    /dialogue/,
  );
  assert.deepEqual(s.game.state, before);
  await assert.rejects(
    s.game.runStory([
      { type: "reward", id: "before-dialogue", money: 20 },
      {
        type: "dialog",
        name: "博士",
        lines: [{ runs: [{ text: "hi", effect: "unknown" }] }],
      },
    ]),
    /Unknown text effect/,
  );
  assert.deepEqual(s.game.state, before);
  const running = s.game.runStory([
    { type: "dialog", name: "博士", lines: ["你好"], speed: 5 },
    { type: "reward", id: "after-dialogue", money: 20 },
  ]);
  await new Promise(setImmediate);
  assert.equal(s.game.state.money, before.money);
  assert.equal(s.ui.dialog.speed, 5);
  s.ui.nextDialogue();
  assert(s.game.storyBusy);
  s.ui.nextDialogue();
  await running;
  assert.equal(s.game.state.money, before.money + 20);
  assert.equal(s.game.storyBusy, false);
});

test("A text-effect failure during confirm rejects the active wait and unlocks without completion callbacks", async () => {
  const plugin = manifest("broken-speech", (api) =>
    api.presentation.textEffect("fail", {
      sample: () => {
        throw new Error("Broken text sample");
      },
    }),
  );
  const s = shellFixture([plugin]);
  let completed = 0;
  const promise = s.ui.say(
    "博士",
    [{ runs: [{ text: "你好", effect: "broken-speech:fail" }] }],
    () => completed++,
    { speed: 100 },
  );
  const rejected = assert.rejects(promise, /Broken text sample/);
  assert.equal(s.clock.pending, 1);
  assert.doesNotThrow(() => s.ui.nextDialogue());
  await rejected;
  assert.equal(s.clock.pending, 0);
  assert.equal(s.ui.dialog, null);
  assert.equal(s.ui.blocked, false);
  assert.equal(completed, 0);
  const next = s.ui.say("博士", ["下一句"], null, { mode: "instant" });
  s.ui.nextDialogue();
  await next;
});
