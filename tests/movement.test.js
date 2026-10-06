import { loadContentSync } from "../tools/content-io.mjs";
import { emptyEncounterTickets } from "../dist/engine/encounter-tickets.js";
import { emptyFieldEffects } from "../dist/engine/field-effects.js";
import { createBag } from "./helpers/inventory-fixture.js";
import { createMonster, Random } from "../dist/engine/model.js";
import { emptyWeather } from "../dist/engine/weather.js";
import { emptyFacilities } from "../dist/engine/facilities.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { MovementRegistry, MovementService } from "../dist/engine/movement.js";
import { FieldSession } from "../dist/engine/field-session.js";
import { FieldDirector } from "../dist/engine/field-director.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { TravelService } from "../dist/engine/travel.js";
import { TravelDirector } from "../dist/presentation/travel-director.js";
import {
  MOVEMENT_MODES,
  TRAVEL_DESTINATIONS,
} from "../dist/packs/emerald/movement.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";

const map = (behavior = Array(15).fill(0)) => ({
  width: 5,
  height: 3,
  blocks: Array(15).fill(0),
  behavior,
  warps: [],
  connections: [],
  signs: [],
  npcs: [],
  indoor: false,
  allowBike: true,
});
function setup({
  definitions = MOVEMENT_MODES,
  maps = { field: map() },
  mode = "walk",
  capabilities = {
    run: true,
    "mach-bike": true,
    "acro-bike": true,
    surf: true,
  },
  objects = () => [],
} = {}) {
  let time = 0,
    clocks = 0,
    triggers = 0;
  const position = { map: Object.keys(maps)[0], x: 0, y: 1, dir: "right" },
    state = { mode };
  const timeline = new Timeline({
    now: () => time,
    wait: async (ms) => {
      time += ms;
    },
  });
  const movement = new MovementService({
    registry: new MovementRegistry(definitions),
    state,
    context: () => ({ capabilities }),
  });
  const field = new FieldSession({
    maps,
    position,
    objects,
    motion: new GridMotion(new SceneGraph(maps)),
    movement,
    transitions: new TransitionController(timeline),
    now: timeline.now,
    onProgress: () => clocks++,
    onStep: () => triggers++,
  });
  return {
    position,
    state,
    movement,
    field,
    timeline,
    finish() {
      time += field.motion.duration;
      field.tick(time);
    },
    counts: () => ({ clocks, triggers }),
  };
}

test("Mach bike accelerates on consecutive steps, turns and blocked steps reset momentum, ordinary grass remains passable", () => {
  const s = setup({ mode: "mach-bike" });
  for (const duration of [16000 / 60, 8000 / 60, 4000 / 60]) {
    assert(s.field.move("right"));
    assert.equal(s.field.motion.duration, duration);
    s.finish();
  }
  assert(s.field.move("down"));
  assert.equal(s.field.motion.duration, 16000 / 60);
  s.finish();
  assert.equal(s.field.move("down"), false);
  assert(s.field.move("up"));
  assert.equal(s.field.motion.duration, 16000 / 60);
  s.finish();
  s.field.world.map.behavior[s.position.y * 5 + 4] = 2;
  assert(s.field.move("right"));
  s.finish();
  s.field.world.map.behavior[s.position.y * 5 + 3] = 3;
  assert.equal(s.field.move("left"), false);
});

test("Surf boarding and dismount commit modes at animation completion, including a continuous water map connection", () => {
  const west = map(Array(15).fill(16)),
    east = map(Array(15).fill(16));
  west.behavior[5] = 0;
  east.behavior[6] = 0;
  west.connections.push({ direction: "right", offset: 0, map: "east" });
  east.connections.push({ direction: "left", offset: 0, map: "west" });
  const s = setup({ maps: { west, east } });
  assert.equal(s.field.move("right"), false);
  assert(s.field.move("right", { mode: "surf" }));
  assert.equal(s.state.mode, "walk");
  assert.equal(
    s.field.motion.sample(s.position, s.timeline.now()).mode,
    "surf",
  );
  s.finish();
  assert.equal(s.state.mode, "surf");
  for (let n = 0; n < 4; n++) {
    assert(s.field.move("right"));
    s.finish();
  }
  assert.equal(s.position.map, "east");
  assert.equal(s.state.mode, "surf");
  assert(s.field.move("right"));
  assert.equal(s.state.mode, "surf");
  s.finish();
  assert.equal(s.state.mode, "walk");
  assert.equal(s.field.move("right"), false);
});

test("Mode permissions and NPC reservations apply to water just as on land", () => {
  const s = setup({
    capabilities: {},
    maps: { field: map(Array(15).fill(16)) },
  });
  assert.equal(s.field.move("right", { mode: "surf" }), false);
  assert.equal(s.position.x, 0);
  const occupied = setup({
    mode: "surf",
    maps: { field: map(Array(15).fill(16)) },
    objects: () => [{ id: "swimmer", x: 2, y: 1, reserved: [{ x: 1, y: 1 }] }],
  });
  const npc = occupied.field.npcs.objects("field")[0];
  npc.fromX = 1;
  npc.fromY = 1;
  npc.start = 0;
  npc.duration = 160;
  assert.equal(occupied.field.move("right"), false);
});

test("Invalid extension plans fail before coordinates, step clocks or persistent modes change", () => {
  const broken = {
    ...MOVEMENT_MODES,
    hover: {
      allowed: () => true,
      traverse: () => true,
      durations: [80],
      afterStep: () => "typo",
    },
  };
  const s = setup({ definitions: broken, mode: "hover" });
  assert.throws(() => s.field.move("right"), /Unknown movement/);
  assert.equal(s.position.x, 0);
  assert.equal(s.field.world.steps, 0);
  assert.equal(s.state.mode, "hover");
  assert.equal(s.field.busy, false);
  assert.deepEqual(s.counts(), { clocks: 0, triggers: 0 });
});

test("A foreign content pack adds its own movement mode and cutscene path without changing field or pathfinding code", async () => {
  const definitions = {
    ...MOVEMENT_MODES,
    glide: {
      allowed: () => true,
      traverse: ({ cell }) => cell.collision === 0,
      durations: [73],
    },
  };
  const s = setup({ definitions, maps: { cloud: map(Array(15).fill(16)) } });
  const director = new FieldDirector({
    field: s.field,
    timeline: s.timeline,
    camera: { mode: "follow", reset() {} },
  });
  director.begin();
  await director.move({ actor: "player", to: { x: 3, y: 1 }, mode: "glide" });
  assert.equal(s.position.x, 3);
  assert.equal(s.field.motion.duration, 73);
  assert.deepEqual(s.counts(), { clocks: 3, triggers: 0 });
  await director.end();
  assert.equal(s.state.mode, "walk");
});

test("Bike normalizes to walking inside a doorway and transient running does not alter the saved mode", () => {
  const s = setup({ mode: "mach-bike" });
  assert(s.movement.set("mach-bike", s.field.world.map).ok);
  s.movement.normalize({ indoor: true });
  assert.equal(s.state.mode, "walk");
  assert(s.field.move("right", { running: true }));
  assert.equal(s.field.motion.duration, 8000 / 60);
  s.finish();
  assert.equal(s.state.mode, "walk");
});

test("Movement registration rejects duplicate IDs and invalid durations before a session starts", () => {
  const registry = new MovementRegistry(MOVEMENT_MODES);
  assert.throws(() => registry.register("walk", MOVEMENT_MODES.walk));
  assert.throws(() =>
    registry.register("broken", { ...MOVEMENT_MODES.walk, durations: [0] }),
  );
  assert.throws(() =>
    registry.register("broken", { ...MOVEMENT_MODES.walk, afterStep: 4 }),
  );
});

function travelSetup() {
  const maps = { field: map(), town: map() },
    position = { map: "field", x: 0, y: 1, dir: "right" };
  const context = { capabilities: { fly: true }, visited: ["town"] };
  let objects = [];
  const service = new TravelService({
    maps,
    position,
    destinations: {
      town: {
        name: "A town",
        position: { map: "town", x: 2, y: 1, dir: "down" },
      },
    },
    context: () => context,
    objects: () => objects,
  });
  return {
    service,
    position,
    context,
    maps,
    occupy: () => (objects = [{ x: 2, y: 1 }]),
  };
}

test("Flight validates visit, capability, indoor origin and live landing occupancy without moving the trainer", () => {
  const s = travelSetup();
  s.context.visited = [];
  assert.equal(s.service.prepare("town").ok, false);
  s.context.visited = ["town"];
  s.context.capabilities.fly = false;
  assert.equal(s.service.prepare("town").ok, false);
  s.context.capabilities.fly = true;
  s.maps.field.indoor = true;
  assert.equal(s.service.prepare("town").ok, false);
  s.maps.field.indoor = false;
  const { plan } = s.service.prepare("town");
  s.occupy();
  assert.equal(s.service.commit(plan).ok, false);
  assert.equal(s.position.map, "field");
});

test("Flight plans are issuer-owned, stale-position checked, and committed once", () => {
  const s = travelSetup(),
    other = travelSetup(),
    { plan } = s.service.prepare("town");
  assert.equal(other.service.commit(plan).ok, false);
  s.position.dir = "up";
  assert.equal(s.service.commit(plan).ok, false);
  const fresh = s.service.prepare("town").plan;
  assert(s.service.commit(fresh).ok);
  assert.equal(s.position.map, "town");
  assert.equal(s.service.commit(fresh).ok, false);
});

test("Flight covers the old map before committing, renders departure/arrival and releases its lock on failure", async () => {
  let time = 0,
    committed = false;
  const observations = [];
  const timeline = new Timeline({
    now: () => time,
    wait: async (ms) => {
      observations.push(director.sample());
      time += ms;
    },
  });
  const transitions = new TransitionController(timeline),
    director = new TravelDirector({ timeline, transitions });
  assert(
    await director.fly(() => {
      assert.equal(transitions.sample().covered, true);
      assert(director.busy);
      committed = true;
    }),
  );
  assert(committed);
  assert(observations.some((v) => v?.phase === "depart"));
  assert(observations.some((v) => v?.phase === "arrive"));
  assert.equal(director.busy, false);
  assert.equal(transitions.busy, false);
  await assert.rejects(
    director.fly(() => {
      throw new Error("occupied");
    }),
    /occupied/,
  );
  assert.equal(director.busy, false);
  assert.equal(transitions.busy, false);
});

test("Imported mode frames have valid native grid sizes and fly destinations resolve to unobstructed land", () => {
  const db = loadContentSync();
  for (const d of Object.values(TRAVEL_DESTINATIONS)) {
    const m = db.maps[d.position.map],
      i = d.position.y * m.width + d.position.x;
    assert.equal((m.blocks[i] >> 10) & 3, 0);
    assert(!m.warps.some((w) => w.x === d.position.x && w.y === d.position.y));
  }
  for (const id of [
    "BrendanMachBike",
    "BrendanAcroBike",
    "BrendanSurf",
    "SurfBlob",
    "FlyBird",
  ]) {
    const image = fs.readFileSync(
        new URL(`../dist/assets/actor-${id}.png`, import.meta.url),
      ),
      d = db.actors[id],
      width = image.readUInt32BE(16),
      height = image.readUInt32BE(20);
    assert.equal(width % d.w, 0);
    assert.equal(height, d.h);
    for (const index of [
      ...Object.values(d.frames?.facing || {}),
      ...Object.values(d.frames?.walk || {}).flat(),
    ])
      assert(index >= 0 && index < width / d.w);
  }
});

test("Saved movement rejects a bike on water, a surf mode on land and unknown visit destinations", () => {
  const db = loadContentSync();
  const state = {
    playerGender: "male",
    playerName: "训练家",
    position: { map: "Route103", x: 22, y: 9, dir: "right" },
    party: [createMonster("mudkip", 10, db, new Random(3))],
    box: [],
    bag: createBag({ mach_bike: 1 }),
    flags: { badgeBalance: true },
    story: { completed: [], rewards: [] },
    money: 0,
    seen: [],
    caught: [],
    movement: { mode: "surf", visited: ["OldaleTown"] },
  };
  state.weather = emptyWeather();
  state.facilities = emptyFacilities();
  state.fieldEffects = emptyFieldEffects();
  state.encounters = emptyEncounterTickets();
  state.appearances = { revision: 0, records: {} };
  state.registeredItem = null;
  state.party[0].moves[0] = { id: "surf", pp: 15 };
  assert(validateSave(state, db));
  state.movement.mode = "mach-bike";
  assert.equal(validateSave(state, db), false);
  state.position.x = 21;
  assert(validateSave(state, db));
  state.movement.mode = "surf";
  assert.equal(validateSave(state, db), false);
  state.movement.mode = "walk";
  state.movement.visited.push("invented");
  assert.equal(validateSave(state, db), false);
});

test("Flight uses a destination preview and delegates entry without changing position on rejection", () => {
  const maps = {
      a: {
        width: 2,
        height: 2,
        blocks: [0, 0, 0, 0],
        behavior: [0, 0, 0, 0],
        warps: [],
      },
    },
    position = { map: "a", x: 0, y: 0, dir: "down" },
    target = { map: "a", x: 1, y: 1, dir: "down" };
  let blocked = true;
  const travel = new TravelService({
    maps,
    position,
    destinations: { home: { name: "Home", position: target } },
    context: () => ({ capabilities: { fly: true }, visited: ["home"] }),
    preview: () => ({ map: maps.a, objects: blocked ? [{ x: 1, y: 1 }] : [] }),
    enter: () => false,
  });
  assert.equal(travel.prepare("home").ok, false);
  blocked = false;
  const plan = travel.prepare("home").plan;
  assert.equal(travel.commit(plan).ok, false);
  assert.deepEqual(position, { map: "a", x: 0, y: 0, dir: "down" });
});
