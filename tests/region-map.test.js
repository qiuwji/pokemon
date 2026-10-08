import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { RegionMapCursor } from "../src/engine/extensions/region-map.js";
import { emeraldStartMenu } from "../src/packs/emerald/start-menu.js";
import { EMERALD_REGION_GRID, emeraldRegionLocation, emeraldRegionName } from "../src/packs/emerald/region-map.js";
import { loadContentSync } from "../tools/content-io.mjs";

test("Region cursor is content-neutral, bounded and detached from caller mutations", () => {
  const grid = { width: 3, height: 2, cells: ["town", null, "route", null, "sea", null] };
  const cursor = new RegionMapCursor(grid, { x: 2, y: 0 });
  grid.cells[2] = "changed";
  assert.equal(cursor.move("right").section, "route");
  assert.deepEqual(cursor.move("down"), { x: 2, y: 1, section: null });
  assert.deepEqual(cursor.select(-1, 99), { x: 0, y: 1, section: null });
  assert.throws(() => { cursor.view().x = 1; }, TypeError);
  assert.throws(() => cursor.select(1.5, 0), /Invalid/);
  assert.deepEqual(cursor.move("invalid"), cursor.view());
  assert.throws(() => new RegionMapCursor({ ...grid, cells: ["town"] }), /Invalid/);
});

test("Native grid and route subdivision locate outdoor players while indoor maps retain their region", () => {
  const { maps } = loadContentSync();
  assert.equal(EMERALD_REGION_GRID.cells.length, 28 * 15);
  for (const id of ["LittlerootTown", "OldaleTown", "RustboroCity", "PetalburgCity"]) {
    const position = emeraldRegionLocation({ map: id, x: 0, y: 0 }, maps);
    const cursor = new RegionMapCursor({ width: 28, height: 15, cells: EMERALD_REGION_GRID.cells }, position);
    assert.equal(cursor.view().section, EMERALD_REGION_GRID.bindings[id]);
  }
  const route = maps.Route104;
  const north = emeraldRegionLocation({ map: "Route104", x: 0, y: 0 }, maps);
  const south = emeraldRegionLocation({ map: "Route104", x: 0, y: route.height - 1 }, maps);
  assert.equal(north.section, south.section);
  assert.equal(south.y - north.y, 2);
  assert.equal(emeraldRegionName(north.section), "104 号道路");
  assert.equal(emeraldRegionLocation({ map: "RustboroCity_PokemonCenter_1F", x: 9, y: 9 }, maps).section,
    "MAPSEC_RUSTBORO_CITY");
  assert.equal(emeraldRegionLocation({ map: "plugin:off-region", x: 0, y: 0 }, maps), null);
  assert.equal(emeraldRegionLocation(null, maps), null);
});

test("Original Start order follows unlocked features and uses the player's name", () => {
  const state = { flags: {}, party: [], playerName: "小遥" };
  assert.deepEqual(emeraldStartMenu(state).map(e => e.id), ["bag", "trainer", "save", "settings", "close"]);
  state.flags = { pokedex: true, pokenavReceived: true }; state.party = [{}];
  assert.deepEqual(emeraldStartMenu(state).map(e => e.id), ["dex", "party", "bag", "map", "trainer", "save", "settings", "close"]);
  assert.equal(emeraldStartMenu(state)[4].label, "小遥");
});

test("Region grid and transparent native sprites match recorded reference exports", () => {
  const root = new URL("../", import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL("generated/packs/emerald/region-map-source.json", root)));
  assert.equal(manifest.revision, "731ad5bfd6e6f265508d0efcca0ba42f9dcf5881");
  for (const [path, hash] of Object.entries(manifest.outputs)) {
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(new URL(path, root))).digest("hex"), hash, path);
  }
});
