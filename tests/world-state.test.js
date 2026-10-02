import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  WorldStateService,
  emptyWorldState,
} from "../dist/engine/world-state.js";
import { World } from "../dist/engine/world.js";
import { NPCSystem } from "../dist/engine/npcs.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
const db = {
  maps: {
    Meadow: {
      id: "Meadow",
      title: "Meadow",
      width: 4,
      height: 4,
      tileset: "small",
      blocks: Array(16).fill(0),
      behavior: Array(16).fill(0),
      border: [0, 0, 0, 0],
      connections: [],
      warps: [],
    },
  },
  tilesets: {
    small: { metatiles: { 0: Array(8).fill(0), 1: Array(8).fill(0) } },
  },
  actors: { Pet: {} },
  trainers: {},
};
const definitions = [
  { id: "rock", actor: "Pet", x: 2, y: 1, dir: "down", kind: "talk" },
];
function service(state = emptyWorldState()) {
  return new WorldStateService({ db, state, objects: () => definitions });
}
test("Persistent overlays share collision/projection, preserve source arrays, and restore after serialization", () => {
  const s = service(),
    p = { map: "Meadow", x: 0, y: 1, dir: "right" },
    w = new World(s.maps, p, { objects: (map) => s.projectObjects(map) });
  s.apply([{ kind: "tile", map: "Meadow", x: 1, y: 1, block: 1024 }]);
  assert.equal(w.move("right"), false);
  assert.equal(db.maps.Meadow.blocks[5], 0);
  assert(Object.isFrozen(s.maps.Meadow.blocks));
  s.apply([
    { kind: "tile", map: "Meadow", x: 1, y: 1, block: 0 },
    { kind: "object", map: "Meadow", id: "rock", changes: { x: 3, y: 1 } },
  ]);
  assert(w.move("right"));
  assert(w.move("right"));
  assert.equal(w.move("right"), false);
  const restored = service(JSON.parse(JSON.stringify(s.state)));
  assert.deepEqual(restored.maps.Meadow.blocks, s.maps.Meadow.blocks);
  assert.equal(restored.projectObjects("Meadow")[0].x, 3);
});
test("Invalid batch leaves no partial tile write; unknown references and stale plans fail", () => {
  const s = service(),
    before = structuredClone(s.state);
  assert.throws(() =>
    s.apply([
      { kind: "tile", map: "Meadow", x: 1, y: 1, block: 1024 },
      { kind: "object", map: "Meadow", id: "missing", changes: { x: 2 } },
    ]),
  );
  assert.deepEqual(s.state, before);
  assert.throws(() =>
    s.apply([{ kind: "tile", map: "Meadow", x: 1, y: 1, block: 1023 }]),
  );
  assert.throws(() =>
    s.apply([
      {
        kind: "object",
        map: "Meadow",
        id: "new",
        spawn: true,
        changes: { x: 1, y: 2, actor: "missing" },
      },
    ]),
  );
  const draft = s.prepare([
    { kind: "tile", map: "Meadow", x: 1, y: 1, behavior: 2 },
  ]);
  s.apply([{ kind: "tile", map: "Meadow", x: 0, y: 0, block: 1 }]);
  assert.throws(() => s.commit(draft), /Stale/);
});
test("Object spawn/hide and changed positions invalidate autonomous and scene-pinned NPC state", () => {
  const s = service(),
    n = new NPCSystem(s.maps, (map) => s.projectObjects(map), {
      random: () => 0,
    });
  const old = n.objects("Meadow")[0];
  n.beginScene();
  n.control("rock", "Meadow");
  s.apply([
    { kind: "object", map: "Meadow", id: "rock", changes: { x: 3, y: 2 } },
  ]);
  n.invalidate("Meadow", "rock");
  const changed = n.objects("Meadow")[0];
  assert.notEqual(changed, old);
  assert.equal(changed.x, 3);
  assert.equal(changed.originX, 3);
  s.apply([
    { kind: "object", map: "Meadow", id: "rock", hidden: true },
    {
      kind: "object",
      map: "Meadow",
      id: "visitor",
      spawn: true,
      changes: { x: 0, y: 3, actor: "Pet" },
    },
  ]);
  n.invalidate("Meadow", "rock");
  assert.deepEqual(
    n.objects("Meadow").map((o) => o.id),
    ["visitor"],
  );
  n.endScene();
});
test("Public world command and story worldPatch persist a created actor and grid update; load uses the same overlay", async () => {
  const base = JSON.parse(
    fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
  );
  const { db, catalog, host } = createEmeraldPlugins(base, []);
  let raw = null;
  const storage = {
    getItem: () => raw,
    setItem: (_, value) => {
      raw = value;
    },
  };
  const timeline = new Timeline({ now: () => 0, wait: async () => {} });
  const build = () =>
    new EmeraldAdventure({
      db,
      catalog,
      plugins: host,
      storage,
      timeline,
      transitions: new TransitionController(timeline),
      director: new BattleDirector(timeline),
      motion: new GridMotion(new SceneGraph(db.maps)),
    });
  const game = build();
  game.ui = {
    blocked: false,
    dialog: null,
    updateSide() {},
    extensions: { refresh() {} },
  };
  const { bus } = attachEmeraldExtensions(game, host);
  const map = "LittlerootTown_ProfessorBirchsLab",
    block = db.maps[map].blocks[4 * db.maps[map].width + 5];
  await bus.execute("core.world.patch", {
    operations: JSON.stringify([
      {
        kind: "object",
        map,
        id: "test:visitor",
        spawn: true,
        changes: { x: 5, y: 4, actor: "Boy1", kind: "talk", name: "Visitor" },
      },
      { kind: "tile", map, x: 5, y: 4, block },
    ]),
  });
  await game.runStory([
    {
      type: "worldPatch",
      operations: [
        { kind: "object", map, id: "test:visitor", changes: { x: 6 } },
      ],
    },
  ]);
  game.save();
  assert(validateSave(JSON.parse(raw).state, db, catalog, host));
  const restored = build();
  assert.equal(
    restored.worldState.projectObjects(map).find((o) => o.id === "test:visitor")
      .x,
    6,
  );
  const bad = structuredClone(game.state);
  bad.worldState.maps[map].objects["test:visitor"].changes.actor = "missing";
  assert.equal(validateSave(bad, db, catalog, host), false);
});
