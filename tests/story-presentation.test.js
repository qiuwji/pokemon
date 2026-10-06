import test from "node:test";
import assert from "node:assert/strict";
import {
  FieldDirector,
  storyResources,
  validateFieldCommand,
} from "../src/engine/field-director.js";
import { CommandRunner } from "../src/engine/commands.js";
import { SceneGraph, GridMotion } from "../src/engine/motion.js";
import { FieldSession } from "../src/engine/field-session.js";
import { CameraRig } from "../src/engine/camera.js";
import { TransitionController } from "../src/engine/timeline.js";
import { SceneDirector } from "../src/presentation/scene-director.js";
import { SceneDOM } from "../src/adapters/scene-dom.js";
import { Renderer } from "../src/adapters/canvas-renderer.js";
import { manualStoryClock } from "./helpers/story-clock.js";
import { layoutDocument } from "./helpers/layout-document.js";
import {
  manifest,
  session,
  objectSchema,
} from "./helpers/session.js";
import { emeraldDatabase } from "../src/packs/emerald/database.js";
function escortFixture() {
  const clock = manualStoryClock(),
    map = {
      width: 8,
      height: 5,
      blocks: Array(40).fill(0),
      behavior: Array(40).fill(0),
      connections: [],
      warps: [],
    },
    position = { map: "meadow", x: 2, y: 2, dir: "right" };
  let steps = 0;
  const field = new FieldSession({
    maps: { meadow: map },
    position,
    objects: () => [
      { id: "guide", actor: "Any", x: 4, y: 2, dir: "right" },
      { id: "friend", actor: "Any", x: 3, y: 2, dir: "right" },
    ],
    motion: new GridMotion(new SceneGraph({ meadow: map })),
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
  return {
    clock,
    field,
    director,
    position,
    get steps() {
      return steps;
    },
  };
}
test("Escort coordinates multiple NPC/player tracks through shared source occupancy and releases control", async () => {
  const f = escortFixture(),
    job = f.director.escort({
      actor: "guide",
      followers: ["friend", "player"],
      to: { x: 5, y: 3 },
    });
  await f.clock.drain(job, (now) => f.field.tick(now));
  assert.deepEqual(
    [f.director.actor("guide").x, f.director.actor("guide").y],
    [5, 3],
  );
  const friend = f.director.actor("friend");
  assert(
    [
      [4, 3],
      [5, 2],
    ].some(([x, y]) => friend.x === x && friend.y === y),
    "Follower must occupy the leader's previous source on either shortest route",
  );
  assert.deepEqual([f.position.x, f.position.y], [4, 2]);
  assert.equal(f.steps, 0);
  await f.director.end();
  assert.equal(f.field.npcs.scene, null);
});
test("Escort may coordinate NPCs without moving the player, and malformed/nonadjacent chains fail before moving", async () => {
  const f = escortFixture(),
    before = structuredClone(f.position);
  await f.clock.drain(
    f.director.escort({
      actor: "guide",
      followers: ["friend"],
      to: { x: 5, y: 2 },
    }),
  );
  assert.deepEqual(f.position, before);
  await f.director.end();
  const bad = escortFixture(),
    lead = bad.director.actor("guide");
  await assert.rejects(
    bad.director.escort({
      actor: "guide",
      followers: ["player"],
      to: { x: 5, y: 2 },
    }),
    /adjacent/,
  );
  const after = bad.director.actor("guide");
  assert.deepEqual(
    { x: after.x, y: after.y, dir: after.dir },
    { x: lead.x, y: lead.y, dir: lead.dir },
  );
  assert.equal(bad.clock.waits.length, 0);
  await bad.director.end();
  for (const followers of [
    [],
    ["guide"],
    ["friend", "friend"],
    [""],
    Array(33).fill("friend"),
    null,
  ])
    assert.throws(
      () =>
        validateFieldCommand(
          { type: "escort", actor: "guide", to: { x: 5, y: 2 }, followers },
          {},
        ),
      /Invalid escort/,
    );
});
test("Group escort resource claims prevent a parallel branch from controlling any member before rewards", async () => {
  let rewards = 0;
  const runner = new CommandRunner(
    { reward: () => rewards++, escort: () => {}, move: () => {} },
    {
      resources: storyResources,
      validateCommand: (c) => validateFieldCommand(c, {}),
    },
  );
  await assert.rejects(
    runner.run([
      { type: "reward" },
      {
        type: "parallel",
        commands: [
          {
            type: "escort",
            actor: "guide",
            followers: ["friend", "player"],
            to: { x: 5, y: 2 },
          },
          { type: "move", actor: "friend", path: ["right"] },
        ],
      },
    ]),
    /actor:friend/,
  );
  assert.equal(rewards, 0);
  assert.deepEqual(storyResources({ type: "escort", actor: "guide" }), [
    "actor:guide",
    "actor:player",
  ]);
});
test("Scene field transforms are pure bounded sampling with reduced motion and isolated faulty callbacks", async () => {
  const clock = manualStoryClock(0),
    errors = [],
    defs = new Map([
      [
        "zoom",
        {
          duration: 800,
          schema: objectSchema(),
          field: (f) => ({
            x: Math.sin(f.progress * Math.PI) * 4,
            zoom: 1 + f.progress,
          }),
        },
      ],
    ]),
    director = new SceneDirector({
      timeline: clock.timeline,
      definitions: defs,
      onError: (e) => errors.push(e),
    });
  const job = director.play("zoom");
  assert.deepEqual(director.fieldTransform(0), { x: 0, y: 0, zoom: 1 });
  assert.equal(director.fieldTransform(400).zoom, 1.5);
  assert.deepEqual(director.fieldTransform(400), director.fieldTransform(400));
  director.reducedMotion = () => true;
  assert.deepEqual(director.fieldTransform(400), { x: 0, y: 0, zoom: 1 });
  director.reducedMotion = () => false;
  defs.get("zoom").field = () => ({ zoom: 5 });
  assert.deepEqual(director.fieldTransform(400), { x: 0, y: 0, zoom: 1 });
  assert.equal(errors.length, 1);
  director.fieldTransform(500);
  assert.equal(errors.length, 1);
  await clock.advance(800);
  await job;
  assert.deepEqual(director.fieldTransform(900), { x: 0, y: 0, zoom: 1 });
});
test("Malformed/async field transforms report once and restore neutral projection instead of breaking the render loop", async () => {
  for (const field of [
    () => ({ x: NaN }),
    () => ({ x: 65 }),
    () => ({ foo: 1 }),
    async () => ({ zoom: 2 }),
  ]) {
    const clock = manualStoryClock(0),
      errors = [],
      director = new SceneDirector({
        timeline: clock.timeline,
        definitions: new Map([
          ["bad", { duration: 10, schema: objectSchema(), field }],
        ]),
        onError: (e) => errors.push(e),
      }),
      job = director.play("bad");
    assert.deepEqual(director.fieldTransform(), { x: 0, y: 0, zoom: 1 });
    assert.equal(errors.length, 1);
    await clock.advance(10);
    await job;
  }
});
test("Public field-only scenes change actual world projection and inverse coordinates, never world state or RNG", async () => {
  let denied;
  const plugin = manifest(
    "camera-scene",
    (api) =>
      api.presentation.scene("focus", {
        duration: 800,
        schema: objectSchema(),
        field: (f) => {
          assert(Object.isFrozen(f.payload));
          denied = api.commands.dispatch("core.save.write", {}).then(
            () => null,
            (e) => e,
          );
          return { zoom: 1 + f.progress * 2, x: 4 };
        },
      }),
    ["save"],
  );
  const s = session([plugin]),
    clock = manualStoryClock(0);
  s.game.timeline.now = clock.timeline.now;
  s.game.timeline.wait = clock.timeline.wait;
  const before = structuredClone(s.game.state),
    seed = s.game.rng.seed,
    normal = s.game.cameraProjection();
  const job = s.game.runStory([
    { type: "presentation", id: "camera-scene:focus" },
  ]);
  await new Promise(setImmediate);
  await clock.advance(400);
  const view = s.game.cameraProjection();
  assert.equal(view.width, normal.width / 2);
  assert.equal(view.x, normal.x + normal.width / 4 + 4);
  assert.match((await denied).message, /read-only callback/);
  const point = { x: view.x + 32, y: view.y + 32 },
    screen = s.game.projectCamera(point, { width: 320, height: 224 });
  const round = s.game.unprojectCamera(screen, { width: 320, height: 224 });
  assert(Math.abs(round.x - point.x) < 1e-8);
  assert(Math.abs(round.y - point.y) < 1e-8);
  assert.deepEqual(s.game.state, before);
  assert.equal(s.game.rng.seed, seed);
  const doc = layoutDocument(),
    surface = doc.getElementById("scene"),
    overlay = new SceneDOM(surface, {
      document: doc,
      definitions: s.game.sceneDirector.definitions,
      assets: {},
    });
  overlay.render(s.game.sceneDirector.sample(400));
  assert.equal(surface.hidden, true);
  const renderer = new Renderer(
    { width: 320, height: 224, getContext: () => ({}) },
    s.db,
    {},
    { projection: (size, now) => s.game.cameraProjection(size, now) },
  );
  assert.deepEqual(renderer.cameraAt(s.game.state.position, 400), view);
  await clock.drain(job);
  assert.deepEqual(s.game.cameraProjection(), normal);
  assert.equal(s.game.storyBusy, false);
});
test("Registered overlay and field definitions validate together; invalid scene payload preflights before reward", async () => {
  const good = manifest("scene-demo", (api) =>
      api.presentation.scene("flash", {
        duration: 100,
        schema: objectSchema(),
        draw: () => {},
        field: () => ({ zoom: 1 }),
      }),
    ),
    s = session([good]),
    before = structuredClone(s.game.state);
  await assert.rejects(
    s.game.runStory([
      { type: "reward", id: "before-scene", money: 5 },
      {
        type: "presentation",
        id: "scene-demo:flash",
        payload: { unexpected: true },
      },
    ]),
  );
  assert.deepEqual(s.game.state, before);
  for (const changes of [{ field: 42 }, { draw: 42 }, { foo: true }])
    assert.throws(
      () =>
        session([
          manifest("bad", (api) =>
            api.presentation.scene("bad", {
              duration: 100,
              schema: objectSchema(),
              field: () => ({}),
              ...changes,
            }),
          ),
        ]),
      /Invalid presentation scene/,
    );
});
test("Pack bootstrap materializes native sprite resources for headless and plugin sessions using one policy", () => {
  const s = session(),
    base = { ...s.db, resources: undefined },
    normalized = emeraldDatabase(base);
  assert.equal(normalized.resources["mudkip-front"], "generated/assets/mudkip-front.png");
  assert.equal(
    emeraldDatabase(normalized).resources["mudkip-front"],
    normalized.resources["mudkip-front"],
  );
});

test("Field-only scenes can run alongside movement and focus, while two clips still conflict before any reward", async () => {
  const plugin = manifest("parallel-scene", (api) =>
      api.presentation.scene("focus", {
        duration: 800,
        schema: objectSchema(),
        field: (f) => ({ zoom: 1 + f.progress }),
      }),
    ),
    s = session([plugin]),
    clock = manualStoryClock(0);
  s.game.timeline.now = clock.timeline.now;
  s.game.timeline.wait = clock.timeline.wait;
  const scene = { type: "presentation", id: "parallel-scene:focus" },
    before = s.game.state.money,
    y = s.game.state.position.y;
  await assert.rejects(
    s.game.runStory([
      { type: "reward", id: "too-early", money: 5 },
      { type: "parallel", commands: [scene, scene] },
    ]),
    /field-presentation/,
  );
  assert.equal(s.game.state.money, before);
  const job = s.game.runStory([
    {
      type: "parallel",
      commands: [
        scene,
        { type: "move", actor: "player", path: ["down"] },
        { type: "cameraFollow", ms: 100 },
      ],
    },
    { type: "reward", id: "after-parallel", money: 5 },
  ]);
  await new Promise(setImmediate);
  assert(s.game.sceneDirector.busy);
  await clock.advance(160);
  assert.equal(s.game.state.money, before);
  await clock.drain(job);
  assert.equal(s.game.state.position.y, y + 1);
  assert.equal(s.game.state.money, before + 5);
  assert.equal(s.game.storyBusy, false);
});
