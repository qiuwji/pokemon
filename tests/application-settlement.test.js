import test from "node:test";
import assert from "node:assert/strict";
import { BattleSession } from "../src/engine/battle-session.js";
import { changeMoney, settleMoney } from "../src/engine/currency.js";
import { session } from "./helpers/session.js";
import { InventoryApplication, INVENTORY_PORTS } from "../src/packs/emerald/application/inventory-application.js";
import { liveApplicationPorts } from "../src/packs/emerald/application/ports.js";
import { createMonster } from "../src/engine/model.js";

for (const phase of ["plan", "commit", "exit-before", "exit-after"]) {
  test(`Battle settlement ${phase} failure releases control and only committed results continue`, async () => {
    let recovered = 0, continued = 0, resets = 0;
    const fail = () => { throw new Error(phase); };
    const combat = new BattleSession({
      director: { busy: false, reset: () => resets++ },
      transitions: { busy: false, run: async (_id, commit) => {
        if (phase === "exit-before") fail();
        commit();
        if (phase === "exit-after") fail();
      } },
      onResult: () => {
        if (phase === "plan") fail();
        return {
          commit: () => { if (phase === "commit") fail(); },
          after: () => continued++,
        };
      },
      onFailure: () => recovered++,
    });
    combat.battle = { ended: true, act: () => [] };
    await assert.rejects(combat.act({}), new RegExp(phase));
    assert.equal(combat.battle, null);
    assert.equal(combat.pendingResult, null);
    assert.equal(combat.busy, false);
    assert.equal(resets, 1);
    assert.equal(continued, phase === "exit-after" ? 1 : 0);
    assert.equal(recovered, phase === "exit-after" ? 0 : 1);
    assert.equal(await combat.act({}), false);
  });
}

test("Failed application settlement restores currency, inventory, custody and RNG before releasing control", async () => {
  const s = session(), enemy = createMonster("zigzagoon", 2, s.db, s.game.rng);
  await s.game.startBattle(enemy);
  s.game.battle.finish("win");
  const before = structuredClone(s.game.state), seed = s.game.rng.snapshot();
  s.game.applications.battle.resultPlan = () => ({ commit: () => {
    s.game.state.money += 100;
    s.game.state.party.push(enemy);
    s.game.state.flags.partial = true;
    s.game.rng.int(100);
    throw new Error("receipt failed");
  } });
  await assert.rejects(s.bus.execute("core.battle.action", { kind: "run" }), /receipt failed/);
  assert.deepEqual(s.game.state, before);
  assert.deepEqual(s.game.rng.snapshot(), seed);
  assert.equal(s.game.battle, null);
  assert.equal(s.game.busy, false);
  assert.doesNotThrow(() => s.game.exportDocument());
});

test("Invalid flag commands fail whole-tree preflight before earlier rewards can mutate state", async () => {
  for (const [key, value] of [
    ["__proto__", true], ["constructor", true], ["prototype", true],
    ["", true], [null, true], ["unsafe", {}], ["unsafe", NaN],
    ["unsafe", Infinity], ["unsafe", undefined],
  ]) {
    const s = session(), before = structuredClone(s.game.state);
    await assert.rejects(s.game.runStory([
      { type: "reward", id: "preflight-reward", money: 25 },
      { type: "flag", key, value },
    ]), /Invalid story flag/);
    assert.deepEqual(s.game.state, before);
  }
});

test("Currency plans reject fractions, invalid balances and overflow without writing state", () => {
  const state = { money: 20 };
  for (const value of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => settleMoney(state, value));
    assert.equal(state.money, 20);
  }
  assert.throws(() => changeMoney(20, -0.5));
  assert.throws(() => changeMoney(-1, 1));
  assert.throws(() => changeMoney(Number.MAX_SAFE_INTEGER, 1));
  assert.throws(() => changeMoney(20, -21));
  assert.equal(changeMoney(20, -21, { clamp: true }), 0);
  settleMoney(state, changeMoney(state.money, -5));
  assert.equal(state.money, 15);
});

test("Shop rejects fractional and negative prices before granting an item or spending money", () => {
  const s = session(), original = s.game.applications.inventory;
  const items = { ...original.itemDefinitions, potion: { ...original.itemDefinitions.potion } };
  const inventory = new InventoryApplication(liveApplicationPorts(
    (name) => original[name], INVENTORY_PORTS, { itemDefinitions: items }));
  const before = structuredClone(s.game.state);
  for (const price of [-20, 0.5, Infinity]) {
    items.potion.price = price;
    assert.equal(inventory.buyItem("potion"), false);
    assert.deepEqual(s.game.state, before);
  }
});
