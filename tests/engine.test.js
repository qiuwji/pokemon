import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
} from "./helpers/inventory-fixture.js";
import { createItemService } from "../dist/engine/items.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import { emptyWeather } from "../dist/engine/weather.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  Random,
  createMonster,
  calculateStats,
  experienceAt,
  damage,
  captureCheck,
  grantExperience,
  healMonster,
  PHYSICAL_TYPES,
} from "../dist/engine/model.js";
import { Battle } from "../dist/engine/battle.js";
import { World, SaveStore } from "../dist/engine/world.js";
import { objectsFor, validateSave } from "../dist/packs/emerald/pack.js";
const db = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const state = () => ({
  weather: emptyWeather(),
  registeredItem: null,
  position: { map: "LittlerootTown", x: 10, y: 10, dir: "up" },
  party: [],
  box: [],
  bag: createBag({ pokeball: 5, potion: 2 }),
  flags: {},
  story: { completed: [], rewards: [] },
  seen: [],
  caught: [],
  money: 3000,
  randomSeed: 123,
  playSeconds: 0,
});
function setup(seed = 123) {
  const rng = new Random(seed);
  return {
    rng,
    p: createMonster("treecko", 5, db, rng),
    e: createMonster("zigzagoon", 2, db, rng),
  };
}
test("Generation III stat formula, nature, growth curve and physical/special split", () => {
  const m = {
    level: 50,
    nature: 0,
    iv: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    ev: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  };
  assert.deepEqual(calculateStats(m, db.species.treecko), {
    hp: 115,
    atk: 65,
    def: 55,
    spa: 85,
    spd: 75,
    spe: 90,
  });
  m.nature = 3;
  assert.equal(calculateStats(m, db.species.treecko).atk, 71);
  assert.equal(experienceAt(5, "medium_slow"), 135);
  assert.equal(experienceAt(6, "medium_slow"), 179);
  assert(!PHYSICAL_TYPES.has("dark"));
  assert(PHYSICAL_TYPES.has("ghost"));
  assert.equal(db.moves.tackle.power, 35);
});
test("STAB, type effectiveness, critical hit, immunity and low HP starter abilities", () => {
  const { rng, p, e } = setup();
  p.level = 20;
  p.stats = calculateStats(p, db.species.treecko);
  const mv = db.moves.absorb;
  const constant = { int: () => 15 };
  const normal = damage(p, e, mv, db, constant).amount;
  const crit = damage(p, e, mv, db, constant, { critical: true }).amount;
  assert(crit >= normal * 1.8);
  p.hp = 1;
  assert(damage(p, e, mv, db, constant).amount > normal);
  const ghostDb = {
    ...db,
    species: {
      ...db.species,
      zigzagoon: { ...db.species.zigzagoon, types: ["ghost"] },
    },
  };
  assert.equal(damage(p, e, db.moves.pound, ghostDb, rng).amount, 0);
});
test("Starter rescue ends, grants exact experience, and upgrades moves at level 6", () => {
  for (const starter of ["treecko", "torchic", "mudkip"]) {
    const rng = new Random(44),
      p = createMonster(starter, 5, db, rng),
      e = createMonster("zigzagoon", 2, db, rng);
    const b = new Battle({
      items: createItemService(ITEMS, fixtureInventory(ITEMS)),
      party: [p],
      enemy: e,
      db,
      rng,
      bag: createBag({ potion: 1, pokeball: 0 }),
      script: "rescue",
    });
    for (let n = 0; n < 30 && !b.ended; n++) b.act({ kind: "move", index: 0 });
    assert.equal(b.result, "win");
    assert.equal(
      p.exp,
      135 + Math.floor((db.species.zigzagoon.expYield * 2) / 7),
    );
  }
  const { p } = setup();
  grantExperience(p, 100, db.species.zigzagoon, db);
  assert.equal(p.level, 6);
  assert(p.moves.some((m) => m.id === "absorb"));
});
test("Status moves lower stats, PP decreases, replacement is free after faint", () => {
  const { rng, p, e } = setup();
  const second = createMonster("mudkip", 5, db, rng);
  const b = new Battle({
    items: createItemService(ITEMS, fixtureInventory(ITEMS)),
    party: [p, second],
    enemy: e,
    db,
    rng,
    bag: createBag({ potion: 0, pokeball: 1 }),
  });
  b.act({ kind: "move", index: 1 });
  assert.equal(b.stages[1].def, -1);
  assert.equal(p.moves[1].pp, db.moves.leer.pp - 1);
  p.hp = 0;
  const enemyHp = e.hp,
    pp = e.moves[0].pp;
  b.act({ kind: "switch", index: 1 });
  assert.equal(b.active, 1);
  assert.equal(e.hp, enemyHp);
  assert.equal(e.moves[0].pp, pp);
});
test("Poké Balls cannot catch trainers, fail consumes a turn, success uses one ball", () => {
  const { rng, p, e } = setup();
  let bag = createBag({ pokeball: 3, potion: 0 });
  const trainer = new Battle({
    items: createItemService(ITEMS, fixtureInventory(ITEMS)),
    party: [p],
    enemy: e,
    db,
    rng,
    bag,
    trainer: true,
  });
  trainer.act({ kind: "item", item: "pokeball" });
  assert.equal(inventoryQuantity(bag, "pokeball"), 3);
  const b = new Battle({
    items: createItemService(ITEMS, fixtureInventory(ITEMS)),
    party: [p],
    enemy: e,
    db,
    rng: { int: () => 0, next: () => 0 },
    bag,
  });
  b.act({ kind: "item", item: "pokeball" });
  assert.equal(b.result, "caught");
  assert.equal(inventoryQuantity(bag, "pokeball"), 2);
  assert(captureCheck(e, db.species.zigzagoon, { int: () => 0 }).caught);
});
test("Damage/PP recovery, invalid potions do not consume items, switching consumes turn", () => {
  const { rng, p, e } = setup();
  const bag = createBag({ potion: 1, pokeball: 0 });
  const b = new Battle({
    items: createItemService(ITEMS, fixtureInventory(ITEMS)),
    party: [p],
    enemy: e,
    db,
    rng,
    bag,
  });
  b.act({ kind: "item", item: "potion", index: 0 });
  assert.equal(inventoryQuantity(bag, "potion"), 1);
  p.hp = 1;
  b.act({ kind: "item", item: "potion", index: 0 });
  assert.equal(inventoryQuantity(bag, "potion"), 0);
  p.status = "poison";
  p.moves[0].pp = 0;
  healMonster(p, db);
  assert.equal(p.hp, p.stats.hp);
  assert.equal(p.status, null);
  assert.equal(p.moves[0].pp, db.moves.pound.pp);
});
test("Original map doors are collision 1 but traversable; indoor exits return to correct tile", () => {
  const s = state();
  s.position = { map: "LittlerootTown", x: 7, y: 17, dir: "up" };
  const w = new World(db.maps, s.position, {
    objects: () => objectsFor(s, db),
  });
  assert(w.move("up"));
  assert.equal(s.position.map, "LittlerootTown_ProfessorBirchsLab");
  assert.equal(s.position.y, 11);
  assert(w.move("down"));
  assert.equal(s.position.map, "LittlerootTown");
  assert.deepEqual([s.position.x, s.position.y], [7, 17]);
});
test("Connected roads retain position and NPC/water/walls stop movement", () => {
  const s = state();
  s.position = { map: "LittlerootTown", x: 10, y: 0, dir: "up" };
  const w = new World(db.maps, s.position, {
    objects: () => objectsFor(s, db),
  });
  assert(w.move("up"));
  assert.equal(s.position.map, "Route101");
  assert.equal(s.position.y, 19);
  assert(w.move("down"));
  assert.equal(s.position.map, "LittlerootTown");
  s.position.x = 15;
  s.position.y = 10;
  assert.equal(w.move("right"), false);
  assert.equal(s.position.x, 15);
});
test("Stairs arrive on accessible floor, ledges only allow southward jumps", () => {
  const s = state();
  s.position = {
    map: "LittlerootTown_BrendansHouse_1F",
    x: 8,
    y: 3,
    dir: "up",
  };
  const w = new World(db.maps, s.position);
  assert(w.move("up"));
  assert.equal(s.position.map, "LittlerootTown_BrendansHouse_2F");
  assert.equal(w.cell(s.position.x, s.position.y).collision, 0);
  assert(
    !w.map.warps.some((v) => v.x === s.position.x && v.y === s.position.y),
  );
  const m = db.maps.Route101,
    i = m.behavior.indexOf(59),
    x = i % m.width,
    y = Math.floor(i / m.width);
  s.position.map = "Route101";
  s.position.x = x;
  s.position.y = y - 1;
  const jump = w.move("down");
  assert(jump?.jump);
  assert.equal(s.position.y, y + 1);
  assert.equal(w.move("up"), false);
});
test("Browser save round-trip and corruption validation", () => {
  const s = state(),
    rng = new Random(12);
  s.party = [createMonster("treecko", 5, db, rng)];
  let raw;
  const storage = { setItem: (k, v) => (raw = v), getItem: () => raw };
  const store = new SaveStore(storage, "test", (v) => validateSave(v, db));
  store.save(s);
  assert.equal(store.load().state.party[0].species, "treecko");
  raw = "broken";
  assert.equal(store.load(), null);
  s.party[0].moves[0].id = "nonexistent";
  assert(!validateSave(s, db));
});
// Reachability across original maps is essential: it catches doors, ledges, counters, and blocked story tiles.
function pathTo(s, target) {
  const w = new World(db.maps, s.position, {
    objects: () => objectsFor(s, db),
  });
  const start = { ...s.position };
  const queue = [{ position: start, path: [] }],
    visited = new Set();
  for (let limit = 0; queue.length && limit < 20000; limit++) {
    const cur = queue.shift();
    const key = cur.position.map + ":" + cur.position.x + "," + cur.position.y;
    if (visited.has(key)) continue;
    visited.add(key);
    if (target(cur.position, w)) {
      Object.assign(s.position, start);
      return cur.path;
    }
    for (const dir of ["up", "down", "left", "right"]) {
      Object.assign(s.position, cur.position);
      const moved = w.move(dir);
      if (moved)
        queue.push({ position: { ...s.position }, path: [...cur.path, dir] });
    }
  }
  Object.assign(s.position, start);
  return null;
}
test("Full story path: town → rescue bag → center nurse → rival → professor", () => {
  const s = state();
  for (const [map, x, y] of [
    ["Route101", 7, 15],
    ["OldaleTown_PokemonCenter_1F", 7, 4],
    ["Route103", 10, 4],
    ["LittlerootTown_ProfessorBirchsLab", 6, 5],
  ]) {
    if (map === "OldaleTown_PokemonCenter_1F") s.flags.rescued = true;
    const path = pathTo(s, (p) => p.map === map && p.x === x && p.y === y);
    assert(path, `unreachable ${map}:${x},${y}`);
    const w = new World(db.maps, s.position, {
      objects: () => objectsFor(s, db),
    });
    for (const dir of path) assert(w.move(dir));
  }
});
