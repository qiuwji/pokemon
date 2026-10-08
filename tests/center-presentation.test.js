import test from "node:test";
import assert from "node:assert/strict";
import { emeraldCenterSequence, CENTER_ACTOR_SCENES } from "../src/packs/emerald/center-presentation.js";
import { frameSequencePlayer } from "../src/presentation/frame-sequence.js";
import { FrameClipDirector } from "../src/presentation/frame-clip-director.js";
import { SceneDirector } from "../src/presentation/scene-director.js";
import { Timeline } from "../src/engine/timeline.js";
import { session } from "./helpers/session.js";

test("center placement includes Eggs and uses native palette phases and monitor timing", () => {
  const sequence = emeraldCenterSequence([{ egg: true }, {}, {}]), player = frameSequencePlayer(sequence);
  const at = frame => player.sample(frame * 1000 / 60).sprites;
  assert.deepEqual(at(0).map(s => [s.x, s.y]), [[93, 36]]);
  assert.equal(at(24).length, 1);
  assert.deepEqual(at(50).map(s => [s.x, s.y]), [[93, 36], [99, 36], [93, 40]]);
  assert.equal(at(81).length, 3);
  assert.equal(at(82).at(-1).resource, "field-heal-monitor");
  assert.equal(at(98).at(-1).tileFrame, 1);
  assert.equal(at(82).at(0).tileFrame, 1);
  assert.equal(at(90).at(0).tileFrame, 2);
  assert.equal(at(178).at(0).tileFrame, 5);
  assert.equal(at(202).at(0).tileFrame, 8);
  assert(at(210).every(s => s.resource !== "field-heal-monitor"));
  assert.equal(at(232).length, 0, "balls disappear while fanfare finishes");
  assert.equal(sequence.cues.find(c => c.id === "emerald:heal").frame, 82);
  assert.equal(emeraldCenterSequence(Array(6).fill({})).frames.length - sequence.frames.length, 75);
});

test("finite clip waits for asynchronous cue completion and releases on failures/reduced motion", async () => {
  let now = 0, release, reduced = false;
  const timeline = new Timeline({ now: () => now, wait: async ms => { now += ms; } });
  const director = new FrameClipDirector(timeline, { reducedMotion: () => reduced });
  const pending = director.play(emeraldCenterSequence([{}]), { onCue: id => id === "emerald:heal" ? new Promise(r => { release = r; }) : undefined });
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert(director.active);
  assert.equal(director.sample().sprites.length, 0);
  release(); await pending;
  assert.equal(director.sample(), null);
  await assert.rejects(director.play(emeraldCenterSequence([{}]), { onCue() { throw new Error("sound failure"); } }), /sound failure/);
  assert.equal(director.active, null);
  reduced = true;
  const before = now;
  await director.play(emeraldCenterSequence([{}]), { onCue() { assert.fail("reduced motion cannot flash/play the cue loop"); } });
  assert.equal(now - before, 240);
});

test("nurse native bow frame is scoped to the source object and cannot persist", async () => {
  let now = 0, finish;
  const timeline = new Timeline({ now: () => now, wait: () => new Promise(r => { finish = r; }) });
  const director = new SceneDirector({ timeline, definitions: new Map(Object.entries(CENTER_ACTOR_SCENES)) });
  const payload = { map: "test", id: "nurse" }, promise = director.play("emerald:nurse-bow", payload);
  assert.equal(director.objectTransforms()[0].frame, 0);
  now = 8 * 1000 / 60; assert.equal(director.objectTransforms()[0].frame, 3);
  now = 40 * 1000 / 60; assert.equal(director.objectTransforms()[0].frame, 0);
  finish(); await promise;
  assert.deepEqual(director.objectTransforms(), []);
});

test("machine failure cannot heal the party and a real counter interaction can retry", async () => {
  const s = session(), g = s.game;
  g.enter({ map: "RustboroCity_PokemonCenter_1F", x: 7, y: 4, dir: "up" });
  s.mon.hp = 1;
  g.ui.showHealCenter = async () => { throw new Error("missing machine resource"); };
  g.interact(); await s.settle();
  assert.equal(s.mon.hp, 1); assert.equal(g.storyBusy, false);
  g.ui.showHealCenter = async () => {};
  g.interact(); await s.settle();
  assert.equal(s.mon.hp, s.mon.stats.hp);
  assert.equal(g.field.npcs.objects(g.state.position.map).find(n => n.kind === "heal").dir, "down");
});

test("field fanfare orchestration resumes music on cue or wait failure without changing ordinary sounds", async () => {
  const { createEmeraldFieldCuePlayer } = await import("../src/game/emerald/presentation/field-audio.js");
  for (const failure of [null, "sound", "wait"]) {
    const calls = [];
    const player = createEmeraldFieldCuePlayer({
      holdMusic() { calls.push("hold"); return () => calls.push("resume"); },
      async play(id) { calls.push(id); if (failure === "sound") throw new Error("sound"); },
    }, { async wait(ms) { calls.push(ms); if (failure === "wait") throw new Error("wait"); } });
    if (failure) await assert.rejects(player("emerald:heal"), new RegExp(failure));
    else await player("emerald:heal");
    assert.equal(calls[0], "hold");
    assert.equal(calls.at(-1), "resume");
    if (!failure) assert.equal(calls[2], 160 * 1000 / 60);
  }
  const played = [];
  await createEmeraldFieldCuePlayer({ play: async id => played.push(id) }, {}) ("emerald:ball.shake");
  assert.deepEqual(played, ["emerald:ball.shake"]);
});
