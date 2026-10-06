import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "./helpers/session.js";
import { sourceObjectId } from "../src/engine/world-object-index.js";
import { WorldStateService } from "../src/engine/world-state.js";
import { nextActorDirection } from "../src/engine/actor-navigation.js";
import { BEHAVIOR } from "../src/engine/terrain.js";
import { ExtensionCatalog } from "../src/engine/extensions/catalog.js";
import { loadContentSync } from "../tools/content-io.mjs";
import { assertPackContent } from "../src/packs/emerald/content.js";
import { objectsFor } from "../src/packs/emerald/pack.js";

test("Browser startup validates the native pack and each source NPC has a stable identity", () => {
  const db=loadContentSync(); assert.equal(assertPackContent(db),db);
  const cast=objectsFor({position:{map:"Route101"},flags:{rescued:true}},db);
  assert(cast.every(o=>typeof o.id==="string" && o.id.length>0));
  assert.equal(new Set(cast.map(o=>o.id)).size,cast.length);
  assert(!cast.some(o=>o.kind==="arena"));
});

function fixture() {
  let dialogue;
  const plugin = manifest("world-test", api => {
    const exports = api.story.registerBundle("speech", { version: 1,
      dialogues: { greeting: { name: "居民", lines: ["新的对白。"] } }, scripts: {}, entries: {},
    });
    dialogue = exports.dialogues.greeting;
  }, ["world"]);
  return { ...session([plugin]), dialogue };
}

test("Source identities do not depend on coordinates; listing distinguishes pending and special objects", async () => {
  assert.equal(sourceObjectId("Town", "npc", { x: 1, y: 2 }, 1),
    sourceObjectId("Town", "npc", { x: 8, y: 9 }, 1));
  const s = fixture(), map = "LittlerootTown";
  const before = await s.bus.execute("core.world.objects", { map });
  const npc = before.objects.find(o => o.kind === "talk" && o.x === 16 && o.y === 10);
  assert(npc.id && npc.sourceId);
  const pending = before.objects.find(o => o.availability === "not-instantiated");
  assert.equal(pending.capabilities.reason, "not-instantiated");
  const result = await s.bus.execute("core.world.patch", { feedback: true, operations: JSON.stringify([
    { kind: "object", map, id: npc.id, changes: { name: "新名字", dialogue: s.dialogue } },
  ]) });
  assert.equal(result.changes[0].object.id, npc.id);
  assert.equal(result.changes[0].object.dialogue, s.dialogue);
  assert.equal(result.changes[0].object.dialoguePreview.lines[0].runs[0].text, "新的对白。");
  assert(Object.isFrozen((await s.bus.execute("core.world.objects", { map })).objects));
  assert(s.game.enter({ map, x: 16, y: 11, dir: "up" }));
  await s.bus.execute("core.field.interact", {}); await s.settle();
  assert.equal(s.dialogs.at(-1).lines[0].runs[0].text, "新的对白。");
  const lab = await s.bus.execute("core.world.objects", { map: "OldaleTown_Mart" });
  const shop = lab.objects.find(o => o.kind === "shop");
  assert(!shop.capabilities.fields.includes("dialogue"));
  const state = structuredClone(s.game.state.worldState);
  await assert.rejects(s.bus.execute("core.world.patch", { operations: JSON.stringify([
    { kind: "object", map: shop.map, id: shop.id, changes: { dialogue: s.dialogue } },
  ]) }), /Unsupported world object field/);
  assert.deepEqual(s.game.state.worldState, state);
});

test("Sign patches affect interaction and readback without creating an NPC blocker", async () => {
  const s = fixture(), map = "LittlerootTown";
  const { objects } = await s.bus.execute("core.world.objects", { map });
  const sign = objects.find(o => o.kind === "sign" && o.x === 15 && o.y === 13);
  const snapshot = structuredClone(s.game.state.worldState);
  await assert.rejects(s.bus.execute("core.world.patch", { operations: JSON.stringify([
    { kind: "object", map, id: sign.id, changes: { dialogue: "missing:dialogue" } },
  ]) }), /Unknown world dialogue/);
  assert.deepEqual(s.game.state.worldState, snapshot);
  await s.bus.execute("core.world.patch", { operations: JSON.stringify([
    { kind: "object", map, id: sign.id, changes: { dialogue: s.dialogue } },
  ]) });
  assert(!s.game.field.npcs.occupants(map).some(o => o.id === sign.id));
  assert(s.game.enter({ map, x: 15, y: 14, dir: "up" }));
  assert.equal(s.game.world.interact().id, sign.id);
  await s.bus.execute("core.field.interact", {}); await s.settle();
  assert.equal(s.dialogs.at(-1).lines[0].runs[0].text, "新的对白。");
  const document = s.game.exportDocument();
  assert(document.state.contentDependencies.includes("world-test"));
  s.game.loadDocument(document);
  assert.equal((await s.bus.execute("core.world.objects", { map, id: sign.id })).objects[0].dialogue, s.dialogue);
  const plain = session();
  plain.game.loadDocument(document);
  assert(plain.game.state.suspendedContent.records.some(r => r.payload.path?.includes(sign.id)));
  assert.equal((await plain.bus.execute("core.world.objects", { map, id: sign.id })).objects[0].dialogue, null);
  await s.bus.execute("core.world.patch", { feedback: true, operations: JSON.stringify([
    { kind: "object", map, id: sign.id, hidden: true },
  ]) });
  assert.equal(s.game.world.interact(), null);
});

test("Region queries report effective appearance and revision; actor endpoints use the effective map", async () => {
  const s = fixture(), map = "LittlerootTown";
  const before = await s.bus.execute("core.world.cells", { map, x: 8, y: 9, width: 1, height: 1 });
  const result = await s.bus.execute("core.world.patch", { feedback: true, operations: JSON.stringify([
    { kind: "tile", map, x: 8, y: 9, appearance: 0 },
  ]) });
  const cell = result.changes[0].region.cells[0];
  assert.equal(cell.appearance, 0);
  assert.equal(cell.block, before.cells[0].block);
  assert.equal(cell.collision, before.cells[0].collision);
  assert.equal(result.changes[0].region.revision, result.revision);
  assert.equal(s.game.applications.actors.repository.maps[map], s.game.worldState.maps[map]);
  assert.equal(s.game.applications.devices.service.catalog.maps[map], s.game.worldState.maps[map]);
});

test("Numeric tile overlays retain their registered tileset owner as a save dependency", () => {
  const catalog = new ExtensionCatalog({ maps: { Town: { tileset: "tile-mod:grid" } }, tilesets: {} });
  const stage = catalog.stage("tile-mod");
  stage.register("tilesets", "grid", { metatiles: { 0: Array(8).fill(0) } });
  stage.commit(); catalog.seal(() => {});
  assert(catalog.dependencies({ worldState: { maps: {
    Town: { tiles: { 0: { appearance: 0 } }, objects: {} },
  } } }).includes("tile-mod"));
});

test("Navigation changes immediately when an effective land tile becomes water", () => {
  const map = { id: "Field", width: 5, height: 4, tileset: "grid",
    blocks: Array(20).fill(0), behavior: Array(20).fill(0), connections: [], warps: [], signs: [] };
  const world = new WorldStateService({ db: {
    maps: { Field: map }, tilesets: { grid: { metatiles: { 0: Array(8).fill(0) } } }, actors: {},
  } });
  const from = { map: "Field", x: 1, y: 1, dir: "down" },
    goal = { map: "Field", x: 3, y: 1 };
  assert.equal(nextActorDirection(world.maps, from, goal, {}), "right");
  world.apply([{ kind: "tile", map: "Field", x: 2, y: 1, behavior: BEHAVIOR.POND_WATER }]);
  assert.notEqual(nextActorDirection(world.maps, from, goal, {}), "right");
  assert.equal(map.behavior[7], 0);
});
