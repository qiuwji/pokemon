import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "./helpers/session.js";
import { registerFacilityContent } from "../src/engine/extensions/facility-content.js";
const slots = { id: "slots", template: "reel-machine", name: "Configured reels", parameters: {
  stake: 10, reels: [["a","a"],["a","a"],["a","a"]], lines: [[0,0,0]],
  payouts: [{ pattern: ["a","a","a"], multiplier: 3 }],
} };
const contest = { id: "contest", template: "score-contest", name: "Configured contest", team: { min: 1, max: 1 }, parameters: {
  rounds: 2, appeals: [{ id: "pose", label: "Pose", points: 3 }, { id: "combo", label: "Combo", points: 2, comboFrom: ["pose"], comboBonus: 4, jam: 1 }],
  opponents: [{ name: "Rival", scores: [3,4] }], prizes: [{ rank: 1, reward: { money: 50, items: [{ id: "potion", count: 1 }] } }],
} };
const plugin = (...facilities) => manifest("content-fixture", api => registerFacilityContent(api, { version: 1, facilities }));

test("JSON contest compiles moves, combos, jam and ranking; final reward and saved result settle once", async () => {
  const { game, bus, mon } = session([plugin(contest)]);
  await new Promise(setImmediate);
  const money = game.state.money, party = structuredClone(game.state.party);
  assert(bus.executeSync("core.facility.enter", { id: "content-fixture:contest", team: [mon.uid] }).ok);
  for (const action of ["pose", "combo"]) assert((await bus.execute("core.facility.action", { action })).ok);
  assert.deepEqual(game.facilityView().active.data, { round: 2, score: 9, crowd: 0, last: "combo", opponents: [6], rank: 1 });
  assert.equal(game.state.money, money);
  assert(bus.executeSync("core.facility.claim", {}).ok);
  assert.equal(game.state.money, money + 50);
  assert.equal(game.itemQuantity("potion"), 1);
  assert.deepEqual(game.state.party, party);
  assert.equal(bus.executeSync("core.facility.claim", {}).ok, false);
  const saved = game.exportDocument();
  assert(saved.state.contentDependencies.includes("content-fixture"));
  game.loadDocument(saved);
  assert.equal(game.facilityView().results.at(-1).data.rank, 1);
});

test("JSON reels expose only legal controls, charge once, reject repeated stops and settle matching paylines", async () => {
  const { game, bus } = session([plugin(slots)]);
  await new Promise(setImmediate);
  const money = game.state.money;
  assert(bus.executeSync("core.facility.enter", { id: "content-fixture:slots", team: [] }).ok);
  assert.deepEqual(game.facilityView().actions.map(a => a.id), ["spin"]);
  assert((await bus.execute("core.facility.action", { action: "spin" })).ok);
  assert.equal(game.state.money, money - 10);
  assert.deepEqual(game.facilityView().actions.map(a => a.id), ["stop-1","stop-2","stop-3"]);
  const seed = game.rng.snapshot();
  await assert.rejects(bus.execute("core.facility.action", { action: "spin" }), /not available/);
  assert.equal(game.rng.snapshot(), seed);
  assert((await bus.execute("core.facility.action", { action: "stop-2" })).ok);
  await assert.rejects(bus.execute("core.facility.action", { action: "stop-2" }), /not available/);
  for (const action of ["stop-3", "stop-1"]) assert((await bus.execute("core.facility.action", { action })).ok);
  assert.equal(game.facilityView().active.data.winnings, 30);
  assert(bus.executeSync("core.facility.claim", {}).ok);
  assert.equal(game.state.money, money + 20);
  assert.equal(bus.executeSync("core.facility.claim", {}).ok, false);
});

test("Failed reel stake rolls back RNG/state; losing and quitting release the facility", async () => {
  const losing = structuredClone(slots);
  losing.parameters.reels = [["a","a"],["b","b"],["c","c"]];
  losing.parameters.payouts = [{ pattern: ["a","b","c"], multiplier: 3 }];
  losing.parameters.lines = [[1,1,1]];
  // A valid pattern may be unreachable because the stop windows differ.
  losing.parameters.reels = [["a","b"],["b","b"],["c","c"]];
  const { game, bus } = session([plugin(losing)]);
  await new Promise(setImmediate);
  game.state.money = 0;
  bus.executeSync("core.facility.enter", { id: "content-fixture:slots", team: [] });
  const view = game.facilityView(), seed = game.rng.snapshot();
  await assert.rejects(bus.execute("core.facility.action", { action: "spin" }), /足够/);
  assert.deepEqual(game.facilityView(), view); assert.equal(game.rng.snapshot(), seed);
  game.state.money = 100;
  assert((await bus.execute("core.facility.action", { action: "spin" })).ok);
  assert(bus.executeSync("core.facility.quit", {}).ok);
  assert.equal(game.facilityActive, false);
  assert.equal(game.state.money, 90, "quit does not refund a committed wager");
  game.rng.int = () => 0; // Inject deterministic host samples for the losing window.
  bus.executeSync("core.facility.enter", { id: "content-fixture:slots", team: [] });
  await bus.execute("core.facility.action", { action: "spin" });
  for (const action of ["stop-1","stop-2","stop-3"]) await bus.execute("core.facility.action", { action });
  assert.equal(game.facilityActive, false);
  assert.equal(game.facilityView().results.at(-1).outcome, "loss");
  assert.equal(game.state.money, 80);
});

test("Bad JSON templates, combo references, payout dimensions and trainer references fail at startup", () => {
  for (const mutate of [
    p => { p.template = "unknown"; },
    p => { p.parameters.lines = [[0]]; },
    p => { p.parameters.payouts[0].pattern = ["missing","a","a"]; },
    p => { p.parameters.stake = -1; },
  ]) { const invalid = structuredClone(slots); mutate(invalid); assert.throws(() => session([plugin(invalid)])); }
  const invalid = structuredClone(contest); invalid.parameters.appeals[1].comboFrom = ["unknown"];
  assert.throws(() => session([plugin(invalid)]), /references/);
  assert.throws(() => session([plugin({ id: "tower", template: "battle-sequence", name: "Tower", team: { min: 1,max: 3 }, parameters: { trainers: ["missing"], money: 0 } })]), /trainer/);
  assert.throws(() => session([plugin(slots,slots)]), /duplicate/);
});

test("Facility action availability executes under the plugin guard with deep frozen inputs", async () => {
  let api, writeRejected = false;
  const p = manifest("when-fixture", value => {
    api = value;
    const activity = api.content.register("facilityActivities", "ready", {
      parameters: objectSchema(), state: objectSchema({ phase: { type: "integer" } }, ["phase"]), initial: { phase: 0 },
      actions: { next: { label: "Next", schema: objectSchema(), when(c) {
        try { c.data.phase = 20; } catch { writeRejected = true; }
        assert.throws(() => api.events.emit("guard", {}), /rule evaluation|evaluation|emit/i);
        return c.data.phase === 0;
      }, decide: () => ({ data: { phase: 1 } }) } },
    });
    api.content.register("facilities", "hall", { name: "Guard", activity, parameters: {} });
  });
  const { game, bus } = session([p]); await new Promise(setImmediate);
  bus.executeSync("core.facility.enter", { id: "when-fixture:hall", team: [] });
  assert.equal(game.facilityView().actions.length, 1); assert(writeRejected);
  assert((await bus.execute("core.facility.action", { action: "next" })).ok);
  assert.equal(game.facilityView().actions.length, 0);
  await assert.rejects(bus.execute("core.facility.action", { action: "next" }), /not available/);
  assert(bus.executeSync("core.facility.quit", {}).ok);
});
