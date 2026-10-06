import { loadContentSync } from "../tools/content-io.mjs";
import { createBag } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { PresentationRegistry } from "../src/presentation/effect-registry.js";
import { createEmeraldPresentation } from "../src/packs/emerald/animations.js";
import { EMERALD_TYPE_COLORS } from "../src/packs/emerald/battle-palette.js";
import { drawBattle } from "../src/presentation/battle-canvas.js";
import { TransitionPatterns } from "../src/presentation/transition-patterns.js";
import { BattleDirector } from "../src/presentation/battle-director.js";
import { Timeline } from "../src/engine/timeline.js";
import { PluginHost } from "../src/engine/extensions/plugin-host.js";
import { Battle } from "../src/engine/battle.js";
import { Random, createMonster } from "../src/engine/model.js";
const db = loadContentSync();
function canvas() {
  const calls = [];
  return new Proxy(
    { calls },
    {
      get: (target, key) =>
        key in target ? target[key] : (...args) => calls.push([key, ...args]),
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
}
const view = {
  homeAlliance: "home",
  sides: [
    { id: "home", allianceId: "home" },
    { id: "away", allianceId: "away" },
  ],
  combatants: [
    {
      seatId: "a",
      sideId: "home",
      monster: {
        uid: "a",
        species: "mudkip",
        hp: 20,
        stats: { hp: 20 },
        status: "poison",
        volatile: { protected: true },
      },
    },
    {
      seatId: "b",
      sideId: "away",
      monster: {
        uid: "b",
        species: "zigzagoon",
        hp: 20,
        stats: { hp: 20 },
        status: null,
      },
    },
  ],
  environment: {
    weather: "rain",
    weatherVisual: "weather.rain",
    terrain: "water",
  },
};
test("Animation declarations reject unknown effects and malformed timing, then seal against changes", () => {
  const registry = new PresentationRegistry().effect("test", () => {});
  assert.throws(() =>
    registry.move("a", {
      duration: 100,
      tracks: [{ effect: "missing", start: 0, end: 1, anchor: "targets" }],
    }),
  );
  assert.throws(() =>
    registry.move("a", {
      duration: 100,
      tracks: [{ effect: "test", start: 0.8, end: 0.2, anchor: "targets" }],
    }),
  );
  registry
    .move("a", {
      duration: 100,
      tracks: [{ effect: "test", start: 0, end: 1, anchor: "targets" }],
    })
    .seal();
  assert.throws(() => registry.effect("later", () => {}));
});
test("Per-move tracks select distinct visuals, fan out over seats and keep input snapshots unchanged", () => {
  const registry = createEmeraldPresentation(),
    layout = new Map([
      ["a", { x: 20, y: 100, back: true }],
      ["b", { x: 200, y: 30 }],
      ["c", { x: 240, y: 80 }],
    ]),
    event = {
      actorSeat: "a",
      targetSeats: ["b", "c"],
      move: { id: "flamethrower", type: "fire", successful: true },
    };
  const before = structuredClone(event),
    effects = registry.sampleMove(event, layout, 0.5);
  assert.equal(effects.length, 4);
  assert.deepEqual(
    new Set(effects.map((e) => e.kind)),
    new Set(["flame", "beam"]),
  );
  assert.deepEqual(event, before);
  assert.equal(
    registry.animation({ id: "water_gun" }).tracks[0].effect,
    "bubbles",
  );
  assert.equal(Object.keys(EMERALD_TYPE_COLORS).length, 17);
});
test("Pack move recipes parameterize the reusable effects and remain drawable", () => {
  const registry = createEmeraldPresentation(),
    layout = new Map([
      ["a", { x: 20, y: 100, back: true }],
      ["b", { x: 200, y: 30 }],
    ]),
    sample = (id) =>
      registry.sampleMove(
        {
          actorSeat: "a",
          targetSeat: "b",
          move: { id, type: "normal", successful: true },
        },
        layout,
        0.5,
      );
  const tackle = registry.animation({ id: "tackle" }),
    ember = registry.animation({ id: "ember" }),
    water = registry.animation({ id: "water_gun" });
  assert.equal(tackle.tracks[0].effect, "contact");
  assert.equal(tackle.tracks[0].parameters.count, 14);
  assert.equal(tackle.lunge, 26);
  assert.equal(ember.tracks[0].effect, "flame");
  assert.equal(ember.tracks[0].parameters.arc, 26);
  assert.equal(water.tracks[0].effect, "bubbles");
  assert.equal(water.tracks[0].parameters.color, "#78c8f8");
  assert.equal(sample("tackle")[0].color, "#fff8d8");
  assert.equal(sample("ember")[0].arc, 26);
  const ctx = canvas();
  for (const visual of [
    ...sample("tackle"),
    ...sample("ember"),
    ...sample("water_gun"),
  ])
    assert(registry.draw(ctx, visual));
});
test("Every opening-slice move registers a well-formed recipe over installed effects", () => {
  const registry = createEmeraldPresentation(),
    opening = [
      "tackle",
      "pound",
      "scratch",
      "slash",
      "cut",
      "quick_attack",
      "growl",
      "leer",
      "tail_whip",
      "howl",
      "harden",
      "focus_energy",
      "mud_slap",
      "water_gun",
      "bubble",
      "ember",
      "absorb",
      "sand_attack",
      "string_shot",
      "poison_sting",
      "peck",
    ];
  for (const id of opening) {
    const definition = registry.moves.get(id);
    assert(definition, `${id} should have a move recipe`);
    assert(
      definition.duration >= 1 && definition.duration <= 10000,
      `${id} duration in range`,
    );
    assert(Number.isFinite(definition.lunge || 0), `${id} lunge is numeric`);
    assert(definition.tracks.length >= 1, `${id} has at least one track`);
    for (const t of definition.tracks)
      assert(registry.effects.has(t.effect), `${id} references ${t.effect}`);
  }
});
test("The registry injects the pack palette only where a recipe leaves the colour open", () => {
  const palette = (type) => (type === "fire" ? "#f87828" : "#000000"),
    layout = new Map([
      ["a", { x: 20, y: 100, back: true }],
      ["b", { x: 200, y: 30 }],
    ]),
    sample = (registry, id, type) =>
      registry.sampleMove(
        { actorSeat: "a", targetSeat: "b", move: { id, type, successful: true } },
        layout,
        0.5,
      )[0],
    withPalette = createEmeraldPresentation({ typeColors: palette });
  assert.equal(
    sample(withPalette, "tackle", "normal").color,
    "#fff8d8",
    "an explicit recipe colour survives the injected palette",
  );
  assert.equal(sample(withPalette, "razor_leaf", "fire").color, "#f87828");
  assert.equal(sample(withPalette, "razor_leaf", "grass").color, "#000000");
  assert.equal(
    sample(createEmeraldPresentation(), "razor_leaf", "fire").color,
    undefined,
    "without a palette the primitive keeps its neutral fallback",
  );
});
test("All registered pixel effects draw without domain access and isolate a failing external drawing handler", () => {
  const errors = [],
    registry = createEmeraldPresentation({ onError: (e) => errors.push(e) }),
    ctx = canvas();
  for (const kind of registry.effects.keys())
    assert(
      registry.draw(ctx, {
        kind,
        type: "steel",
        source: { x: 20, y: 100 },
        target: { x: 200, y: 30 },
        t: 0.7,
        status: "paralysis",
        amount: -1,
      }),
    );
  assert.deepEqual(errors, []);
  const broken = new PresentationRegistry({
    onError: (e) => errors.push(e),
  }).effect("bad", () => {
    throw new Error("bad");
  });
  assert.equal(broken.draw(ctx, { kind: "bad" }), false);
  assert.equal(ctx.calls.at(-1)[0], "restore");
});
test("Persistent environment/status/protection visuals consume projections only; all transition patterns fully cover commits", () => {
  const registry = createEmeraldPresentation(),
    director = new BattleDirector(new Timeline({ now: () => 600 }), {
      registry,
    });
  director.reset(view);
  const before = structuredClone(view),
    ctx = canvas();
  drawBattle(ctx, {}, director.sample());
  assert.deepEqual(view, before);
  assert(ctx.calls.some((c) => c[0] === "strokeRect"));
  for (const kind of ["fade", "shutter", "blinds", "mosaic", "wave", "iris"]) {
    const c = canvas();
    new TransitionPatterns().draw(c, kind, {
      opacity: 1,
      width: 320,
      height: 224,
    });
    assert(
      c.calls.some(
        (call) =>
          call[0] === "fillRect" && call.slice(1).join(",") === "0,0,320,224",
      ),
    );
  }
});
test("Plugins can override one existing move through public presentation registration without editing the renderer", () => {
  const host = new PluginHost({ base: db }).load([
    {
      id: "visual",
      version: "1.0.0",
      apiVersion: 1,
      dataVersion: 1,
      permissions: [],
      setup(api) {
        const effect = api.presentation.effect("spark", { draw: () => {} });
        api.presentation.move("water", {
          moveId: "water_gun",
          animation: {
            duration: 500,
            tracks: [{ effect, anchor: "targets", start: 0, end: 1 }],
          },
        });
      },
    },
  ]);
  const registry = createEmeraldPresentation({ host });
  assert.equal(
    registry.moves.get("water_gun").tracks[0].effect,
    "visual:spark",
  );
});
test("Battle snapshots carry detached weather, volatile state, actual stage delta and per-hit identity", () => {
  const rng = new Random(1),
    party = [createMonster("mudkip", 10, db, rng)],
    enemy = createMonster("zigzagoon", 10, db, rng),
    battle = new Battle({
      party,
      enemy,
      db,
      rng,
      bag: createBag({}),
      environment: { terrain: "cave" },
    });
  battle.changeStage(0, "atk", 1);
  const event = battle.events.at(-1);
  assert.equal(event.kind, "stage");
  assert.equal(event.amount, 1);
  assert.equal(event.combatants[0].monster.volatile.stages.atk, 1);
  battle.conditions.get(battle.homeSeat).stages.atk = 4;
  assert.equal(event.combatants[0].monster.volatile.stages.atk, 1);
  assert.equal(event.environment.terrain, "cave");
  const hits = battle
    .act({ kind: "move", index: 0 })
    .filter((e) => e.kind === "hurt" && e.hit);
  assert(hits.length);
  assert(hits.every((e) => e.moveId && e.moveType));
});
