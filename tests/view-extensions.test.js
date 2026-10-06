import test from "node:test";
import assert from "node:assert/strict";
import {
  session,
  manifest,
  objectSchema,
} from "./helpers/session.js";
import {
  CameraProfiles,
  cameraProjection,
  projectWorld,
  unprojectScreen,
} from "../src/engine/camera-view.js";
import { drawEnvironmentLayers } from "../src/presentation/environment-layers-canvas.js";
import { createEmeraldPresentation } from "../src/packs/emerald/animations.js";
import { Renderer } from "../src/adapters/canvas-renderer.js";
const viewPlugin = (capture) =>
  manifest(
    "views",
    (api) => {
      capture(api);
      api.content.register("cameraProfiles", "wide", {
        name: "Wide",
        columns: 30,
        rows: 20,
      });
      api.content.register("cameraProfiles", "near", {
        name: "Near",
        columns: 20,
        rows: 14,
        zoom: 2,
      });
      const visual = api.presentation.effect("mist", {
        draw(ctx, f) {
          ctx.fillStyle = "#ddd";
          ctx.fillRect(0, 0, f.width, f.height);
        },
      });
      api.content.register("environmentLayers", "mist", {
        name: "Mist",
        visual,
        order: 2,
        opacity: 0.2,
        schema: objectSchema(
          { density: { type: "number", minimum: 0, maximum: 1 } },
          ["density"],
        ),
        initialData: { density: 0.3 },
      });
      api.content.register("environmentLayers", "fog", {
        name: "Fog",
        visual: "weather.fog",
        order: 1,
        opacity: 0.1,
      });
    },
    ["camera", "environment"],
  );
test("Public camera leases change range/focus without changing world state; ties and disconnected foci fail before writes", async () => {
  let api;
  const { game } = session([viewPlugin((v) => (api = v))]);
  const before = structuredClone(game.state);
  const a = await api.commands.dispatch("core.camera.acquire", {
    profile: "views:wide",
    priority: 1,
    scope: "session",
  });
  const view = await api.commands.dispatch("core.camera.view", {});
  assert.equal(view.width, 480);
  assert.equal(view.height, 320);
  assert.deepEqual(game.state, before);
  assert.equal(api.query().view.camera.columns, 30);
  await assert.rejects(
    api.commands.dispatch("core.camera.acquire", {
      profile: "views:near",
      priority: 1,
    }),
    /Ambiguous/,
  );
  await assert.rejects(
    api.commands.dispatch("core.camera.acquire", {
      profile: "views:near",
      priority: 2,
      focus: { map: "LittlerootTown_ProfessorBirchsLab", x: 1, y: 1 },
    }),
    /disconnected/,
  );
  const b = await api.commands.dispatch("core.camera.acquire", {
    profile: "views:near",
    priority: 2,
  });
  assert.equal(
    (await api.commands.dispatch("core.camera.view", {})).width,
    160,
  );
  await api.commands.dispatch("core.camera.release", { token: b.token });
  assert.equal(
    (await api.commands.dispatch("core.camera.view", {})).width,
    480,
  );
  await api.commands.dispatch("core.camera.release", { token: a.token });
  assert.equal(
    (await api.commands.dispatch("core.camera.view", {})).width,
    240,
  );
});
test("Projection and inverse use the same letterboxed space, reject margins and preserve tile coordinates", async () => {
  const profile = new CameraProfiles({
    p: { name: "p", columns: 30, rows: 20, zoom: 1 },
  }).get("p");
  const view = cameraProjection(profile, { x: 160, y: 100 });
  const world = { x: 160, y: 100 },
    screen = projectWorld(world, view);
  assert.deepEqual(unprojectScreen(screen, view), world);
  assert.equal(unprojectScreen({ x: 0, y: 0 }, view), null);
  let api;
  const { game } = session([viewPlugin((v) => (api = v))]);
  await api.commands.dispatch("core.camera.acquire", { profile: "views:wide" });
  const p = game.motion.graph.point(game.state.position);
  const pixel = await api.commands.dispatch("core.camera.project", {
    point: { x: p.x, y: p.y },
  });
  const inverse = await api.commands.dispatch("core.camera.unproject", {
    point: pixel,
  });
  assert.deepEqual(inverse, { x: p.x, y: p.y });
});
test("Story camera temporarily wins over plugin focus, then restores it; visit/session leases reset at proper boundaries", async () => {
  let api;
  const { game } = session([viewPlugin((v) => (api = v))]);
  const focus = { map: "Route101", x: 5, y: 10 };
  const a = await api.commands.dispatch("core.camera.acquire", {
    profile: "views:near",
    priority: 1,
    focus,
    scope: "session",
  });
  const player = game.motion.graph.point(game.state.position);
  assert.deepEqual(game.camera.sample(player), game.motion.graph.point(focus));
  const held = { ...player, x: player.x + 16 };
  await game.camera.pan(player, held, 10);
  assert.deepEqual(game.camera.sample(player), held);
  await game.camera.follow(player, 10);
  assert.deepEqual(game.camera.sample(player), game.motion.graph.point(focus));
  await api.commands.dispatch("core.camera.acquire", {
    profile: "views:wide",
    priority: 2,
  });
  game.enter({ map: "Route101", x: 5, y: 11, dir: "up" });
  assert.equal(api.query().view.camera.profile, "views:near");
  game.loadDocument(game.exportDocument());
  assert.equal(api.query().view.camera.profile, "emerald-default");
  const b = await api.commands.dispatch("core.camera.acquire", {
    profile: "views:near",
  });
  assert.notEqual(a.token, b.token);
});
test("Independent fog layers compose in order without replacing logical weather; schema errors and unknown drawings fail", async () => {
  let api;
  const { game } = session([viewPlugin((v) => (api = v))]);
  const weather = structuredClone(game.state.weather),
    rng = game.rng.seed;
  const a = await api.commands.dispatch("core.environment.acquire", {
    layer: "views:mist",
    scope: "session",
  });
  const b = await api.commands.dispatch("core.environment.acquire", {
    layer: "views:fog",
  });
  assert.deepEqual(
    game.environmentFrames().map((f) => f.id),
    ["views:fog", "views:mist"],
  );
  assert.deepEqual(game.state.weather, weather);
  assert.equal(game.rng.seed, rng);
  await assert.rejects(
    api.commands.dispatch("core.environment.acquire", {
      layer: "views:mist",
      data: '{"density":2}',
    }),
  );
  assert.equal(game.environmentFrames().length, 2);
  game.enter({ map: "Route101", x: 5, y: 11, dir: "up" });
  assert.equal(game.environmentFrames().length, 1);
  await api.commands.dispatch("core.environment.release", { token: a.token });
  assert.equal(game.environmentFrames().length, 0);
  assert.equal(
    await api.commands.dispatch("core.environment.release", { token: b.token }),
    false,
  );
  assert.throws(
    () =>
      session([
        manifest("bad", (api) =>
          api.content.register("environmentLayers", "bad", {
            name: "Bad",
            visual: "missing",
          }),
        ),
      ]),
    /Unknown environment visual/,
  );
});
test("Field renderer shares projection for tiles/actors/weather/light and environment; frame drawing leaves rules untouched", async () => {
  let api;
  const { game, db, host } = session([viewPlugin((v) => (api = v))]);
  await api.commands.dispatch("core.camera.acquire", { profile: "views:wide" });
  await api.commands.dispatch("core.environment.acquire", {
    layer: "views:mist",
  });
  const traces = [];
  let depth = 0;
  const ctx = {
    globalAlpha: 1,
    save() {
      depth++;
    },
    restore() {
      depth--;
    },
    fillRect(...a) {
      traces.push(a);
    },
    translate() {},
    scale() {},
    beginPath() {},
    rect() {},
    clip() {},
  };
  const renderer = new Renderer(
    { width: 320, height: 224, getContext: () => ctx },
    db,
    {},
    {
      cameraRig: game.camera,
      cameraConfiguration: () => game.cameraConfiguration(),
      appearanceView: (t, c) => game.appearanceFrame(t, c),
      environmentLayers: () => game.environmentFrames(),
      presentation: createEmeraldPresentation({ host }),
    },
  );
  renderer.grid = () => {};
  renderer.actor = () => {};
  renderer.drawMap = () => {};
  const before = structuredClone(game.state);
  renderer.world(game.world, game.field.npcs, 0);
  assert.equal(renderer.camera.width, 480);
  assert(traces.some((a) => a[2] === 480 && a[3] === 320));
  assert.equal(depth, 0);
  assert.deepEqual(game.state, before);
  assert.deepEqual(
    renderer.visibleMaps(game.state.position, 0),
    renderer.graph.visible(game.state.position.map, renderer.camera, 480, 320),
  );
});
test("Environment drawing is deterministic, honors reduced motion and releases context on failure", () => {
  let frame,
    depth = 0;
  const ctx = {
    globalAlpha: 1,
    save() {
      depth++;
    },
    restore() {
      depth--;
    },
  };
  const layer = { visual: "fog", data: { density: 0.3 }, opacity: 0.2 };
  drawEnvironmentLayers(ctx, [layer], 500, {
    width: 480,
    height: 320,
    reducedMotion: true,
    registry: {
      draw(_c, f) {
        frame = f;
      },
    },
  });
  assert.equal(frame.now, 0);
  assert.equal(frame.width, 480);
  assert.equal(depth, 0);
  assert.throws(
    () =>
      drawEnvironmentLayers(ctx, [layer], 0, {
        width: 480,
        height: 320,
        registry: {
          draw() {
            throw new Error("bad");
          },
        },
      }),
    /bad/,
  );
  assert.equal(depth, 0);
});

test("Public density composition selects distinct grass cells, prepares regional individuals and displays their species without StoryRunner", async () => {
  const { encounterFixture } = await import(
    "./helpers/encounter-extension-fixture.js"
  );
  const { isGrass } = await import(
    "../src/engine/extensions/terrain-utils.js"
  );
  const s = encounterFixture({
    permissions: ["actors", "encounters", "movement", "random", "appearance"],
  });
  const story = structuredClone(s.game.state.story),
    region = await s.api.commands.dispatch("core.world.cells", {
      x: 0,
      y: 0,
      width: 6,
      height: 5,
    });
  const candidates = region.cells
    .filter(
      (c) =>
        isGrass(c.behavior) &&
        c.collision === 0 &&
        !c.warp &&
        !c.occupants.length,
    )
    .map((c) => ({ x: c.x, y: c.y }));
  const chosen = await s.api.commands.dispatch("core.random.sample", {
    values: JSON.stringify(candidates),
    count: Math.floor(candidates.length / 10),
  });
  assert.equal(chosen.length, 2);
  assert.equal(new Set(chosen.map((c) => `${c.x},${c.y}`)).size, 2);
  for (const c of chosen) {
    const { actor } = await s.spawn(c.x, c.y),
      { ticket } = await s.api.commands.dispatch("core.encounter.prepare", {
        actor: actor.uid,
        area: "land",
      });
    await s.api.commands.dispatch("core.appearance.set", {
      target: { kind: "actor", uid: actor.uid },
      appearance: "emerald-species",
      data: JSON.stringify({ species: ticket.species }),
    });
    const frame = s.game.appearanceFrame({ kind: "actor", uid: actor.uid }, {});
    assert.equal(frame.layers[0].resource, ticket.species + "-front");
    assert.equal(ticket.species, "zigzagoon");
  }
  for (let i = 0; i < 12; i++) {
    s.game.world.steps++;
    s.game.step(s.game.world.cell(1, 2));
  }
  assert.equal(s.game.battle, null);
  assert.deepEqual(s.game.state.story, story);
  const saved = s.game.exportDocument();
  s.game.loadDocument(saved);
  assert.equal(Object.keys(s.api.query().encounters).length, 2);
  assert.equal(Object.keys(s.api.query().appearances.records).length, 2);
});
