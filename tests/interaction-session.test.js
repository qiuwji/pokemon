import test from "node:test";
import assert from "node:assert/strict";
import {
  InteractionRegistry,
  InteractionSessionService,
} from "../src/engine/interactions.js";
import { objectSchema } from "../src/engine/extensions/values.js";
import { Random } from "../src/engine/model.js";

const bar = {
  version: 1,
  parameters: objectSchema({ speed: { type: "number", minimum: 0.01, maximum: 1 } }, ["speed"]),
  state: objectSchema(
    { cursor: { type: "number" }, direction: { type: "integer", enum: [1, -1] } },
    ["cursor", "direction"],
  ),
  result: objectSchema({ cursor: { type: "number" } }, ["cursor"]),
  inputs: ["confirm"],
  init: () => ({ cursor: 0, direction: 1 }),
  step: (state, frame) => {
    let cursor = state.cursor + state.direction * 0.1;
    let direction = state.direction;
    if (cursor > 1) {
      cursor = 1;
      direction = -1;
    }
    if (cursor < 0) {
      cursor = 0;
      direction = 1;
    }
    const next = { cursor, direction };
    if (frame.input.pressed.includes("confirm"))
      return {
        kind: "terminal",
        state: next,
        outcome: cursor >= 0.4 && cursor <= 0.6 ? "success" : "failure",
        result: { cursor },
      };
    return { kind: "running", state: next };
  },
  view: (state) => ({
    nodes: [{ kind: "meter", x: 8, y: 140, width: 120, height: 6, value: state.cursor }],
  }),
};

function build() {
  const registry = new InteractionRegistry({ "demo:bar": bar });
  return new InteractionSessionService({ registry, random: new Random(1) });
}

test("a session runs fixed logical steps and freezes a terminal result", () => {
  const service = build();
  const view = service.start("demo", "demo:bar", { speed: 0.1 });
  assert.equal(view.lifecycle, "running");
  assert.equal(service.active, true);
  service.advanceTicks(view.id, 5);
  assert.equal(service.view(view.id).state.cursor, 0.5);
  service.input(view.id, "confirm", true);
  const terminals = service.advanceTicks(view.id, 1);
  assert.equal(terminals.length, 1);
  assert.equal(terminals[0].lifecycle, "finishing");
  assert.equal(terminals[0].terminal.outcome, "success");
  assert(Math.abs(terminals[0].terminal.result.cursor - 0.6) < 1e-9);
  service.complete(view.id, { ok: true });
  assert.equal(service.view(view.id).lifecycle, "completed");
  assert.equal(service.active, false);
});

test("edges preserve press and release in the same tick", () => {
  const service = build();
  const view = service.start("demo", "demo:bar", { speed: 0.1 });
  service.setInput(view.id, ["confirm"]);
  service.setInput(view.id, []);
  const terminal = service.advanceTicks(view.id, 1)[0];
  assert.equal(terminal.terminal.outcome, "failure");
  assert.equal(service.sessions.get(view.id).frameEdges.length, 0);
});

test("wall-clock advance never runs more than the catch-up budget", () => {
  const service = build();
  const view = service.start("demo", "demo:bar", { speed: 0.1 });
  service.advance(0);
  service.advance(1000);
  const cursor = service.view(view.id).state.cursor;
  assert(cursor <= 0.8 + Number.EPSILON);
});

test("a running session rejects a second start and unknown inputs", () => {
  const service = build();
  service.start("demo", "demo:bar", { speed: 0.1 });
  assert.throws(() => service.start("demo", "demo:bar", { speed: 0.1 }), /already active/);
  const id = service.current();
  assert.throws(() => service.input(id, "jump", true), /Unknown interaction input/);
});

test("frame data is validated before it reaches the host renderer", () => {
  const service = build();
  const view = service.start("demo", "demo:bar", { speed: 0.1 });
  const frame = service.frame(view.id);
  assert.equal(frame.data.nodes[0].kind, "meter");
  const broken = new InteractionRegistry({
    "demo:bad": { ...bar, view: () => ({ nodes: [{ kind: "star" }] }) },
  });
  const fallback = new InteractionSessionService({ registry: broken, random: new Random(1) });
  const bad = fallback.start("demo", "demo:bad", { speed: 0.1 });
  assert.deepEqual(fallback.frame(bad.id).data, { nodes: [] });
});

test("a business fault fails the session without throwing", () => {
  const registry = new InteractionRegistry({
    "demo:boom": { ...bar, step: () => { throw new Error("boom"); } },
  });
  const service = new InteractionSessionService({ registry, random: new Random(1) });
  const view = service.start("demo", "demo:boom", { speed: 0.1 });
  assert.doesNotThrow(() => service.advanceTicks(view.id, 1));
  assert.equal(service.view(view.id).lifecycle, "failed");
  assert.equal(service.active, false);
});

test("pause freezes the clock and resume rebases without background catch-up", () => {
  const service = build();
  const view = service.start("demo", "demo:bar", { speed: 0.1 });
  service.advance(0);
  service.pause(view.id);
  assert.equal(service.view(view.id).lifecycle, "paused");
  service.advance(100000);
  assert.equal(service.view(view.id).state.cursor, 0);
  service.resume(view.id);
  service.advance(100000);
  service.advance(100000 + 1000 / 60);
  assert.equal(service.view(view.id).state.cursor, 0.1);
});

test("cancel discards an unfinished session without a result", () => {
  const service = build();
  const view = service.start("demo", "demo:bar", { speed: 0.1 });
  service.advanceTicks(view.id, 3);
  service.cancel(view.id);
  assert.equal(service.view(view.id).lifecycle, "cancelled");
  assert.equal(service.view(view.id).terminal, null);
  assert.equal(service.active, false);
});
