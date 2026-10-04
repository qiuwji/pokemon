import test from "node:test";
import assert from "node:assert/strict";
import { aiControl } from "../dist/plugins/ai-control/index.js";
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

test("Actual catalog defaults to AI control and the original BGM packs; the test fixture requires an explicit test environment", async () => {
  const fs = await import("node:fs");
  const options = { url: new URL("../dist/plugins/catalog.json", import.meta.url), content: loadContentSync(),
    readJSON: url => JSON.parse(fs.readFileSync(url)) };
  // The consolidated original-sound pack is content, not an opt-in experiment: the reference plays music.
  const defaults = (await loadPluginCatalog(options)).map(p => p.id);
  assert.deepEqual(defaults.sort(), ["ai-control", "emerald-audio"]);
  await assert.rejects(loadPluginCatalog({ ...options, parameters: new URLSearchParams("test-harness=1") }), /test environment/);
  assert.ok((await loadPluginCatalog({ ...options, environment: "test", parameters: new URLSearchParams("test-harness=1") })).map(p => p.id).includes("test-harness"));
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

test("AI detail projections include cultivation, catalog move/item details, collection and task destinations without RNG or save writes", () => {
  const s = session([aiControl]), before = structuredClone(s.game.state), seed = s.game.rng.seed;
  const q = s.bus.executeSync("ai-control:observe", { detail: "all" }, "network");
  assert.deepEqual(q.party[0].stats, s.mon.stats); assert.deepEqual(q.party[0].iv, s.mon.iv);
  assert.deepEqual(q.party[0].ev, s.mon.ev); assert.equal(q.party[0].nature, s.mon.nature); assert.equal(q.party[0].exp, s.mon.exp);
  const move = q.party[0].moves[0], definition = s.db.moves[move.id];
  assert.equal(move.power, definition.power); assert.equal(move.accuracy, definition.accuracy);
  assert.equal(move.maxPP, definition.pp); assert.equal(move.priority, definition.priority ?? 0);
  assert.equal(q.dex.caughtCount, s.game.state.caught.length); assert.equal(q.box.total, s.game.state.box.length);
  assert.equal(q.tasks.current.destination.map, "Route103");
  assert.deepEqual(s.game.state, before); assert.equal(s.game.rng.seed, seed); assert(Object.isFrozen(q.party[0].stats));
});
test("NPC confirmed-talk metadata survives save reload; observations describe interactions and current opponents", async () => {
  const base = loadContentSync(), s = session([aiControl, createTestHarness(base.maps.LittlerootTown_ProfessorBirchsLab)]);
  s.game.enter({ map: "test-harness:room", x: 3, y: 4, dir: "up" });
  const before = s.bus.executeSync("ai-control:observe", { detail: "world" });
  const npc = before.objects.find(o => o.inFront);
  assert(npc.canTalk); assert(npc.blocksMovement); assert.equal(npc.talkedBefore, false);
  s.bus.executeSync("core.field.interact", {}, "network"); await s.settle();
  assert.equal(s.bus.executeSync("ai-control:observe", { detail: "world" }).objects.find(o => o.id === npc.id).talkedBefore, true);
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.bus.executeSync("ai-control:observe", { detail: "world" }).objects.find(o => o.id === npc.id).talkedBefore, true);
  await s.game.startTrainerBattle("youngster");
  const b = s.bus.executeSync("ai-control:observe", { detail: "battle" }).battle;
  const enemy = b.combatants.find(seat => seat.monster?.uid !== s.mon.uid).monster;
  assert.equal(typeof enemy.stats.spe, "number"); assert(enemy.moves[0].name); assert(enemy.types.length);
});
