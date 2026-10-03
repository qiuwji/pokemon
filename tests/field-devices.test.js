import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  FieldDeviceCatalog,
  FieldDevices,
  emptyFieldDevices,
} from "../dist/engine/field-devices.js";
import { FieldActionRegistry } from "../dist/engine/field-actions.js";
import { objectSchema } from "../dist/engine/extensions/values.js";
import { EMERALD_FIELD_MECHANISMS } from "../dist/packs/emerald/field-mechanisms.js";
import { EMERALD_FIELD_ACTIONS } from "../dist/packs/emerald/field-actions.js";
import { BEHAVIOR as B } from "../dist/engine/terrain.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { FieldActionDirector } from "../dist/presentation/field-action-director.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { createMonster } from "../dist/engine/model.js";
const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const destination = { map: "Landing", x: 1, y: 1, dir: "down" };
function engine(
  policy,
  { scope = "visit", state, prepareOperations = (x) => x } = {},
) {
  const commits = [],
    catalog = new FieldDeviceCatalog({
      mechanisms: { test: { scope, ...policy } },
      devices: { device: { map: "Lab", x: 1, y: 1, mechanism: "test" } },
      maps: { Lab: { width: 3, height: 3 } },
      actions: new FieldActionRegistry(EMERALD_FIELD_ACTIONS),
    });
  const service = new FieldDevices({
    catalog,
    state,
    context: () => ({}),
    prepareOperations,
    commitOperations: (plan) => commits.push(plan),
  });
  return { service, commits, catalog };
}
const position = { map: "Lab", x: 1, y: 1 };
test("Device registration rejects bad placements, state schemas, async policies and unknown action requests", () => {
  assert.throws(() => engine({ scope: "forever", enter: () => ({}) }));
  assert.throws(() =>
    engine({
      schema: objectSchema({ on: { type: "boolean" } }, ["on"]),
      initialState: {},
      enter: () => ({}),
    }),
  );
  const a = engine({ enter: async () => ({}) });
  assert.throws(() => a.service.event("enter", position), /synchronous/i);
  const b = engine({
    enter: (c) => {
      c.state.changed = true;
      return {};
    },
  });
  assert.throws(() => b.service.event("enter", position), TypeError);
  const c = engine({
    enter: () => ({ requests: [{ key: "bad", action: "missing" }] }),
  });
  assert.throws(
    () => c.service.event("enter", position),
    /Unknown device action/,
  );
  assert.deepEqual(c.service.state, emptyFieldDevices());
  assert.throws(
    () =>
      new FieldDeviceCatalog({
        mechanisms: {},
        devices: { bad: { map: "Lab", x: 0, y: 0, mechanism: "missing" } },
        maps: { Lab: { width: 1, height: 1 } },
      }),
  );
});
test("Device callbacks stage state and world effects atomically before host commits", () => {
  const s = engine(
    {
      schema: objectSchema({ count: { type: "integer" } }, ["count"]),
      initialState: { count: 0 },
      enter: (c) => ({
        state: { count: c.state.count + 1 },
        operations: [{ kind: "tile" }],
      }),
    },
    {
      prepareOperations: () => {
        throw new Error("blocked");
      },
    },
  );
  assert.throws(() => s.service.event("enter", position), /blocked/);
  assert.deepEqual(s.service.state, emptyFieldDevices());
  assert.equal(s.commits.length, 0);
});
test("Due timers are ordered, cancellable and replacement timers wait for their own deadline", () => {
  const seen = [];
  const s = engine({
    enter: () => ({
      timers: [
        { key: "a", delayMs: 50 },
        { key: "b", delayMs: 50 },
        { key: "c", delayMs: 50 },
      ],
    }),
    timer: (c) => {
      seen.push(c.event.payload.key);
      return c.event.payload.key === "a"
        ? { cancelTimers: ["b"], timers: [{ key: "c", delayMs: 20 }] }
        : {};
    },
  });
  s.service.event("enter", position);
  s.service.advance(49);
  assert.deepEqual(seen, []);
  s.service.advance(1);
  assert.deepEqual(seen, ["a"]);
  s.service.advance(20);
  assert.deepEqual(seen, ["a", "c"]);
});
test("Timer failures preserve saved cursor, own state and pending task for retry", () => {
  const s = engine(
    {
      enter: () => ({ timers: [{ key: "change", delayMs: 50 }] }),
      timer: () => ({ operations: [{}] }),
    },
    {
      prepareOperations: () => {
        throw new Error("rejected");
      },
    },
  );
  s.service.event("enter", position);
  const saved = structuredClone(s.service.state);
  assert.throws(() => s.service.advance(100), /rejected/);
  assert.deepEqual(s.service.state, saved);
});
test("Visit resets clear transient work, preserve permanent records, support resume and reject stale plans", () => {
  const policy = {
    schema: objectSchema({ on: { type: "boolean" } }, ["on"]),
    initialState: { on: false },
    enter: () => ({
      state: { on: true },
      timers: [{ key: "change", delayMs: 50 }],
      requests: [{ key: "fall", action: "fall", input: { device: "device" } }],
    }),
  };
  for (const scope of ["visit", "permanent"]) {
    const { service } = engine(policy, { scope });
    service.event("enter", position);
    assert.equal(service.prepareVisit("Lab", { resume: true }), null);
    const stale = service.prepareVisit("Lab");
    service.advance(1);
    assert.throws(() => service.commitVisit(stale), /Stale/);
    service.commitVisit(service.prepareVisit("Lab"));
    assert.deepEqual(service.state.timers, {});
    assert.deepEqual(service.state.requests, {});
    assert.equal(
      service.state.records.device?.on,
      scope === "permanent" ? true : undefined,
    );
  }
});
test("Device saves validate content references and elevation matching avoids other planes", () => {
  const s = engine({ enter: () => ({}) });
  assert.throws(
    () =>
      new FieldDevices({
        catalog: s.catalog,
        state: { ...emptyFieldDevices(), records: { removed: {} } },
      }),
  );
  assert.equal(
    s.service.matches(
      { ...position, elevation: 3 },
      { ...position, elevation: 4 },
    ),
    false,
  );
  assert.equal(
    s.service.matches(
      { ...position, elevation: 0 },
      { ...position, elevation: 4 },
    ),
    true,
  );
});
function fixture(
  mechanism = "thin-ice",
  { plugin, cell = 2, blockedLanding = false } = {},
) {
  let now = 0,
    saved = null,
    game;
  const fieldMap = (id) => ({
    ...base.maps.Route101,
    id,
    width: 8,
    height: 4,
    blocks: Array(32).fill(0),
    behavior: Array(32).fill(0),
    connections: [],
    warps: [],
    npcs: [],
    signs: [],
    elements: [],
  });
  const lab = fieldMap("Lab");
  lab.behavior[8 + cell] =
    mechanism === "thin-ice" ? B.THIN_ICE : B.CRACKED_FLOOR;
  const landing = fieldMap("Landing");
  if (blockedLanding) landing.blocks[9] = 1024;
  const compiled = createEmeraldPlugins(
    { ...base, maps: { ...base.maps, Lab: lab, Landing: landing } },
    [
      {
        id: "devices",
        apiVersion: 1,
        version: "1.0.0",
        dataVersion: 1,
        permissions: ["world"],
        setup(api) {
          api.content.register("fieldDevices", "tile", {
            map: "Lab",
            x: cell,
            y: 1,
            mechanism,
            config: {
              holeMetatile: 0,
              ...(mechanism === "thin-ice" ? { crackedMetatile: 1 } : {}),
              to: destination,
            },
          });
          plugin?.(api);
        },
      },
    ],
  );
  const timeline = new Timeline({
    now: () => now,
    wait: async (ms) => {
      now += ms;
    },
  });
  game = new EmeraldAdventure({
    ...compiled,
    plugins: compiled.host,
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
    toast() {},
    checkGrowth() {},
  });
  game.state.party = [createMonster("mudkip", 10, game.db, game.rng)];
  game.state.flags.starter = true;
  game.enter({ map: "Lab", x: 1, y: 1, dir: "right" });
  const { bus } = attachEmeraldExtensions(game, compiled.host);
  return {
    game,
    bus,
    frame(ms, input) {
      now += ms;
      game.handleFieldInput(input);
      game.tick(now, ["Lab"]);
    },
    advance(ms) {
      now += ms;
      game.tick(now, ["Lab"]);
    },
    async flush() {
      for (let i = 0; i < 30; i++) await Promise.resolve();
    },
  };
}
test("Thin ice cracks, survives active-visit save reload and breaks on second entry before animated fall", async () => {
  const s = fixture(),
    g = s.game;
  assert(g.move("right"));
  s.advance(84);
  assert.equal(g.worldState.maps.Lab.behavior[10], B.CRACKED_ICE);
  assert.deepEqual(g.state.devices.records["devices:tile"], { visited: true });
  s.advance(100);
  const save = g.exportDocument();
  g.loadDocument(save);
  assert.equal(g.worldState.maps.Lab.behavior[10], B.CRACKED_ICE);
  assert(g.move("left"));
  s.advance(200);
  assert(g.move("right"));
  s.advance(84);
  assert.equal(g.worldState.maps.Lab.behavior[10], B.CRACKED_FLOOR_HOLE);
  assert.equal(g.state.position.map, "Lab");
  s.advance(100);
  s.advance(1);
  await s.flush();
  assert.equal(g.state.position.map, "Landing");
  assert.equal(g.actionBusy, false);
  assert.equal(
    g.fieldActionOptions().some((x) => x.id === "fall"),
    false,
  );
  g.enter({ map: "Lab", x: 1, y: 1, dir: "right" });
  assert.equal(g.worldState.maps.Lab.behavior[10], B.THIN_ICE);
  assert.equal(g.state.devices.records["devices:tile"], undefined);
});
test("Device timers pause during menus and restore remaining delay from saves", () => {
  const s = fixture(),
    g = s.game;
  g.move("right");
  s.advance(30);
  g.ui.blocked = true;
  s.advance(200);
  g.ui.blocked = false;
  const doc = g.exportDocument();
  g.loadDocument(doc);
  g.ui.blocked = true;
  s.advance(1000);
  assert.equal(g.worldState.maps.Lab.behavior[10], B.THIN_ICE);
  g.ui.blocked = false;
  s.advance(53);
  assert.equal(g.worldState.maps.Lab.behavior[10], B.THIN_ICE);
  s.advance(1);
  assert.equal(g.worldState.maps.Lab.behavior[10], B.CRACKED_ICE);
});
test("Fast registered movement clears cracked floor before opening; walking triggers fall", async () => {
  const s = fixture("cracked-floor", {
      cell: 5,
      plugin(api) {
        api.content.register("movement", "test-bike", {
          name: "test bike",
          actor: "BrendanMachBike",
          durations: [48],
          allowed: () => true,
          traverse: (c) => c.cell.collision === 0,
        });
      },
    }),
    g = s.game;
  g.state.flags.bike = true;
  assert.equal(g.setMovementMode("devices:test-bike").ok, true);
  for (let i = 0; i < 3; i++) {
    assert(g.move("right"));
    s.advance(g.motion.duration);
  }
  assert(g.move("right"));
  assert.equal(g.motion.duration, 48);
  s.advance(48);
  assert(g.move("right"));
  s.advance(2);
  assert.equal(g.worldState.maps.Lab.behavior[13], B.CRACKED_FLOOR_HOLE);
  assert.equal(g.state.position.x, 6);
  assert.equal(g.actionBusy, false);
  const walk = fixture("cracked-floor"),
    w = walk.game;
  assert(w.move("right"));
  walk.advance(50);
  assert.equal(w.state.position.map, "Lab");
  walk.advance(120);
  walk.advance(1);
  await walk.flush();
  assert.equal(w.state.position.map, "Landing");
});
test("Plugin interaction uses public world command and read-only device query with persistent state", async () => {
  const s = fixture("thin-ice", {
      plugin(api) {
        const mechanism = api.content.register("fieldMechanisms", "switch", {
          scope: "permanent",
          schema: objectSchema({ on: { type: "boolean" } }, ["on"]),
          initialState: { on: false },
          interact: (c) => ({
            state: { on: !c.state.on },
            facts: [{ kind: "switched" }],
          }),
        });
        api.content.register("fieldDevices", "switch", {
          map: "Lab",
          x: 1,
          y: 2,
          mechanism,
        });
      },
    }),
    g = s.game;
  g.state.position.dir = "down";
  assert.equal(
    (await s.bus.execute("core.device.interact", { id: "devices:switch" })).ok,
    true,
  );
  assert.equal(g.state.devices.records["devices:switch"].on, true);
  const document = g.exportDocument();
  g.loadDocument(document);
  assert.equal(g.state.devices.records["devices:switch"].on, true);
  g.enter(destination);
  g.enter({ map: "Lab", x: 1, y: 1, dir: "down" });
  assert.equal(g.state.devices.records["devices:switch"].on, true);
});
test("Fall pose is clock-driven, commits under cover, restores after landing and respects reducedMotion", async () => {
  for (const reduced of [false, true]) {
    let now = 0,
      director,
      transitions;
    const samples = [];
    const timeline = new Timeline({
      now: () => now,
      wait: async (ms) => {
        now += ms;
        samples.push(director.sample());
      },
    });
    director = new FieldActionDirector({
      timeline,
      reducedMotion: () => reduced,
    });
    transitions = new TransitionController(timeline);
    await director.play(
      {
        ...EMERALD_FIELD_ACTIONS.fall,
        id: "fall",
        target: {},
        operation: { kind: "travel" },
      },
      () => {
        assert(transitions.sample().covered);
      },
      { transitions },
    );
    assert(
      samples.some(
        (s) => s?.phase === "settle" && Object.keys(s.player).length === 0,
      ),
    );
    if (reduced)
      assert(samples.every((s) => !s || Object.keys(s.player).length === 0));
    else
      assert(samples.some((s) => s?.player.opacity === 0 && s.player.y === 24));
    assert.equal(director.sample(), null);
  }
});

test("Blocked fall reports rejection and keeps player position; device switch also responds to ordinary interaction", async () => {
  const s = fixture("cracked-floor", { blockedLanding: true }),
    g = s.game,
    outcomes = [];
  g.plugins.events.on("core:device-action", (e) =>
    outcomes.push(e.payload.outcome),
  );
  assert(g.move("right"));
  s.advance(50);
  s.advance(120);
  s.advance(1);
  await s.flush();
  assert.equal(g.state.position.map, "Lab");
  assert.equal(g.state.position.x, 2);
  assert.equal(g.actionBusy, false);
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].ok, false);
  const toggle = fixture("thin-ice", {
    plugin(api) {
      const mechanism = api.content.register("fieldMechanisms", "switch", {
        scope: "permanent",
        schema: objectSchema({ n: { type: "integer" } }, ["n"]),
        initialState: { n: 0 },
        interact: (c) => ({ state: { n: c.state.n + 1 } }),
      });
      api.content.register("fieldDevices", "switch", {
        map: "Lab",
        x: 1,
        y: 2,
        mechanism,
      });
    },
  });
  toggle.game.state.position.dir = "down";
  toggle.game.interact();
  assert.equal(toggle.game.state.devices.records["devices:switch"].n, 1);
});
test("Field action avatar registration freezes descriptions, rejects non-player anchors and other-plane falls", () => {
  const avatar = structuredClone(EMERALD_FIELD_ACTIONS.fall.avatar),
    definition = { ...EMERALD_FIELD_ACTIONS.fall, avatar };
  const registry = new FieldActionRegistry({ fall: definition });
  avatar[0].keyframes[0].values.y = 99;
  assert.equal(
    registry.definitions.get("fall").avatar[0].keyframes[0].values.y,
    0,
  );
  assert.throws(() =>
    registry.register("bad", {
      ...definition,
      avatar: [{ ...avatar[0], anchor: "targets" }],
    }),
  );
  const context = {
    position: { map: "Lab", x: 1, y: 1, elevation: 4 },
    map: { width: 3, height: 3, behavior: Array(9).fill(B.CRACKED_FLOOR_HOLE) },
    devices: { devices: { tile: { map: "Lab", x: 1, y: 1, elevation: 3 } } },
  };
  assert.equal(
    EMERALD_FIELD_ACTIONS.fall.allowed(context, { device: "tile" }),
    false,
  );
});

test("Actual Mach input passes a cracked floor; held walking cannot bypass queued fall", async () => {
  const held = { direction: "right", secondary: false, running: false };
  const fast = fixture("cracked-floor", { cell: 5 });
  fast.game.state.flags.bike = true;
  assert(fast.game.setMovementMode("mach-bike").ok);
  fast.frame(0, held);
  for (let i = 0; i < 70 && fast.game.state.position.x < 6; i++)
    fast.frame(1000 / 60, held);
  assert.equal(fast.game.state.position.map, "Lab");
  assert.equal(fast.game.state.position.x, 6);
  assert.equal(
    fast.game.worldState.maps.Lab.behavior[13],
    B.CRACKED_FLOOR_HOLE,
  );
  assert.equal(
    fast.game.state.devices.requests["devices:tile"]?.fall,
    undefined,
  );
  const walk = fixture("cracked-floor");
  walk.frame(0, held);
  for (let i = 0; i < 15 && !walk.game.actionBusy; i++)
    walk.frame(1000 / 60, held);
  await walk.flush();
  assert.equal(walk.game.state.position.map, "Landing");
});
test("Releasing fast Mach input over an opened floor requests fall instead of indefinite hovering", async () => {
  const s = fixture("cracked-floor", { cell: 5 }),
    held = { direction: "right", secondary: false, running: false };
  s.game.state.flags.bike = true;
  s.game.setMovementMode("mach-bike");
  s.frame(0, held);
  for (let i = 0; i < 60 && s.game.state.position.x < 5; i++)
    s.frame(1000 / 60, held);
  for (let i = 0; i < 8 && !s.game.actionBusy; i++)
    s.frame(1000 / 60, { ...held, direction: null });
  await s.flush();
  assert.equal(s.game.state.position.map, "Landing");
});

test("Plugin input rules can select a technique and control movement through public input command without editing the engine", async () => {
  const s = fixture("thin-ice", {
    plugin(api) {
      const inputRule = api.content.register("movementInputs", "step", {
        schema: objectSchema({ calls: { type: "integer" } }, ["calls"]),
        initialState: { calls: 0 },
        decide: (c) => ({
          state: { calls: c.state.calls + 1 },
          action:
            c.busy || !c.input.direction
              ? null
              : {
                  kind: "step",
                  direction: c.input.direction,
                  durationMs: 73,
                  technique: "float",
                },
        }),
      });
      api.content.register("movement", "hover", {
        name: "hover",
        actor: "BrendanMachBike",
        durations: [90],
        inputRule,
        techniques: { float: { name: "float", pose: "hover" } },
        allowed: () => true,
        traverse: (c) => c.cell.collision === 0,
      });
    },
  });
  assert(s.game.setMovementMode("devices:hover").ok);
  assert.equal(
    await s.bus.execute("core.field.input", { direction: "right" }),
    true,
  );
  assert.equal(s.game.motion.duration, 73);
  assert.equal(s.game.movement.technique, "float");
  assert.equal(s.game.applications.movement.input.state.calls, 1);
  assert.equal(
    await s.bus.execute("core.field.input", { direction: "left" }),
    false,
  );
  assert.equal(
    s.game.motion.dir,
    "right",
    "busy input cannot jitter actor facing",
  );
  assert.equal(s.game.applications.movement.input.state.calls, 2);
  assert.equal(await s.bus.execute("core.field.input-reset", {}), true);
  assert.equal(s.game.applications.movement.input.state, null);
});

test("A blocked fast departure cannot keep the rider hovering over an opened cracked floor", async () => {
  const s = fixture("cracked-floor", { cell: 5 }),
    held = { direction: "right", secondary: false, running: false };
  s.game.state.flags.bike = true;
  s.game.setMovementMode("mach-bike");
  s.frame(0, held);
  for (let i = 0; i < 60 && s.game.state.position.x < 5; i++)
    s.frame(1000 / 60, held);
  s.game.patchWorld([{ kind: "tile", map: "Lab", x: 6, y: 1, block: 1024 }]);
  for (let i = 0; i < 15 && !s.game.actionBusy; i++) s.frame(1000 / 60, held);
  await s.flush();
  assert.equal(s.game.state.position.map, "Landing");
});
