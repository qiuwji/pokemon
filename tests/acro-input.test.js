import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  MovementInputRegistry,
  MovementInputSession,
} from "../dist/engine/movement-input.js";
import { MovementRegistry, MovementService } from "../dist/engine/movement.js";
import { GEN3_MOVEMENT_INPUTS } from "../dist/engine/rules/gen3/bike-input.js";
import { MOVEMENT_MODES } from "../dist/packs/emerald/movement.js";
import {
  MovementApplication,
  MOVEMENT_PORTS,
} from "../dist/packs/emerald/application/movement-application.js";
import { FieldSession } from "../dist/engine/field-session.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import {
  FieldTerrainRegistry,
  FieldTerrainService,
} from "../dist/engine/field-terrain.js";
import { EMERALD_TERRAIN_RULES } from "../dist/packs/emerald/terrain-rules.js";
import { BEHAVIOR as B } from "../dist/engine/terrain.js";
import { validateSpriteAnimations } from "../dist/engine/extensions/sprite-contracts.js";
import { sampleSpriteAnimation } from "../dist/presentation/sprite-animation.js";
function setup() {
  let now = 0;
  const registry = new MovementRegistry(MOVEMENT_MODES),
    driver = new MovementInputSession({
      registry: new MovementInputRegistry(GEN3_MOVEMENT_INPUTS),
      movement: registry,
    }),
    position = { map: "Field", x: 2, y: 2, dir: "right" },
    map = {
      width: 5,
      height: 5,
      blocks: Array(25).fill(0),
      behavior: Array(25).fill(0),
      connections: [],
      warps: [],
      npcs: [],
      signs: [],
      indoor: false,
      allowBike: true,
    },
    state = { position, movement: { mode: "acro-bike", visited: ["Field"] } },
    movement = new MovementService({
      registry,
      state: state.movement,
      context: () => ({ capabilities: { "acro-bike": true } }),
    }),
    steps = [],
    field = new FieldSession({
      maps: { Field: map },
      position,
      movement,
      terrain: new FieldTerrainService(
        new FieldTerrainRegistry(EMERALD_TERRAIN_RULES),
      ),
      objects: () => [],
      transitions: { busy: false },
      motion: new GridMotion(new SceneGraph({ Field: map })),
      now: () => now,
      onStep: () => steps.push({ ...position }),
    });
  const ports = Object.fromEntries(MOVEMENT_PORTS.map((k) => [k, null]));
  Object.assign(ports, {
    state,
    field,
    world: field.world,
    timeline: { now: () => now },
    canManageParty: () => !field.busy,
    ui: { blocked: false },
    growthDirector: { busy: false },
    transitions: { busy: false },
    stepField: (d, o) => field.move(d, o),
  });
  const app = new MovementApplication(ports);
  app.input = driver;
  app.movement = movement;
  return {
    app,
    driver,
    field,
    position,
    map,
    state,
    steps,
    sample(d = null, b = false, dt = 0) {
      now += dt;
      field.tick(now);
      return app.handleFieldInput({
        direction: d,
        secondary: b,
        running: false,
      });
    },
    advance(dt) {
      now += dt;
      field.tick(now);
    },
    view(dt = 0, reducedMotion = false) {
      return field.motion.sample(position, now + dt, { reducedMotion });
    },
  };
}
const frames = (n) => (n * 1000) / 60;
test("Acro ordinary motion takes 6 frames; idle turn waits 6 without steps or direction jitter", () => {
  const s = setup();
  assert(s.sample("right"));
  assert.equal(s.field.motion.duration, frames(6));
  s.advance(frames(6));
  assert.equal(s.steps.length, 1);
  s.sample(null);
  assert.equal(s.sample("up"), false);
  assert.equal(s.position.dir, "right");
  assert.equal(s.sample("up", false, frames(5)), false);
  assert(s.sample("up", false, frames(1)));
  assert.equal(s.position.dir, "up");
  assert.equal(s.steps.length, 1);
  assert.equal(s.position.x, 3);
});
test("Recent direction and secondary edges side-hop one tile with locked facing; stale edge only turns", () => {
  const s = setup();
  assert(s.sample("up", true));
  assert.equal(s.position.y, 1);
  assert.equal(s.position.dir, "right");
  assert.equal(s.field.motion.duration, frames(16));
  assert.equal(s.view(frames(8)).dir, "right");
  assert(s.view(frames(8)).lift > 0);
  assert.equal(s.view(frames(8), true).lift, 0);
  s.advance(frames(16));
  assert.equal(s.steps.length, 1);
  const stale = setup();
  stale.sample(null, true);
  stale.advance(frames(8));
  stale.sample(null, false);
  stale.advance(frames(8));
  stale.sample("up");
  stale.sample("up", true, frames(4));
  assert.equal(stale.position.y, 2); // Too late for direction+secondary history.
});
test("Opposite-direction jump turns halfway in place without advancing field counters", () => {
  const s = setup();
  assert(s.sample("left", true));
  assert.equal(s.position.x, 2);
  assert.equal(s.position.dir, "left");
  assert.equal(s.view(frames(7)).dir, "right");
  assert.equal(s.view(frames(8)).dir, "left");
  s.advance(frames(16));
  assert.equal(s.steps.length, 0);
});
test("Standing wheelie uses native rise timing, 40-frame charge and repeated 16-frame in-place hops", () => {
  const s = setup();
  assert(s.sample(null, true));
  assert.equal(s.view().pose, "wheelie-rise");
  s.advance(frames(8));
  assert(s.sample(null, true));
  assert.equal(s.view().pose, "wheelie");
  s.sample(null, true, frames(39));
  assert.equal(s.view().pose, "wheelie");
  assert(s.sample(null, true, frames(1)));
  assert.equal(s.view().pose, "hop");
  s.advance(frames(16));
  assert(s.sample(null, true));
  assert.equal(s.view().pose, "hop");
  s.advance(frames(16));
  assert(s.sample(null, false));
  assert.equal(s.view().pose, "wheelie-lower");
  s.advance(frames(8));
  s.sample(null);
  assert.equal(s.view().pose, "normal");
  assert.equal(s.steps.length, 0);
});
test("Wheelie moves in 8 frames, blocked wheelie pedals in place and bumpy slope retains raised wheel", () => {
  const s = setup();
  s.sample("right", true);
  assert.equal(s.field.motion.duration, frames(8));
  s.advance(frames(8));
  s.sample(null, true);
  assert.equal(s.view().pose, "wheelie");
  s.map.behavior[2 * 5 + 3] = B.BUMPY_SLOPE;
  s.sample(null, false);
  assert.equal(s.view().pose, "wheelie");
  s.map.blocks[2 * 5 + 4] = 1 << 10;
  assert.equal(s.sample("right", true), false);
  const count = s.steps.length;
  assert(s.sample("right", true));
  assert.equal(s.position.x, 3);
  assert.equal(s.field.motion.duration, frames(8));
  s.advance(frames(8));
  assert.equal(s.steps.length, count);
});
test("Side-hop rail entry is perpendicular; rejected side-hop returns ordinary facing", () => {
  const s = setup();
  s.map.behavior[1 * 5 + 2] = B.VERTICAL_RAIL;
  assert.equal(s.sample("up", true), false);
  assert.equal(s.position.y, 2);
  assert(s.sample("up", true));
  assert.equal(s.position.dir, "up");
  const allowed = setup();
  allowed.map.behavior[1 * 5 + 2] = B.HORIZONTAL_RAIL;
  assert(allowed.sample("up", true));
  assert.equal(allowed.position.dir, "right");
});
test("Pausing or changing modes clears Acro input and idle pose while preserving an active interpolation", () => {
  const s = setup();
  s.sample(null, true);
  s.advance(frames(8));
  s.sample(null, true);
  s.app.ui.blocked = true;
  s.sample(null, true);
  assert.equal(s.view().pose, "normal");
  s.app.ui.blocked = false;
  s.state.movement.mode = "walk";
  s.app.resetFieldInput();
  s.sample("right");
  const halfway = s.view(80).x;
  s.app.resetFieldInput();
  assert.equal(s.view(80).x, halfway);
  assert(s.field.busy);
});
test("Native Acro frame metadata is validated and sampled without browser, RNG or directional leakage", () => {
  const db = JSON.parse(
      fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
    ),
    actor = db.actors.BrendanAcroBike;
  validateSpriteAnimations(actor);
  assert.equal(actor.frameCount, 27);
  const a = actor.animations;
  assert.deepEqual(sampleSpriteAnimation(a, "wheelie-rise", "up", 0, false), {
    index: 13,
    flip: false,
  });
  assert.equal(
    sampleSpriteAnimation(a, "wheelie-rise", "up", frames(4), false).index,
    14,
  );
  assert.equal(
    sampleSpriteAnimation(a, "wheelie", "right", 0, false).index,
    18,
  );
  assert.equal(
    sampleSpriteAnimation(a, "wheelie", "down", frames(8), true).index,
    22,
  );
  assert.equal(
    sampleSpriteAnimation(a, "wheelie", "down", frames(16), true).index,
    21,
  );
  assert.equal(
    sampleSpriteAnimation(a, "wheelie-rise", "up", 0, false, {
      reducedMotion: true,
    }).index,
    14,
  );
  assert.equal(sampleSpriteAnimation(a, "unknown", "up", 0, false), null);
  const bad = structuredClone(actor);
  bad.animations.hop.idle.directions.up[0].index = 27;
  assert.throws(() => validateSpriteAnimations(bad), /Invalid sprite frame/);
  assert.throws(() =>
    validateSpriteAnimations({ ...actor, frameCount: undefined }),
  );
});

test("Acro ledge hop retains two-tile landing and native 32-frame high jump rather than ordinary riding duration", () => {
  const s = setup();
  s.map.behavior[2 * 5 + 3] = 56;
  assert(s.sample("right"));
  assert.equal(s.position.x, 4);
  assert.equal(s.field.motion.duration, frames(32));
  assert.equal(s.view(frames(12)).lift, 12);
  s.advance(frames(32));
  assert.equal(s.steps.length, 1);
});
