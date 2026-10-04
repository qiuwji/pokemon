import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  FacilityRegistry,
  FacilitySession,
  emptyFacilities,
} from "../dist/engine/facilities.js";
import { objectSchema } from "../dist/engine/extensions/values.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { createEmeraldCommandFacade } from "../dist/packs/emerald/command-facade.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { createMonster, Random } from "../dist/engine/model.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { SceneGraph, GridMotion } from "../dist/engine/motion.js";
import { facilityFixture } from "./fixtures/extensions/facility.js";
import { validateSave } from "../dist/packs/emerald/pack.js";
const base = loadContentSync();
function fixture(plugins = [], storage = new Map()) {
  const { db, catalog, host } = createEmeraldPlugins(
      structuredClone(base),
      plugins,
    ),
    timeline = new Timeline({ now: () => 0, wait: async () => {} });
  const game = new EmeraldAdventure({
    db,
    catalog,
    plugins: host,
    timeline,
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(db.maps)),
    storage: {
      getItem: (id) => storage.get(id) || null,
      setItem: (id, value) => storage.set(id, value),
    },
    wallNow: () => 1000,
  });
  game.ui = {
    blocked: false,
    dialog: null,
    closeModal() {},
    say: async () => {},
    updateSide() {},
    resetBattleMenu() {},
    drawBattleHUD() {},
    announce() {},
    checkGrowth() {},
    showFacility() {},
    toast() {},
    extensions: { refresh() {} },
  };
  const { bus } = attachEmeraldExtensions(game, host);
  game.state.flags.rescued = true;
  const mon = createMonster("mudkip", 100, db, game.rng);
  mon.moves = [{ id: "aerial_ace", pp: db.moves.aerial_ace.pp }];
  game.state.party.push(mon);
  return { game, db, catalog, host, bus, storage, mon };
}
const stageState = objectSchema(
  {
    round: { type: "integer", minimum: 0, maximum: 3 },
    score: { type: "integer", minimum: 0 },
  },
  ["round", "score"],
);
function contestPlugin(permissions = ["facilities"], override = {}) {
  let api;
  return {
    get api() {
      return api;
    },
    id: "showcase",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions,
    setup(value) {
      api = value;
      const activity = api.content.register("facilityActivities", "appeals", {
        parameters: objectSchema(),
        state: stageState,
        initial: { round: 0, score: 0 },
        actions: {
          appeal: {
            label: "表演",
            schema: objectSchema(
              { strength: { type: "integer", minimum: 1, maximum: 5 } },
              ["strength"],
            ),
            draws: [10],
            decide(context) {
              assert(Object.isFrozen(context));
              assert(Object.isFrozen(context.world.party[0]));
              assert.throws(() => {
                context.world.party[0].hp = 0;
              }, TypeError);
              const data = {
                round: context.data.round + 1,
                score:
                  context.data.score +
                  context.input.strength +
                  context.rolls[0],
              };
              return {
                data,
                ...(data.round === 3
                  ? { pendingReward: { money: data.score } }
                  : {}),
              };
            },
            ...override,
          },
        },
      });
      api.content.register("facilities", "stage", {
        name: "表演框架示例",
        activity,
        parameters: {},
      });
    },
  };
}
test("Facility activity registration rejects missing references, asynchronous rules and invalid state schemas", async () => {
  assert.throws(
    () =>
      createEmeraldPlugins(structuredClone(base), [
        {
          id: "bad",
          apiVersion: 1,
          version: "1.0.0",
          dataVersion: 1,
          permissions: [],
          setup(api) {
            api.content.register("facilities", "missing", {
              name: "Missing",
              activity: "missing",
              parameters: {},
            });
          },
        },
      ]),
    /facility/i,
  );
  assert.throws(
    () =>
      createEmeraldPlugins(structuredClone(base), [
        contestPlugin([], { draws: [-1] }),
      ]),
    /facility action/i,
  );
  const p = contestPlugin(["facilities"], {
      decide: async () => ({ data: { round: 1, score: 0 } }),
    }),
    { game, bus } = fixture([p]);
  bus.executeSync("core.facility.enter", { id: "showcase:stage", team: [] });
  const before = game.facilityView(),
    seed = game.rng.snapshot();
  await assert.rejects(
    bus.execute("core.facility.action", {
      action: "appeal",
      input: JSON.stringify({ strength: 3 }),
    }),
    /synchronous|async/i,
  );
  assert.deepEqual(game.facilityView(), before);
  assert.equal(game.rng.snapshot(), seed);
});
test("Non-battle plugin activity controls independent appeal state, public inputs, reward and saved result", async () => {
  const plugin = contestPlugin(),
    { game, bus, host, db, catalog } = fixture([plugin]);
  const money = game.state.money;
  assert(
    (
      await plugin.api.commands.dispatch("core.facility.enter", {
        id: "showcase:stage",
        team: [],
      })
    ).ok,
  );
  for (let i = 0; i < 3; i++)
    assert(
      (
        await plugin.api.commands.dispatch("core.facility.action", {
          action: "appeal",
          input: JSON.stringify({ strength: 3 }),
        })
      ).ok,
    );
  assert.equal(game.battle, null);
  assert.equal(game.facilityView().active.phase, "reward");
  const score = game.facilityView().active.data.score;
  assert((await plugin.api.commands.dispatch("core.facility.claim")).ok);
  assert.equal(game.facilityActive, false);
  assert.equal(game.state.money, money + score);
  assert.equal(game.state.facilities.results[0].data.round, 3);
  assert.equal(game.state.facilities.results[0].outcome, "win");
  assert(game.exportDocument().state.contentDependencies.includes("showcase"));
  assert(validateSave(game.state, db, catalog, host));
  assert(Object.isFrozen(host.runtime.query().facilities));
  assert.equal(bus.executeSync("core.facility.claim").ok, false);
});
test("Two registered trainer rounds use isolated selected team, suppress normal prizes, and settle once", async () => {
  const { game, bus, mon } = fixture();
  mon.hp = 1;
  mon.heldItem = "oran_berry";
  game.inventory.apply(game.state.bag, [
    { kind: "add", item: "potion", count: 2 },
  ]);
  const party = structuredClone(game.state.party),
    bag = structuredClone(game.state.bag),
    position = structuredClone(game.state.position),
    money = game.state.money;
  assert(
    bus.executeSync("core.facility.enter", {
      id: "practice-series",
      team: [mon.uid],
    }).ok,
  );
  for (let round = 0; round < 2; round++) {
    assert((await bus.execute("core.facility.action", { action: "next" })).ok);
    assert.equal(game.battle.party[0].level, 20);
    assert.notEqual(game.battle.party[0], mon);
    assert.equal(
      game.battle.items.inventory.quantity(game.battle.bag, "potion"),
      0,
    );
    for (let action = 0; game.battle && action < 10; action++)
      await bus.execute("core.battle.action", { kind: "move", index: 0 });
    assert.equal(game.battle, null);
    assert.deepEqual(game.state.party, party);
    assert.deepEqual(game.state.bag, bag);
    assert.equal(game.state.money, money);
  }
  assert.equal(game.facilityView().active.phase, "reward");
  assert(bus.executeSync("core.facility.claim").ok);
  assert.equal(game.state.money, money + 240);
  assert.equal(game.itemQuantity("potion"), 3);
  assert.deepEqual(game.state.party, party);
  assert.deepEqual(game.state.position, position);
  assert(!game.state.story.rewards.some((id) => id.startsWith("trainer.")));
  assert.equal(game.state.facilities.results.length, 1);
  assert.equal(bus.executeSync("core.facility.claim").ok, false);
});
test("Facility admission and active-session boundaries reject party changes, field motion, saving and importing", async () => {
  const { game, bus, mon, storage } = fixture();
  const before = structuredClone(game.state);
  assert.equal(
    bus.executeSync("core.facility.enter", {
      id: "practice-series",
      team: ["missing"],
    }).ok,
    false,
  );
  assert.deepEqual(game.state, before);
  game.save();
  const saved = [...storage.values()][0],
    document = game.exportDocument();
  assert(
    bus.executeSync("core.facility.enter", {
      id: "practice-series",
      team: [mon.uid],
    }).ok,
  );
  assert.equal(game.canManageParty(), false);
  assert.equal(game.move("up"), false);
  assert.equal(
    game.handleFieldInput({
      direction: "up",
      secondary: false,
      running: false,
    }),
    false,
  );
  assert.equal(game.save(), false);
  assert.equal([...storage.values()][0], saved);
  assert.throws(() => game.exportDocument(), /退出设施/);
  assert.throws(() => game.loadDocument(document), /Invalid save/);
  assert.equal(game.reset(), false);
  await assert.rejects(
    bus.execute("core.battle.start", { trainerId: "youngster" }),
    { code: "busy" },
  );
  const movement = bus.executeSync("core.field.move", { direction: "up" });
  assert.equal(movement.status, "busy"); assert.equal(movement.reason, "facility");
  assert(bus.executeSync("core.facility.quit").ok);
  assert(game.canManageParty());
  assert.equal(game.facilityView().results[0].outcome, "quit");
});
test("Failed facility action restores RNG/economy/session; slot plugin runs without any combat", async () => {
  const { game, bus } = fixture([facilityFixture]);
  assert(
    bus.executeSync("core.facility.enter", {
      id: "fixture-facility:game-room",
      team: [],
    }).ok,
  );
  game.state.money = 0;
  const before = game.facilityView(),
    seed = game.rng.snapshot();
  await assert.rejects(
    bus.execute("core.facility.action", { action: "spin" }),
    /足够/,
  );
  assert.equal(game.rng.snapshot(), seed);
  assert.deepEqual(game.facilityView(), before);
  game.state.money = 200;
  const replica = new Random(game.rng.snapshot()),
    reels = [replica.int(6), replica.int(6), replica.int(6)],
    payout = reels.every((v) => v === reels[0]) ? 200 : 0;
  assert((await bus.execute("core.facility.action", { action: "spin" })).ok);
  assert.deepEqual(game.facilityView().active.data.reels, reels);
  assert.equal(game.state.money, 180 + payout);
  assert.equal(game.battle, null);
  assert.equal(game.facilityView().active.data.spins, 1);
  assert(bus.executeSync("core.facility.quit").ok);
});
test("Unauthorized plugin cannot drive facilities and invalid transitions leave state intact", async () => {
  const plugin = contestPlugin([]),
    { game } = fixture([plugin]);
  await assert.rejects(
    plugin.api.commands.dispatch("core.facility.enter", {
      id: "showcase:stage",
      team: [],
    }),
    /permission/,
  );
  assert.equal(game.facilityActive, false);
  const bad = contestPlugin(["facilities"], {
    decide: () => ({ data: { round: 99, score: 0 }, reward: { money: 1000 } }),
  });
  const other = fixture([bad]);
  other.bus.executeSync("core.facility.enter", {
    id: "showcase:stage",
    team: [],
  });
  const before = structuredClone(other.game.state),
    seed = other.game.rng.snapshot();
  await assert.rejects(
    other.bus.execute("core.facility.action", {
      action: "appeal",
      input: '{"strength":1}',
    }),
  );
  assert.deepEqual(other.game.state, before);
  assert.equal(other.game.rng.snapshot(), seed);
});
test("Facility transition stamps and battle tickets reject repeated or foreign results", () => {
  const activity = {
    parameters: objectSchema(),
    state: objectSchema(),
    initial: {},
    actions: {
      start: {
        label: "start",
        schema: objectSchema(),
        decide: () => ({ data: {}, battle: { trainerId: "dummy" } }),
      },
    },
    onBattle: () => ({ data: {}, outcome: "win" }),
  };
  const registry = new FacilityRegistry({
      activities: { simple: activity },
      definitions: {
        test: { name: "Test", activity: "simple", parameters: {} },
      },
      references: { trainers: { dummy: {} } },
    }),
    state = emptyFacilities(),
    session = new FacilitySession({ registry, state });
  session.enter("test", [], [], { flags: {} });
  const plan = session.prepareAction("start", {}, {}, []),
    stale = session.prepareAction("start", {}, {}, []),
    { ticket } = session.commit(plan);
  assert.throws(() => session.commit(plan), /Stale/);
  assert.throws(() => session.commit(stale), /Stale/);
  assert.throws(() => session.prepareResult({ ...ticket }, "win", {}), /Stale/);
  const result = session.prepareResult(ticket, "win", {});
  session.commit(result);
  assert.throws(() => session.prepareResult(ticket, "win", {}), /Stale/);
  assert.equal(state.results.length, 1);
});
test("Reward capacity rejection keeps an earned facility claim pending without partially awarding", async () => {
  const plugin = contestPlugin(["facilities"], {
      decide: () => ({
        data: { round: 3, score: 20 },
        pendingReward: { money: 100, items: { potion: 1 } },
      }),
    }),
    { game, bus } = fixture([plugin]);
  bus.executeSync("core.facility.enter", { id: "showcase:stage", team: [] });
  await bus.execute("core.facility.action", {
    action: "appeal",
    input: '{"strength":1}',
  });
  const pocket = game.inventory.registry.pocketOf("potion"),
    policy = game.inventory.registry.get(pocket);
  game.state.bag.pockets[pocket] = Array.from(
    { length: policy.capacity },
    () => ({ item: "potion", count: policy.stackLimit }),
  );
  const before = structuredClone(game.state),
    active = game.facilityView().active;
  assert.throws(() => bus.executeSync("core.facility.claim"), /口袋|装下/);
  assert.deepEqual(game.state, before);
  assert.deepEqual(game.facilityView().active, active);
  game.state.bag.pockets[pocket][0] = null;
  assert(bus.executeSync("core.facility.claim").ok);
  assert.equal(game.state.money, before.money + 100);
});
test("UI facade routes facilities through the shared bus and save validation rejects forged ledgers", async () => {
  const { game, bus, mon, db, catalog, host } = fixture();
  const uiGame = createEmeraldCommandFacade(game, bus);
  assert(uiGame.enterFacility("practice-series", [mon.uid]).ok);
  assert((await uiGame.facilityAction("next")).ok);
  assert.equal(uiGame.quitFacility().ok, false);
  const invalid = structuredClone(game.state);
  invalid.facilities.results.push({
    id: "facility.999",
    facility: "practice-series",
    outcome: "win",
    data: { round: 2 },
  });
  assert.equal(validateSave(invalid, db, catalog, host), false);
});

test("Presentation failure after a non-battle commit preserves its economy, progress and consumed RNG", async () => {
  const { game, bus } = fixture([facilityFixture]);
  bus.executeSync("core.facility.enter", {
    id: "fixture-facility:game-room",
    team: [],
  });
  const seed = game.rng.snapshot(),
    money = game.state.money;
  game.ui.updateSide = () => {
    throw new Error("UI unavailable");
  };
  await assert.rejects(
    bus.execute("core.facility.action", { action: "spin" }),
    /UI unavailable/,
  );
  assert.equal(game.facilityView().active.data.spins, 1);
  assert.notEqual(game.rng.snapshot(), seed);
  assert.equal(
    game.state.money,
    money - 20 + game.facilityView().active.data.payout,
  );
});
test("Losing an isolated facility battle releases the session without blackout, party damage or normal settlement", async () => {
  const defeat = {
    id: "defeat",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(api) {
      const trainer = api.content.register("trainers", "opponent", {
        name: "Opponent",
        script: "defeat:test",
        prize: 999,
        party: [{ species: "poochyena", level: 100, moves: ["aerial_ace"] }],
      });
      api.content.register("facilities", "series", {
        name: "Failure fixture",
        activity: "core:battle-sequence",
        team: { min: 1, max: 1 },
        parameters: { trainers: [trainer], money: 50 },
      });
    },
  };
  const { game, bus, db } = fixture([defeat]);
  const mon = createMonster("mudkip", 1, db, game.rng);
  mon.moves = [{ id: "splash", pp: db.moves.splash.pp }];
  game.state.party = [mon];
  const original = structuredClone(mon),
    position = structuredClone(game.state.position),
    money = game.state.money;
  bus.executeSync("core.facility.enter", {
    id: "defeat:series",
    team: [mon.uid],
  });
  await bus.execute("core.facility.action", { action: "next" });
  await bus.execute("core.battle.action", { kind: "move", index: 0 });
  assert.equal(game.battle, null);
  assert.equal(game.facilityActive, false);
  assert.equal(game.state.facilities.results[0].outcome, "loss");
  assert.deepEqual(mon, original);
  assert.deepEqual(game.state.position, position);
  assert.equal(game.state.money, money);
});
test("Completed activity results reload with their plugin, while a missing activity plugin protects the original save", async () => {
  const { game, bus, storage } = fixture([facilityFixture]);
  bus.executeSync("core.facility.enter", {
    id: "fixture-facility:game-room",
    team: [],
  });
  await bus.execute("core.facility.action", { action: "spin" });
  bus.executeSync("core.facility.quit");
  const saved = [...storage.values()][0];
  const restored = fixture([facilityFixture], storage).game;
  assert.equal(restored.facilityActive, false);
  assert.deepEqual(
    restored.state.facilities.results,
    game.state.facilities.results,
  );
  assert.equal(restored.state.money, game.state.money);
  const missing = fixture([], storage).game;
  assert.equal(missing.saveProtected, true);
  assert.match(missing.saveWarning, /fixture-facility/);
  missing.save();
  assert.equal([...storage.values()][0], saved);
});

test("Failed facility battle settlement releases its wait and permits quitting without writing a result", async () => {
  const { game, mon, bus } = fixture();
  assert(game.enterFacility("practice-series", [mon.uid]).ok);
  assert((await game.facilityAction("next")).ok);
  game.battle.finish("win");
  const facility = game.applications.facilities, before = structuredClone(game.state);
  const economy = facility.economy;
  facility.economy = () => { throw new Error("没有足够的游戏币"); };
  await assert.rejects(bus.execute("core.battle.action", { kind: "run" }), /游戏币/);
  assert.equal(game.battle, null);
  assert.equal(game.facilityView().active.phase, "ready");
  assert.deepEqual(game.state, before);
  facility.economy = economy;
  assert(game.quitFacility().ok);
  assert.doesNotThrow(() => game.exportDocument());
});
