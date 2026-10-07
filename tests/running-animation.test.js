import test from "node:test";
import assert from "node:assert/strict";
import { loadContentSync } from "../tools/content-io.mjs";
import { GridMotion, SceneGraph } from "../src/engine/motion.js";
import { MOVEMENT_MODES } from "../src/packs/emerald/movement.js";
import { sampleSpriteAnimation } from "../src/presentation/sprite-animation.js";
import { validateSpriteAnimations } from "../src/engine/extensions/sprite-contracts.js";
import { Renderer } from "../src/adapters/canvas-renderer.js";
const db = loadContentSync(), actor = db.actors.BrendanRun;

test("Native running alternates feet through two eight-frame steps and rests after landing", () => {
  validateSpriteAnimations(actor);
  const motion = new GridMotion(new SceneGraph(db.maps));
  const start = { map: "LittlerootTown", x: 10, y: 10, dir: "down" };
  const duration = MOVEMENT_MODES.run.durations[0];
  assert.equal(duration, 8000 / 60);
  for (let step = 0; step < 2; step++) {
    const from = { ...start, y: start.y + step }, to = { ...from, y: from.y + 1 };
    motion.begin(from, to, step * duration, { mode: "run", duration });
    const indices = [];
    for (let frame = 0; frame < 8; frame++) {
      const p = motion.sample(to, (step * 8 + frame) * 1000 / 60);
      indices.push(sampleSpriteAnimation(actor.animations, p.pose, p.dir,
        p.animationTimeMs, p.moving, { progress: p.progress, foot: p.foot }).index);
    }
    assert.deepEqual(indices, [step ? 3 : 4, step ? 3 : 4, step ? 3 : 4,
      step ? 3 : 4, step ? 3 : 4, 0, 0, 0]);
    const landed = motion.sample(to, (step + 1) * duration);
    assert.equal(landed.y, to.y * 16);
    assert(!landed.moving);
    assert.equal(sampleSpriteAnimation(actor.animations, "normal", "down", 0, false).index, 0);
  }
});
test("Canvas consumes stride progress for each direction and mirrors the west atlas only", () => {
  const renderer = Object.create(Renderer.prototype), draws = [];
  Object.assign(renderer, { db, assets: { "actor-BrendanRun": { width: 144, height: 32 } },
    reducedMotion: () => false, ctx: { save() {}, restore() {}, translate() {}, scale() {},
      drawImage: (...args) => draws.push(args) } });
  for (const [dir, index] of [["down", 4], ["up", 6], ["left", 8], ["right", 8]]) {
    renderer.actor("BrendanRun", 0, 0, dir, 0.2, 1, true, { pose: "normal", timeMs: 0 });
    assert.equal(draws.at(-1)[1], index * 16);
  }
  assert.equal(sampleSpriteAnimation(actor.animations, "normal", "right", 0, true,
    { progress: 0.2, foot: 1 }).flip, true);
  assert.equal(sampleSpriteAnimation(actor.animations, "normal", "down", 0, true,
    { progress: 0.2, foot: 1, reducedMotion: true }).index, 0);
});
test("Sprite clock registration rejects unknown and non-looping stride clocks", () => {
  const bad = structuredClone(actor);
  bad.animations.normal.move.clock = "unknown";
  assert.throws(() => validateSpriteAnimations(bad), /Invalid directional/);
  bad.animations.normal.move.clock = "stride";
  bad.animations.normal.move.loop = false;
  assert.throws(() => validateSpriteAnimations(bad), /Invalid directional/);
});


test("Both avatars use the same native horizontal running frames for five frames, then three rest frames", () => {
  for (const name of ["BrendanRun", "MayRun"]) {
    const a = db.actors[name]; validateSpriteAnimations(a);
    for (const dir of ["left", "right"]) for (const foot of [0, 1]) {
      const frames = Array.from({ length: 8 }, (_, frame) => sampleSpriteAnimation(a.animations, "normal", dir,
        0, true, { progress: frame / 8, foot }));
      assert.deepEqual(frames.map(f => f.index), [7 + foot,7 + foot,7 + foot,7 + foot,7 + foot,2,2,2]);
      assert(frames.every(f => f.flip === (dir === "right")));
    }
  }
});
