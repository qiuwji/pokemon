import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "./helpers/session.js";
import { ActorScheduleRegistry } from "../dist/engine/actor-schedules.js";
import { NPCBehaviorRegistry } from "../dist/engine/npc-behaviors.js";
import {
  WorldClock,
  emptyWorldClock,
  DAY_MS,
} from "../dist/engine/world-clock.js";
const base = loadContentSync();
const position = (map, x = 2, y = 1) => ({
  map: `routine:${map}`,
  x,
  y,
  dir: "right",
});
const map = {
  title: "Schedule fixture",
  width: 5,
  height: 4,
  blocks: Array(20).fill(0),
  behavior: Array(20).fill(0),
  tileset: base.maps.LittlerootTown.tileset,
  border: [0, 0, 0, 0],
  elements: [],
  warps: [],
  connections: [],
  signs: [],
  npcs: [],
};
function plugin(offscreen = "hold", work = position("b")) {
  return manifest("routine", (api) => {
    for (const name of ["a", "b", "home", "observer"]) {
      api.content.register("maps", name, {
        ...map,
        id: `routine:${name}`,
        connections:
          name === "a"
            ? [{ direction: "right", offset: 0, map: "routine:b" }]
            : name === "b"
              ? [{ direction: "left", offset: 0, map: "routine:a" }]
              : [],
      });
    }
    const schedule = api.content.register("actorSchedules", "worker", {
      offscreen,
      entries: [
        {
          id: "rest",
          start: 0,
          position: position("home"),
          behavior: "sleep",
          pose: "sleep",
        },
        {
          id: "work",
          start: 480,
          position: work,
          behavior: "still",
          pose: "hop",
        },
        {
          id: "return",
          start: 1080,
          position: position("home"),
          behavior: "still",
        },
      ],
    });
    api.content.register("actorTemplates", "worker", {
      name: "Worker",
      actor: "ProfBirch",
      behavior: "still",
      schedule,
    });
  });
}
function fixture(offscreen = "hold", work) {
  const s = session([plugin(offscreen, work)]);
  Object.assign(s.game.state.position, position("observer", 0, 3));
  s.game.bindField();
  return {
    ...s,
    tick(now, maps = ["routine:a", "routine:b"]) {
      s.game.tick(now, maps);
    },
  };
}
async function spawn(s, p = position("a", 4)) {
  const result = await s.bus.execute("core.actor.spawn", {
    template: "routine:worker",
    position: p,
  });
  assert.equal(result.ok, true);
  return result.actor.uid;
}
async function start(s, hour = 8, minute = 0) {
  assert.equal(
    (await s.bus.execute("core.time.start", { hour, minute })).ok,
    true,
  );
}
test("Schedules validate coverage, references and targets before attaching; weekday selection uses the saved game-day cycle", () => {
  const maps = { "routine:a": map },
    behaviors = new NPCBehaviorRegistry();
  const entry = { id: "daily", start: 0, position: position("a") };
  const registry = (d) =>
    new ActorScheduleRegistry({ worker: { entries: d } }, { maps, behaviors });
  for (const entries of [
    [],
    [{ ...entry, start: 1 }],
    [entry, { ...entry, id: "duplicate" }],
    [{ ...entry, position: position("missing") }],
    [{ ...entry, behavior: "typo" }],
    [{ ...entry, pose: "typo" }],
    [{ ...entry, days: [0, 0] }],
    [{ ...entry, config: null }],
  ])
    assert.throws(() => registry(entries), /schedule/i);
  const r = registry([
    { ...entry, id: "week", days: [0, 1, 2, 3, 4] },
    { ...entry, id: "weekend", days: [5, 6] },
    { ...entry, id: "work", start: 480, days: [0, 1, 2, 3, 4] },
  ]);
  assert.equal(r.select("worker", { initialized: false }), null);
  assert.equal(
    r.select("worker", { initialized: true, day: 0, hour: 7, minute: 59 }).id,
    "week",
  );
  assert.equal(
    r.select("worker", { initialized: true, day: 7, hour: 8, minute: 0 }).id,
    "work",
  );
  assert.equal(
    r.select("worker", { initialized: true, day: 6, hour: 12, minute: 0 }).id,
    "weekend",
  );
  assert.throws(
    () =>
      r.select("worker", { initialized: true, day: 0, hour: 24, minute: 0 }),
    /clock/,
  );
});
test("Visible scheduled actors navigate across connected maps before applying arrival behavior and pose", async () => {
  const s = fixture(),
    uid = await spawn(s);
  await start(s);
  s.game.field.npcs.objects("routine:a");
  for (const now of [5000, 10000, 15000, 20000]) s.tick(now);
  const r = s.game.actors.view(uid);
  assert.equal(r.map, "routine:b");
  assert.equal(r.x, 2);
  assert.equal(r.pose, "hop");
  assert.equal(s.game.actors.routines()[uid].arrived, true);
  const query = await s.bus.execute("core.query", {});
  assert(Object.isFrozen(query.actorRoutines[uid].position));
  assert.equal(query.actorRoutines[uid].id, "work");
});
test("Unconfigured clocks and explicit hold never teleport actors; visible endpoints and paused sessions prevent catch-up", async () => {
  const hold = fixture(),
    uid = await spawn(hold, position("home"));
  hold.tick(5000, []);
  assert.deepEqual(hold.game.actors.routines(), {});
  await start(hold);
  hold.tick(10000, []);
  assert.equal(hold.game.actors.view(uid).map, "routine:home");
  const s = fixture("relocate"),
    actor = await spawn(s, position("home"));
  await start(s);
  s.tick(5000, ["routine:home"]);
  assert.equal(s.game.actors.view(actor).map, "routine:home");
  s.tick(10000, ["routine:b"]);
  assert.equal(s.game.actors.view(actor).map, "routine:home");
  s.game.ui.blocked = true;
  s.tick(15000, []);
  assert.equal(s.game.actors.view(actor).map, "routine:home");
  s.game.ui.blocked = false;
  s.tick(20000, []);
  assert.equal(s.game.actors.view(actor).map, "routine:b");
});
test("Offscreen catch-up waits for collision to clear, emits once, and restores current rather than missed routines", async () => {
  const s = fixture("relocate"),
    uid = await spawn(s, position("home"));
  const blocker = await spawn(s, position("b"));
  const events = [];
  s.host.events.on("core:actor-relocated", (e) => {
    if (e.payload.after.uid === uid) events.push(e.payload);
  });
  await start(s);
  s.tick(5000, []);
  assert.equal(s.game.actors.view(uid).map, "routine:home");
  await s.bus.execute("core.actor.remove", { uid: blocker });
  s.tick(10000, []);
  s.tick(15000, []);
  assert.equal(events.length, 1);
  assert.equal(events[0].after.uid, uid);
  assert.equal(events[0].routine.id, "work");
  await s.bus.execute("core.time.advance", { ms: DAY_MS + 11 * 60 * 60000 });
  const document = s.game.exportDocument();
  s.game.loadDocument(document);
  assert.equal(s.game.actors.view(uid).map, "routine:home");
  assert.equal(s.game.actors.routines()[uid].id, "return");
  assert.equal(s.game.actors.routines()[uid].day, 1);
  assert.equal(events.length, 2);
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(events.length, 2);
});
test("Routine changes cannot relocate a scripted or still interpolating actor", async () => {
  const s = fixture("relocate", position("a", 3)),
    uid = await spawn(s, position("a", 1));
  await start(s);
  s.game.field.npcs.objects("routine:a");
  s.tick(5000, ["routine:a"]);
  const before = s.game.field.npcs.view("routine:a", 5060)[0];
  assert.equal(s.game.actors.view(uid).x, 2);
  await s.bus.execute("core.time.advance", { ms: 11 * 60 * 60000 });
  s.tick(5060, []);
  assert.equal(s.game.actors.view(uid).map, "routine:a");
  assert.equal(s.game.field.npcs.view("routine:a", 5060)[0].px, before.px);
  // The existing scene pin owns the character until the scene releases control.
  s.game.field.npcs.scene = { pins: new Map(), hidden: new Set() };
  s.tick(10000, []);
  assert.equal(s.game.actors.view(uid).map, "routine:a");
  s.game.field.npcs.scene = null;
  s.tick(15000, []);
  assert.equal(s.game.actors.view(uid).map, "routine:home");
});
test("Clock restore and rollback select a monotonic latest phase without an Actor-specific persisted clock", () => {
  let wall = 1000000;
  const state = emptyWorldClock(),
    clock = new WorldClock({ state, wallNow: () => wall });
  clock.start(7, 59);
  const entries = [
    { id: "rest", start: 0, position: position("a") },
    { id: "work", start: 480, position: position("a") },
  ];
  const r = new ActorScheduleRegistry(
    { worker: { entries } },
    { maps: { "routine:a": map }, behaviors: new NPCBehaviorRegistry() },
  );
  wall += 60000;
  new WorldClock({ state, wallNow: () => wall }).sync({ resumed: true });
  assert.equal(r.select("worker", clock.view()).id, "work");
  wall -= 120000;
  clock.sync({ resumed: true });
  assert.equal(r.select("worker", clock.view()).id, "work");
});
test("A schedule includes foreign destination plugins in the save dependency ledger before the actor visits them", async () => {
  const destination = manifest("destination", (api) =>
    api.content.register("maps", "room", { ...map, id: "destination:room" }),
  );
  const actor = plugin("hold", {
    map: "destination:room",
    x: 2,
    y: 1,
    dir: "up",
  });
  const s = session([destination, actor]);
  Object.assign(s.game.state.position, position("observer", 0, 3));
  s.game.bindField();
  await spawn(s, position("home"));
  const document = s.game.exportDocument();
  assert(document.state.contentDependencies.includes("destination"));
  const missing = session([plugin()]);
  missing.game.loadDocument(document);
  assert(!missing.game.state.contentDependencies.includes("destination"));
  assert.equal(missing.game.state.money, document.state.money);
});
