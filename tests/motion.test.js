import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { SceneGraph, GridMotion, actorFrame } from "../dist/engine/motion.js";
import { NPCSystem } from "../dist/engine/npcs.js";
import { objectsFor } from "../dist/packs/emerald/pack.js";
const db = loadContentSync();
test("Native directional walk frames never mix south, north or west poses", () => {
  const sequences = {
    down: [3, 4, 0],
    up: [5, 6, 1],
    left: [7, 8, 2],
    right: [7, 8, 2],
  };
  for (const [dir, allowed] of Object.entries(sequences)) {
    for (let foot = 0; foot < 2; foot++)
      for (const t of [0.0, 0.2, 0.5, 0.8, 1]) {
        const f = actorFrame(dir, t, foot, t < 1);
        assert(allowed.includes(f.index));
        assert.equal(f.flip, dir === "right");
      }
    assert.equal(actorFrame(dir).index, allowed[2]);
  }
});
test("Town to route and route to town are exactly one grid step in a shared world", () => {
  const graph = new SceneGraph(db.maps);
  const a = graph.point({ map: "LittlerootTown", x: 10, y: 0 }),
    b = graph.point({ map: "Route101", x: 10, y: 19 });
  assert.equal(a.zone, b.zone);
  assert.equal(a.x, b.x);
  assert.equal(a.y - b.y, 16);
  const oldale = graph.point({ map: "OldaleTown", x: 10, y: 19 }),
    route = graph.point({ map: "Route101", x: 10, y: 0 });
  assert.equal(route.y - oldale.y, 16);
  const visible = graph.visible("LittlerootTown", { x: 0, y: -80 });
  assert(visible.includes("Route101"));
  assert(visible.includes("LittlerootTown"));
});
test("Crossing a map boundary interpolates instead of resetting and locks direction", () => {
  const graph = new SceneGraph(db.maps),
    motion = new GridMotion(graph);
  const from = { map: "LittlerootTown", x: 10, y: 0, dir: "up" },
    to = { map: "Route101", x: 10, y: 19, dir: "up" };
  assert(motion.begin(from, to, 1000));
  assert.equal(motion.sample(to, 1000).y, 0);
  assert.equal(motion.sample({ ...to, dir: "right" }, 1080).y, -8);
  assert.equal(motion.sample({ ...to, dir: "right" }, 1080).dir, "up");
  assert.equal(motion.sample(to, 1160).y, -16);
  assert(!motion.moving(1160));
});
test("Run and walk finish at the same grid destination with matching animation clocks", () => {
  const graph = new SceneGraph(db.maps);
  for (const [running, duration] of [
    [false, 160],
    [true, 96],
  ]) {
    const motion = new GridMotion(graph),
      from = { map: "LittlerootTown", x: 10, y: 10, dir: "up" },
      to = { ...from, y: 9 };
    motion.begin(from, to, 500, { running });
    assert.equal(motion.duration, duration);
    assert(motion.moving(500 + duration - 1));
    assert.equal(motion.sample(to, 500 + duration).y, 144);
    assert(!motion.moving(500 + duration));
  }
});
test("Original town NPCs wander within declared ranges, reserve cells and interpolate", () => {
  const state = {
    position: { map: "LittlerootTown", x: 10, y: 10, dir: "up" },
    flags: {},
    party: [],
  };
  const npc = new NPCSystem(
    db.maps,
    (map) => objectsFor({ ...state, position: { ...state.position, map } }, db),
    { random: () => 0.5 },
  );
  const list = npc.objects("LittlerootTown");
  const fat = list.find((n) => n.actor === "FatMan");
  assert.equal(fat.movement.mode, "wander");
  npc.tick(5000, state.position);
  assert.equal(fat.x, 11);
  assert.equal(fat.y, 13);
  assert(npc.reserved(fat).some((p) => p.x === 12));
  assert.equal(
    npc.view("LittlerootTown", 5128).find((n) => n.id === fat.id).px,
    11.5 * 16,
  );
  for (let i = 1; i < 15; i++) npc.tick(5000 + i * 3000, state.position);
  assert(Math.abs(fat.x - fat.originX) <= 2);
  assert(Math.abs(fat.y - fat.originY) <= 1);
});
test("NPCs respect player collision, dialogue pause and face player after interaction", () => {
  const map = {
    width: 5,
    height: 5,
    blocks: Array(25).fill(0),
    behavior: Array(25).fill(0),
    warps: [],
    connections: [],
  };
  const npc = new NPCSystem(
    { test: map },
    () => [
      {
        id: "test",
        x: 2,
        y: 2,
        dir: "down",
        movement: { mode: "wander", rangeX: 1, rangeY: 1 },
      },
    ],
    { random: () => 0.5 },
  );
  const person = npc.objects("test")[0];
  npc.tick(5000, { map: "test", x: 1, y: 2 });
  assert.equal(person.x, 2);
  npc.tick(8000, { map: "test", x: 4, y: 4 }, { paused: true });
  assert.equal(person.x, 2);
  npc.tick(11000, { map: "test", x: 4, y: 4 });
  assert.equal(person.x, 1);
  npc.face("test", "test", "right");
  assert.equal(person.dir, "right");
  assert.equal(person.duration, 0);
});
test("Every map uses 8x8 tile atlas definitions, not pre-rendered scene files", () => {
  for (const m of Object.values(db.maps)) {
    const p = db.tilesets[m.tileset];
    assert(p);
    assert.equal(p.tileSize, 8);
    assert.equal(p.gridSize, 16);
    assert.equal(m.border.length, 4);
    for (const block of m.blocks) {
      const def = p.metatiles[block & 1023];
      assert.equal(def.length, 8);
      for (const tile of def) assert(p.lookup[tile & ~3072] !== undefined);
    }
  }
  assert(Object.keys(db.tilesets["general-petalburg"].animations).length > 0);
});
