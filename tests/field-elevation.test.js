import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../dist/engine/world.js";
import { ElevationPolicy } from "../dist/engine/elevation.js";
import { GEN3_ELEVATION as height } from "../dist/engine/rules/gen3/elevation.js";
import { findRoute } from "../dist/engine/pathfinding.js";
import { NPCSystem } from "../dist/engine/npcs.js";
import { NPCBehaviorRegistry } from "../dist/engine/npc-behaviors.js";
import {
  FieldTerrainRegistry,
  FieldTerrainService,
} from "../dist/engine/field-terrain.js";
import { EMERALD_TERRAIN_RULES } from "../dist/packs/emerald/terrain-rules.js";
import { findWatchingTrainer } from "../dist/engine/field-triggers.js";
import { emeraldFieldPriority } from "../dist/packs/emerald/field-layers.js";
import { Renderer } from "../dist/adapters/canvas-renderer.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
const map = (levels, width = levels.length) => ({
  id: "bridge",
  title: "Bridge",
  width,
  height: levels.length / width,
  blocks: levels.map((n) => n << 12),
  behavior: levels.map(() => 0),
  connections: [],
  warps: [],
  signs: [],
  npcs: [],
  elements: [],
  border: [0, 0, 0, 0],
});
test("Elevation is optional; Gen III transition and multi-level tiles retain separate logical and visual heights", () => {
  const m = map([3, 2, 0, 15, 2]),
    generic = { map: "bridge", x: 0, y: 0, dir: "right" };
  assert(new World({ bridge: m }, generic).move("right"));
  assert.equal(generic.elevation, undefined);
  const p = { map: "bridge", x: 0, y: 0, dir: "right" },
    w = new World({ bridge: m }, p, { elevation: height });
  assert.equal(w.move("right"), false);
  w.enter("bridge", 1, 0, "right");
  assert(w.move("right"));
  assert.equal(p.elevation, 0);
  assert.equal(p.previousElevation, 2);
  assert(w.move("right"));
  assert.equal(p.elevation, 0);
  assert.equal(p.previousElevation, 2);
  assert(w.move("right"));
  assert.equal(
    p.elevation,
    0,
    "Leaving multi-level tiles retains actor height",
  );
  assert.throws(() => height.validate({ elevation: 15 }));
  assert.throws(() => new ElevationPolicy({ multiLevel: 0, transition: 0 }));
});
test("Bridge objects and both movement reservations collide only on compatible planes; interaction uses the same policy", () => {
  const m = map([15, 15, 15]),
    objects = [
      {
        id: "low",
        x: 1,
        y: 0,
        elevation: 2,
        reserved: [{ x: 2, y: 0, elevation: 3 }],
      },
    ],
    p = {
      map: "bridge",
      x: 0,
      y: 0,
      dir: "right",
      elevation: 3,
      previousElevation: 3,
    },
    w = new World({ bridge: m }, p, {
      elevation: height,
      objects: () => objects,
    });
  assert.equal(w.interact(), null);
  assert(w.move("right"));
  assert.equal(w.move("right"), false);
  const low = new World(
    { bridge: m },
    { map: "bridge", x: 0, y: 0, dir: "right", elevation: 2 },
    { elevation: height, objects: () => objects },
  );
  assert.equal(low.interact().id, "low");
  assert.equal(low.move("right"), false);
});
test("Pathfinding distinguishes the same bridge coordinate on different heights instead of discarding a reachable route", () => {
  const maps = { bridge: map([3, 15, 2, 0, 0, 0], 3) },
    from = { map: "bridge", x: 0, y: 0, dir: "down", elevation: 3 },
    to = { map: "bridge", x: 1, y: 0, elevation: 2 };
  const path = findRoute(maps, from, to, { elevation: height }),
    p = { ...from },
    w = new World(maps, p, { elevation: height });
  for (const dir of path) assert(w.move(dir));
  assert.equal(p.x, 1);
  assert.equal(p.y, 0);
  assert.equal(p.elevation, 2);
  assert(path.length > 1);
  assert.equal(
    from.previousElevation,
    undefined,
    "BFS must not normalize the caller's position",
  );
});
test("Connected movement preserves bridge height and serialized standing state restores the same collision", () => {
  const a = map([15]),
    b = map([15]);
  a.connections = [{ direction: "right", map: "b", offset: 0 }];
  const p = {
      map: "a",
      x: 0,
      y: 0,
      dir: "right",
      elevation: 4,
      previousElevation: 4,
    },
    w = new World({ a, b }, p, { elevation: height });
  assert(w.move("right"));
  assert.equal(p.map, "b");
  assert.equal(p.elevation, 4);
  const restored = JSON.parse(JSON.stringify(p));
  new World({ a, b }, restored, { elevation: height });
  assert.deepEqual(restored, p);
});
test("Autonomous NPCs share height collisions with players, keep reservation height and cannot walk off their plane", () => {
  const m = map([15, 15, 2]),
    registry = new NPCBehaviorRegistry({
      forward: {
        decide: () => ({
          move: true,
          dir: "right",
          pose: "walk",
          duration: 160,
        }),
      },
    }),
    n = new NPCSystem(
      { bridge: m },
      () => [
        {
          id: "high",
          x: 0,
          y: 0,
          dir: "right",
          elevation: 3,
          movement: { mode: "forward", rangeX: 3 },
        },
      ],
      { random: () => 0, behaviors: registry, elevation: height },
    );
  n.objects("bridge");
  n.tick(1000, { map: "bridge", x: 1, y: 0, elevation: 2 });
  assert.equal(n.objects("bridge")[0].x, 1);
  assert(n.occupants("bridge")[0].reserved.every((p) => p.elevation === 3));
  n.tick(4000, { map: "bridge", x: 0, y: 0, elevation: 2 });
  assert.equal(n.objects("bridge")[0].x, 1);
});
test("Trainer sight and Fortree bicycle policy read actor height rather than the bridge tile sentinel", () => {
  const maps = { bridge: map([15, 15, 15]) },
    trainer = {
      id: "trainer",
      trainerId: "t",
      sightRange: 3,
      dir: "right",
      x: 0,
      y: 0,
      elevation: 3,
    },
    p = { map: "bridge", x: 2, y: 0, dir: "left", elevation: 2 };
  assert.equal(
    findWatchingTrainer({
      maps,
      position: p,
      objects: () => [trainer],
      elevation: height,
    }),
    null,
  );
  p.elevation = 3;
  assert.equal(
    findWatchingTrainer({
      maps,
      position: p,
      objects: () => [trainer],
      elevation: height,
    }).id,
    "trainer",
  );
  const terrain = new FieldTerrainService(
      new FieldTerrainRegistry(EMERALD_TERRAIN_RULES),
    ),
    c = {
      mode: "mach-bike",
      cell: { behavior: 0x78, elevation: 15 },
      sourceCell: { behavior: 0 },
      actor: { previousElevation: 2 },
    };
  assert.equal(terrain.before(c).allowed, false);
  c.actor.previousElevation = 3;
  assert.equal(terrain.before(c).allowed, undefined);
});
test("Renderer draws lower actors below the bridge overlay and higher actors above it without changing state", () => {
  const calls = [],
    m = map([15]),
    context = {
      save() {},
      restore() {},
      fillRect() {},
      translate() {},
      scale() {},
      beginPath() {},
      rect() {},
      clip() {},
    },
    r = new Renderer(
      { width: 320, height: 224, getContext: () => context },
      {
        maps: { bridge: m },
        tilesets: { small: {} },
        actors: { Low: { h: 16 }, High: { h: 16 } },
      },
      {},
      {
        fieldPriority: emeraldFieldPriority,
        appearanceView: (target, c) => ({
          shadow: true,
          layers: [
            {
              kind: "actor",
              actor: target.kind === "player" ? "Player" : c.actor,
            },
          ],
        }),
      },
    );
  m.tileset = "small";
  r.grid = () => {};
  r.drawMap = (id, overlay) => calls.push(overlay ? "overlay" : "base");
  r.actor = (id) => calls.push(id);
  r.cameraAt = () => ({
    x: 0,
    y: 0,
    width: 320,
    height: 224,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  r.graph.visible = () => ["bridge"];
  r.motion.sample = () => ({
    x: 0,
    y: 20,
    dir: "down",
    progress: 1,
    foot: 0,
    previousElevation: 3,
  });
  const p = { map: "bridge", x: 0, y: 0, dir: "down", elevation: 3 },
    before = { ...p };
  r.world(
    { map: m, maps: { bridge: m }, position: p },
    {
      view: () => [
        {
          id: "low",
          actor: "Low",
          px: 0,
          py: 10,
          dir: "down",
          previousElevation: 3,
        },
        {
          id: "high",
          actor: "High",
          px: 0,
          py: 10,
          dir: "down",
          previousElevation: 4,
        },
      ],
    },
    0,
  );
  assert.deepEqual(calls, ["base", "Low", "Player", "overlay", "High"]);
  assert.deepEqual(p, before);
});
test("Public actor commands permit two bridge planes, restore saved heights and reject invalid plane writes atomically", async () => {
  const base = loadContentSync(),
    m = map(Array(20).fill(15), 5);
  m.blocks[15] = 3 << 12;
  m.tileset = base.maps.Route101.tileset;
  const compiled = createEmeraldPlugins(base, [
    {
      id: "height",
      version: "1.0.0",
      apiVersion: 1,
      dataVersion: 1,
      permissions: ["actors"],
      setup(api) {
        api.content.register("maps", "bridge", { ...m, id: "height:bridge" });
        api.content.register("actorTemplates", "person", {
          name: "Person",
          actor: "ProfBirch",
          behavior: "still",
        });
      },
    },
  ]);
  let now = 0;
  const timeline = new Timeline({
      now: () => now,
      wait: async (ms) => {
        now += ms;
      },
    }),
    game = new EmeraldAdventure({
      ...compiled,
      plugins: compiled.host,
      storage: { getItem: () => null, setItem() {} },
      timeline,
      transitions: new TransitionController(timeline),
      director: new BattleDirector(timeline),
      motion: new GridMotion(new SceneGraph(compiled.db.maps)),
    });
  game.attachUI({ blocked: false, dialog: null, updateSide() {}, toast() {} });
  assert(game.enter({ map: "height:bridge", x: 0, y: 3, dir: "right" }));
  const { bus } = attachEmeraldExtensions(game, compiled.host),
    { actor } = await bus.execute("core.actor.spawn", {
      template: "height:person",
      position: { map: "height:bridge", x: 1, y: 3, dir: "down", elevation: 2 },
    });
  assert(game.move("right"));
  await timeline.wait(1000);
  game.field.tick(now);
  assert.equal(game.state.position.elevation, 3);
  assert.equal(
    game.actors.spawn("height:person", {
      map: "height:bridge",
      x: 1,
      y: 3,
      dir: "down",
      elevation: 3,
    }).ok,
    false,
  );
  const before = structuredClone(game.state.worldState);
  assert.throws(
    () =>
      game.patchWorld([
        { kind: "tile", map: "height:bridge", x: 1, y: 3, block: 4 << 12 },
      ]),
    /block/,
  );
  assert.deepEqual(game.state.worldState, before);
  await assert.rejects(
    bus.execute("core.actor.update", {
      uid: actor.uid,
      position: {
        map: "height:bridge",
        x: 1,
        y: 3,
        dir: "down",
        elevation: 15,
      },
    }),
  );
  game.loadDocument(game.exportDocument());
  assert.equal(game.actors.view(actor.uid).elevation, 2);
  assert.equal(game.state.position.elevation, 3);
  const npc = game.field.npcs
    .objects("height:bridge")
    .find((n) => n.id === actor.uid);
  assert.equal(
    game.actorRuntime.resolve("height:bridge", npc, {
      move: true,
      pose: "walk",
      goal: { map: "height:bridge", x: 2, y: 3, elevation: 3 },
    }).move,
    false,
    "Goal planning must preserve the actor's bridge plane",
  );
  const corrupt = structuredClone(game.state);
  corrupt.position.elevation = 15;
  assert.equal(
    validateSave(corrupt, compiled.db, compiled.catalog, compiled.host),
    false,
  );
  corrupt.position.elevation = 3;
  corrupt.actors.records[actor.uid].elevation = 15;
  assert.equal(
    validateSave(corrupt, compiled.db, compiled.catalog, compiled.host),
    false,
  );
});
