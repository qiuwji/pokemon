import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "./helpers/session.js";
test("plugin actor identity and memory survive save restore", async () => {
  const plugin = manifest("actor-demo", api => {
    api.content.register("npcBehaviors", "idle", { decide: () => ({ pose: "still" }) });
    api.content.register("actorTemplates", "guide", {
      name: "向导", actor: "ProfBirch", behavior: "actor-demo:idle",
      schema: objectSchema({ visits: { type: "integer", minimum: 0 } }, ["visits"]),
      initialState: { visits: 0 },
    });
  });
  const { game, bus } = session([plugin]);
  const result = await bus.execute("core.actor.spawn", {
    template: "actor-demo:guide", position: { map: "LittlerootTown", x: 8, y: 10, dir: "down" },
  });
  assert.equal(result.ok, true);
  const uid = result.actor.uid;
  assert((await bus.execute("core.actor.update", { uid, data: JSON.stringify({ visits: 1 }) })).ok);
  game.loadDocument(game.exportDocument());
  assert.equal(game.actors.view(uid).data.visits, 1);
  assert.equal(await bus.execute("core.actor.remove", { uid }), true);
  assert.equal(Object.hasOwn(game.actors.list(), uid), false);
});
