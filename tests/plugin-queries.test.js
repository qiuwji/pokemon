import test from "node:test";
import assert from "node:assert/strict";
import { session, manifest, objectSchema } from "./helpers/session.js";

test("Read-only plugin queries remain available while busy without writing, saving or consuming RNG", () => {
  const plugin = manifest("reader", api => api.queries.register("view", {
    schema: objectSchema(), network: true,
    read: view => ({ position: view.query().position, data: view.store.get("missing") }),
  }));
  const s = session([plugin]), before = structuredClone(s.game.state), seed = s.game.rng.seed;
  s.bus.active = "long-running-command";
  s.game.storyBusy = true;
  const result = s.bus.executeSync("reader:view", {}, "network");
  assert.deepEqual(result.position, before.position);
  assert(Object.isFrozen(result.position));
  assert.deepEqual(s.game.state, before);
  assert.equal(s.game.rng.seed, seed);
  assert.equal(s.saved.size, 0);
});

test("Plugin query callbacks cannot dispatch commands or return promises; invalid reader is rejected", async () => {
  let api, denied;
  const plugin = manifest("reader", value => {
    api = value;
    api.queries.register("bad", { schema: objectSchema(), read() {
      denied = api.commands.dispatch("core.field.move", { direction: "down" });
      return {};
    } });
    api.queries.register("async", { schema: objectSchema(), read: async () => ({}) });
  }, ["movement"]);
  const s = session([plugin]), before = structuredClone(s.game.state);
  s.bus.executeSync("reader:bad");
  await assert.rejects(denied, /read-only callback/);
  assert.throws(() => s.bus.executeSync("reader:async"), /synchronous|Promise|Async/i);
  assert.deepEqual(s.game.state, before);
  assert.throws(() => session([manifest("invalid", api => api.queries.register("invalid", { schema: objectSchema() }))]), /Query requires/);
  await assert.rejects(s.bus.execute("reader:bad", {}, "network"), /not_network_enabled/);
  assert.throws(() => session([manifest("duplicate", api => {
    api.actions.register("same", { schema: objectSchema(), run() {} });
    api.queries.register("same", { schema: objectSchema(), read: () => ({}) });
  })]), /Duplicate plugin command/);
});
