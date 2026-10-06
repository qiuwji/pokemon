import test from "node:test";
import assert from "node:assert/strict";
import { BrowserInput } from "../src/adapters/browser-input.js";

function fakeInput(declared = ["left", "right", "up", "down", "confirm"]) {
  const calls = [];
  const bridge = {
    active: () => true,
    declares: (action) => declared.includes(action),
    set: (action, active) => calls.push([action, active]),
    clear: () => {},
    cancel: () => calls.push(["cancel"]),
  };
  const listeners = new Map();
  const dirButtons = ["up", "down", "left", "right"].map((dir) => {
    const handlers = new Map();
    return {
      dataset: { dir },
      setPointerCapture() {},
      addEventListener(type, fn) {
        handlers.set(type, fn);
      },
      fire: (type, event = {}) => handlers.get(type)?.(event),
    };
  });
  const doc = {
    hidden: false,
    addEventListener: (type, fn) => listeners.set(type, fn),
    querySelector: () => null,
    querySelectorAll: (selector) => (selector === "[data-dir]" ? dirButtons : []),
  };
  const win = { addEventListener() {} };
  const game = { resetFieldInput() {}, storyBusy: false, save() {} };
  const input = new BrowserInput({
    document: doc,
    window: win,
    game,
    ui: { blocked: false },
    interactionInput: bridge,
  });
  const key = (type, value) =>
    listeners.get(type)({
      key: value,
      repeat: false,
      preventDefault() {},
      target: { closest: () => null },
    });
  return { input, calls, key, dirButtons };
}

test("held input merges sources and only releases when the last source lets go", () => {
  const { calls, key } = fakeInput();
  key("keydown", "a");
  key("keydown", "ArrowLeft");
  key("keyup", "a");
  assert.deepEqual(calls, [["left", true]]);
  key("keyup", "ArrowLeft");
  assert.deepEqual(calls, [["left", true], ["left", false]]);
});

test("touch direction buttons feed the session input bridge", () => {
  const { calls, dirButtons } = fakeInput();
  const right = dirButtons[3];
  right.fire("pointerdown", { preventDefault() {}, pointerId: 1 });
  assert.deepEqual(calls, [["right", true]]);
  right.fire("pointerup", {});
  assert.deepEqual(calls, [["right", true], ["right", false]]);
});
