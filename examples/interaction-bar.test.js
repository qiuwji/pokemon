import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
const position = objectSchema(
  { map: { type: "string" }, x: { type: "integer" }, y: { type: "integer" }, dir: { type: "string" } },
  ["map", "x", "y", "dir"],
);
function timingBar() {
  let api;
  const plugin = manifest(
    "bar-demo",
    (value) => {
      api = value;
      const prize = api.content.register("items", "prize", {
        name: "计时奖励", price: 0, contexts: ["field"], target: "party",
        effects: [{ op: "restoreHP", amount: 10 }], icon: "◇", description: "示例。",
      });
      const completion = api.actions.register("finish", {
        schema: objectSchema(
          {
            instance: { type: "string", minLength: 1, maxLength: 128 },
            context: objectSchema({ map: { type: "string" }, position }, ["map", "position"]),
            outcome: { type: "string", enum: ["success", "failure"] },
            result: objectSchema({ cursor: { type: "number" } }, ["cursor"]),
          },
          ["instance", "context", "outcome", "result"],
        ),
        run(ctx, input) {
          if (input.outcome === "success")
            ctx.intent({ kind: "reward", reward: { id: "bar-demo:win", items: { [prize]: 1 } } });
          ctx.store.set("attempts", (ctx.store.get("attempts") || 0) + 1);
        },
      });
      api.interactions.register("timing", {
        version: 1,
        parameters: objectSchema({ speed: { type: "number", minimum: 0.01, maximum: 1 } }, ["speed"]),
        state: objectSchema({ cursor: { type: "number" }, direction: { type: "integer", enum: [1, -1] } }, ["cursor", "direction"]),
        result: objectSchema({ cursor: { type: "number" } }, ["cursor"]),
        inputs: ["confirm"],
        completion,
        init: () => ({ cursor: 0, direction: 1 }),
        step: (state, frame) => {
          let cursor = state.cursor + 0.1,
            direction = state.direction;
          if (cursor > 1) { cursor = 1; direction = -1; }
          const next = { cursor, direction };
          if (!frame.input.pressed.includes("confirm")) return { kind: "running", state: next };
          return { kind: "terminal", state: next,
            outcome: cursor >= 0.4 && cursor <= 0.6 ? "success" : "failure", result: { cursor } };
        },
        view: (state) => ({
          nodes: [
            { kind: "panel", x: 40, y: 120, width: 160, height: 12, background: "#202020", border: "#ffffff", borderWidth: 1 },
            { kind: "rect", x: 40 + Math.round(160 * 0.4), y: 120, width: Math.round(160 * 0.2), height: 12, color: "#f2d94e" },
            { kind: "line", x1: 40 + Math.round(160 * state.cursor), y1: 116, x2: 40 + Math.round(160 * state.cursor), y2: 136, width: 2, color: "#ffffff" },
            { kind: "text", x: 120, y: 110, text: "按 Z 判定", align: "center", size: 8, color: "#ffffff" },
          ],
          statusText: state.direction > 0 ? "→" : "←",
        }),
      });
    },
    ["reward"],
  );
  return { plugin, api: () => api };
}

test("authoring: a timing bar starts, judges input and settles a real reward", async () => {
  const { plugin, api } = timingBar();
  const s = session([plugin]);
  const bag = () => s.host.runtime.query().bag["bar-demo:prize"] || 0;
  await s.bus.execute("core.interaction.start",
    { definition: "bar-demo:timing", parameters: JSON.stringify({ speed: 0.1 }) }, "ui");
  await s.bus.execute("core.interaction.advance", { ticks: 5 }, "ui");
  await s.bus.execute("core.interaction.input", { action: "confirm", active: true }, "ui");
  const settled = await s.bus.execute("core.interaction.advance", { ticks: 1 }, "ui");
  assert.equal(settled.terminals[0].outcome, "success");
  assert.equal(bag(), 1);
  assert.equal(api().store.get("attempts"), 1);

  s.game.loadDocument(s.game.exportDocument());
  assert.equal(bag(), 1);
  assert.equal(api().store.get("attempts"), 1);
});

test("authoring: an early press fails without a reward and can be retried", async () => {
  const { plugin, api } = timingBar();
  const s = session([plugin]);
  const bag = () => s.host.runtime.query().bag["bar-demo:prize"] || 0;
  await s.bus.execute("core.interaction.start",
    { definition: "bar-demo:timing", parameters: JSON.stringify({ speed: 0.1 }) }, "ui");
  await s.bus.execute("core.interaction.input", { action: "confirm", active: true }, "ui");
  const settled = await s.bus.execute("core.interaction.advance", { ticks: 1 }, "ui");
  assert.equal(settled.terminals[0].outcome, "failure");
  assert.equal(bag(), 0);
  assert.equal(api().store.get("attempts"), 1);
});
