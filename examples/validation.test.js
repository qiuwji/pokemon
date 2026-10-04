import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
test("late invalid intent rolls back plugin memory and world money", async () => {
  let api;
  const plugin = manifest("check-demo", value => {
    api = value;
    api.actions.register("bad", { schema: objectSchema(), run(ctx) {
      ctx.store.set("attempts", 1);
      ctx.intent({ kind: "reward", reward: { id: "check-demo:gift", money: 20 } });
      ctx.intent({ kind: "friendship", uid: "missing", amount: 1 });
    } });
  }, ["reward", "friendship"]);
  const { game } = session([plugin]);
  const before = structuredClone(game.state), seed = game.rng.snapshot();
  await assert.rejects(api.commands.dispatch("check-demo:bad", {}));
  assert.equal(game.state.money, before.money);
  assert.equal(api.store.get("attempts"), null);
  assert.deepEqual(game.state.story.rewards, before.story.rewards);
  assert.equal(game.rng.snapshot(), seed);
  const view = api.query();
  assert.throws(() => { view.party[0].hp = 0; }, TypeError);
  game.loadDocument(game.exportDocument());
  assert.equal(api.store.get("attempts"), null);
});
