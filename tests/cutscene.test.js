import { loadContentSync } from "../tools/content-io.mjs";
import { manualStoryClock as manualClock } from "./helpers/story-clock.js";
import { inventoryQuantity } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { TransitionController } from "../src/engine/timeline.js";
import { CameraRig } from "../src/engine/camera.js";
import {
  FieldDirector,
  storyResources,
} from "../src/engine/field-director.js";
import { FieldSession } from "../src/engine/field-session.js";
import { SceneGraph, GridMotion } from "../src/engine/motion.js";
import { CommandRunner } from "../src/engine/commands.js";
import { findRoute } from "../src/engine/pathfinding.js";
import { EmeraldAdventure } from "../src/packs/emerald/adventure.js";
import { BattleDirector } from "../src/presentation/battle-director.js";
import { createMonster } from "../src/engine/model.js";
import { battleOutcome } from "../src/packs/emerald/story.js";
import {
  OPEN_BAG,
  RETURN_TO_CENTER,
} from "../src/packs/emerald/story/common/scenes.js";
const db = loadContentSync();
function makeGame(position = { map: "Route101", x: 6, y: 14, dir: "right" }) {
  const clock = manualClock(),
    writes = [],
    messages = [],
    mapChanges = [];
  const transitions = new TransitionController(clock.timeline);
  const game = new EmeraldAdventure({
    db,
    timeline: clock.timeline,
    transitions,
    director: new BattleDirector(clock.timeline),
    motion: new GridMotion(new SceneGraph(db.maps)),
    storage: {
      getItem: () => null,
      setItem: (k, v) => writes.push(JSON.parse(v)),
    },
    onMap: (title, map) =>
      mapChanges.push({ map, opacity: transitions.sample().opacity }),
  });
  game.enter(position);
  const ui = {
    dialog: null,
    blocked: false,
    updateSide() {},
    resetBattleMenu() {},
    drawBattleHUD() {},
    announce() {},
    checkGrowth() {},
    toast() {},
    closeModal() {},
    starterPicker() {},
    say(name, lines) {
      messages.push({
        name,
        lines,
        map: game.state.position.map,
        rescued: game.state.flags.rescued,
        position: { ...game.state.position },
      });
      return Promise.resolve();
    },
  };
  game.attachUI(ui);
  return { game, clock, writes, messages, mapChanges };
}

test("Entire command tree is validated before rewards or movement; parallel pose conflicts fail early", async () => {
  const effects = [];
  const runner = new CommandRunner(
    { reward: () => effects.push("grant"), move() {}, face() {} },
    { resources: storyResources },
  );
  await assert.rejects(
    runner.run([
      { type: "reward" },
      { type: "sequence", commands: [{ type: "unknown" }] },
    ]),
    /Unknown/,
  );
  assert.deepEqual(effects, []);
  await assert.rejects(
    runner.run([
      {
        type: "parallel",
        commands: [
          { type: "move", actor: "guide" },
          { type: "face", actor: "guide" },
        ],
      },
    ]),
    /conflict/,
  );
});

test("Parallel choreography joins every track and drains in-flight movement before reporting failure", async () => {
  const clock = manualClock(),
    order = [];
  const runner = new CommandRunner({
    track: async (c) => {
      await clock.timeline.wait(c.ms);
      order.push(c.ms);
    },
    fail: () => {
      throw new Error("track failed");
    },
    mark: () => order.push("after"),
  });
  let finished = false;
  const job = runner.run([
    {
      type: "parallel",
      commands: [{ type: "track", ms: 400 }, { type: "fail" }],
    },
    { type: "mark" },
  ]);
  job.catch(() => {
    finished = true;
  });
  await clock.advance(200);
  assert(!finished);
  await clock.advance(200);
  await assert.rejects(job, /track failed/);
  assert.deepEqual(order, [400]);
});

test("Camera pans independently of player state, holds focus, then returns smoothly to live follow", async () => {
  const clock = manualClock(),
    camera = new CameraRig(clock.timeline);
  const player = { x: 160, y: 300, zone: "outside" },
    to = { x: 160, y: 140, zone: "outside" };
  let job = camera.pan(player, to, 400);
  await clock.advance(200);
  assert.equal(camera.sample(player).y, 220);
  assert.equal(player.y, 300);
  await clock.advance(200);
  await job;
  assert.equal(camera.sample({ ...player, y: 320 }).y, 140);
  job = camera.follow(player, 400);
  await clock.advance(200);
  assert.equal(camera.sample({ ...player, y: 340 }).y, 240);
  await clock.advance(200);
  await job;
  assert.equal(camera.sample({ ...player, y: 340 }).y, 340);
});

test("A different content pack reuses scripted walking, NPC tracks, camera and emotes without field triggers", async () => {
  const m = {
    width: 6,
    height: 5,
    blocks: Array(30).fill(0),
    behavior: Array(30).fill(2),
    connections: [],
    warps: [],
    indoor: false,
  };
  const clock = manualClock(),
    position = { map: "Meadow", x: 1, y: 3, dir: "up" };
  let steps = 0;
  const field = new FieldSession({
    maps: { Meadow: m },
    position,
    objects: () => [
      { id: "guide", actor: "AnyActor", x: 2, y: 2, dir: "down" },
    ],
    motion: new GridMotion(new SceneGraph({ Meadow: m })),
    now: clock.timeline.now,
    transitions: new TransitionController(clock.timeline),
    onStep: () => steps++,
  });
  const director = new FieldDirector({
    field,
    timeline: clock.timeline,
    camera: new CameraRig(clock.timeline),
  });
  director.begin();
  const job = director.move({ actor: "guide", path: ["right"] });
  await new Promise(setImmediate);
  field.npcs.tick(clock.timeline.now(), position, { paused: true });
  await clock.advance(80);
  field.npcs.tick(clock.timeline.now(), position, { paused: true });
  const pose = field.npcs.view("Meadow", clock.timeline.now())[0];
  assert.equal(pose.px, 2.5 * 16);
  assert(pose.moving);
  await clock.advance(80);
  await job;
  await clock.drain(director.move({ actor: "player", to: { x: 1, y: 1 } }));
  assert.equal(position.y, 1);
  assert.equal(steps, 0);
  await director.end();
  assert(!field.npcs.scene);
});

for (const [x, y] of [
  [6, 14],
  [7, 13],
  [8, 14],
  [7, 15],
]) {
  test(`Rescue choreography from bag side ${x},${y} approaches before travel and enters lab under blackout`, async () => {
    const { game, clock, writes, messages, mapChanges } = makeGame({
      map: "Route101",
      x,
      y,
      dir: "up",
    });
    game.state.party = [createMonster("mudkip", 5, db, game.rng)];
    game.state.flags.starter = "mudkip";
    const seed = game.rng.seed;
    const commands = battleOutcome(
      game.state,
      { script: "rescue", result: "win" },
      db,
    );
    assert(!game.state.flags.rescued);
    const job = game.runStory(commands);
    assert(game.busy);
    assert.equal(game.move("up"), false);
    assert.equal(game.buyItem("potion"), false);
    game.save();
    assert.equal(writes.length, 0);
    await clock.drain(job, (now) => game.tick(now, [game.state.position.map]));
    assert.equal(messages[0].map, "Route101");
    assert(!messages[0].rescued);
    assert.equal(messages.at(-1).map, "LittlerootTown_ProfessorBirchsLab");
    assert.deepEqual(game.state.position, {
      map: "LittlerootTown_ProfessorBirchsLab",
      x: 6,
      y: 5,
      dir: "up",
      elevation: 3,
      previousElevation: 3,
    });
    assert(game.state.flags.rescued);
    assert.equal(
      mapChanges.find((c) => c.map === "LittlerootTown_ProfessorBirchsLab")
        .opacity,
      1,
    );
    assert.equal(game.rng.seed, seed);
    assert.equal(writes.length, 1);
    assert(
      !game.storyBusy && !game.fieldDirector.active && !game.field.npcs.scene,
    );
    assert.equal(game.fieldDirector.emotes.size, 0);
    assert.equal(
      game.field.npcs
        .objects(game.state.position.map)
        .find((n) => n.id === "birch").y,
      4,
    );
    assert.equal(game.field.world.steps > 0, true);
  });
}

test("Intro plays independent NPC tracks, keeps progress incomplete until dialogue finishes, and releases camera", async () => {
  const { game, clock, messages } = makeGame({
    map: "Route101",
    x: 10,
    y: 19,
    dir: "up",
  });
  await clock.drain(game.runStory([{type:"script",id:"emerald:route101.rescue-intro"}]), (now) =>
    game.tick(now, ["Route101"]),
  );
  assert.equal(messages.length, 2);
  assert(game.state.flags.heardBirch);
  assert.equal(game.camera.mode, "follow");
  assert.equal(game.state.position.y, 15);
  assert(!game.busy);
});

test("Bag investigation walks to its interaction position and waits before opening selection", async () => {
  const { game, clock } = makeGame({
    map: "Route101",
    x: 8,
    y: 14,
    dir: "left",
  });
  let opened = false;
  game.ui.starterPicker = () => {
    opened = true;
    assert.equal(game.state.position.x, 6);
    assert.equal(game.state.position.y, 14);
  };
  await clock.drain(game.runStory(OPEN_BAG));
  assert(opened);
  assert.equal(game.state.position.dir, "right");
});

test("Failed scene clears input ownership, camera, actor overrides and transient effects without saving partial choreography", async () => {
  const { game, clock, writes } = makeGame();
  const job = game.runStory([
    { type: "hide", actor: "pursuer" },
    { type: "cameraTo", actor: "birch", ms: 100 },
    { type: "move", actor: "player", to: { map: "Route101", x: 0, y: 0 } },
  ]);
  await assert.rejects(clock.drain(job), /No walkable route/);
  assert(!game.busy && !game.field.npcs.scene);
  assert.equal(game.camera.mode, "follow");
  assert(game.field.npcs.objects("Route101").some((n) => n.id === "pursuer"));
  assert.equal(writes.length, 0);
});

test("Defeat return uses the shared entrance choreography and finishes on reachable center floor", async () => {
  const { game, clock, messages } = makeGame();
  await clock.drain(game.runStory(RETURN_TO_CENTER));
  assert.equal(game.state.position.map, "OldaleTown_PokemonCenter_1F");
  assert.equal(game.state.position.y, 5);
  assert.equal(messages[0].map, "OldaleTown_PokemonCenter_1F");
});

test("Route planning honors connected-map destination NPCs and rejects unreachable targets", () => {
  const makeMap = () => ({
    width: 3,
    height: 3,
    blocks: Array(9).fill(0),
    behavior: Array(9).fill(0),
    warps: [],
    connections: [],
  });
  const maps = { South: makeMap(), North: makeMap() };
  maps.South.connections = [{ direction: "up", map: "NORTH", offset: 0 }];
  maps.North.connections = [{ direction: "down", map: "SOUTH", offset: 0 }];
  const from = { map: "South", x: 1, y: 0, dir: "up" },
    to = { map: "North", x: 1, y: 2 };
  assert.deepEqual(findRoute(maps, from, to), ["up"]);
  assert.throws(
    () =>
      findRoute(maps, from, to, {
        objects: (map) => (map === "North" ? [{ x: 1, y: 2 }] : []),
      }),
    /No walkable route/,
  );
});

test("Malformed choreography is rejected before earlier rewards, positions or save state are changed", async () => {
  const { game, writes } = makeGame();
  await assert.rejects(
    game.runStory([
      {
        type: "reward",
        id: "gift",
        flags: { gift: true },
        items: { potion: 1 },
      },
      { type: "wait", ms: -1 },
    ]),
    /Invalid wait/,
  );
  assert.equal(inventoryQuantity(game.state.bag, "potion"), 0);
  assert(!game.state.flags.gift);
  assert.equal(writes.length, 0);
  assert(!game.busy);
  await assert.rejects(
    game.runStory([
      {
        type: "scene",
        position: { map: "Route101", x: 0, y: 0 },
        actors: [{ id: "guide", x: 0, y: 0 }],
      },
    ]),
    /Invalid scene/,
  );
});

test("Movement automation returns at a story/dialogue boundary without waiting for acknowledgement", async () => {
  const { game, clock } = makeGame();
  game.field.pending = {};
  game.storyBusy = true;
  await game.waitForMovement();
  assert.equal(clock.waits.length, 0);
  game.storyBusy = false;
  game.ui.blocked = true;
  await game.waitForMovement();
  assert.equal(clock.waits.length, 0);
});

test("Dialogue confirmation gates later actor movement and flags, and input stays locked between commands", async () => {
  const { game, clock } = makeGame();
  let acknowledge;
  game.ui.say = () =>
    new Promise((resolve) => {
      acknowledge = resolve;
    });
  const job = game.runStory([
    { type: "dialog", name: "Guide", lines: ["Wait for confirmation"] },
    { type: "move", actor: "player", to: { x: 6, y: 15 } },
    { type: "flag", key: "arrived", value: true },
  ]);
  await new Promise(setImmediate);
  assert.equal(game.state.position.y, 14);
  assert(!game.state.flags.arrived);
  assert(game.busy);
  acknowledge();
  await clock.drain(job);
  assert.equal(game.state.position.y, 15);
  assert(game.state.flags.arrived);
  assert(!game.busy);
});

test("Scripted battle handoff releases field input ownership and redraws a ready combat menu", async () => {
  const { game, clock } = makeGame();
  game.state.party = [createMonster("mudkip", 5, db, game.rng)];
  const hudStates = [];
  game.ui.drawBattleHUD = () =>
    hudStates.push({ battle: !!game.battle, busy: game.busy });
  await clock.drain(
    game.runStory([
      {
        type: "battle",
        species: "poochyena",
        level: 2,
        options: { trainer: true, script: "test" },
      },
    ]),
  );
  assert(game.battle);
  assert(!game.busy);
  assert.deepEqual(hudStates.at(-1), { battle: true, busy: false });
  assert(!game.field.npcs.scene);
});
