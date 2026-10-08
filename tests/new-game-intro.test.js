import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { session } from "./helpers/session.js";
import { layoutDocument } from "./helpers/layout-document.js";
import { newGameClip } from "../src/packs/emerald/new-game-presentation.js";
import { createNewGameInterface } from "../src/ui/emerald/new-game-interface.js";
import { validateFrameSequence } from "../src/engine/extensions/frame-sequence-contracts.js";
import { createEmeraldAudio } from "../src/packs/emerald/audio-library.js";
import { createNamingView } from "../src/ui/emerald/naming-view.js";

const phases = ["arrival", "release", "hide-birch", "show-player", "change-gender", "naming-out", "naming-return", "hide-player", "show-birch", "hide-birch-final", "show-player-center", "shrink"];
const person = (frame, name) => frame.sprites.find(sprite => sprite.resource === "new-game-" + name);
const documentPort = () => {
  const doc = layoutDocument(), create = doc.createElement;
  doc.createElement = tag => {
    const node = create(tag);
    node.remove = () => {};
    node.click = () => { if (!node.disabled) node.onclick?.(); };
    return node;
  };
  return doc;
};

test("Every prepared intro frame fits its installed image sheet, including Lotad's animated second frame", () => {
  const { game, host } = session(), sounds = createEmeraldAudio(host), sizes = new Map();
  for (const gender of ["male", "female"]) for (const id of phases) {
    const clip = validateFrameSequence(newGameClip(id, { gender }), { event: { combatants: [] }, resources: game.db.resources, sounds });
    assert(Object.isFrozen(clip.frames));
    for (const frame of clip.frames) for (const sprite of frame.sprites) {
      if (!sizes.has(sprite.resource)) {
        const png = readFileSync(game.db.resources[sprite.resource]);
        sizes.set(sprite.resource, [png.readUInt32BE(16), png.readUInt32BE(20)]);
      }
      const [width, height] = sizes.get(sprite.resource);
      assert(sprite.width <= width && ((sprite.tileFrame || 0) + 1) * sprite.height <= height, `${id}/${sprite.resource} sheet bounds`);
    }
  }
  const release = newGameClip("release");
  assert.equal(person(release.frames[87], "lotad").tileFrame, 1);
  assert.deepEqual([person(release.frames.at(-1), "lotad").x, person(release.frames.at(-1), "lotad").y], [100, 75]);
  assert.deepEqual(release.cues.map(c => [c.id, c.frame]), [["emerald:ball.open", 32], ["emerald:cry.lotad", 65]]);
});

test("Birch stages preserve native waits, delayed palette steps, gender slide and black truck handoff", () => {
  const intro = newGameClip("arrival");
  assert.equal(intro.frames.length, 216 + 176 + 80);
  assert.equal(person(intro.frames[215], "birch"), undefined);
  assert.deepEqual(person(intro.frames[216], "birch").alpha, [0, 16]);
  assert.equal(intro.frames[216 + 28].sprites[0].tileFrame, 7);
  assert.deepEqual(person(intro.frames[216 + 175], "birch").alpha, [16, 0]);
  const change = newGameClip("change-gender", { gender: "female" });
  assert.equal(person(change.frames[15], "male").x, 244);
  assert.equal(person(change.frames.at(-1), "female").x, 180);
  const shrink = newGameClip("shrink", { gender: "female" });
  assert.equal(person(shrink.frames[47], "female").scaleX, 160 / 256);
  assert.equal(person(shrink.frames[47], "female").y, 96);
  assert.equal(person(shrink.frames.at(-1), "female"), undefined);
  assert.equal(shrink.frames.at(-1).sprites[0].tint.amount, 16);
});

function introUI(game, { selections = ["female", "no", "male", "yes"], names = ["小秋", "阿丘"], fail = false } = {}) {
  const doc = documentPort(), root = doc.getElementById("root"), disposals = new Set(), played = [], lines = [];
  let disposed = 0, choice = 0, naming = 0, silence;
  const closeModal = () => { for (const dispose of [...disposals]) { disposals.delete(dispose); dispose(); } root.replaceChildren(); };
  const ui = createNewGameInterface({ document: doc, root, closeModal,
    ownModalResource: dispose => disposals.add(dispose),
    sound: () => {},
    frameScene: () => ({
      async play(clip) {
        assert(game.storyBusy);
        assert(!game.state.flags.playerConfigured, "UI must not mutate the profile draft");
        played.push(clip);
        if (fail && clip.frames.length === 112) throw new Error("Scene frame failed");
      },
      dispose: () => disposed++,
    }),
    async say(name, text, _after, options) { lines.push({ name, text }); options?.onPause?.(0); },
    async choose(_name, _prompt, _options, _cancel, policy) {
      const id = selections[choice++];
      await policy.onHighlight?.(id);
      return id;
    },
    modal(_title, _body, policy) {
      assert.equal(policy.type, "naming");
      const host = doc.createElement("div"); host.setAttribute("data-naming-host", ""); root.append(host);
      queueMicrotask(() => {
        const input = root.querySelector("input");
        assert(input, "the player receives a real naming input");
        input.value = names[naming++]; input.oninput();
        root.querySelector('[data-naming-action="ok"]').click();
      });
    },
  });
  game.ui.showNewGameIntroduction = options => { silence = options.stopMusic; return ui.showNewGameIntroduction(options); };
  return { played, lines, get disposed() { return disposed; }, get naming() { return naming; }, staleMusic: () => silence() };
}

test("New-game map entry waits for naming, rejects the first name, commits once and resumes the source truck sequence", async () => {
  const s = session([], { fresh: true }), game = s.game;
  game.state.flags = {}; game.state.party = [];
  const ui = introUI(game);
  await game.flushStoryQueue(); await s.settle();
  assert.equal(ui.naming, 2);
  assert.equal(game.state.playerGender, "male");
  assert.equal(game.state.playerName, "阿丘");
  assert.equal(game.state.flags.playerConfigured, true);
  assert.equal(game.state.flags.truckArrived, true);
  assert.equal(ui.disposed, 1);
  assert.equal(game.storyBusy, false);
  assert(ui.lines.some(line => line.text.includes("那么，你是？")));
  assert(ui.played.some(clip => person(clip.frames.at(-1), "female")?.x === 180));
  ui.staleMusic(); assert.equal(game.storyMusic, null, "closed-screen callbacks expire");
  const saved = game.saveStore.load(); assert(saved);
  game.loadDocument(saved); await game.flushStoryQueue();
  assert.equal(ui.disposed, 1, "saved configured profiles never replay the introduction");
  assert.equal(game.state.playerName, "阿丘");
});

test("A failed post-Birch frame leaves the profile and truck incomplete, releases locks, and can retry the real entry", async () => {
  const s = session([], { fresh: true }), game = s.game;
  game.state.flags = {};
  const ui = introUI(game, { fail: true });
  const commands = game.story.resolve("mapEnter", game.state, { map: "InsideOfTruck" });
  await assert.rejects(game.runStory(commands), /Scene frame failed/);
  assert.equal(game.state.flags.playerConfigured, undefined);
  assert.equal(game.state.flags.truckArrived, undefined);
  assert.equal(game.storyBusy, false); assert.equal(ui.disposed, 1);
  ui.staleMusic(); assert.equal(game.storyMusic, null);
  const retry = introUI(game, { selections: ["female", "yes"], names: ["小遥"] });
  game.storyMapEntered("InsideOfTruck", "restore");
  await game.flushStoryQueue(); await s.settle();
  assert.equal(game.state.playerName, "小遥"); assert.equal(game.state.playerGender, "female");
  assert.equal(game.state.flags.truckArrived, true); assert.equal(retry.disposed, 1);
});

test("Free naming accepts Chinese, guards IME Enter, rejects empty/overlong names, and allows cancellation", () => {
  const doc = documentPort(), host = doc.getElementById("naming"), names = [], cancelled = [];
  const view = createNamingView({ document: doc, container: host, gender: "male", onConfirm: name => names.push(name), onCancel: () => cancelled.push(true) });
  const input = host.querySelector("input"), ok = host.querySelector('[data-naming-action="ok"]');
  assert.equal(doc.activeElement, input);
  ok.click(); assert.deepEqual(names, []);
  input.oncompositionstart(); input.value = "正在输入中文"; ok.click(); assert.deepEqual(names, []);
  input.oncompositionend(); input.value = " 我喜欢的名字 "; ok.click(); assert.deepEqual(names, ["我喜欢的名字"]);
  input.value = "字".repeat(17); ok.click(); assert.equal(names.length, 1);
  input.value = "字".repeat(16); input.onkeydown({ key: "Enter", preventDefault() {} }); assert.equal(names.at(-1).length, 16);
  host.querySelector('[data-naming-action="cancel"]').click(); assert.equal(cancelled.length, 1);
  view.dispose(); ok.click(); view.back(); assert.equal(names.length, 2); assert.equal(cancelled.length, 1);
});

