import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
test("first plugin uses registered content and public reward transaction", async () => {
  let api;
  const plugin = manifest("handoff-demo", value => {
    api = value;
    const item = api.content.register("items", "snack", {
      name: "示例点心", price: 10, contexts: ["field"], target: "party",
      effects: [{ op: "restoreHP", amount: 10 }], icon: "◇", description: "项目示例。",
    });
    api.actions.register("gift", { schema: objectSchema(), run(ctx) {
      ctx.intent({ kind: "reward", reward: { id: "handoff-demo:gift", items: { [item]: 1 } } });
    } });
  }, ["reward"]);
  const { game } = session([plugin]);
  await api.commands.dispatch("handoff-demo:gift", {});
  assert.equal(api.query().bag["handoff-demo:snack"], 1);
  await assert.rejects(api.commands.dispatch("handoff-demo:gift", {}), /Core intent rejected/);
  assert.equal(api.query().bag["handoff-demo:snack"], 1);
  const document = game.exportDocument();
  assert(document.state.contentDependencies.includes("handoff-demo"));
  game.loadDocument(document);
  assert.equal(api.query().bag["handoff-demo:snack"], 1);
});
