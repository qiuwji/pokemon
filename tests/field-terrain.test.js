import { loadContentSync } from "../tools/content-io.mjs";
import { setQuantity } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  FieldTerrainRegistry,
  FieldTerrainService,
} from "../dist/engine/field-terrain.js";
import { FieldSession } from "../dist/engine/field-session.js";
import { MovementRegistry, MovementService } from "../dist/engine/movement.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { FieldDirector } from "../dist/engine/field-director.js";
import {
  BEHAVIOR as B,
  isWater,
  hasEncounterTerrain,
} from "../dist/engine/terrain.js";
import { EMERALD_TERRAIN_RULES } from "../dist/packs/emerald/terrain-rules.js";
import { MOVEMENT_MODES } from "../dist/packs/emerald/movement.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";

const map = (row) => ({
  width: row.length,
  height: 3,
  behavior: [...row.map(() => 0), ...row, ...row.map(() => 0)],
  blocks: Array(row.length * 3).fill(0),
  connections: [],
  warps: [],
  npcs: [],
  signs: [],
  indoor: false,
  allowBike: true,
});
function setup({
  maps = { field: map([0, B.ICE, B.ICE, 0, 0]) },
  rules = EMERALD_TERRAIN_RULES,
  mode = "walk",
  onStep = () => {},
} = {}) {
  let time = 0,
    paused = false;
  const events = [],
    steps = [],
    progress = [],
    position = { map: Object.keys(maps)[0], x: 0, y: 1, dir: "down" };
  const movement = new MovementService({
    registry: new MovementRegistry(MOVEMENT_MODES),
    state: { mode },
    context: () => ({
      capabilities: {
        "mach-bike": true,
        "acro-bike": true,
        run: true,
        surf: true,
      },
    }),
  });
  const timeline = new Timeline({
    now: () => time,
    wait: async (ms) => {
      time += ms;
    },
  });
  const field = new FieldSession({
    maps,
    position,
    movement,
    terrain: new FieldTerrainService(new FieldTerrainRegistry(rules)),
    objects: () => [],
    motion: new GridMotion(new SceneGraph(maps)),
    transitions: new TransitionController(timeline),
    now: timeline.now,
    canContinue: () => !paused,
    onTerrain: (event) => events.push(event),
    onProgress: () => progress.push({ ...position }),
    onStep: () => {
      steps.push({ ...position });
      onStep();
    },
  });
  return {
    field,
    movement,
    position,
    events,
    steps,
    progress,
    timeline,
    pause: (value) => {
      paused = value;
    },
    finish() {
      time += field.motion.duration;
      field.tick(time);
    },
    tick() {
      field.tick(time);
    },
    sample() {
      return field.motion.sample(position, time);
    },
  };
}
test("Terrain rules combine deterministic priority and veto with immutable small snapshots", () => {
  const rules = new FieldTerrainService(
    new FieldTerrainRegistry({
      z: {
        priority: 10,
        when: () => true,
        before: () => ({ allowed: true, duration: 60 }),
      },
      a: {
        priority: 10,
        when: () => true,
        before: (c) => {
          assert.throws(() => (c.cell.behavior = 5), TypeError);
          return { duration: 90 };
        },
      },
      veto: {
        when: () => true,
        before: () => ({ allowed: false, duration: 200 }),
      },
    }),
  );
  const result = rules.before({ cell: { behavior: 0 } });
  assert.equal(result.duration, 90);
  assert.equal(result.allowed, false);
  assert.deepEqual(result.ruleIds, ["a", "z", "veto"]);
});
test("Invalid, asynchronous and non-boolean terrain callbacks fail explicitly", () => {
  const registry = new FieldTerrainRegistry({
    valid: { when: () => true, after: () => null },
  });
  assert.throws(() => registry.register("valid", {}));
  for (const definition of [
    { when: () => true },
    { when: true, after: () => null },
    { when: () => true, after: () => null, priority: 1001 },
  ])
    assert.throws(() => registry.register("bad", definition));
  for (const rule of [
    { when: () => true, after: () => ({ direction: "typo" }) },
    { when: () => true, after: async () => null },
    { when: () => 1, after: () => null },
    { when: () => true, before: () => ({ duration: 0 }) },
    { when: () => true, before: () => ({ mystery: true }) },
  ]) {
    const service = new FieldTerrainService(new FieldTerrainRegistry({ rule }));
    assert.throws(() => (rule.before ? service.before({}) : service.after({})));
  }
});
test("Ice moves continuously with frozen footsteps and preserves per-tile clocks and encounters", () => {
  const s = setup();
  assert(s.field.move("right"));
  s.finish();
  assert.equal(s.position.x, 2);
  assert.equal(s.field.motion.duration, 96);
  assert.equal(s.sample().freezeAnimation, true);
  assert.equal(s.sample().pose, "slide");
  assert.equal(s.field.move("left"), false);
  s.finish();
  s.finish();
  assert.equal(s.position.x, 3);
  assert.equal(s.field.busy, false);
  assert.equal(s.steps.length, 3);
  assert.equal(s.progress.length, 3);
  assert(
    s.events
      .filter((e) => e.kind === "step")
      .slice(1)
      .every((e) => e.forced),
  );
});
test("A modal pauses queued terrain movement and resumes without losing the route; scripted movement overrides it", () => {
  const s = setup({ onStep: () => s.pause(true) });
  s.field.move("right");
  s.finish();
  assert.equal(s.position.x, 1);
  assert(s.field.busy);
  s.tick();
  assert.equal(s.position.x, 1);
  s.pause(false);
  s.tick();
  assert.equal(s.position.x, 2);
  s.finish();
  assert(s.field.move("up", { scripted: true }));
  s.finish();
  assert.equal(s.position.y, 0);
  assert.equal(s.field.busy, false);
});
test("Walls stop forced movement and cyclic conveyors release the input lock with an explicit reason", () => {
  const blocked = setup();
  blocked.field.world.map.blocks[7] = 1024;
  blocked.field.move("right");
  blocked.finish();
  assert.equal(blocked.position.x, 1);
  assert.equal(blocked.field.busy, false);
  assert.equal(blocked.events.at(-1).reason, "blocked");
  const loop = map([0, B.WALK_EAST, B.WALK_WEST]);
  const s = setup({ maps: { field: loop } });
  s.field.move("right");
  for (let i = 0; i < 5; i++) s.finish();
  assert.equal(s.field.busy, false);
  assert.equal(s.events.at(-1).reason, "cycle-limit");
});
test("Slide tiles lock the facing direction while conveyors turn it to their flow", () => {
  const slide = map([0, B.SLIDE_NORTH, 0]);
  const s = setup({ maps: { field: slide } });
  s.field.move("right");
  s.finish();
  assert.equal(s.position.y, 0);
  assert.equal(s.position.dir, "right");
  assert.equal(s.sample().freezeAnimation, true);
  s.finish();
  const conveyor = setup({ maps: { field: map([0, B.WALK_NORTH, 0]) } });
  conveyor.field.move("right");
  conveyor.finish();
  assert.equal(conveyor.position.dir, "up");
  assert.equal(conveyor.field.motion.duration, 160);
});
test("Ice crosses adjacent maps without a transition or a discontinuous camera coordinate", () => {
  const west = map([0, B.ICE]),
    east = map([B.ICE, 0]);
  west.connections.push({ direction: "right", map: "east", offset: 0 });
  east.connections.push({ direction: "left", map: "west", offset: 0 });
  const s = setup({ maps: { west, east } });
  s.field.move("right");
  s.finish();
  assert.equal(s.position.map, "east");
  assert.equal(s.position.x, 0);
  assert.equal(s.field.transitions.busy, false);
  assert.equal(s.sample().x, 16);
  s.finish();
  s.finish();
  assert.equal(s.position.x, 1);
  assert.equal(s.field.busy, false);
});
test("Currents remain water, retain surfing and dismount on land; encounter flags are independent", () => {
  const s = setup({
    maps: { field: map([0x10, B.CURRENT_EAST, B.CURRENT_EAST, 0]) },
    mode: "surf",
  });
  s.field.move("right");
  s.finish();
  assert.equal(s.movement.state.mode, "surf");
  assert.equal(s.field.motion.duration, 64);
  s.finish();
  s.finish();
  assert.equal(s.movement.state.mode, "walk");
  assert.equal(s.field.busy, false);
  assert(isWater(B.CURRENT_EAST));
  assert(!hasEncounterTerrain(B.CURRENT_EAST));
  assert(!isWater(0x16));
  assert(hasEncounterTerrain(0x10));
  assert.equal(
    setup({ maps: { field: map([0, B.CURRENT_EAST]) } }).field.move("right"),
    false,
  );
});
test("Muddy slopes reject a slow climb and retain facing while sliding down; fast Mach momentum climbs", () => {
  const terrain = map([0, 0, 0]);
  terrain.behavior[1] = B.MUDDY_SLOPE;
  const slow = setup({ maps: { field: terrain }, mode: "mach-bike" });
  slow.position.x = 1;
  slow.field.move("up");
  slow.finish();
  assert.equal(slow.position.y, 1);
  assert.equal(slow.position.dir, "up");
  assert.equal(slow.movement.momentum.steps, 0);
  slow.finish();
  const fast = setup({ maps: { field: terrain }, mode: "mach-bike" });
  fast.position.x = 1;
  fast.movement.momentum = { mode: "mach-bike", direction: "up", steps: 2 };
  fast.field.move("up");
  fast.finish();
  assert.equal(fast.position.y, 0);
  assert.equal(fast.field.busy, false);
});
test("Acro techniques gate bumpy slopes, enforce rail axes and consume a side hop only after committing", async () => {
  const terrain = map([0, B.VERTICAL_RAIL, 0]);
  terrain.blocks[1] = terrain.blocks[7] = 1024;
  const s = setup({ maps: { field: terrain }, mode: "acro-bike" });
  assert.equal(s.field.move("right"), false);
  const director = new FieldDirector({
    field: s.field,
    timeline: s.timeline,
    camera: { mode: "follow", reset() {} },
  });
  director.begin();
  assert.throws(() => director.route("player", { x: 1, y: 1 }), /No walkable/);
  await director.end();
  assert(s.movement.setTechnique("side-hop", terrain).ok);
  assert(s.field.move("right"));
  assert.equal(s.position.dir, "right");
  assert.equal(s.sample().pose, "side-hop");
  assert.equal(s.movement.technique, "side-hop");
  s.finish();
  assert.equal(s.movement.technique, "normal");
  assert.equal(s.field.move("right"), false);
  const bump = setup({
    maps: { field: map([0, B.BUMPY_SLOPE, 0]) },
    mode: "acro-bike",
  });
  assert.equal(bump.field.move("right"), false);
  bump.movement.setTechnique("hop", bump.field.world.map);
  assert(bump.field.move("right"));
  assert.equal(bump.field.motion.jump, true);
  assert.equal(
    bump.movement.setTechnique("unknown", bump.field.world.map).ok,
    false,
  );
});
test("No-running tiles keep walking speed and visual pose; forbidden bike tiles block before changing coordinates", () => {
  const s = setup({ maps: { field: map([0, B.NO_RUNNING, 0]) } });
  assert(s.field.move("right", { running: true }));
  assert.equal(s.field.motion.duration, 160);
  assert.equal(s.sample().pose, "walk");
  const bike = setup({
    maps: { field: map([0, B.NO_RUNNING, 0]) },
    mode: "mach-bike",
  });
  assert.equal(bike.field.move("right"), false);
  assert.equal(bike.position.x, 0);
});
test("Faulty post-step policies release the lock while invalid pre-step output cannot move the actor", () => {
  const s = setup({
    rules: { bad: { when: () => true, after: () => ({ direction: "oops" }) } },
  });
  s.field.move("right");
  s.finish();
  assert.equal(s.position.x, 1);
  assert.equal(s.field.busy, false);
  assert.equal(s.events.at(-1).kind, "fault");
  const bad = setup({
    rules: { bad: { when: () => true, before: () => ({ duration: -1 }) } },
  });
  assert.throws(() => bad.field.move("right"));
  assert.equal(bad.position.x, 0);
  assert.equal(bad.progress.length, 0);
});
test("Plugins register terrain policies without altering the executor and receive only immutable terrain metadata", () => {
  const db = loadContentSync();
  let observed = false;
  const { catalog } = createEmeraldPlugins(db, [
    {
      id: "flow",
      apiVersion: 1,
      version: "1.0.0",
      dataVersion: 1,
      permissions: [],
      setup(api) {
        api.content.register("terrainRules", "tile", {
          priority: 150,
          when(c) {
            observed =
              Object.isFrozen(c.map) && !Object.hasOwn(c.map, "blocks");
            return c.cell.behavior === 0;
          },
          after: () => ({ direction: "right", duration: 73 }),
        });
      },
    },
  ]);
  const s = setup({
    rules: catalog.terrainRules,
    maps: { field: map([0, 0, 0]) },
  });
  s.field.move("right");
  s.finish();
  assert(observed);
  assert.equal(s.field.motion.duration, 73);
  assert.equal(s.position.x, 2);
});

test("Application commands select techniques; a paused cutscene stops current drift and queued steps resume afterward", async () => {
  const { EmeraldAdventure } = await import(
    "../dist/packs/emerald/adventure.js"
  );
  const { BattleDirector } = await import(
    "../dist/presentation/battle-director.js"
  );
  const { attachEmeraldExtensions } = await import(
    "../dist/packs/emerald/extension-ports.js"
  );
  const base = loadContentSync();
  const lab = {
    ...base.maps.Route101,
    ...map([0, B.ICE, B.ICE, 0]),
    elements: [],
    id: "Lab",
    title: "Lab",
  };
  const compiled = createEmeraldPlugins(
    { ...base, maps: { ...base.maps, Lab: lab } },
    [],
  );
  let time = 0;
  const timeline = new Timeline({
    now: () => time,
    wait: async (ms) => {
      time += ms;
    },
  });
  const game = new EmeraldAdventure({
    ...compiled,
    plugins: compiled.host,
    storage: { getItem: () => null, setItem() {} },
    timeline,
    transitions: new TransitionController(timeline),
    motion: new GridMotion(new SceneGraph(compiled.db.maps)),
    director: new BattleDirector(timeline),
  });
  game.attachUI({ blocked: false, dialog: null, updateSide() {}, toast() {} });
  game.enter({ map: "Lab", x: 0, y: 1, dir: "right" });
  setQuantity(game.state.bag, "acro_bike", 1);
  const { bus } = attachEmeraldExtensions(game, compiled.host);
  assert((await bus.execute("core.movement.mode", { mode: "acro-bike" })).ok);
  assert(
    (await bus.execute("core.movement.technique", { technique: "wheelie" })).ok,
  );
  assert.equal(
    (await bus.execute("core.query", {})).movementTechnique,
    "wheelie",
  );
  assert((await bus.execute("core.movement.mode", { mode: "walk" })).ok);
  game.move("right");
  game.storyBusy = true;
  time += game.motion.duration;
  game.field.tick(time);
  assert.equal(game.state.position.x, 1);
  assert(game.busy);
  game.storyBusy = false;
  game.field.tick(time);
  assert.equal(game.state.position.x, 2);
  time += game.motion.duration;
  game.field.tick(time);
  time += game.motion.duration;
  game.field.tick(time);
  assert.equal(game.state.position.x, 3);
  assert.equal(game.busy, false);
});

test("Blocked slide continuation preserves facing instead of turning toward the blocked flow", () => {
  const terrain = map([0, B.SLIDE_NORTH, 0]);
  terrain.blocks[1] = 1024;
  const s = setup({ maps: { field: terrain } });
  s.field.move("right");
  s.finish();
  assert.equal(s.position.dir, "right");
  assert.equal(s.position.y, 1);
  assert.equal(s.field.busy, false);
  assert.equal(s.events.at(-1).reason, "blocked");
});
