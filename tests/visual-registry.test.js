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
test("Unregistered moves have no approximate built-in recipe", () => {
  const registry = createEmeraldPresentation();
  assert.equal(registry.moves.size, 0);
  assert.equal(registry.animation({ id: "flamethrower" }), null);
  assert.deepEqual(registry.sampleMove({ actorSeat: "a", move: { id: "flamethrower" } }, new Map([["a", {}]]), 0.5), []);
  assert.equal(Object.keys(EMERALD_TYPE_COLORS).length, 17);
});
test("Explicit external effect declarations fan out over seats and preserve supplied colours", () => {
  const registry = new PresentationRegistry({ typeColors: () => "#f87828" }).effect("beam", () => {});
  registry.move("authored", { duration: 500, tracks: [
    { effect: "beam", start: 0, end: 1, anchor: "targets" },
    { effect: "beam", start: 0, end: 1, anchor: "targets", parameters: { color: "#ffffff" } },
  ] });
  const layout = new Map([["a", { x: 20, y: 100, back: true }], ["b", { x: 200, y: 30 }], ["c", { x: 240, y: 80 }]]),
    event = { actorSeat: "a", targetSeats: ["b", "c"], move: { id: "authored", type: "fire", successful: true } }, before = structuredClone(event);
  const effects = registry.sampleMove(event, layout, 0.5);
  assert.equal(effects.length, 4);
  assert.equal(effects[0].color, "#f87828");
  assert.equal(effects[2].color, "#ffffff");
  assert.deepEqual(event, before);
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
