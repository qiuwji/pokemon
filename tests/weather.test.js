import { createBag } from "./helpers/inventory-fixture.js";
import { Renderer } from "../dist/adapters/canvas-renderer.js";
import { PresentationRegistry } from "../dist/presentation/effect-registry.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  WeatherRegistry,
  WorldWeather,
  emptyWeather,
} from "../dist/engine/weather.js";
import {
  GEN3_WORLD_WEATHER,
  GEN3_BATTLE_WEATHER,
} from "../dist/engine/rules/gen3/weather.js";
import { GEN3_MAP_WEATHER } from "../dist/engine/rules/gen3/map-weather.js";
import { Battle } from "../dist/engine/battle.js";
import { BattleWeatherRegistry } from "../dist/engine/battle/weather.js";
import { TRAIT_OPERATIONS } from "../dist/engine/battle/trait-operations.js";
import { RANDOM_POWER_OPERATIONS } from "../dist/engine/battle/random-power-operations.js";
import { Random, createMonster } from "../dist/engine/model.js";
import { WeatherDirector } from "../dist/presentation/weather-director.js";
import { drawWeather } from "../dist/presentation/environment-canvas.js";
import { createDefaultPresentation } from "../dist/presentation/default-presentation.js";
import { createEmeraldPresentation } from "../dist/packs/emerald/animations.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { PACK } from "../dist/packs/emerald/pack.js";
const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const registry = () =>
  new WeatherRegistry(GEN3_WORLD_WEATHER, {
    defaultWeather: "clear",
    battleKinds: GEN3_BATTLE_WEATHER,
  });
const maps = {
  A: {
    width: 5,
    height: 5,
    weather: {
      default: "clear",
      regions: [
        { x: 1, y: 1, elevation: 3, weather: "rain" },
        { x: 2, y: 1, weather: "clear" },
      ],
    },
  },
  B: { width: 5, height: 5, weather: { default: "route119" } },
  C: { width: 5, height: 5, indoor: true, weather: { default: "none" } },
};
const world = (state) =>
  new WorldWeather({
    state: state || emptyWeather(),
    registry: registry(),
    maps,
  });
function session(plugins = [], records = {}, wallStart = 100000) {
  let now = 0,
    wall = wallStart;
  const errors = [],
    compiled = createEmeraldPlugins(structuredClone(base), plugins, (error) =>
      errors.push(error),
    );
  const timeline = new Timeline({
    now: () => now,
    wait: async (ms) => {
      now += ms;
    },
  });
  const game = new EmeraldAdventure({
    ...compiled,
    plugins: compiled.host,
    timeline,
    wallNow: () => wall,
    storage: {
      getItem: (key) => records[key] || null,
      setItem: (key, value) => {
        records[key] = value;
      },
    },
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(compiled.db.maps)),
  });
  game.ui = {
    dialog: null,
    blocked: false,
    updateSide() {},
    updateTime() {},
    updateWeather() {},
    toast(text) {
      errors.push(new Error(text));
    },
    closeModal() {},
    announce() {},
    drawBattleHUD() {},
    resetBattleMenu() {},
  };
  const extensions = attachEmeraldExtensions(game, compiled.host);
  game.state.party = [createMonster("mudkip", 15, game.db, game.rng)];
  return {
    game,
    ...compiled,
    ...extensions,
    records,
    errors,
    wall: (ms) => {
      wall += ms;
    },
    frame: (ms) => {
      now += ms;
      return now;
    },
  };
}
function battle({
  weather = "rain",
  weatherDefinitions = GEN3_BATTLE_WEATHER,
  enemyAbility = "pickup",
  effects,
} = {}) {
  const compiled = createEmeraldPlugins(base, []),
    db = compiled.db,
    rng = new Random(74);
  const p = createMonster("treecko", 30, db, rng),
    e = createMonster("zigzagoon", 30, db, rng);
  p.ability = "overgrow";
  e.ability = enemyAbility;
  p.stats.hp = p.hp = 160;
  e.stats.hp = e.hp = 160;
  const seed = rng.seed;
  const b = new Battle({
    party: [p],
    enemyParty: [e],
    db,
    rng,
    trainer: true,
    bag: createBag({}),
    environment: { weather },
    weatherDefinitions,
    effects,
  });
  return { b, p, e, rng, seed };
}
test("Reference map weather preserves 518 headers and 86 coordinate events with separate field/battle identities", () => {
  assert.equal(Object.keys(GEN3_MAP_WEATHER).length, 518);
  assert.equal(
    Object.values(GEN3_MAP_WEATHER).reduce(
      (n, m) => n + (m.regions?.length || 0),
      0,
    ),
    86,
  );
  assert.equal(GEN3_MAP_WEATHER.Route113.default, "clear");
  assert(GEN3_MAP_WEATHER.Route113.regions.some((r) => r.weather === "ash"));
  assert(
    GEN3_MAP_WEATHER.Route119.regions.some((r) => r.weather === "route119"),
  );
  assert.equal(GEN3_WORLD_WEATHER.clear.battle, undefined);
  assert.equal(GEN3_WORLD_WEATHER.snow.battle, undefined);
  assert.equal(GEN3_WORLD_WEATHER.drought.battle, "sun");
  for (const id of ["rain", "thunderstorm", "downpour"])
    assert.equal(GEN3_WORLD_WEATHER[id].battle, "rain");
});

test("Weather restore rejects non-object override containers and explicit malformed map weather rather than assuming clear", () => {
  for (const overrides of [7, "invalid", true, [], null]) {
    const state = { ...emptyWeather(), overrides },
      before = structuredClone(state);
    assert.throws(
      () => new WorldWeather({ state, registry: registry(), maps }),
    );
    assert.deepEqual(state, before);
  }
  for (const weather of [null, false, 0, "clear"])
    assert.throws(() => registry().validateMaps({ A: { ...maps.A, weather } }));
  assert.doesNotThrow(() =>
    registry().validateMaps({ A: { width: 5, height: 5 } }),
  );
  const { game: g, db, catalog, host } = session();
  const state = structuredClone(g.state),
    before = structuredClone(g.state);
  state.weather.overrides = 7;
  assert.equal(validateSave(state, db, catalog, host), false);
  assert.deepEqual(g.state, before);
});
test("Coordinate weather respects elevation, remains until another trigger and resets on map entry", () => {
  const w = world();
  w.enter("A", 0);
  w.step({ map: "A", x: 1, y: 1, elevation: 2 });
  assert.equal(w.view().kind, "clear");
  w.step({ map: "A", x: 1, y: 1, elevation: 3 });
  assert.equal(w.view().kind, "rain");
  w.step({ map: "A", x: 4, y: 4, elevation: 3 });
  assert.equal(w.view().kind, "rain");
  w.enter("C", 0);
  assert.equal(w.view().kind, "none");
  w.enter("A", 0);
  assert.equal(w.view().kind, "clear");
  assert(Object.isFrozen(w.view()));
});
test("Daily cycles advance saved stages once and resolve only on entry or coordinate selection", () => {
  const w = world();
  w.enter("B", 0);
  assert.equal(w.view().kind, "clear");
  w.advanceDays(1);
  assert.equal(w.view().kind, "clear");
  w.enter("B", 0);
  assert.equal(w.view().kind, "rain");
  w.advanceDays(1);
  w.enter("B", 0);
  assert.equal(w.view().kind, "thunderstorm");
  w.advanceDays(2);
  w.enter("B", 0);
  assert.equal(w.view().kind, "clear");
  const restored = world(structuredClone(w.state));
  assert.deepEqual(restored.view(), w.view());
});
test("Temporary and remote overrides expire once; invalid requests never mutate valid state", () => {
  const w = world();
  w.enter("A", 0);
  w.set("A", "sand", { now: 0, durationMs: 100 });
  w.set("B", "rain", { now: 0 });
  w.step({ map: "A", x: 2, y: 1 });
  assert.equal(w.view().kind, "sand");
  const before = structuredClone(w.state);
  for (const run of [
    () => w.set("A", "typo", { now: 0 }),
    () => w.set("A", "rain", { now: 0, durationMs: -1 }),
    () => w.enter("missing", 100),
    () => w.advanceDays(-1),
  ]) {
    assert.throws(run);
    assert.deepEqual(w.state, before);
  }
  w.expire(99);
  assert.equal(w.view().kind, "sand");
  w.expire(100);
  assert.equal(w.view().kind, "clear");
  const revision = w.state.revision;
  w.expire(100);
  assert.equal(w.state.revision, revision);
  w.enter("B", 100);
  assert.equal(w.view().kind, "rain");
  w.clear("B");
  assert.equal(w.view().kind, "clear");
});
test("Registries reject missing references, cycles, map regions and invalid residual policies before play", () => {
  for (const definitions of [
    { bad: { label: "x", battle: "missing" } },
    { bad: { label: "x", cycle: ["missing"] } },
    { bad: { label: "x", cycle: ["bad"] } },
  ])
    assert.throws(() => new WeatherRegistry(definitions));
  assert.throws(() =>
    registry().validateMaps({
      bad: {
        width: 2,
        height: 2,
        weather: {
          default: "rain",
          regions: [{ x: 2, y: 0, weather: "clear" }],
        },
      },
    }),
  );
  assert.throws(() =>
    registry().validateMaps({
      bad: { width: 2, height: 2, presentation: { weather: "rain" } },
    }),
  );
  assert.throws(
    () =>
      new BattleWeatherRegistry({
        bad: { residual: { divisor: 0, immuneTypes: [] } },
      }),
  );
  const dry = new WeatherRegistry(
    { dry: { label: "干燥" } },
    { defaultWeather: "dry" },
  );
  const generic = new WorldWeather({
    state: emptyWeather(),
    registry: dry,
    maps: { A: { width: 1, height: 1 } },
  });
  assert.equal(generic.view("A").kind, "dry");
  generic.enter("A", 0);
  assert.equal(generic.view().kind, "dry");
  const w = world();
  w.enter("A", 0);
  const corrupt = structuredClone(w.state);
  corrupt.active.kind = "rain";
  assert.throws(() => world(corrupt));
});
test("Abnormal weather phase is a saved foreground clock rather than render randomness or RTC", () => {
  const abnormalMaps = {
    A: { width: 2, height: 2, weather: { default: "abnormal" } },
  };
  const w = new WorldWeather({
    state: emptyWeather(),
    registry: registry(),
    maps: abnormalMaps,
  });
  w.enter("A", 0);
  const duration = GEN3_WORLD_WEATHER.abnormal.periodMs;
  w.advance(duration - 1);
  assert.equal(w.view().kind, "downpour");
  const restored = new WorldWeather({
    state: structuredClone(w.state),
    registry: registry(),
    maps: abnormalMaps,
  });
  restored.advance(1);
  assert.equal(restored.view().kind, "drought");
  restored.advance(duration);
  assert.equal(restored.view().kind, "downpour");
});
test("Battle inherits permanent weather, applies registered residual immunity and suppresses it through Cloud Nine", () => {
  const s = battle({ weather: "sand" });
  assert.deepEqual(s.b.weather, { kind: "sand", turns: null });
  assert.equal(s.b.snapshot().environment.weatherVisual, "weather.sand");
  s.b.rounds.residuals();
  assert.equal(s.p.hp, 150);
  assert.equal(s.e.hp, 150);
  assert.equal(s.b.weather.turns, null);
  const suppressed = battle({ weather: "sand", enemyAbility: "cloud_nine" });
  suppressed.b.rounds.residuals();
  assert.equal(suppressed.p.hp, 160);
  assert.equal(suppressed.b.snapshot().environment.weather, null);
  assert.equal(suppressed.b.weather.kind, "sand");
  const custom = battle({
    weather: "smog",
    weatherDefinitions: {
      ...GEN3_BATTLE_WEATHER,
      smog: {
        visual: "weather.ash",
        weatherBall: "poison",
        residual: { divisor: 8, immuneTypes: ["grass"] },
      },
    },
  });
  custom.b.rounds.residuals();
  assert.equal(custom.p.hp, 160);
  assert.equal(custom.e.hp, 140);
  const c = { battle: custom.b, move: { type: "normal" } };
  RANDOM_POWER_OPERATIONS.weatherBall(c);
  assert.equal(c.move.type, "poison");
  assert.equal(c.baseMultiplier, 2);
});
test("Weather moves expire after five rounds, repeated weather fails and entry abilities can make it permanent", () => {
  const { b } = battle({ weather: null });
  const c = { battle: b, emit: (...args) => b.emit(...args) };
  assert(TRAIT_OPERATIONS.setWeather(c, { weather: "rain", turns: 5 }));
  b.rounds.residuals();
  assert.equal(b.weather.turns, 4);
  assert.equal(
    TRAIT_OPERATIONS.setWeather(c, { weather: "rain", turns: 5 }),
    false,
  );
  assert.equal(b.weather.turns, 4);
  const mon = b.roster.occupant(b.homeSeat);
  mon.moves = [{ id: "rain_dance", pp: 5 }];
  b.executeMove(b.homeSeat, 0, b.homeSeat);
  assert.equal(mon.moves[0].pp, 4);
  assert.equal(b.weather.turns, 4);
  assert.equal(
    b.events.filter((e) => e.kind === "move").at(-1).move.successful,
    false,
  );
  for (let i = 0; i < 4; i++) b.rounds.residuals();
  assert.equal(b.weather, null);
  const ability = battle({ weather: "sun", enemyAbility: "drizzle" });
  assert.deepEqual(ability.b.weather, { kind: "rain", turns: null });
  assert.throws(() => battle({ weather: "typo" }), /Unknown battle weather/);
  assert.throws(
    () =>
      battle({
        effects: { bad: { primary: [{ op: "setWeather", weather: "typo" }] } },
      }),
    /Unknown battle weather/,
  );
});
test("Weather crossfades are clock-injected, preserve interruption continuity and respect reduced motion", () => {
  const d = new WeatherDirector({ duration: 100 });
  assert.deepEqual(d.sample(0, "rain"), []);
  assert.deepEqual(d.sample(100, "rain"), [{ visual: "rain", opacity: 1 }]);
  d.sample(100, "sand");
  const halfway = d.sample(150, "sand");
  assert.deepEqual(halfway, [
    { visual: "rain", opacity: 0.5 },
    { visual: "sand", opacity: 0.5 },
  ]);
  assert.deepEqual(d.sample(150, "fog"), halfway);
  assert.deepEqual(d.sample(250, "fog"), [{ visual: "fog", opacity: 1 }]);
  assert.deepEqual(d.sample(251, null, { reducedMotion: true }), []);
});
function canvas() {
  const calls = [],
    stack = [];
  return {
    calls,
    globalAlpha: 1,
    fillStyle: "",
    save() {
      stack.push([this.globalAlpha, this.fillStyle]);
    },
    restore() {
      [this.globalAlpha, this.fillStyle] = stack.pop();
    },
    fillRect(...args) {
      calls.push([this.fillStyle, this.globalAlpha, ...args]);
    },
  };
}
test("Registered weather artists are deterministic, opacity-safe and use static reduced-motion rendering", () => {
  for (const kind of [
    "rain",
    "downpour",
    "thunderstorm",
    "sand",
    "snow",
    "hail",
    "ash",
    "bubbles",
    "fog",
    "fog-diagonal",
    "clouds",
    "sun",
    "underwater",
    "shade",
  ]) {
    const a = canvas(),
      b = canvas();
    drawWeather(a, "weather." + kind, 500, { opacity: 0.25 });
    drawWeather(b, "weather." + kind, 500, { opacity: 0.25 });
    assert.deepEqual(a.calls, b.calls);
    assert(a.calls.every((c) => c[1] <= 0.25));
    assert.equal(a.globalAlpha, 1);
    const x = canvas(),
      y = canvas();
    drawWeather(x, "weather." + kind, 0, { reducedMotion: true });
    drawWeather(y, "weather." + kind, 90000, { reducedMotion: true });
    assert.deepEqual(x.calls, y.calls);
  }
});
test("Application commands, read-only queries, map visits, expiry and current save schema share one owner", async () => {
  const s = session();
  const g = s.game;
  assert.equal(PACK.version, 11);
  assert.equal(
    (
      await s.bus.execute("core.weather.set", {
        map: "LittlerootTown",
        weather: "rain",
        durationMs: 100,
      })
    ).ok,
    false,
  );
  assert(g.startClock(8, 0).ok);
  assert(
    (
      await s.bus.execute("core.weather.set", {
        map: "LittlerootTown",
        weather: "thunderstorm",
        durationMs: 100,
      })
    ).ok,
  );
  const q = await s.bus.execute("core.query", {});
  assert.equal(q.weather.kind, "thunderstorm");
  g.save();
  const exported = g.exportDocument();
  assert(validateSave(exported.state, g.db, g.catalog, s.host));
  const savedWeather = structuredClone(g.state.weather);
  const other = session([], s.records);
  assert.deepEqual(other.game.state.weather, savedWeather);
  const invalid = structuredClone(exported);
  delete invalid.state.weather;
  assert.throws(() => g.loadDocument(invalid), /Invalid save/);
  const old = { ...exported, version: PACK.version - 1 };
  assert.throws(() => g.loadDocument(old), /Invalid save/);
  s.wall(100);
  g.tick(s.frame(100));
  assert.equal(g.weatherView().kind, "clear");
  assert(
    (
      await s.bus.execute("core.weather.set", {
        map: "LittlerootTown",
        weather: "sand",
      })
    ).ok,
  );
  const before = structuredClone(g.state);
  await assert.rejects(
    s.bus.execute("core.weather.set", { map: "missing", weather: "rain" }),
    /Unknown weather map/,
  );
  assert.deepEqual(g.state, before);
  assert(g.enter({ map: "Route101", x: 8, y: 1, dir: "up" }));
  assert.equal(g.weatherView().kind, "clear");
});
test("Plugins register weather, combat policy and drawing without editing core; missing permissions deny commands", async () => {
  let api,
    observer,
    drawn = 0;
  const plugin = {
    id: "storm",
    version: "1.0.0",
    apiVersion: 1,
    dataVersion: 1,
    permissions: ["weather"],
    setup(p) {
      api = p;
      p.presentation.effect("mist", {
        draw(ctx, frame) {
          assert(Object.isFrozen(frame));
          drawn++;
          ctx.fillRect(0, 0, frame.width, frame.height);
        },
      });
      p.content.register("battleWeather", "smog", {
        visual: "storm:mist",
        residual: { divisor: 16, immuneTypes: ["poison"] },
      });
      p.content.register("weather", "smog", {
        label: "毒雾",
        visual: "storm:mist",
        battle: "storm:smog",
      });
    },
  };
  const s = session([
    plugin,
    {
      id: "observer",
      version: "1.0.0",
      apiVersion: 1,
      dataVersion: 1,
      permissions: [],
      setup(p) {
        observer = p;
      },
    },
  ]);
  const result = await api.commands.dispatch("core.weather.set", {
    map: "LittlerootTown",
    weather: "storm:smog",
  });
  assert(result.ok);
  const q = api.query();
  assert(Object.isFrozen(q.weather));
  assert.throws(() => (q.weather.kind = "rain"), TypeError);
  const presentation = createEmeraldPresentation({ host: s.host });
  drawWeather(canvas(), q.weather.visual, 0, { registry: presentation });
  assert.equal(drawn, 1);
  s.game.save();
  assert(s.game.state.contentDependencies.includes("storm"));
  const before = structuredClone(s.game.state.weather);
  await assert.rejects(
    observer.commands.dispatch("core.weather.clear", { map: "LittlerootTown" }),
    /permission/i,
  );
  assert.deepEqual(s.game.state.weather, before);
  const bad = {
    ...plugin,
    id: "bad",
    setup(p) {
      p.content.register("weather", "broken", {
        label: "x",
        visual: "bad:missing",
      });
    },
  };
  assert.throws(
    () => createEmeraldPlugins(base, [bad]),
    /Invalid weather definition/,
  );
});
test("Saved RTC days advance weather stages once after offline restore while active selections remain stable", () => {
  const s = session();
  const g = s.game;
  g.startClock(23, 59);
  assert(g.setWeather("LittlerootTown", "route119").ok);
  g.save();
  const restored = session([], s.records, 220000);
  restored.game.tick(restored.frame(1));
  assert.equal(restored.game.weatherView().day, 1);
  assert.equal(restored.game.weatherView().kind, "clear");
  restored.game.tick(restored.frame(1));
  assert.equal(restored.game.weatherView().day, 1);
  assert(restored.game.enter({ ...restored.game.state.position }));
  assert.equal(restored.game.weatherView().kind, "rain");
});
test("Story weather validates the full sequence before writing, resets on entry, and conflicts in parallel tracks", async () => {
  const s = session(),
    g = s.game;
  const before = structuredClone(g.state.weather);
  await assert.rejects(
    g.runStory([
      { type: "weather", weather: "rain" },
      { type: "weather", weather: "typo" },
    ]),
    /Unknown weather/,
  );
  assert.deepEqual(g.state.weather, before);
  await g.runStory([{ type: "weather", weather: "rain" }]);
  assert.equal(g.weatherView().source, "script");
  assert.equal(g.weatherView().kind, "rain");
  assert(g.enter({ ...g.state.position }));
  assert.equal(g.weatherView().kind, "clear");
  await assert.rejects(
    g.runStory([
      {
        type: "parallel",
        commands: [
          { type: "weather", weather: "rain" },
          { type: "weather", weather: "sand" },
        ],
      },
    ]),
    /Parallel story conflict/,
  );
  const q = await s.bus.execute("core.weather.query", { map: "Route101" });
  assert.equal(q.map, "Route101");
  assert(Object.isFrozen(q));
});
test("Weather intents join transactions, roll back a partial change and emit no rolled-back weather facts", async () => {
  let api;
  const facts = [];
  const plugin = {
    id: "storm",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: ["weather"],
    setup(p) {
      api = p;
      p.events.on("core:weather-changed", (event) => facts.push(event));
      p.actions.register("fail", {
        label: "失败天气",
        schema: {
          type: "object",
          properties: {},
          required: [],
          additionalProperties: false,
        },
        run(ctx) {
          ctx.intent({
            kind: "weather",
            map: "LittlerootTown",
            weather: "rain",
          });
          ctx.intent({ kind: "weather", map: "missing", weather: "sand" });
        },
      });
      p.actions.register("set", {
        label: "雨天",
        schema: {
          type: "object",
          properties: {},
          required: [],
          additionalProperties: false,
        },
        run(ctx) {
          ctx.intent({
            kind: "weather",
            map: "LittlerootTown",
            weather: "rain",
          });
        },
      });
    },
  };
  const s = session([plugin]),
    g = s.game;
  const before = structuredClone(g.state.weather);
  let writes = 0;
  const owner = g.applications.weather,
    original = owner.setWeather.bind(owner);
  owner.setWeather = (...args) => {
    const result = original(...args);
    if (result.ok) writes++;
    return result;
  };
  await assert.rejects(s.bus.execute("storm:fail", {}), /Unknown weather map/);
  assert.equal(writes, 1);
  assert.deepEqual(g.state.weather, before);
  g.tick(s.frame(1));
  assert.equal(facts.length, 0);
  assert((await api.commands.dispatch("storm:set", {})).ok);
  assert.equal(g.weatherView().kind, "rain");
  g.tick(s.frame(1));
  assert.equal(facts.length, 1);
});
test("Field weather crosses the real battle application boundary and combat changes cannot rewrite the field", async () => {
  const s = session(),
    g = s.game;
  assert(g.setWeather("LittlerootTown", "thunderstorm").ok);
  const enemy = createMonster("zigzagoon", 10, g.db, g.rng);
  enemy.ability = "pickup";
  assert(await g.startBattle(enemy, { trainer: true }));
  assert.equal(g.battle.weather.kind, "rain");
  assert.equal(g.battle.weather.turns, null);
  TRAIT_OPERATIONS.setWeather(
    { battle: g.battle, emit: (...args) => g.battle.emit(...args) },
    { weather: "sun", turns: 5 },
  );
  assert.equal(g.battle.weather.kind, "sun");
  assert.equal(g.weatherView().kind, "thunderstorm");
});
test("Foreground abnormal phases pause across battle/hidden gaps and survive a current-schema reload", () => {
  const s = session(),
    g = s.game;
  g.setWeather("LittlerootTown", "abnormal");
  const phase = GEN3_WORLD_WEATHER.abnormal.periodMs;
  g.tick(0);
  g.tick(phase);
  assert.equal(g.weatherView().kind, "drought");
  g.combat.battle = {};
  g.tick(phase + 100);
  g.combat.battle = null;
  g.tick(phase + 100000);
  assert.equal(g.weatherView().kind, "drought");
  g.applications.weather.tick(phase + 100001, false);
  g.applications.weather.tick(phase + 200000, true);
  assert.equal(g.weatherView().kind, "drought");
  g.save();
  const restored = session([], s.records);
  assert.equal(restored.game.weatherView().kind, "drought");
  assert.equal(
    restored.game.state.weather.active.elapsedMs,
    g.state.weather.active.elapsedMs,
  );
});
test("Field renderer uses the actual map key and registered indoor weather, without altering domain state", () => {
  const alias = "storm:room",
    map = { ...base.maps.LittlerootTown_ProfessorBirchsLab, indoor: true },
    db = { ...base, maps: { [alias]: map } };
  const ctx = canvas(),
    seen = [];
  let drawn = 0;
  const presentation = new PresentationRegistry()
    .effect("storm:mist", () => {
      drawn++;
    })
    .seal();
  const renderer = new Renderer(
    { getContext: () => ctx },
    db,
    {},
    {
      presentation,
      environment: (m, now, id) => {
        seen.push(id);
        return { weather: "storm:mist", hour: 12 };
      },
    },
  );
  renderer.grid = () => {};
  renderer.drawMap = () => {};
  renderer.actor = () => {};
  const w = {
    position: { map: alias, x: 6, y: 12, dir: "down" },
    map,
    maps: db.maps,
  };
  const before = structuredClone(w);
  renderer.world(w, { view: () => [] }, 0);
  renderer.world(w, { view: () => [] }, 600);
  assert.deepEqual(seen, [alias, alias]);
  assert.equal(drawn, 1);
  assert.deepEqual(w, before);
});
