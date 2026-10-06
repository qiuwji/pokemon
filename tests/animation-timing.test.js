import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  ANIMATION_EASINGS,
  validateMoveAnimation,
  placeAnimationTracks,
} from "../src/engine/extensions/visual-contracts.js";
import {
  sampleAnimationTrack,
  EASINGS,
} from "../src/presentation/animation-timing.js";
import { PresentationRegistry } from "../src/presentation/effect-registry.js";
import { BattleDirector } from "../src/presentation/battle-director.js";
import { Timeline } from "../src/engine/timeline.js";
import { PluginHost } from "../src/engine/extensions/plugin-host.js";
import { createEmeraldPresentation } from "../src/packs/emerald/animations.js";

const track = { effect: "glow", anchor: "targets", start: 0, end: 1 };
const frames = [
  { at: 0, values: { radius: 0 }, easing: "in-quad" },
  { at: 0.5, values: { radius: 40 } },
  { at: 1, values: { radius: 0 } },
];
const layout = new Map([
  ["a", { x: 30, y: 100, back: true }],
  ["b", { x: 200, y: 30 }],
  ["c", { x: 240, y: 60 }],
]);
const view = {
  actorSeat: "a",
  targetSeat: "b",
  targetSeats: ["b", "c"],
  combatants: [
    {
      seatId: "a",
      sideId: "home",
      monster: { uid: "a", species: "mudkip", hp: 10, stats: { hp: 10 } },
    },
    {
      seatId: "b",
      sideId: "away",
      monster: { uid: "b", species: "zigzagoon", hp: 10, stats: { hp: 10 } },
    },
  ],
};
function registry() {
  return new PresentationRegistry().effect("glow", () => {});
}

test("Pure tracks interpolate segment keyframes with shared named easing and stable boundaries", () => {
  assert.deepEqual(Object.keys(EASINGS).sort(), [...ANIMATION_EASINGS].sort());
  const definition = {
      ...track,
      keyframes: frames,
      parameters: { color: "red", nested: { value: 1 } },
    },
    before = structuredClone(definition);
  assert.equal(sampleAnimationTrack(definition, 0).parameters.radius, 0);
  assert.equal(sampleAnimationTrack(definition, 0.25).parameters.radius, 10);
  assert.equal(sampleAnimationTrack(definition, 0.75).parameters.radius, 20);
  assert.equal(sampleAnimationTrack(definition, 1).parameters.radius, 0);
  assert.equal(sampleAnimationTrack(definition, -0.1), null);
  assert.equal(sampleAnimationTrack(definition, 1.1), null);
  const sampled = sampleAnimationTrack(definition, 0.25);
  sampled.parameters.nested.value = 5;
  assert.deepEqual(definition, before);
  assert.equal(
    sampleAnimationTrack({ ...track, easing: "in-quad" }, 0.5).t,
    0.25,
  );
  assert.equal(
    sampleAnimationTrack({ ...track, easing: "step-end" }, 0.999).t,
    0,
  );
});
test("Reusable fragments keep local keyframe timing when placed in charge, release and impact intervals", () => {
  const original = [{ ...track, keyframes: frames }],
    before = structuredClone(original);
  const placed = placeAnimationTracks(original, 0.4, 0.8);
  assert.equal(placed[0].start, 0.4);
  assert.equal(placed[0].end, 0.8);
  assert(
    Math.abs(sampleAnimationTrack(placed[0], 0.6).parameters.radius - 40) <
      1e-10,
  );
  const description = {
    duration: 1200,
    tracks: [
      ...placeAnimationTracks(original, 0, 0.3),
      ...placed,
      ...placeAnimationTracks(original, 0.8, 1),
    ],
  };
  assert.doesNotThrow(() => validateMoveAnimation(description));
  assert.deepEqual(original, before);
  assert.throws(() => placeAnimationTracks(original, 0.8, 0.4));
});
test("Per-target hit and miss branches use committed facts and cannot mutate event or layout", () => {
  const r = registry().move("beam", {
    duration: 1000,
    tracks: [
      { ...track, when: "hit" },
      { ...track, when: "miss", parameters: { missed: true } },
    ],
  });
  const event = {
      ...view,
      move: {
        id: "beam",
        targetResults: [
          { seatId: "b", successful: true },
          { seatId: "c", successful: false },
        ],
      },
    },
    before = structuredClone(event);
  const effects = r.sampleMove(event, layout, 0.5);
  assert.equal(effects.length, 2);
  assert.equal(effects[0].targetSeat, "b");
  assert.equal(effects[1].targetSeat, "c");
  assert.equal(effects[1].missed, true);
  effects[0].source.x = 999;
  assert.equal(layout.get("a").x, 30);
  assert.deepEqual(event, before);
  assert.deepEqual(
    r.sampleAnimation(r.moves.get("beam"), event, layout, 0.5, {
      reducedMotion: true,
    }),
    { effects: [], poses: [] },
  );
});
test("Strict animation contracts reject unknown timing, channel shape, pose, async data and easing", () => {
  for (const change of [
    { easing: "spring" },
    { when: "calculate-hit" },
    {
      keyframes: [
        { at: 0, values: { x: 0 } },
        { at: 1, values: { y: 1 } },
      ],
    },
    {
      keyframes: [
        { at: 0.1, values: { x: 0 } },
        { at: 1, values: { x: 1 } },
      ],
    },
    { parameters: { callback: () => {} } },
    { curve: true },
  ])
    assert.throws(() =>
      validateMoveAnimation({
        duration: 300,
        tracks: [{ ...track, ...change }],
      }),
    );
  for (const values of [{ hp: 0 }, { opacity: 2 }, { scale: -1 }])
    assert.throws(() =>
      validateMoveAnimation({
        duration: 300,
        tracks: [],
        poses: [
          {
            anchor: "actor",
            start: 0,
            end: 1,
            keyframes: [
              { at: 0, values },
              { at: 1, values },
            ],
          },
        ],
      }),
    );
});
test("Battle event registration picks specific selectors, rejects duplicates and seals against mutation", () => {
  const r = registry()
    .battle("generic", {
      kind: "form",
      animation: { duration: 100, tracks: [] },
    })
    .battle("mega", {
      kind: "form",
      match: { formId: "demo:mega" },
      animation: { duration: 900, tracks: [track] },
    });
  assert.equal(
    r.eventAnimation({ kind: "form", formId: "demo:mega" }).animation.duration,
    900,
  );
  assert.equal(
    r.eventAnimation({ kind: "form", formId: "other" }).animation.duration,
    100,
  );
  assert.throws(() =>
    r.battle("duplicate", {
      kind: "form",
      match: { formId: "demo:mega" },
      animation: { duration: 700, tracks: [] },
    }),
  );
  assert.throws(() =>
    r.battle("missing", {
      kind: "form",
      match: { formId: {} },
      animation: { duration: 700, tracks: [] },
    }),
  );
  r.seal();
  assert.throws(() =>
    r.battle("late", {
      kind: "form",
      animation: { duration: 100, tracks: [] },
    }),
  );
});
test("A form plugin controls injected-clock choreography while battle snapshots and reduced-motion facts remain intact", async () => {
  const db = loadContentSync();
  const host = new PluginHost({ base: db }).load([
    {
      id: "visual",
      apiVersion: 1,
      version: "1.0.0",
      dataVersion: 1,
      permissions: [],
      setup(api) {
        const effect = api.presentation.effect("burst", { draw() {} });
        api.presentation.battle("mega", {
          kind: "form",
          match: { formId: "visual:mega" },
          animation: {
            duration: 1000,
            tracks: [
              { ...track, anchor: "actor", effect, easing: "smoothstep" },
            ],
            poses: [
              {
                anchor: "actor",
                start: 0,
                end: 1,
                keyframes: [
                  { at: 0, values: { scale: 1, y: 0 } },
                  { at: 0.5, values: { scale: 1.5, y: -12 } },
                  { at: 1, values: { scale: 1, y: 0 } },
                ],
              },
            ],
          },
        });
      },
    },
  ]);
  const r = createEmeraldPresentation({ host });
  let time = 0,
    observations = [],
    reduced = false;
  const timeline = new Timeline({
    now: () => time,
    wait: async (ms) => {
      time += ms / 2;
      observations.push(director.sample());
      time += ms / 2;
    },
  });
  const director = new BattleDirector(timeline, {
    registry: r,
    reducedMotion: () => reduced,
  });
  const event = {
      ...view,
      kind: "form",
      formId: "visual:mega",
      actorSeat: "a",
      targetSeat: "a",
    },
    before = structuredClone(event);
  director.reset(view);
  await director.play(event);
  assert.equal(time, 1000);
  assert.equal(observations[0].actors[0].scale, 1.5);
  assert.equal(observations[0].actors[0].y, -12);
  assert.equal(observations[0].effects[0].kind, "visual:burst");
  assert.equal(observations[0].effects[0].t, 0.5);
  assert.deepEqual(event, before);
  assert.equal(director.busy, false);
  reduced = true;
  observations = [];
  await director.play(event);
  assert.equal(time, 1240);
  assert.deepEqual(observations[0].effects, []);
  assert.equal(observations[0].actors[0].scale, 1);
  assert.deepEqual(director.view.combatants, view.combatants);
});
test("Append choreography preserves default movement while adding a reusable effect", () => {
  const r = registry().battle("extra", {
    kind: "form",
    mode: "append",
    animation: { duration: 800, tracks: [{ ...track, anchor: "actor" }] },
  });
  const director = new BattleDirector(new Timeline({ now: () => 400 }), {
    registry: r,
  });
  director.reset(view);
  director.stage({ ...view, kind: "form", targetSeat: "a" });
  director.event.start = 0;
  director.event.duration = 800;
  const sampled = director.sample();
  assert.equal(sampled.actors[0].scale, 1.12);
  assert.equal(sampled.effects[0].kind, "glow");
});
test("A per-move pose track drives visual offsets without adding a new director branch", () => {
  const r = registry().move("beam", {
    duration: 800,
    tracks: [track],
    poses: [
      {
        anchor: "actor",
        start: 0,
        end: 1,
        keyframes: [
          { at: 0, values: { x: 0 } },
          { at: 1, values: { x: 40 } },
        ],
      },
    ],
  });
  const director = new BattleDirector(new Timeline({ now: () => 400 }), {
    registry: r,
  });
  director.reset(view);
  director.stage({
    ...view,
    kind: "move",
    move: { id: "beam", type: "water" },
  });
  director.event.start = 0;
  director.event.duration = 800;
  assert.equal(director.sample().actors[0].x, 20);
});

test("Field-wide event tracks have a viewport anchor even when the semantic event has no acting seat", () => {
  const r = registry(),
    definition = { duration: 800, tracks: [{ ...track, anchor: "field" }] };
  const sampled = r.sampleAnimation(definition, { kind: "entry" }, layout, 0.5);
  assert.equal(sampled.effects.length, 1);
  assert.equal(sampled.effects[0].target.x, 160);
  assert.equal(sampled.effects[0].target.width, 320);
  assert.equal(sampled.effects[0].scope, "battle-field");
  const custom = r.sampleAnimation(definition, {}, layout, 0.5, {
    field: { x: 200, y: 150, width: 400, height: 300 },
  });
  assert.equal(custom.effects[0].target.width, 400);
});
