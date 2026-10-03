import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "./helpers/session.js";
test("non-battle facility progresses and settles once", async () => {
  const plugin = manifest("stage-demo", api => {
    const activity = api.content.register("facilityActivities", "appeal", {
      parameters: objectSchema(),
      state: objectSchema({ score: { type: "integer", minimum: 0 } }, ["score"]),
      initial: { score: 0 },
      actions: { perform: { label: "表演", schema: objectSchema(),
        decide: c => ({ data: { score: c.data.score + 3 }, pendingReward: { money: 30 } }),
      } },
    });
    api.content.register("facilities", "hall", { name: "表演示例", activity, parameters: {} });
  });
  const { game, bus } = session([plugin]), before = game.state.money;
  assert(bus.executeSync("core.facility.enter", { id: "stage-demo:hall", team: [] }).ok);
  assert((await bus.execute("core.facility.action", { action: "perform" })).ok);
  assert.equal(game.facilityView().active.data.score, 3);
  assert(bus.executeSync("core.facility.claim", {}).ok);
  assert.equal(game.state.money, before + 30);
  assert.equal(game.facilityActive, false);
  assert.equal(bus.executeSync("core.facility.claim", {}).ok, false);
  game.loadDocument(game.exportDocument());
  assert.equal(game.facilityView().results[0].outcome, "win");
});
