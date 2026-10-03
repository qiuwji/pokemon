import test from "node:test";
import assert from "node:assert/strict";
import { session, manifest } from "../examples/helpers/session.js";
import { battleBurst } from "../dist/plugins/battle-burst.js";
import { Battle } from "../dist/engine/battle.js";
import { createMonster } from "../dist/engine/model.js";
import { createEmeraldPresentation } from "../dist/packs/emerald/animations.js";

function extension(overrides = {}) {
  return manifest("augment-test", (api) => {
    api.content.register("battleAugments", "boost", {
      name: "增强",
      moves: ["aerial_ace"],
      select: () => "aerial_ace",
      limit: { scope: "controller", max: 1 },
      ...overrides,
    });
  });
}
async function setup(
  plugin = extension(),
  { doubles = false, rules = {} } = {},
) {
  const s = session([plugin]);
  s.game.inventory.apply(s.game.state.bag, [
    { kind: "add", item: "potion", count: 5 },
  ]);
  const ally = createMonster("mudkip", 10, s.db, s.game.rng);
  const foes = [0, 1].map(() =>
    createMonster("poochyena", 30, s.db, s.game.rng),
  );
  for (const mon of [s.mon, ally, ...foes])
    mon.moves = [{ id: "tackle", pp: 20 }];
  const b = new Battle({
    party: doubles ? [s.mon, ally] : [s.mon],
    enemyParty: doubles ? foes : foes.slice(0, 1),
    db: s.db,
    bag: s.game.state.bag,
    rng: s.game.rng,
    trainer: true,
    format: doubles ? "doubles" : "singles",
    items: s.game.items,
    augmentDefinitions: s.catalog.battleAugments,
    ai: (battle, seat) => ({ kind: "move", seat, index: 0 }),
    rules: {
      damage: () => ({ amount: 1, type: 1, critical: false }),
      ...rules,
    },
  });
  return { ...s, b, ally, foes };
}
test("Registered plugin augment uses public battle command, source PP, one controller use and registered presentation", async () => {
  const s = session([battleBurst]);
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  const b = s.game.battle,
    pp = s.mon.moves[0].pp;
  const choices = await s.bus.execute("core.battle.augments", { index: 0 });
  assert.equal(choices[0].id, "battle-burst:burst");
  await s.bus.execute("core.battle.action", {
    kind: "move",
    index: 0,
    augment: choices[0].id,
  });
  assert.equal(s.mon.moves[0].pp, pp - 1);
  assert.equal(b.augments.view()[0].count, 1);
  const event = b.events.find((e) => e.kind === "augment");
  assert.equal(event.sourceMoveId, "tackle");
  const registry = createEmeraldPresentation({ host: s.host });
  assert.equal(registry.eventAnimation(event).animation.duration, 320);
  assert.equal(
    b.events.find((e) => e.kind === "move").move.id,
    "battle-burst:burst",
  );
});
test("Unknown references, charge replacements and malformed limits/costs fail registration", () => {
  for (const patch of [
    { moves: ["missing"] },
    { moves: ["fly"] },
    { limit: { scope: "world", max: 1 } },
    { cost: { item: "missing" } },
    { cost: { pp: 0 } },
  ])
    assert.throws(() => session([extension(patch)]), /augment/i);
});
test("Choice reserves shared uses in doubles; cancellation releases without PP, cost or RNG", async () => {
  const { b, mon, game } = await setup(
    extension({ cost: { item: "potion", pp: 2 } }),
    { doubles: true },
  );
  const before = structuredClone(game.state.bag),
    seed = game.rng.snapshot();
  b.act({ kind: "move", index: 0, augment: "augment-test:boost" });
  assert.equal(mon.moves[0].pp, 20);
  assert.equal(b.augments.view().length, 0);
  assert(
    b
      .act({ kind: "move", index: 0, augment: "augment-test:boost" })
      .some((e) => e.kind === "invalid"),
  );
  b.act({ kind: "cancel" });
  assert.deepEqual(game.state.bag, before);
  assert.equal(game.rng.snapshot(), seed);
  assert.equal(b.augments.options(b.homeSeat, 0).length, 1);
});
test("Inventory fees share reservation with ordinary item actions in both directions", async () => {
  const { b, game } = await setup(
    extension({ cost: { item: "potion", count: 3 } }),
    { doubles: true },
  );
  const count = game.itemQuantity("potion");
  game.inventory.apply(game.state.bag, [
    { kind: "remove", item: "potion", count: count - 3 },
  ]);
  b.act({ kind: "move", index: 0, augment: "augment-test:boost" });
  assert(
    b
      .act({ kind: "item", item: "potion", index: 1 })
      .some((e) => e.kind === "invalid"),
  );
  b.act({ kind: "cancel" });
  b.player.hp--;
  b.act({ kind: "item", item: "potion", index: 0 });
  assert(
    b
      .act({ kind: "move", index: 0, augment: "augment-test:boost" })
      .some((e) => e.kind === "invalid"),
  );
});
test("A late rule fault rolls back source PP, payment, random stream and augment usage", async () => {
  const { b, mon, game } = await setup(
    extension({ cost: { item: "potion", pp: 2 } }),
  );
  const before = structuredClone(game.state.bag),
    seed = game.rng.snapshot();
  b.traits.run = (phase) => {
    if (phase === "after-action") throw new Error("injected after payment");
  };
  assert.throws(
    () => b.act({ kind: "move", index: 0, augment: "augment-test:boost" }),
    /injected/,
  );
  assert.equal(mon.moves[0].pp, 20);
  assert.equal(game.rng.snapshot(), seed);
  assert.deepEqual(game.state.bag, before);
  assert.equal(b.augments.view().length, 0);
  assert.equal(b.turn, 0);
});
test("Execution rechecks selected source/qualification; sleep never consumes augmentation", async () => {
  const { b, mon, ally } = await setup(
    extension({ requires: (c) => c.actor.hp === c.actor.stats.hp }),
    { doubles: true },
  );
  b.act({ kind: "move", index: 0, augment: "augment-test:boost" });
  mon.hp--;
  b.act({ kind: "move", index: 0 });
  assert.equal(b.augments.view().length, 0);
  assert.equal(mon.moves[0].pp, 20);
  mon.hp = mon.stats.hp;
  mon.status = "sleep";
  mon.sleep = 2;
  b.act({ kind: "move", index: 0, augment: "augment-test:boost" });
  b.act({ kind: "move", index: 0 });
  assert.equal(b.augments.view().length, 0);
  assert.equal(mon.moves[0].pp, 20);
  assert(ally.moves[0].pp < 20);
});
test("Replacement target mode governs validation and costs consume once even on protection", async () => {
  const { b, mon, game } = await setup(
    extension({ cost: { item: "potion", pp: 2 } }),
  );
  const count = game.itemQuantity("potion");
  b.conditions.get(b.awaySeat).protected = true;
  // Round start resets Protect; set it at the existing action hook instead.
  const run = b.traits.run.bind(b.traits);
  b.traits.run = (phase, c) => {
    if (phase === "action") b.conditions.get(b.awaySeat).protected = true;
    return run(phase, c);
  };
  b.act({ kind: "move", index: 0, augment: "augment-test:boost" });
  assert.equal(mon.moves[0].pp, 18);
  assert.equal(game.itemQuantity("potion"), count - 1);
  assert.equal(b.augments.view()[0].count, 1);
  assert.equal(b.augments.options(b.homeSeat, 0).length, 0);
});
test("Rule callbacks are frozen, synchronous and cannot select undeclared moves", async () => {
  for (const patch of [
    { select: async () => "aerial_ace" },
    { select: () => "tackle" },
    { requires: () => 1 },
    {
      requires: (c) => {
        c.actor.hp = 0;
        return true;
      },
    },
  ]) {
    const { b, mon, game } = await setup(extension(patch));
    const seed = game.rng.snapshot();
    assert.throws(() =>
      b.act({ kind: "move", index: 0, augment: "augment-test:boost" }),
    );
    assert.equal(mon.moves[0].pp, 20);
    assert.equal(game.rng.snapshot(), seed);
    assert.equal(b.turn, 0);
  }
});
test("Shared limit groups reject conflicting caps and count across different registered augments", async () => {
  const plugin = manifest("shared", (api) => {
    for (const id of ["one", "two"])
      api.content.register("battleAugments", id, {
        name: id,
        moves: ["aerial_ace"],
        select: () => "aerial_ace",
        limit: { scope: "alliance", key: "shared:energy", max: 1 },
      });
  });
  const { b } = await setup(plugin);
  b.act({ kind: "move", index: 0, augment: "shared:one" });
  assert.equal(b.augments.options(b.homeSeat, 0).length, 0);
  assert.equal(b.augments.view()[0].key, "shared:energy");
  const bad = manifest("bad-caps", (api) => {
    for (const max of [1, 2])
      api.content.register("battleAugments", "cap" + max, {
        name: "bad",
        moves: ["aerial_ace"],
        select: () => "aerial_ace",
        limit: { scope: "controller", key: "bad-caps:shared", max },
      });
  });
  assert.throws(() => session([bad]), /Conflicting shared/);
});
test("AI strategy receives valid augmented candidates and replacement priority orders the real turn", async () => {
  const plugin = manifest("priority", (api) => {
    const move = api.content.register("moves", "quick", {
      name: "Quick",
      effect: "hit",
      power: 20,
      accuracy: 0,
      pp: 1,
      priority: 3,
      type: "normal",
      chance: 0,
      target: "selected",
    });
    api.content.register("battleAugments", "quick", {
      name: "Quick",
      moves: [move],
      select: () => move,
    });
    api.content.register("battleStrategies", "burst", {
      decide: (view) => view.candidates.findIndex((a) => a.augment),
    });
  });
  const s = await setup(plugin);
  const { BattleStrategyRegistry } = await import(
    "../dist/engine/battle/strategy-registry.js"
  );
  const strategies = new BattleStrategyRegistry(s.catalog.battleStrategies);
  s.b.roster.owner(s.b.awaySeat).strategy = "priority:burst";
  s.b.ai = (b, seat) => strategies.decide(b, seat);
  const events = s.b.act({ kind: "move", index: 0 });
  assert.equal(events.find((e) => e.kind === "move").actorSeat, s.b.awaySeat);
  assert.equal(events.find((e) => e.kind === "move").move.id, "priority:quick");
  assert.equal(s.foes[0].moves[0].pp, 19);
});
test("Forged internal replacement fields cannot bypass source choice or augment eligibility", async () => {
  const { b, mon } = await setup();
  const events = b.act({
    kind: "move",
    index: 0,
    augmentedMove: "aerial_ace",
    sourceMoveId: "tackle",
    skipPP: true,
  });
  assert.equal(events.find((e) => e.kind === "move").move.id, "tackle");
  assert.equal(mon.moves[0].pp, 19);
});
test("Battle menu adapter forwards the registered augment instead of silently using the base move", async () => {
  const { createBattleInterface } = await import(
    "../dist/packs/emerald/battle-interface.js"
  );
  const s = session([battleBurst]);
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  const sent = [];
  let nodes = [],
    html = "";
  const root = {
    hidden: true,
    set innerHTML(value) {
      html = value;
      nodes = [...value.matchAll(/<button([^>]*)>/g)].map((match) => {
        const dataset = Object.fromEntries(
          [...match[1].matchAll(/data-([a-z]+)="([^"]*)"/g)].map((m) => [
            m[1],
            m[2],
          ]),
        );
        return {
          dataset,
          classList: { add() {} },
          click() {
            this.onclick?.();
          },
        };
      });
    },
    get innerHTML() {
      return html;
    },
    querySelectorAll(selector) {
      const match = selector.match(/^\[data-(\w+)\]$/);
      return match
        ? nodes.filter((n) => Object.hasOwn(n.dataset, match[1]))
        : nodes;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
  };
  const game = {
    db: s.db,
    battle: s.game.battle,
    busy: false,
    director: s.game.director,
    turn: (action) => sent.push(action),
  };
  const ui = createBattleInterface(game, {
    document: { getElementById: () => root },
    hpTrack: () => "",
    hpColor: () => "",
    escapeHTML: String,
    showParty() {},
    showBag() {},
  });
  ui.draw();
  root
    .querySelectorAll("[data-action]")
    .find((n) => n.dataset.action === "fight")
    .click();
  const choice = root
    .querySelectorAll("[data-move]")
    .find((n) => n.dataset.augment === "battle-burst:burst");
  assert(choice);
  choice.click();
  assert.equal(sent[0].augment, "battle-burst:burst");
  assert.equal(sent[0].index, 0);
});
test("Replacement self-target is validated without inheriting the source attack target", async () => {
  const { b, mon } = await setup(
    extension({ moves: ["recover"], select: () => "recover" }),
  );
  const rejected = b.act({
    kind: "move",
    index: 0,
    augment: "augment-test:boost",
    target: { kind: "seat", id: b.awaySeat },
  });
  assert(rejected.some((e) => e.kind === "invalid"));
  assert.equal(mon.moves[0].pp, 20);
  assert.equal(b.augments.view().length, 0);
  mon.hp -= 5;
  b.act({ kind: "move", index: 0, augment: "augment-test:boost" });
  assert.equal(b.augments.view()[0].count, 1);
  assert.equal(mon.moves[0].pp, 19);
});
