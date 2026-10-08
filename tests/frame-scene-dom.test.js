import test from "node:test";
import assert from "node:assert/strict";
import { FrameSceneDOM } from "../src/adapters/frame-scene-dom.js";
import { Timeline } from "../src/engine/timeline.js";
import { FrameSequenceBuilder } from "../src/engine/extensions/frame-sequence-builder.js";

function fixture() {
  let now = 0, release, removed = 0;
  const callbacks = new Map(), painted = [];
  const context = { clearRect() {}, save() {}, restore() {}, translate(x, y) { painted.push([x, y]); }, scale() {}, drawImage() {} };
  const document = { createElement: () => ({ getContext: () => context, remove: () => removed++ }) };
  const timeline = new Timeline({ now: () => now, wait: () => new Promise(resolve => { release = resolve; }) });
  const clock = { request: fn => { callbacks.set(fn, fn); return fn; }, cancel: id => callbacks.delete(id) };
  const scene = new FrameSceneDOM({ document, host: { append() {} }, width: 240, height: 160,
    assets: { image: { width: 8, height: 8 } }, resources: { image: "image.png" }, timeline, clock });
  const clip = new FrameSequenceBuilder().track({ frames: 2, sample: frame => ({ sprites: [{ resource: "image", width: 8, height: 8, x: frame, y: 0 }] }) }).build();
  return { scene, clip, painted, callbacks, get removed() { return removed; }, finish() { now = 34; release(); } };
}
test("A frame scene retains its last validated frame across dialogue and rejects overlapping playback", async () => {
  const s = fixture(), playing = s.scene.play(s.clip);
  assert.deepEqual(s.painted.at(-1), [0, 0]);
  await assert.rejects(s.scene.play(s.clip), /unavailable/);
  s.finish(); await playing;
  assert.deepEqual(s.painted.at(-1), [1, 0]);
  assert.equal(s.callbacks.size, 0); assert.equal(s.removed, 0);
  s.scene.stage(s.clip); s.scene.dispose(); s.scene.dispose();
  assert.equal(s.removed, 1); assert.throws(() => s.scene.stage(s.clip), /disposed/);
});
test("Disposal interrupts a pending clip without later paints, callbacks or an unhandled promise", async () => {
  const s = fixture(), playing = s.scene.play(s.clip), old = [...s.callbacks.values()][0];
  s.scene.dispose(); await assert.rejects(playing, /disposed/);
  const count = s.painted.length;
  old(); s.finish(); await Promise.resolve();
  assert.equal(s.painted.length, count); assert.equal(s.callbacks.size, 0); assert.equal(s.removed, 1);
});
test("Missing image frames fail explicitly and release the frame loop", async () => {
  const s = fixture();
  const invalid = new FrameSequenceBuilder().track({ frames: 1, sample: () => ({ sprites: [{ resource: "image", width: 8, height: 8, tileFrame: 1, x: 0, y: 0 }] }) }).build();
  await assert.rejects(s.scene.play(invalid), /image unavailable/);
  assert.equal(s.callbacks.size, 0); s.scene.dispose(); s.finish();
});
