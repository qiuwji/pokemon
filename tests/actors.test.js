import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  ActorRepository,
  ActorTemplateRegistry,
} from "../src/engine/actor-repository.js";
import { NPCBehaviorRegistry } from "../src/engine/npc-behaviors.js";
import {
  perceive,
  nextActorDirection,
} from "../src/engine/actor-navigation.js";
import { objectSchema } from "../src/engine/extensions/values.js";
import { createEmeraldPlugins } from "../src/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../src/packs/emerald/adventure.js";
import { attachEmeraldExtensions } from "../src/packs/emerald/extension-ports.js";
import { validateSave } from "../src/packs/emerald/save-contract.js";
import { Timeline, TransitionController } from "../src/engine/timeline.js";
import { BattleDirector } from "../src/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../src/engine/motion.js";
const map = {
  id: "a",
  title: "A",
  width: 5,
  height: 4,
  blocks: Array(20).fill(0),
  behavior: Array(20).fill(0),
  warps: [],
  connections: [],
  signs: [],
  npcs: [],
};
const definitions = {
  worker: {
    name: "Worker",
    actor: "sprite",
    behavior: "still",
    schema: objectSchema({ mood: { type: "string", enum: ["rest", "work"] } }, [
      "mood",
    ]),
    initialState: { mood: "rest" },
  },
};
function repository(state) {
  return new ActorRepository({
    registry: new ActorTemplateRegistry(definitions, {
      actors: { sprite: {} },
      behaviors: new NPCBehaviorRegistry(),
    }),
    maps: { a: map, b: { ...map, id: "b" } },
    state,
  });
}
test("Actor identities and schema-defined memory persist independently of maps, and only external changes invalidate motion", () => {
  const s = repository(),
    r = s.spawn("worker", { map: "a", x: 1, y: 1, dir: "right" });
  const moved = s.update(
    r.uid,
    { position: { map: "b", x: 2, y: 1, dir: "left" }, data: { mood: "work" } },
    { external: false },
  );
  assert.equal(moved.version, 0);
  assert.equal(s.objects("a").length, 0);
  assert.equal(s.objects("b")[0].id, r.uid);
  const restored = repository(JSON.parse(JSON.stringify(s.state)));
  assert.equal(restored.view(r.uid).data.mood, "work");
  assert.equal(restored.update(r.uid, { hidden: true }).version, 1);
  assert.equal(restored.objects("b").length, 0);
  assert.equal(
    restored.spawn("worker", { map: "a", x: 3, y: 2, dir: "up" }).uid,
    "core:actor.2",
  );
});
test("Invalid actor state fails without writing earlier fields and unknown templates cannot load", () => {
  const s = repository(),
    r = s.spawn("worker", { map: "a", x: 1, y: 1, dir: "up" }),
    before = structuredClone(s.state);
  assert.throws(() =>
    s.update(r.uid, {
      position: { map: "b", x: 2, y: 1, dir: "up" },
      data: { mood: "typo" },
    }),
  );
  assert.deepEqual(s.state, before);
  assert.throws(() =>
    s.update(r.uid, { position: { map: "a", x: 5, y: 1, dir: "up" } }),
  );
  assert.throws(() =>
    repository({
      sequence: 1,
      records: { [r.uid]: { ...s.state.records[r.uid], template: "missing" } },
    }),
  );
  assert.throws(() =>
    repository({ sequence: 1, records: { player: s.state.records[r.uid] } }),
  );
  assert.throws(() =>
    s.spawn("missing", { map: "a", x: 0, y: 0, dir: "down" }),
  );
});
test("Perception filters distance/maps and visibility through walls; observations are read-only", () => {
  const m = { ...map, blocks: map.blocks.slice() };
  m.blocks[7] = 1024;
  const observed = perceive(
    { a: m },
    { uid: "self", map: "a", x: 1, y: 1 },
    [
      { uid: "hidden", map: "a", x: 3, y: 1 },
      { uid: "near", map: "a", x: 1, y: 2 },
      { uid: "other", map: "b", x: 1, y: 1 },
    ],
    3,
  );
  assert.deepEqual(
    observed.map((e) => [e.uid, e.visible]),
    [
      ["near", true],
      ["hidden", false],
    ],
  );
  assert.throws(() => (observed[0].x = 9), TypeError);
});
test("Navigation uses common walls and reservations and selects an adjacent goal without stepping onto its target", () => {
  const maps = { a: map },
    from = { map: "a", x: 1, y: 1, dir: "down" },
    goal = { map: "a", x: 3, y: 1, adjacent: true };
  assert.equal(
    nextActorDirection(maps, from, goal, {
      objects: () => [{ id: "player", x: 3, y: 1 }],
    }),
    "right",
  );
  assert.equal(
    nextActorDirection(maps, { ...from, x: 2 }, goal, {
      objects: () => [{ id: "player", x: 3, y: 1 }],
    }),
    null,
  );
  const blocked = { ...map, blocks: Array(20).fill(1024) };
  blocked.blocks[6] = 0;
  assert.equal(
    nextActorDirection({ a: blocked }, from, goal, { objects: () => [] }),
    null,
  );
});
const base = loadContentSync();
const memorySchema = objectSchema({ ticks: { type: "integer", minimum: 0 } }, [
  "ticks",
]);
function actorPlugin(
  decide = (c) => ({
    move: true,
    dir: "right",
    pose: "walk",
    state: { ticks: c.state.ticks + 1 },
    duration: 120,
  }),
) {
  return {
    id: "people",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: ["actors"],
    setup(api) {
      const m = {
        ...map,
        tileset: base.maps.LittlerootTown.tileset,
        border: [0, 0, 0, 0],
        elements: [],
      };
      api.content.register("maps", "a", {
        ...m,
        id: "people:a",
        connections: [{ direction: "right", offset: 0, map: "people:b" }],
      });
      api.content.register("maps", "b", {
        ...m,
        id: "people:b",
        connections: [{ direction: "left", offset: 0, map: "people:a" }],
      });
      api.content.register("npcBehaviors", "worker", { decide });
      api.content.register("actorTemplates", "worker", {
        name: "Worker",
        actor: "ProfBirch",
        behavior: "people:worker",
        schema: memorySchema,
        initialState: { ticks: 0 },
      });
    },
  };
}
function fixture(plugin = actorPlugin()) {
  const c = createEmeraldPlugins(base, [plugin]);
  let frame = 0;
  const timeline = new Timeline({
    now: () => frame,
    wait: async (ms) => {
      frame += ms;
    },
  });
  const game = new EmeraldAdventure({
    ...c,
    plugins: c.host,
    wallNow: () => 100000,
    storage: { getItem: () => null, setItem() {} },
    timeline,
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(c.db.maps)),
  });
  game.attachUI({
    blocked: false,
    dialog: null,
    updateSide() {},
    updateTime() {},
    checkGrowth() {},
    toast() {},
  });
  // Mid-adventure fixture: the truck opening and the town arrival already happened.
  game.state.flags.introDone = true;
  game.state.flags.truckLeft = true;
  // The fixture is a save already loaded on this map: the position is arranged directly and
  // the map-scoped visit marker is cleared, because there is no route from the new-game map.
  Object.assign(game.state.position, { map: "people:a", x: 0, y: 3, dir: "up" });
  game.state.fieldEffects.activeMap = null;
  game.bindField();
  const { bus } = attachEmeraldExtensions(game, c.host);
  return {
    game,
    bus,
    ...c,
    tick(n, maps = ["people:a", "people:b"]) {
      frame = n;
      game.tick(n, maps);
    },
  };
}
test("Public spawn, autonomous movement and cross-map identity use the same reservation/motion and survive save rebinding", async () => {
  const s = fixture(),
    { actor } = await s.bus.execute("core.actor.spawn", {
      template: "people:worker",
      position: { map: "people:a", x: 4, y: 1, dir: "right" },
    });
  s.game.field.npcs.objects("people:a");
  s.tick(5000);
  const after = s.game.actors.view(actor.uid);
  assert.equal(after.map, "people:b");
  assert.equal(after.x, 0);
  assert.equal(after.data.ticks, 1);
  assert.equal(s.game.field.npcs.objects("people:a").length, 0);
  assert(
    s.game.field.npcs
      .occupants("people:a")
      .some((n) => n.id === actor.uid && n.x === 4 && n.y === 1),
  );
  s.game.field.npcs.tick(5200, s.game.state.position, {
    paused: true,
    maps: [],
  });
  assert.equal(s.game.field.npcs.occupants("people:a").length, 0);
  assert.equal(s.game.field.npcs.view("people:b", 5060)[0].px, -8);
  const saved = JSON.parse(JSON.stringify(s.game.state));
  assert(validateSave(saved, s.db, s.catalog, s.host));
  assert(s.host.catalog.dependencies(saved).includes("people"));
  s.game.state = saved;
  s.game.bindField();
  assert.equal(s.game.field.npcs.objects("people:b")[0].id, actor.uid);
  assert.equal(
    (await s.bus.execute("core.query", {})).actors[actor.uid].data.ticks,
    1,
  );
});
test("Brain state and schedule query are frozen; goal-driven actors approach the player but respect occupied tiles", async () => {
  const snapshots = [],
    s = fixture(
      actorPlugin((c) => {
        assert(Object.isFrozen(c.state));
        assert(Object.isFrozen(c.perception));
        snapshots.push(c);
        const player = c.perception.find((e) => e.uid === "player");
        return {
          move: false,
          pose: "walk",
          goal: { map: player.map, x: player.x, y: player.y, adjacent: true },
          state: { ticks: c.state.ticks + 1 },
        };
      }),
    );
  const { actor } = await s.bus.execute("core.actor.spawn", {
    template: "people:worker",
    position: { map: "people:a", x: 3, y: 3, dir: "left" },
  });
  s.game.field.npcs.objects("people:a");
  s.tick(5000);
  assert.equal(s.game.actors.view(actor.uid).x, 2);
  s.tick(10000);
  assert.equal(s.game.actors.view(actor.uid).x, 1);
  s.tick(15000);
  assert.equal(s.game.actors.view(actor.uid).x, 1);
  assert.equal(snapshots[0].time.initialized, false);
  assert.equal(s.game.actors.view(actor.uid).data.ticks, 3);
});
test("Spawn/teleport cannot overlap players or NPC reservations, bad brain state is isolated, and removal clears caches", async () => {
  const s = fixture(
    actorPlugin((c) => ({
      move: true,
      dir: "right",
      pose: "walk",
      state: { ticks: -1 },
    })),
  );
  assert.equal(
    (
      await s.bus.execute("core.actor.spawn", {
        template: "people:worker",
        position: { ...s.game.state.position },
      })
    ).ok,
    false,
  );
  const { actor } = await s.bus.execute("core.actor.spawn", {
    template: "people:worker",
    position: { map: "people:a", x: 2, y: 1, dir: "right" },
  });
  s.game.field.npcs.objects("people:a");
  s.tick(5000);
  assert.equal(s.game.actors.view(actor.uid).data.ticks, 0);
  assert.equal(s.game.actors.view(actor.uid).x, 2);
  assert.equal(
    (
      await s.bus.execute("core.actor.update", {
        uid: actor.uid,
        position: { ...s.game.state.position },
      })
    ).ok,
    false,
  );
  assert(await s.bus.execute("core.actor.remove", { uid: actor.uid }));
  assert.equal(s.game.field.npcs.objects("people:a").length, 0);
});

test("World edits cannot block persistent actors or create a second owner for their identities", async () => {
  const s = fixture(),
    { actor } = await s.bus.execute("core.actor.spawn", {
      template: "people:worker",
      position: { map: "people:a", x: 2, y: 1, dir: "up" },
    });
  const before = structuredClone(s.game.state.worldState);
  assert.throws(
    () =>
      s.game.patchWorld([
        { kind: "tile", map: "people:a", x: 2, y: 1, block: 1024 },
      ]),
    /block an actor/,
  );
  assert.throws(
    () =>
      s.game.patchWorld([
        { kind: "object", map: "people:a", id: actor.uid, changes: { x: 3 } },
      ]),
    /actor commands/,
  );
  assert.throws(
    () =>
      s.game.patchWorld([
        {
          kind: "object",
          map: "people:a",
          id: "rock",
          spawn: true,
          changes: { x: 2, y: 1, actor: "ProfBirch", kind: "talk" },
        },
      ]),
    /overlap an actor/,
  );
  assert.deepEqual(s.game.state.worldState, before);
});

test("Adjacent actor interactions are semantic requests; plugins retain ownership of relation effects", async () => {
  const s = fixture(
      actorPlugin((c) => ({
        move: false,
        pose: "still",
        state: { ticks: c.state.ticks + 1 },
        interaction: { target: "player", kind: "people:greet" },
      })),
    ),
    requests = [];
  s.host.events.on("core:actor-interaction-requested", (e) =>
    requests.push(e.payload),
  );
  const { actor } = await s.bus.execute("core.actor.spawn", {
    template: "people:worker",
    position: { map: "people:a", x: 1, y: 3, dir: "left" },
  });
  s.game.field.npcs.objects("people:a");
  s.tick(5000);
  assert.deepEqual(requests, [
    { actor: actor.uid, target: "player", kind: "people:greet" },
  ]);
  await s.bus.execute("core.actor.update", {
    uid: actor.uid,
    position: { map: "people:a", x: 3, y: 3, dir: "left" },
  });
  s.game.field.npcs.objects("people:a");
  s.tick(10000);
  assert.equal(requests.length, 1);
});

test("Registered poses change pure visual samples and sprites without changing occupancy and restore through saved actors", async () => {
  const plugin = actorPlugin(() => ({ move: false, pose: "people:happy" })),
    setup = plugin.setup;
  plugin.setup = (api) => {
    setup(api);
    api.content.register("npcPoses", "happy", {
      height: 6,
      periodMs: 400,
      inPlace: true,
      actor: "Boy1",
    });
  };
  const s = fixture(plugin),
    { actor } = await s.bus.execute("core.actor.spawn", {
      template: "people:worker",
      position: { map: "people:a", x: 2, y: 2, dir: "up" },
    });
  s.game.field.npcs.objects("people:a");
  s.tick(4900);
  const view = s.game.field.npcs.view("people:a", 4900)[0];
  assert.equal(view.actor, "Boy1");
  assert.equal(view.lift, 6);
  assert.equal(view.x, 2);
  assert.equal(view.y, 2);
  assert.equal(s.game.actors.view(actor.uid).pose, "people:happy");
  const saved = JSON.parse(JSON.stringify(s.game.state));
  assert(validateSave(saved, s.db, s.catalog, s.host));
  assert(s.host.catalog.dependencies(saved).includes("people"));
  s.game.state = saved;
  s.game.bindField();
  assert.equal(s.game.field.npcs.view("people:a", 4900)[0].actor, "Boy1");
  assert.throws(
    () => s.game.actors.update(actor.uid, { pose: "missing" }),
    /pose/,
  );
});

test("Reduced actor pose motion keeps committed location and sprite but removes cosmetic bounce and jogging", async () => {
  const plugin = actorPlugin(() => ({ move: false, pose: "people:happy" })),
    setup = plugin.setup;
  plugin.setup = (api) => {
    setup(api);
    api.content.register("npcPoses", "happy", {
      height: 6,
      periodMs: 400,
      inPlace: true,
      actor: "Boy1",
    });
  };
  const s = fixture(plugin);
  await s.bus.execute("core.actor.spawn", {
    template: "people:worker",
    position: { map: "people:a", x: 2, y: 2, dir: "up" },
  });
  s.game.field.npcs.objects("people:a");
  s.tick(4900);
  const view = s.game.field.npcs.view("people:a", 4900, {
    reducedMotion: true,
  })[0];
  assert.equal(view.lift, 0);
  assert.equal(view.moving, false);
  assert.equal(view.actor, "Boy1");
  assert.equal(view.px, 32);
  assert.equal(view.py, 32);
});

test("Memory and pose commands do not restart an in-flight actor interpolation", async () => {
  const s = fixture(),
    { actor } = await s.bus.execute("core.actor.spawn", {
      template: "people:worker",
      position: { map: "people:a", x: 1, y: 1, dir: "right" },
    });
  s.game.field.npcs.objects("people:a");
  s.tick(5000);
  const before = s.game.field.npcs.view("people:a", 5060)[0];
  assert.equal(before.px, 24);
  await s.bus.execute("core.actor.update", {
    uid: actor.uid,
    data: JSON.stringify({ ticks: 999 }),
    pose: "hop",
  });
  const after = s.game.field.npcs.view("people:a", 5060)[0];
  assert.equal(after.px, before.px);
  assert.equal(after.start, before.start);
  assert.equal(after.duration, before.duration);
  assert.equal(after.pose, "hop");
  assert.equal(s.game.actors.view(actor.uid).data.ticks, 999);
});

test("Map restoration cannot cover persistent actors and world patches protect both cells of an in-flight step", async () => {
  const s = fixture(),
    g = s.game;
  g.patchWorld([{ kind: "tile", map: "people:a", x: 1, y: 1, block: 1024 }]);
  g.patchWorld([
    { kind: "tile", map: "people:a", x: 1, y: 1, block: 0, scope: "visit" },
  ]);
  const { actor } = await s.bus.execute("core.actor.spawn", {
    template: "people:worker",
    position: { map: "people:a", x: 1, y: 1, dir: "right" },
  });
  const before = structuredClone(g.state.worldState);
  assert.equal(g.enter({ map: "people:a", x: 0, y: 3, dir: "up" }), false);
  assert.deepEqual(g.state.worldState, before);
  g.field.npcs.objects("people:a");
  s.tick(5000);
  assert.equal(g.actors.view(actor.uid).x, 2);
  assert.throws(
    () =>
      g.patchWorld([
        {
          kind: "tile",
          map: "people:a",
          x: 1,
          y: 1,
          block: 1024,
          scope: "visit",
        },
      ]),
    /block an actor/,
  );
  assert.equal(g.enter({ map: "people:a", x: 0, y: 3, dir: "up" }), false);
  assert.deepEqual(g.state.worldState, before);
  s.tick(5200, []);
  assert.equal(g.enter({ map: "people:a", x: 0, y: 3, dir: "up" }), true);
  assert.equal(g.world.map.blocks[6], 1024);
});
test("A restored static object cannot cover an actor, and temporary overlays cannot become a second saved actor owner", async () => {
  const plugin = actorPlugin(),
    setup = plugin.setup;
  plugin.setup = (api) => {
    setup(api);
    api.content.register("mapExtensions", "tree", {
      map: "people:a",
      elements: [
        {
          id: "people:tree",
          actor: "ProfBirch",
          kind: "cutTree",
          x: 2,
          y: 1,
          dir: "down",
        },
      ],
    });
  };
  const s = fixture(plugin),
    g = s.game;
  g.patchWorld([
    {
      kind: "object",
      map: "people:a",
      id: "people:tree",
      hidden: true,
      scope: "visit",
    },
  ]);
  const { actor } = await s.bus.execute("core.actor.spawn", {
    template: "people:worker",
    position: { map: "people:a", x: 2, y: 1, dir: "up" },
  });
  const before = structuredClone(g.state.worldState);
  assert.equal(g.enter({ map: "people:a", x: 0, y: 3, dir: "up" }), false);
  assert.deepEqual(g.state.worldState, before);
  const corrupt = structuredClone(g.state);
  corrupt.worldState.visits["people:a"].objects[actor.uid] = {
    hidden: true,
    changes: {},
  };
  assert.equal(validateSave(corrupt, s.db, s.catalog, s.host), false);
  const used = s.host.catalog.dependencies({ worldState: g.state.worldState });
  assert(used.includes("people"));
});
