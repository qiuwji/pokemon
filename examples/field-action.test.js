import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "./helpers/session.js";
test("plugin field plan commits through the public command", async () => {
  const plugin = manifest("paint-demo", api => {
    api.content.register("fieldActions", "paint", {
      name: "涂色", duration: 100, cue: "field-cut",
      allowed: () => true,
      target: context => context.position,
      plan: context => ({ kind: "world", operations: [{
        kind: "tile", map: context.position.map, x: 1, y: 1,
        behavior: 2, scope: "permanent",
      }] }),
    });
  });
  const { game, bus } = session([plugin]);
  const result = await bus.execute("core.field.action", { id: "paint-demo:paint" });
  assert.equal(result.ok, true);
  assert.equal(game.world.map.behavior[game.world.map.width + 1], 2);
  const saved = game.exportDocument();
  game.loadDocument(saved);
  assert.equal(game.world.map.behavior[game.world.map.width + 1], 2);
  assert.equal((await bus.execute("core.field.action", { id: "paint-demo:typo" })).ok, false);
});
