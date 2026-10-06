import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { validateSave } from "../src/packs/emerald/save-contract.js";

/** The host flushes queued map-enter stories once per frame; headless must do it explicitly. */
async function flush(s, predicate) {
  for (let i = 0; i < 60; i++) {
    await s.game.flushStoryQueue();
    if (predicate()) return true;
    try {
      await s.settle();
    } catch {
      // The story still owns control; the next frame continues the same command tree.
    }
  }
  return predicate();
}

const said = (s) =>
  s.dialogs
    .at(-1)
    .lines.flatMap((line) =>
      typeof line === "string" ? [line] : line.runs.map((run) => run.text),
    );

test("The reference opening map is present and centred on the truck interior", () => {
  const s = session([], { fresh: true });
  // Remove the helper's battle arrangement to validate the real empty-party opening state.
  s.game.state.party = [];
  s.game.state.flags = {};
  const map = s.db.maps.InsideOfTruck;
  // WarpToTruck() warps a new game into MAP_INSIDE_OF_TRUCK, and SetPlayerCoordsFromWarp
  // puts the player in the map centre when the reference passes no coordinates.
  assert.equal(Math.floor(map.width / 2), 2);
  assert.equal(Math.floor(map.height / 2), 2);
  // The importer now reads MAP_TYPE_INDOOR instead of guessing from underscores.
  assert.equal(map.indoor, true);
  assert.deepEqual(s.game.state.position, {
    map: "InsideOfTruck", x: 2, y: 2, dir: "down", elevation: 3, previousElevation: 3,
  });
  assert.deepEqual(s.game.state.movement.visited, []);
  const document = s.game.exportDocument();
  const invalid = structuredClone(document.state);
  invalid.movement.visited.push("InsideOfTruck");
  assert.equal(validateSave(invalid, s.db, s.catalog, s.host), false);
  assert(validateSave(document.state, s.db, s.catalog, s.host));
  s.game.loadDocument(document);
  assert.equal(s.game.state.position.map, "InsideOfTruck");
  assert.deepEqual(s.game.state.movement.visited, []);
});

test("The truck map is the real reference map with its boxes, signs and door tiles", () => {
  const s = session();
  const map = s.db.maps.InsideOfTruck;
  assert.equal(map.width, 5);
  assert.equal(map.height, 5);
  assert.equal(map.music, "MUS_NONE");
  // Reference object events: three moving boxes; five box signs share one script.
  assert.deepEqual(
    map.npcs.map((n) => n.local_id).sort(),
    ["LOCALID_TRUCK_BOX_BOTTOM_L", "LOCALID_TRUCK_BOX_BOTTOM_R", "LOCALID_TRUCK_BOX_TOP"],
  );
  assert.equal(map.signs.length, 5);
  assert.ok(map.signs.every((s2) => s2.script === "InsideOfTruck_EventScript_MovingBox"));
  // The three MAP_DYNAMIC warps are runtime destinations owned by the story, not map data.
  assert.deepEqual(map.warps, []);
  // The exit uses the reference atlas, not a scene image.
  assert.equal(Object.keys(s.db.tilesets[map.tileset].metatiles).length, 550);
  assert.equal(s.db.tilesets[map.tileset].tileSize, 8);
});

test("The truck opening plays the reference sound beats in order", async () => {
  const s = session();
  const cues = [];
  s.game.attachSound((cue) => cues.push(cue));
  s.game.state.flags.truckLeft = false;
  s.game.enter({ map: "InsideOfTruck", x: 2, y: 2, dir: "down" });
  await flush(s, () => cues.length >= 4);
  assert.deepEqual(cues, [
    "emerald-audio:se_truck_move",
    "emerald-audio:se_truck_stop",
    "emerald-audio:se_truck_unload",
    "emerald-audio:se_truck_door",
  ]);
  // The player stays under story control until the door opens.
  assert.equal(s.game.state.position.map, "InsideOfTruck");
});

test("The moving boxes read the original text", async () => {
  const s = session();
  s.game.state.flags.truckLeft = true;
  s.game.enter({ map: "InsideOfTruck", x: 1, y: 1, dir: "up" });
  s.game.interact();
  await s.settle();
  assert.match(said(s).join(""), /宝可梦品牌/);
});

test("Stepping on the truck door leaves for Littleroot at the reference warp tile", async () => {
  const s = session();
  s.game.state.flags.truckLeft = false;
  s.game.enter({ map: "InsideOfTruck", x: 2, y: 2, dir: "down" });
  await s.game.flushStoryQueue();
  await s.settle();
  // Let the arrival beats finish before the player regains control.
  for (let i = 0; i < 40 && (s.game.storyBusy || s.game.busy); i++) {
    await s.game.flushStoryQueue();
    await s.settle();
  }
  assert.equal(s.game.storyBusy, false);
  // The reference coord_event fires when the player steps onto the tiles in front of the door.
  assert.equal(s.game.move("right"), true);
  await s.game.timeline.wait(s.game.motion.duration);
  s.game.field.tick(s.game.timeline.now());
  assert.equal(s.game.state.position.map, "InsideOfTruck");
  await s.settle();
  assert.equal(s.game.move("right"), true);
  await s.game.timeline.wait(s.game.motion.duration);
  s.game.field.tick(s.game.timeline.now());
  await flush(s, () => s.game.state.position.map === "LittlerootTown");
  assert.equal(s.game.state.position.map, "LittlerootTown");
  assert.deepEqual(
    { x: s.game.state.position.x, y: s.game.state.position.y },
    { x: 3, y: 10 },
  );
  assert.equal(s.game.state.flags.truckLeft, true);
});
