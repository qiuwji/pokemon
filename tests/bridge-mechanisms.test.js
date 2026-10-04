import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { WorldStateService } from "../dist/engine/world-state.js";
import { World } from "../dist/engine/world.js";
import {
  FieldDevices,
  FieldDeviceCatalog,
} from "../dist/engine/field-devices.js";
import { BEHAVIOR as B } from "../dist/engine/terrain.js";

import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { Renderer } from "../dist/adapters/canvas-renderer.js";
const frames = (n) => (n * 1000) / 60;
const base = loadContentSync();
function fixture(style = "fortree-bridge", { lowerOnEntry = false } = {}) {
  let now = 0,
    saved = null;
  const lab = {
    ...base.maps.Route101,
    id: "Lab",
    width: 7,
    height: 4,
    blocks: Array(28).fill(0),
    behavior: Array(28).fill(0),
    connections: [],
    warps: [],
    npcs: [],
    signs: [],
    elements: [],
  };
  const logs = style === "log-bridge";
  lab.blocks[9] = 0;
  lab.behavior[9] = logs ? B.PACIFIDLOG_LOG_LEFT : B.FORTREE_BRIDGE;
  lab.blocks[10] = logs ? 1 : 0;
  lab.behavior[10] = logs ? B.PACIFIDLOG_LOG_RIGHT : B.FORTREE_BRIDGE;
  const compiled = createEmeraldPlugins(
    { ...base, maps: { ...base.maps, Lab: lab } },
    [
      {
        id: "bridges",
        apiVersion: 1,
        version: "1.0.0",
        dataVersion: 1,
        permissions: ["world"],
        setup(api) {
          api.content.register("fieldDevices", "one", {
            map: "Lab",
            x: 2,
            y: 1,
            mechanism: style,
            ...(logs
              ? {
                  footprint: [
                    { dx: 0, dy: 0 },
                    { dx: 1, dy: 0 },
                  ],
                  config: {
                    tiles: [
                      { floating: 0, half: 2, submerged: 4 },
                      { floating: 1, half: 3, submerged: 5 },
                    ],
                  },
                }
              : { config: { raised: 0, lowered: 1, lowerOnEntry } }),
          });
          if (!logs)
            api.content.register("fieldDevices", "two", {
              map: "Lab",
              x: 3,
              y: 1,
              mechanism: style,
              config: { raised: 0, lowered: 1, lowerOnEntry },
            });
        },
      },
    ],
  );
  const timeline = new Timeline({
      now: () => now,
      wait: async (ms) => {
        now += ms;
      },
    }),
    game = new EmeraldAdventure({
      ...compiled,
      plugins: compiled.host,
      storage: {
        getItem: () => saved,
        setItem: (_, v) => {
          saved = v;
        },
      },
      timeline,
      transitions: new TransitionController(timeline),
      director: new BattleDirector(timeline),
      motion: new GridMotion(new SceneGraph(compiled.db.maps)),
    });
  const faults = [];
  game.attachUI({
    blocked: false,
    dialog: null,
    updateSide() {},
    toast(t) {
      faults.push(t);
    },
    checkGrowth() {},
  });
  game.enter({ map: "Lab", x: 1, y: 1, dir: "right" });
  return {
    game,
    faults,
    lab,
    advance(ms) {
      now += ms;
      game.tick(now, ["Lab"]);
    },
    jump(ms) {
      now += ms;
    },
    tile(x) {
      const m = game.world.map,
        i = 7 + x;
      return {
        logical: m.blocks[i] & 1023,
        appearance: m.appearances[i] ?? m.blocks[i] & 1023,
        behavior: m.behavior[i],
        high: m.blocks[i] & ~1023,
      };
    },
  };
}
test("Appearance overlays are validated, immutable, saved/reset by visit and never alter collision/elevation/behavior", () => {
  const db = {
    maps: {
      Room: {
        width: 2,
        height: 1,
        tileset: "test",
        blocks: [0, 1024 | (2 << 12)],
        behavior: [0, 7],
        connections: [],
        warps: [],
      },
    },
    tilesets: { test: { metatiles: { 0: [], 1: [] } } },
  };
  const s = new WorldStateService({ db });
  s.commit(s.prepareVisit("Room"));
  const p = { map: "Room", x: 0, y: 0, dir: "right" },
    w = new World(s.maps, p);
  s.apply([
    { kind: "tile", map: "Room", x: 1, y: 0, appearance: 1, scope: "visit" },
  ]);
  assert.equal(w.move("right"), false);
  assert.equal(s.maps.Room.blocks[1], db.maps.Room.blocks[1]);
  assert.equal(s.maps.Room.behavior[1], 7);
  assert.equal(s.maps.Room.appearances[1], 1);
  assert(Object.isFrozen(s.maps.Room.appearances));
  const restored = new WorldStateService({
    db,
    state: JSON.parse(JSON.stringify(s.state)),
  });
  assert.equal(restored.maps.Room.appearances[1], 1);
  restored.apply([
    { kind: "tile", map: "Room", x: 1, y: 0, appearance: null, scope: "visit" },
  ]);
  assert.equal(restored.maps.Room.appearances[1], undefined);
  for (const appearance of [-1, 1024, 0.5, 2])
    assert.throws(() =>
      s.prepare([{ kind: "tile", map: "Room", x: 1, y: 0, appearance }]),
    );
  s.commit(s.prepareVisit("Room"));
  assert.equal(s.maps.Room.appearances[1], undefined);
});
test("Canvas chooses appearance per grid cell without changing logical map or scene placement", () => {
  const m = {
      width: 2,
      height: 1,
      tileset: "tiny",
      blocks: [0, 1],
      appearances: { 1: 3 },
    },
    calls = [];
  const renderer = Object.create(Renderer.prototype);
  Object.assign(renderer, {
    db: { maps: { Room: m }, tilesets: { tiny: {} } },
    graph: { placements: { Room: { x: 0, y: 0 } } },
    camera: { x: 0, y: 0, width: 320, height: 224 },
    grid: (_, block) => calls.push(block),
  });
  renderer.drawMap("Room", false, 0);
  assert.deepEqual(calls, [0, 3]);
  assert.deepEqual(m.blocks, [0, 1]);
});
test("Fortree preserves unpatched reference entry behavior, lowers bridge-to-bridge and bounces visually while logical tile is raised", () => {
  const s = fixture(),
    g = s.game;
  assert(g.move("right"));
  assert.equal(s.tile(2).logical, 0);
  s.advance(160);
  assert(g.move("right"));
  assert.equal(s.tile(3).logical, 1);
  assert.equal(s.tile(2).logical, 0);
  s.advance(frames(4));
  assert.equal(s.tile(2).appearance, 1);
  assert.equal(s.tile(2).logical, 0);
  assert.equal(s.tile(2).behavior, B.FORTREE_BRIDGE);
  s.advance(frames(4));
  assert.equal(s.tile(2).appearance, 0);
  s.advance(frames(3));
  assert.equal(s.tile(2).appearance, 1);
  s.advance(frames(4));
  assert.equal(s.tile(2).appearance, 0);
  assert.equal(g.state.devices.records["bridges:one"].phase, "raised");
  assert.deepEqual(s.faults, []);
});
test("Fortree activation handles spawn/re-entry, an odd lower plane never depresses, and re-entry cancels stale bounce frames", () => {
  const s = fixture(),
    g = s.game;
  g.enter({ map: "Lab", x: 2, y: 1, dir: "right" });
  assert.equal(s.tile(2).logical, 1);
  g.patchWorld([{ kind: "tile", map: "Lab", x: 1, y: 1, block: 3 << 12 }]);
  g.enter({ map: "Lab", x: 1, y: 1, dir: "right" });
  g.patchWorld([{ kind: "tile", map: "Lab", x: 2, y: 1, block: 15 << 12 }]);
  assert(g.move("right"));
  assert.equal(g.state.position.elevation, 3);
  assert.equal(s.tile(2).logical, 0);
  s.advance(160);
  g.enter({ map: "Lab", x: 2, y: 1, dir: "right" });
  assert(g.move("left"));
  s.advance(160);
  assert(g.move("right"));
  s.advance(frames(16));
  assert.equal(s.tile(2).appearance, 0);
  assert.equal(g.state.devices.records["bridges:one"].phase, "raised");
});
test("Log bridge sinks both cells, stays submerged between its ends and raises with separate logical/render tiles", () => {
  const s = fixture("log-bridge"),
    g = s.game;
  assert(g.move("right"));
  assert.deepEqual([s.tile(2).logical, s.tile(3).logical], [2, 3]);
  s.advance(frames(8));
  assert.deepEqual([s.tile(2).logical, s.tile(3).logical], [4, 5]);
  s.advance(30);
  assert(g.move("right"));
  assert.deepEqual([s.tile(2).logical, s.tile(3).logical], [4, 5]);
  assert.equal(Object.keys(g.state.devices.timers["bridges:one"]).length, 0);
  s.advance(160);
  assert(g.move("right"));
  assert.deepEqual([s.tile(2).logical, s.tile(3).logical], [0, 1]);
  assert.deepEqual([s.tile(2).appearance, s.tile(3).appearance], [2, 3]);
  s.advance(frames(8));
  assert.deepEqual([s.tile(2).appearance, s.tile(3).appearance], [0, 1]);
  assert.deepEqual(s.faults, []);
});
test("Bridge work pauses, saves remaining animation and re-enters with a fresh visit; delayed input starts timers at event time", () => {
  const s = fixture("log-bridge"),
    g = s.game;
  s.jump(100);
  assert(g.move("right"));
  s.advance(frames(4));
  assert.equal(s.tile(2).logical, 2);
  g.ui.blocked = true;
  s.advance(1000);
  g.ui.blocked = false;
  const doc = g.exportDocument();
  g.loadDocument(doc);
  assert.equal(s.tile(2).logical, 2); // paused whole field intervals freeze device clock.
  s.advance(frames(4));
  assert.equal(s.tile(2).logical, 4);
  g.enter({ map: "Lab", x: 1, y: 1, dir: "right" });
  assert.equal(s.tile(2).logical, 0);
  assert.equal(g.state.devices.records["bridges:one"], undefined);
  g.enter({ map: "Lab", x: 3, y: 1, dir: "right" });
  assert.equal(s.tile(3).logical, 5);
});
test("Footprints reject duplicates/bounds and multi-cell devices share identity and phase matching", () => {
  const maps = { Room: { width: 3, height: 3 } },
    mechanisms = { multi: { scope: "visit", activate: () => ({}) } };
  for (const footprint of [
    [{ dx: 1, dy: 0 }],
    [
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
    ],
    [
      { dx: 0, dy: 0 },
      { dx: -2, dy: 0 },
    ],
    [],
    null,
    [null],
  ])
    assert.throws(
      () =>
        new FieldDeviceCatalog({
          maps,
          mechanisms,
          devices: {
            one: { map: "Room", x: 1, y: 1, mechanism: "multi", footprint },
          },
        }),
      /footprint/,
    );
  const service = new FieldDevices({
    catalog: new FieldDeviceCatalog({
      maps,
      mechanisms,
      devices: {
        one: {
          map: "Room",
          x: 1,
          y: 1,
          mechanism: "multi",
          footprint: [
            { dx: 0, dy: 0 },
            { dx: 1, dy: 0 },
          ],
        },
      },
    }),
  });
  assert(
    service.matches(service.catalog.get("one"), { map: "Room", x: 2, y: 1 }),
  );
});

test("Native bridge content fails startup for an absent frame, mismatched pair or multi-cell Fortree section", () => {
  for (const placement of [
    { mechanism: "fortree-bridge", config: { raised: 1023, lowered: 0 } },
    {
      mechanism: "fortree-bridge",
      footprint: [
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
      ],
      config: { raised: 0, lowered: 1 },
    },
    {
      mechanism: "log-bridge",
      config: {
        tiles: [
          { floating: 0, half: 1, submerged: 2 },
          { floating: 0, half: 1, submerged: 2 },
        ],
      },
    },
    {
      mechanism: "log-bridge",
      footprint: [
        { dx: 0, dy: 0 },
        { dx: 2, dy: 0 },
      ],
      config: {
        tiles: [
          { floating: 0, half: 1, submerged: 2 },
          { floating: 0, half: 1, submerged: 2 },
        ],
      },
    },
  ])
    assert.throws(
      () =>
        createEmeraldPlugins(base, [
          {
            id: "invalid",
            apiVersion: 1,
            version: "1.0.0",
            dataVersion: 1,
            permissions: [],
            setup(api) {
              api.content.register("fieldDevices", "one", {
                map: "Route101",
                x: 2,
                y: 2,
                ...placement,
              });
            },
          },
        ]),
      /bridge|Fortree/,
    );
});
