import test from "node:test";
import assert from "node:assert/strict";
import {
  MovementInputRegistry,
  MovementInputSession,
} from "../dist/engine/movement-input.js";
import { MovementRegistry } from "../dist/engine/movement.js";
import {
  GEN3_MOVEMENT_INPUTS,
  GEN3_MACH_DURATIONS,
} from "../dist/engine/rules/gen3/bike-input.js";
import { MOVEMENT_MODES } from "../dist/packs/emerald/movement.js";
import { BrowserInput } from "../dist/adapters/browser-input.js";
import { BEHAVIOR as B } from "../dist/engine/terrain.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
const input = (direction) => ({ direction, secondary: false, running: false });
function fixture(rules = GEN3_MOVEMENT_INPUTS, definitions = MOVEMENT_MODES) {
  const registry = new MovementInputRegistry(rules),
    movement = new MovementRegistry(definitions),
    driver = new MovementInputSession({ registry, movement });
  let now = 0;
  const context = {
    position: { map: "Lab", x: 1, y: 1, dir: "right" },
    cell: { block: 0, behavior: 0, collision: 0, elevation: 0 },
    momentum: { mode: null, direction: null, steps: 0 },
  };
  return {
    driver,
    context,
    sample(direction, options = {}) {
      now += options.dt ?? 1;
      return driver.sample(input(direction), {
        now,
        mode: "mach-bike",
        context,
        ...options,
      });
    },
  };
}
test("Mach input accelerates through original 16/8/4-frame steps and coasts through 4/8/16 on release", () => {
  const s = fixture();
  for (const duration of GEN3_MACH_DURATIONS) {
    assert.equal(s.sample("right").durationMs, duration);
    s.driver.feedback(true);
  }
  assert.equal(s.sample("right").durationMs, GEN3_MACH_DURATIONS[2]);
  for (const duration of [...GEN3_MACH_DURATIONS].reverse())
    assert.equal(s.sample(null).durationMs, duration);
  assert.equal(s.sample(null), null);
  assert.deepEqual(s.driver.state, { counter: 0, speed: 0, running: false });
});
test("Mach standing turns first, moving turns retain acceleration and blocked feedback resets inertia", () => {
  const s = fixture();
  assert.deepEqual(s.sample("up"), {
    kind: "turn",
    direction: "up",
    durationMs: 1000 / 60,
  });
  s.context.position.dir = "up";
  assert.equal(s.sample("up").durationMs, GEN3_MACH_DURATIONS[0]);
  assert.equal(s.sample("up").durationMs, GEN3_MACH_DURATIONS[1]);
  assert.equal(s.sample("left").durationMs, GEN3_MACH_DURATIONS[2]);
  s.driver.feedback(false);
  assert.equal(s.sample("up").durationMs, GEN3_MACH_DURATIONS[0]);
});
test("Motion busy does not advance Mach speed; pause and mode change clear transient input state", () => {
  const s = fixture();
  s.sample("right");
  const saved = s.driver.state;
  assert.equal(s.sample("left", { busy: true, dt: 1000 }), null);
  assert.deepEqual(s.driver.state, saved);
  assert.equal(s.sample("right", { paused: true }), null);
  assert.equal(s.sample("right").durationMs, GEN3_MACH_DURATIONS[0]);
  assert.deepEqual(s.sample("down", { mode: "walk" }), {
    kind: "step",
    direction: "down",
  });
  assert.equal(s.sample("right").durationMs, GEN3_MACH_DURATIONS[0]);
});
test("Rail-facing constraints prevent illegal idle turns and respect moving deceleration", () => {
  const s = fixture();
  s.context.cell.behavior = B.VERTICAL_RAIL;
  assert.equal(s.sample("left"), null);
  s.context.position.dir = "up";
  s.sample("up");
  s.sample("up");
  assert.equal(s.sample("left").direction, "up");
  assert.equal(s.driver.state.speed, 0);
});
test("Control policies must be synchronous and read-only; invalid actions cannot commit memory", () => {
  const d = {
    "mach-bike": { ...MOVEMENT_MODES["mach-bike"], inputRule: "test" },
  };
  for (const decide of [
    async () => ({ state: {} }),
    (c) => {
      c.input.direction = "down";
      return { state: {} };
    },
    () => ({ state: {}, action: { kind: "teleport", direction: "up" } }),
    () => ({
      state: {},
      action: { kind: "step", direction: "up", durationMs: Infinity },
    }),
    () => ({
      state: {},
      action: { kind: "step", direction: "up", technique: "missing" },
    }),
  ]) {
    const s = fixture({ test: { decide } }, d);
    assert.throws(() => s.sample("right"));
    assert.deepEqual(s.driver.state, {});
  }
  assert.throws(
    () => fixture({}, MOVEMENT_MODES),
    /Unknown movement input rule/,
  );
  const bad = fixture(
    {
      test: {
        decide: () => ({
          state: {},
          action: { kind: "step", direction: "up" },
        }),
      },
    },
    d,
  );
  assert.throws(
    () => bad.sample("right", { busy: true }),
    /Invalid movement input action/,
  );
});
test("Fractional frame motion finishes at its deadline without a floating-point extra frame", () => {
  const maps = { Lab: { width: 4, height: 4, connections: [] } },
    motion = new GridMotion(new SceneGraph(maps)),
    start = GEN3_MACH_DURATIONS[0],
    duration = GEN3_MACH_DURATIONS[1];
  const from = { map: "Lab", x: 0, y: 0, dir: "right" },
    to = { ...from, x: 1 };
  motion.begin(from, to, start, { duration });
  assert.equal(motion.moving(start + duration), false);
  assert.equal(motion.sample(to, start + duration).progress, 1);
});
test("Browser maps held and released logical input, preserves field/menu paths and clears on blur", () => {
  const listeners = {},
    windowListeners = {},
    frames = [],
    events = [],
    doc = {
      addEventListener(type, fn) {
        listeners[type] = fn;
      },
      querySelectorAll: () => [],
    },
    win = {
      addEventListener(type, fn) {
        windowListeners[type] = fn;
      },
    },
    game = {
      handleFieldInput: (frame) => frames.push(frame),
      resetFieldInput: () => events.push("reset"),
      save() {},
    },
    ui = {
      navigateMenu: (dir) => events.push(dir),
      navigateBattle() {},
      focusTrap() {},
      confirm() {},
      back() {},
      showMenu() {},
    };
  const browser = new BrowserInput({ document: doc, window: win, game, ui });
  const key = (key, repeat = false) => ({
    key,
    repeat,
    target: { closest: () => false },
    preventDefault() {},
  });
  listeners.keydown(key("ArrowRight"));
  listeners.keydown(key("Shift"));
  browser.tick();
  assert.deepEqual(frames.at(-1), {
    direction: "right",
    secondary: true,
    running: true,
  });
  listeners.keyup(key("ArrowRight"));
  browser.tick();
  assert.equal(frames.at(-1).direction, null);
  listeners.keyup(key("Shift"));
  browser.tick();
  assert.equal(frames.at(-1).secondary, false);
  ui.modalType = "bag";
  listeners.keydown(key("ArrowUp"));
  assert.equal(events.at(-1), "up");
  windowListeners.blur();
  assert.equal(events.at(-1), "reset");
  assert.equal(browser.held, null);
  browser.destroy();
});
