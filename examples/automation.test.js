import test from "node:test";
import assert from "node:assert/strict";
import { aiControl } from "../dist/plugins/ai-control.js";
import { createTestHarness } from "../dist/plugins/test-harness.js";
import { loadPluginCatalog } from "../dist/adapters/plugin-loader.js";
import { loadContentSync } from "../tools/content-io.mjs";
import { session } from "../tests/helpers/session.js";

test("Default AI observer exposes compact live state and commands; observation does not mutate the game", () => {
  const s = session([aiControl]), before = structuredClone(s.game.state), rng = s.game.rng.seed;
  s.game.storyBusy = true;
  const q = s.bus.executeSync("ai-control:observe", {}, "network");
  assert.equal(q.busy, true); assert.equal(q.party[0].uid, s.mon.uid);
  assert.equal(q.field, undefined); assert.equal(q.bag, undefined);
  assert(s.bus.executeSync("ai-control:commands", {}, "network").commands.some(c => c.id === "core.battle.action"));
  assert.deepEqual(s.game.state, before); assert.equal(s.game.rng.seed, rng);
  assert(Object.isFrozen(q.party[0]));
});

test("Actual catalog defaults only to AI control; test fixture requires an explicit test environment", async () => {
  const fs = await import("node:fs");
  const options = { url: new URL("../dist/plugins/catalog.json", import.meta.url), content: loadContentSync(),
    readJSON: url => JSON.parse(fs.readFileSync(url)) };
  assert.deepEqual((await loadPluginCatalog(options)).map(p => p.id), ["ai-control"]);
  await assert.rejects(loadPluginCatalog({ ...options, parameters: new URLSearchParams("test-harness=1") }), /test environment/);
  assert.deepEqual((await loadPluginCatalog({ ...options, environment: "test", parameters: new URLSearchParams("test-harness=1") })).map(p => p.id), ["ai-control", "test-harness"]);
});

test("Test harness prepares through atomic intents, retries once and exposes dialogue reward evidence", async () => {
  const base = loadContentSync(), s = session([aiControl, createTestHarness(base.maps.LittlerootTown_ProfessorBirchsLab)]);
  assert.deepEqual(s.bus.executeSync("test-harness:prepare", {}, "network"), { prepared: true });
  const after = structuredClone(s.game.state);
  assert.equal(s.bus.executeSync("test-harness:prepare", {}, "network").reason, "already-prepared");
  assert.deepEqual(s.game.state, after);
  assert.equal(s.game.state.party.length, 2);
  s.game.enter({ map: "test-harness:room", x: 3, y: 4, dir: "up" });
  s.bus.executeSync("core.field.interact", {}, "network"); await s.settle();
  const report = s.bus.executeSync("test-harness:report", {}, "network");
  assert(report.receivedGift); assert.equal(report.potions, 3);
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.bus.executeSync("test-harness:report").receivedGift, true);
});

test("Test harness preparation rolls back its reward and memory when party creation has no capacity", () => {
  const base = loadContentSync(), s = session([createTestHarness(base.maps.LittlerootTown_ProfessorBirchsLab)]);
  for (let i = 1; i < 6; i++) s.game.state.party.push({ ...structuredClone(s.mon), uid: "full-" + i });
  const before = structuredClone(s.game.state), rng = s.game.rng.seed;
  assert.throws(() => s.bus.executeSync("test-harness:prepare"), /capacity/);
  assert.deepEqual(s.game.state, before); assert.equal(s.game.rng.seed, rng);
  assert.equal(s.bus.executeSync("test-harness:report").prepared, false);
});
