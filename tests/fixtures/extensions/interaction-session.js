import { manifest, objectSchema } from "../../helpers/session.js";
const position = objectSchema(
  {
    map: { type: "string" },
    x: { type: "integer" },
    y: { type: "integer" },
    dir: { type: "string" },
  },
  ["map", "x", "y", "dir"],
);
/** Test-only real-time session: registration, public clock/input and completion transaction. */
export const interactionSessionFixture = manifest(
  "fixture-bar",
  (api) => {
    const item = api.content.register("items", "prize", {
      name: "计时奖励",
      price: 0,
      contexts: ["field"],
      target: "party",
      effects: [{ op: "restoreHP", amount: 1 }],
      icon: "◇",
      description: "测试夹具。",
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
          ctx.intent({
            kind: "reward",
            reward: { id: "fixture-bar:win", items: { [item]: 1 } },
          });
        ctx.store.set("last", input.result.cursor);
      },
    });
    api.interactions.register("bar", {
      version: 1,
      parameters: objectSchema(
        { speed: { type: "number", minimum: 0.01, maximum: 1 } },
        ["speed"],
      ),
      state: objectSchema(
        { cursor: { type: "number" }, direction: { type: "integer", enum: [1, -1] } },
        ["cursor", "direction"],
      ),
      result: objectSchema({ cursor: { type: "number" } }, ["cursor"]),
      inputs: ["confirm"],
      completion,
      init: () => ({ cursor: 0, direction: 1 }),
      step: (state, frame) => {
        let cursor = state.cursor + 0.1;
        let direction = state.direction;
        if (cursor > 1) {
          cursor = 1;
          direction = -1;
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
    });
  },
  ["reward"],
);
