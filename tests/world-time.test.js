import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  WorldClock,
  emptyWorldClock,
  validateWorldClock,
  DAY_MS,
  MINUTE_MS,
} from "../src/engine/world-clock.js";
import {
  WorldSchedule,
  TimeTaskRegistry,
} from "../src/engine/world-schedule.js";
import { ConditionQueries } from "../src/engine/condition-queries.js";
import { emeraldTide } from "../src/packs/emerald/time.js";
import { createEmeraldPlugins } from "../src/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../src/packs/emerald/adventure.js";
import { attachEmeraldExtensions } from "../src/packs/emerald/extension-ports.js";
import { Timeline, TransitionController } from "../src/engine/timeline.js";
import { BattleDirector } from "../src/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../src/engine/motion.js";
import { validateSave } from "../src/packs/emerald/save-contract.js";
const base = loadContentSync();
function setupClock(options = {}) {
  let wall = 100000;
  const clock = new WorldClock({
    state: emptyWorldClock(),
    wallNow: () => wall,
    ...options,
  });
  return {
    clock,
    wall: (value) => {
      wall = value;
    },
    now: () => wall,
  };
}

test("World time starts once at a selected local time and advances independently of foreground play time", () => {
  const s = setupClock();
  s.wall(200000);
  s.clock.sync();
  assert.equal(s.clock.view().initialized, false);
  assert.equal(s.clock.state.wallMs, null);
  assert(s.clock.start(23, 59).ok);
  assert.equal(s.clock.start(12, 0).ok, false);
  s.clock.samplePlay(10);
  s.clock.samplePlay(1510);
  assert.equal(s.clock.view().playSeconds, 1);
  s.wall(260000);
  s.clock.sync();
  assert.deepEqual(s.clock.boundaries(), {
    minutes: 1,
    days: 1,
    fromMinute: 1439,
    toMinute: 1440,
    fromDay: 0,
    toDay: 1,
  });
  assert.equal(s.clock.view().hour, 0);
  assert.equal(s.clock.view().day, 1);
  assert.equal(s.clock.boundaries().minutes, 0);
});
test("Clock restore advances offline intervals once while preserving play duration and rollback high-water mark", () => {
  const s = setupClock();
  s.clock.start(9, 0);
  s.clock.samplePlay(0);
  s.clock.samplePlay(1000);
  const state = JSON.parse(JSON.stringify(s.clock.state));
  s.wall(100000 + 2 * DAY_MS);
  const restored = new WorldClock({ state, wallNow: s.now });
  restored.sync({ resumed: true });
  assert.equal(restored.view().day, 2);
  assert.equal(restored.view().playSeconds, 1);
  restored.sync();
  assert.equal(restored.view().day, 2);
  s.wall(100000);
  assert.equal(restored.sync(), 0);
  s.wall(100000 + 2 * DAY_MS + MINUTE_MS);
  restored.sync();
  assert.equal(restored.view().minute, 1);
  restored.samplePlay(1000000);
  assert.equal(restored.view().playSeconds, 1);
});
test("Explicit offline pause and cap policies do not change foreground clock rules", () => {
  for (const [offline, expected] of [
    ["pause", 0],
    ["cap", 60000],
  ]) {
    const s = setupClock({ offline, maxOfflineMs: 60000 });
    s.clock.start(0);
    s.wall(300000);
    s.clock.sync({ resumed: true });
    assert.equal(s.clock.state.localMs, expected);
    s.wall(360000);
    s.clock.sync();
    assert.equal(s.clock.state.localMs, expected + 60000);
  }
});
test("Play duration retains fractional frame time and excludes hidden sessions, backwards clocks and reload gaps", () => {
  const s = setupClock();
  s.clock.samplePlay(0);
  for (let i = 1; i <= 60; i++) s.clock.samplePlay((i * 1000) / 60);
  assert.equal(s.clock.state.playMs, 1000);
  s.clock.samplePlay(2000, false);
  s.clock.samplePlay(100000);
  s.clock.samplePlay(101000);
  assert.equal(s.clock.state.playMs, 2000);
  s.clock.samplePlay(100);
  assert.equal(s.clock.state.playMs, 2000);
});
test("Invalid clocks and setup input fail before changing time", () => {
  for (const change of [
    { localMs: -1 },
    { initialized: true, processedDay: 1 },
    { playMs: Infinity },
    { wallMs: "now" },
    { unexpected: 3 },
  ])
    assert.throws(() =>
      validateWorldClock({ ...emptyWorldClock(), ...change }),
    );
  const s = setupClock();
  assert.throws(() => s.clock.start(24));
  assert.throws(() => s.clock.advance(10));
  assert.equal(s.clock.state.initialized, false);
  s.clock.start(0);
  assert.throws(() => s.clock.advance(-1));
  assert.equal(s.clock.state.localMs, 0);
});
const definitions = {
  once: {},
  all: { intervalMs: 100, catchUp: "all" },
  aggregate: { intervalMs: 100, catchUp: "aggregate" },
  latest: { intervalMs: 100, catchUp: "latest" },
};
function schedule() {
  return new WorldSchedule({ registry: new TimeTaskRegistry(definitions) });
}
test("Tasks validate data, preserve stable identities through serialization and deliver once after their deadline", () => {
  const s = schedule(),
    task = s.schedule("once", 500, { delayMs: 100 });
  assert.equal(s.collect(599).length, 0);
  assert.throws(() => s.schedule("unknown", 0));
  assert.throws(() => s.schedule("once", 0, { data: { typo: true } }));
  const restored = new WorldSchedule({
    registry: s.registry,
    state: JSON.parse(JSON.stringify(s.state)),
  });
  assert.equal(restored.collect(600)[0].id, task.id);
  assert.equal(restored.collect(600).length, 0);
  assert.equal(restored.schedule("once", 600).id, "task.2");
  assert(restored.cancel("task.2"));
  assert.equal(restored.cancel("task.2"), false);
});
test("Repeated task catch-up can aggregate, select latest or drain every occurrence with a bounded ordered queue", () => {
  for (const kind of ["all", "aggregate", "latest"]) {
    const s = schedule();
    s.schedule(kind, 0);
    const due = s.collect(350, 2);
    if (kind === "all") {
      assert.equal(due.length, 2);
      assert.deepEqual(
        due.map((e) => e.dueMs),
        [0, 100],
      );
      assert.deepEqual(
        s.collect(350).map((e) => e.dueMs),
        [200, 300],
      );
    } else {
      assert.equal(due.length, 1);
      assert.equal(due[0].count, kind === "aggregate" ? 4 : 1);
      assert.equal(due[0].skipped, kind === "latest" ? 3 : 0);
      assert.equal(due[0].lastDueMs, 300);
    }
    assert.equal(s.collect(399).length, 0);
    assert.equal(s.collect(400)[0].dueMs, 400);
  }
});
test("Scheduler rejects overflow atomically without losing earlier pending one-shot tasks", () => {
  const s = schedule();
  s.schedule("once", 0);
  s.schedule("all", Number.MAX_SAFE_INTEGER);
  const before = structuredClone(s.state);
  assert.throws(() => s.collect(Number.MAX_SAFE_INTEGER));
  assert.deepEqual(s.state, before);
  assert.throws(() => new TimeTaskRegistry({ invalid: { intervalMs: 0 } }));
  assert.throws(
    () =>
      new WorldSchedule({
        registry: s.registry,
        state: {
          sequence: 0,
          tasks: { x: { definition: "unknown", dueMs: 0, data: {} } },
        },
      }),
  );
});
test("Original tide windows and registered story queries read the saved local clock rather than device timezone", () => {
  assert.deepEqual(
    Array.from({ length: 24 }, (_, hour) => emeraldTide(hour)),
    [
      "high",
      "high",
      "high",
      "low",
      "low",
      "low",
      "low",
      "low",
      "low",
      "high",
      "high",
      "high",
      "high",
      "high",
      "high",
      "low",
      "low",
      "low",
      "low",
      "low",
      "low",
      "high",
      "high",
      "high",
    ],
  );
  const s = setupClock();
  s.clock.start(15, 45);
  const q = new ConditionQueries(),
    state = { clock: s.clock.state };
  assert.equal(q.read({ id: "worldHour" }, state), 15);
  assert.equal(q.read({ id: "worldMinute" }, state), 45);
  assert.equal(q.read({ id: "clockSet" }, state), true);
});
function adventure(
  plugins = [],
  savedDocument = null,
  playActive = () => true,
) {
  let wall = 100000,
    frame = 0,
    saved = savedDocument;
  const compiled = createEmeraldPlugins(base, plugins),
    timeline = new Timeline({
      now: () => frame,
      wait: async (ms) => {
        frame += ms;
      },
    });
  const game = new EmeraldAdventure({
    ...compiled,
    plugins: compiled.host,
    wallNow: () => wall,
    playActive,
    storage: {
      getItem: () => saved,
      setItem: (_, value) => {
        saved = value;
      },
    },
    timeline,
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(compiled.db.maps)),
  });
  game.attachUI({
    blocked: false,
    dialog: null,
    updateSide() {},
    updateTime() {},
    toast() {},
    checkGrowth() {},
  });
  const { bus } = attachEmeraldExtensions(game, compiled.host);
  // Clock cases run mid-adventure; the truck arrival scene is not under test here.
  game.state.flags.introDone = true;
  game.state.flags.truckLeft = true;
  if (!savedDocument)
    assert(game.enter({ map: "LittlerootTown", x: 10, y: 10, dir: "up" }));
  return {
    game,
    bus,
    ...compiled,
    setWall: (ms) => {
      wall = ms;
    },
    tick: (ms) => {
      frame = ms;
      game.tick(frame, [game.state.position.map]);
    },
    saved: () => saved,
  };
}
test("Public time setup, scheduled plugin facts and save/load use the same domain clock without core writes", async () => {
  const events = [],
    plugin = {
      id: "schedule",
      apiVersion: 1,
      version: "1.0.0",
      dataVersion: 1,
      permissions: ["time"],
      setup(api) {
        api.content.register("timeTasks", "visit", { intervalMs: MINUTE_MS });
        api.events.on("core:time-task", (e) => events.push(e));
      },
    };
  const s = adventure([plugin]);
  assert((await s.bus.execute("core.time.start", { hour: 23, minute: 59 })).ok);
  assert(
    (
      await s.bus.execute("core.time.schedule", {
        definition: "schedule:visit",
        delayMs: MINUTE_MS,
      })
    ).ok,
  );
  s.tick(0);
  s.setWall(100000 + MINUTE_MS);
  s.tick(1000);
  assert.equal(events.length, 1);
  assert.equal(events[0].payload.definition, "schedule:visit");
  assert.equal((await s.bus.execute("core.query", {})).time.day, 1);
  s.game.save();
  assert(s.saved());
  const restored = adventure([plugin], s.saved());
  restored.setWall(100000 + MINUTE_MS);
  restored.game.syncTime();
  assert.equal(restored.game.timeView().day, 1);
  assert.equal(restored.game.state.playSeconds, 1);
  assert.equal(
    restored.game.schedule.view().tasks["task.1"].dueMs,
    1441 * MINUTE_MS,
  );
  assert(
    validateSave(
      restored.game.state,
      restored.db,
      restored.catalog,
      restored.host,
    ),
  );
  const invalid = structuredClone(restored.game.state);
  invalid.clock.processedDay = 100;
  assert.equal(
    validateSave(invalid, restored.db, restored.catalog, restored.host),
    false,
  );
  const omitted = adventure([], s.saved()).game; omitted.loadDocument(JSON.parse(s.saved()));
  assert.equal(Object.keys(omitted.state.schedule.tasks).length, 0);
  assert(omitted.state.suspendedContent.records.some(r => r.payload.path?.[0] === "schedule"));
});
test("World clocks advance during dialogue but daily/task effects wait until the field is available", async () => {
  const s = adventure(),
    days = [];
  s.host.events.on("core:world-day", (e) => days.push(e));
  await s.bus.execute("core.time.start", { hour: 23, minute: 59 });
  s.game.ui.blocked = true;
  s.setWall(100000 + 2 * DAY_MS);
  s.tick(0);
  assert.equal(s.game.timeView().day, 2);
  assert.equal(days.length, 0);
  s.game.ui.blocked = false;
  s.tick(1000);
  assert.equal(days.length, 1);
  assert.equal(days[0].payload.days, 2);
  s.tick(2000);
  assert.equal(days.length, 1);
});

test("Registered actor behavior observes saved world time and map environment through immutable context", async () => {
  const observations = [],
    plugin = {
      id: "shift",
      apiVersion: 1,
      version: "1.0.0",
      dataVersion: 1,
      permissions: [],
      setup(api) {
        api.content.register("npcBehaviors", "worker", {
          decide(c) {
            observations.push({
              hour: c.time.hour,
              weather: c.environment.weather,
            });
            assert(Object.isFrozen(c.time));
            return { move: false, pose: c.time.hour < 9 ? "sleep" : "cheer" };
          },
        });
        api.content.register("maps", "field", {
          ...base.maps.Route101,
          connections: [],
          warps: [],
          npcs: [],
          signs: [],
          weather: { default: "rain" },
          elements: [
            {
              id: "worker",
              kind: "talk",
              actor: "Scientist1",
              x: 2,
              y: 2,
              dir: "down",
              movement: { mode: "shift:worker" },
            },
          ],
        });
      },
    };
  const s = adventure([plugin]);
  await s.bus.execute("core.time.start", { hour: 8, minute: 0 });
  s.game.enter({ map: "shift:field", x: 3, y: 3, dir: "up" });
  const npc = s.game.field.npcs.objects("shift:field")[0];
  npc.next = 0;
  s.tick(0);
  assert.equal(npc.pose, "sleep");
  s.setWall(100000 + 3600000);
  npc.next = 0;
  s.tick(1000);
  assert.equal(npc.pose, "cheer");
  assert.deepEqual(observations, [
    { hour: 8, weather: "rain" },
    { hour: 9, weather: "rain" },
  ]);
});

test("Explicit time advances obey the same time-event deferral as RTC ticks", async () => {
  const s = adventure(),
    days = [];
  s.host.events.on("core:world-day", (e) => days.push(e.payload));
  s.game.startClock(12, 0);
  const originalMap = s.game.state.position.map;
  s.game.state.position.map = Object.keys(s.game.db.maps).find((id) =>
    id.includes("PokemonCenter"),
  );
  s.game.advanceWorldTime(DAY_MS);
  assert.equal(days.length, 0);
  s.tick(0);
  assert.equal(days.length, 0);
  s.game.state.position.map = originalMap;
  s.tick(1000);
  assert.equal(days.length, 1);
  assert.equal(days[0].days, 1);
});

test("Host visibility excludes background frames from play duration while world RTC still advances", () => {
  let active = true;
  const s = adventure([], null, () => active);
  s.game.startClock(12, 0);
  s.tick(0);
  s.tick(1000);
  active = false;
  s.setWall(160000);
  s.tick(61000);
  s.tick(62000);
  assert.equal(s.game.timeView().minute, 1);
  assert.equal(s.game.state.playSeconds, 1);
  active = true;
  s.tick(63000);
  s.tick(64000);
  assert.equal(s.game.state.playSeconds, 2);
});
