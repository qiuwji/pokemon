import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
test("plugin actor identity and memory survive save restore", async () => {
  let api;
  const plugin = manifest("actor-demo", value => {
    api = value;
    api.content.register("npcBehaviors", "idle", { timing: { intervalMs: 100 }, decide: () => ({ move: false, pose: "still" }) });
    api.content.register("actorTemplates", "guide", {
      name: "向导", actor: "ProfBirch", behavior: "actor-demo:idle",
      schema: objectSchema({ visits: { type: "integer", minimum: 0 } }, ["visits"]), initialState: { visits: 0 },
    });
    api.actions.register("create", { schema: objectSchema(), run(ctx) {
      ctx.intent({ kind: "actors", operation: "spawn", template: "actor-demo:guide", position: { map: "LittlerootTown", x: 8, y: 10, dir: "down" } }, result => {
        ctx.store.set("guide", result.actor.uid);
        ctx.intent({ kind: "actors", operation: "update", uid: result.actor.uid, data: JSON.stringify({ visits: 1 }) });
      });
    } });
  }, ["actors"]);
  const { game, bus } = session([plugin]);
  await api.commands.dispatch("actor-demo:create");
  const uid = api.store.get("guide");
  game.loadDocument(game.exportDocument());
  assert.equal(api.store.get("guide"), uid);
  assert.equal(game.actors.view(uid).data.visits, 1);
  assert.equal(await bus.execute("core.actor.remove", { uid }), true);
  assert.equal(Object.hasOwn(game.actors.list(), uid), false);
});
