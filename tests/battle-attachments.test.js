import test from "node:test";
import assert from "node:assert/strict";
import { session, manifest, objectSchema } from "./helpers/session.js";
import { attachmentFixture } from "./fixtures/extensions/attachment.js";
import { Battle } from "../src/engine/battle.js";
import { createMonster } from "../src/engine/model.js";

function extension(overrides = {}) {
  return manifest("attach-test", (api) => {
    const form = api.content.register("forms", "stance", {
      species: "mudkip",
      name: "测试姿态",
      scope: "battle",
      baseStats: { spe: 200 },
      clearOn: ["leave", "faint"],
    });
    api.content.register("battleAttachments", "brace", {
      name: "战术姿态",
      commitPoint: "beforeOrder",
      transition: { form },
      ...overrides,
    });
  });
}

async function setup(plugin = attachmentFixture, { doubles = false } = {}) {
  const s = session([plugin]);
  const ally = createMonster("mudkip", 10, s.db, s.game.rng);
  const foes = [0, 1].map(() => createMonster("poochyena", 30, s.db, s.game.rng));
  for (const mon of [s.mon, ally, ...foes]) mon.moves = [{ id: "tackle", pp: 20 }];
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
    attachmentDefinitions: s.catalog.battleAttachments,
    formDefinitions: s.catalog.forms,
    ai: (battle, seat) => ({ kind: "move", seat, index: 0 }),
    rules: { damage: () => ({ amount: 1, type: 1, critical: false }) },
  });
  return { ...s, b, ally, foes };
}

test("a beforeOrder attachment changes form, consumes one use and reorders the real turn", async () => {
  const { b, mon } = await setup();
  const options = b.attachments.options(b.homeSeat, 0);
  assert.equal(options.length, 1);
  assert.equal(options[0].id, "fixture-attachment:brace");
  assert.equal(options[0].commitPoint, "beforeOrder");
  const pp = mon.moves[0].pp;
  const events = b.act({
    kind: "move",
    index: 0,
    attachments: [{ id: "fixture-attachment:brace" }],
  });
  assert.equal(b.forms.effective(mon).form, "fixture-attachment:stance");
  assert.equal(b.attachments.view()[0].count, 1);
  assert(events.some((e) => e.kind === "form"));
  assert(events.some((e) => e.kind === "attachment"));
  assert.equal(b.turnOrder[0], b.homeSeat);
  assert.equal(mon.moves[0].pp, pp - 1);
  assert.equal(b.attachments.options(b.homeSeat, 0).length, 0);
});

test("without the attachment the default result is unchanged", async () => {
  const { b, mon } = await setup();
  b.act({ kind: "move", index: 0 });
  assert.equal(b.forms.effective(mon).form, undefined);
  assert.equal(b.attachments.view().length, 0);
  assert.equal(b.turnOrder[0], b.awaySeat);
});

test("cancel releases the attachment reservation without form, PP or quota changes", async () => {
  const { b, mon } = await setup(attachmentFixture, { doubles: true });
  b.act({ kind: "move", index: 0, attachments: [{ id: "fixture-attachment:brace" }] });
  assert.equal(mon.moves[0].pp, 20);
  assert.equal(b.forms.effective(mon).form, undefined);
  const invalid = b.act({
    kind: "move",
    index: 0,
    attachments: [{ id: "fixture-attachment:brace" }],
  });
  assert(invalid.some((e) => e.kind === "invalid"));
  b.act({ kind: "cancel" });
  assert.equal(b.attachments.view().length, 0);
  assert.equal(mon.moves[0].pp, 20);
  assert.equal(b.attachments.options(b.homeSeat, 0).length, 1);
});

test("mixing augment and attachments is rejected and bad references fail registration", async () => {
  const { b } = await setup();
  const events = b.act({
    kind: "move",
    index: 0,
    augment: "x",
    attachments: [{ id: "fixture-attachment:brace" }],
  });
  assert(events.some((e) => e.kind === "invalid"));
  for (const patch of [
    { commitPoint: "later" },
    { limit: { scope: "world", max: 1 } },
    { transition: { form: "missing" } },
    { unavailablePolicy: "explode" },
  ])
    assert.throws(() => session([extension(patch)]), /attachment/i);
});

test("a derived move overlays the effective move while paying source PP once", async () => {
  const plugin = manifest("derive-test", (api) => {
    api.content.register("battleAttachments", "surge", {
      name: "蓄能",
      commitPoint: "moveStart",
      deriveMove: (c) => ({ power: (c.sourceMove?.power || 0) + 25, priority: 5 }),
    });
  });
  const { b, mon } = await setup(plugin);
  const base = b.db.moves.tackle.power,
    pp = mon.moves[0].pp;
  const options = b.attachments.options(b.homeSeat, 0);
  assert.equal(options[0].derives, true);
  const events = b.act({
    kind: "move",
    index: 0,
    attachments: [{ id: "derive-test:surge" }],
  });
  const move = events.find((e) => e.kind === "move");
  assert.equal(move.move.power, base + 25);
  assert.equal(move.move.id, "tackle");
  assert.equal(mon.moves[0].pp, pp - 1);
  assert.equal(b.turnOrder[0], b.homeSeat);
});

test("out-of-range derivations and forged derived plans fail safely", async () => {
  for (const deriveMove of [
    () => ({ power: 999 }),
    () => ({ type: "missing" }),
    () => ({ target: "sideways" }),
    () => ({ priority: 20 }),
    () => ({ effect: "boom" }),
  ]) {
    const plugin = manifest("bad-derive", (api) =>
      api.content.register("battleAttachments", "bad", {
        name: "bad",
        commitPoint: "moveStart",
        deriveMove,
      }),
    );
    const { b, mon } = await setup(plugin);
    assert.throws(() =>
      b.act({ kind: "move", index: 0, attachments: [{ id: "bad-derive:bad" }] }),
    );
    assert.equal(mon.moves[0].pp, 20);
  }
  const { b, mon } = await setup();
  const events = b.act({
    kind: "move",
    index: 0,
    derivedMove: { power: 250 },
  });
  assert.equal(events.find((e) => e.kind === "move").move.id, "tackle");
  assert.notEqual(events.find((e) => e.kind === "move").move.power, 250);
  assert.equal(mon.moves[0].pp, 19);
});

test("a derived move may declare a physical/special category", async () => {
  const plugin = manifest("cat-test", (api) =>
    api.content.register("battleAttachments", "spec", {
      name: "spec",
      commitPoint: "moveStart",
      deriveMove: () => ({ category: "special" }),
    }),
  );
  const { b } = await setup(plugin);
  const prepared = b.attachments.prepare({
    seat: b.homeSeat,
    index: 0,
    attachments: [{ id: "cat-test:spec" }],
  });
  assert.equal(prepared.derivedMove.category, "special");
  assert.throws(
    () =>
      b.attachments.derive(
        { seat: b.homeSeat, index: 0 },
        { id: "cat-test:spec", parameters: {} },
        { deriveMove: () => ({ category: "status" }) },
      ),
    /category/,
  );
});

test("two attachments combine and parameterized derivation is validated", async () => {
  const plugin = manifest("multi-test", (api) => {
    const form = api.content.register("forms", "stance", {
      species: "mudkip",
      name: "姿态",
      scope: "battle",
      baseStats: { spe: 200 },
      clearOn: ["leave"],
    });
    api.content.register("battleAttachments", "stance", {
      name: "姿态",
      commitPoint: "beforeOrder",
      transition: { form },
    });
    api.content.register("battleAttachments", "focus", {
      name: "蓄能",
      commitPoint: "moveStart",
      parameters: objectSchema(
        { bonus: { type: "integer", minimum: 0, maximum: 100 } },
        ["bonus"],
      ),
      deriveMove: (c) => ({ power: (c.sourceMove?.power || 0) + c.parameters.bonus }),
    });
  });
  const { b } = await setup(plugin);
  const prepared = b.attachments.prepare({
    seat: b.homeSeat,
    index: 0,
    attachments: [
      { id: "multi-test:stance" },
      { id: "multi-test:focus", parameters: { bonus: 15 } },
    ],
  });
  assert.equal(prepared.attachments.length, 2);
  assert.equal(prepared.derivedMove.power, b.db.moves.tackle.power + 15);
  const twoTransitions = manifest("two-forms", (api) => {
    const form = api.content.register("forms", "f", {
      species: "mudkip",
      name: "f",
      scope: "battle",
    });
    for (const id of ["a", "b"])
      api.content.register("battleAttachments", id, {
        name: id,
        commitPoint: "beforeOrder",
        transition: { form },
      });
  });
  const other = await setup(twoTransitions);
  const rejected = other.b.act({
    kind: "move",
    index: 0,
    attachments: [{ id: "two-forms:a" }, { id: "two-forms:b" }],
  });
  assert(rejected.some((e) => e.kind === "invalid"));
});

test("an explicit limit key spends one shared pool across augment and attachment", async () => {
  const plugin = manifest("shared-quota", (api) => {
    api.content.register("battleAugments", "boost", {
      name: "b",
      moves: ["tackle"],
      select: () => "tackle",
      limit: { scope: "controller", key: "shared:energy", max: 1 },
    });
    api.content.register("battleAttachments", "brace", {
      name: "a",
      commitPoint: "moveStart",
      limit: { scope: "controller", key: "shared:energy", max: 1 },
    });
  });
  const { b } = await setup(plugin, { doubles: true });
  assert.equal(b.attachments.options(b.homeSeat, 0).length, 1);
  b.act({ kind: "move", index: 0, augment: "shared-quota:boost" });
  assert.equal(b.attachments.options(b.homeSeat, 0).length, 0);
  b.act({ kind: "cancel" });
  assert.equal(b.attachments.options(b.homeSeat, 0).length, 1);

  const conflicting = manifest("bad-shared", (api) => {
    api.content.register("battleAugments", "a", {
      name: "a",
      moves: ["tackle"],
      select: () => "tackle",
      limit: { scope: "controller", key: "dup:pool", max: 1 },
    });
    api.content.register("battleAttachments", "b", {
      name: "b",
      commitPoint: "moveStart",
      limit: { scope: "controller", key: "dup:pool", max: 2 },
    });
  });
  assert.throws(() => session([conflicting]), /Conflicting shared battle quota/);
});

function realBattle(s) {
  const mon = s.mon,
    foe = createMonster("poochyena", 30, s.db, s.game.rng);
  // Deterministic: the player is fast and cannot be KO'd before its modifier resolves.
  mon.stats.spe = 999;
  mon.stats.hp = 999;
  mon.hp = 999;
  mon.moves = [{ id: "tackle", pp: 20 }];
  foe.moves = [{ id: "tackle", pp: 20 }];
  const b = new Battle({
    party: [mon],
    enemyParty: [foe],
    db: s.db,
    bag: s.game.state.bag,
    rng: s.game.rng,
    trainer: true,
    items: s.game.items,
    attachmentDefinitions: s.catalog.battleAttachments,
    formDefinitions: s.catalog.forms,
    ai: (battle, seat) => ({ kind: "move", seat, index: 0 }),
    // Real damage formula stays, but pin accuracy so the assertion does not depend on a 95% roll.
    rules: { accuracy: () => true },
  });
  return { b, mon, foe };
}

test("an attachment modifier applies only during its own move resolution", async () => {
  const plugin = manifest("mod-test", (api) =>
    api.content.register("battleAttachments", "crush", {
      name: "crush",
      commitPoint: "moveStart",
      modifiers: [{ phase: "damage-modifier", modify: (value) => value + 100000 }],
    }),
  );
  const withMod = realBattle(session([plugin]));
  withMod.b.act({
    kind: "move",
    index: 0,
    seat: withMod.b.homeSeat,
    attachments: [{ id: "mod-test:crush" }],
  });
  assert.equal(withMod.b.enemy.hp, 0);

  const without = realBattle(session([plugin]));
  without.b.act({ kind: "move", index: 0, seat: without.b.homeSeat });
  assert(without.b.enemy.hp > 0);
});

test("an attachment can consume the source slot's PP while forged ppClear is dropped", async () => {
  const plugin = manifest("pp-test", (api) =>
    api.content.register("battleAttachments", "allin", {
      name: "allin",
      commitPoint: "moveStart",
      pp: "clear",
    }),
  );
  const { b, mon } = await setup(plugin);
  b.act({
    kind: "move",
    index: 0,
    seat: b.homeSeat,
    attachments: [{ id: "pp-test:allin" }],
  });
  assert.equal(mon.moves[0].pp, 0);

  const forged = await setup(plugin);
  forged.b.act({ kind: "move", index: 0, seat: forged.b.homeSeat, ppClear: true });
  assert.equal(forged.mon.moves[0].pp, 19);
  assert.throws(
    () => session([manifest("pp-bad", (api) => api.content.register("battleAttachments", "x", { name: "x", commitPoint: "moveStart", pp: "half" }))]),
    /attachment/i,
  );
});

test("a skipped derivation falls back to the base move", async () => {
  const plugin = manifest("skip-derive", (api) =>
    api.content.register("battleAttachments", "focus", {
      name: "focus",
      commitPoint: "moveStart",
      requires: (c) => c.actor.hp === c.actor.stats.hp,
      deriveMove: () => ({ power: 250 }),
    }),
  );
  const { b, mon } = await setup(plugin);
  const prepared = b.actions.prepare({
    kind: "move",
    index: 0,
    seat: b.homeSeat,
    attachments: [{ id: "skip-derive:focus" }],
  });
  assert.equal(prepared.derivedMove.power, 250);
  mon.hp--;
  const outcome = b.attachments.applyPoint(prepared, "moveStart");
  assert.equal(outcome.skipped, true);
  assert.equal(prepared.derivedMove, null);
});

test("candidate discovery does not fail on required parameters", async () => {
  const plugin = manifest("param-opt", (api) =>
    api.content.register("battleAttachments", "focus", {
      name: "focus",
      commitPoint: "moveStart",
      parameters: objectSchema({ bonus: { type: "integer", minimum: 0, maximum: 100 } }, ["bonus"]),
      deriveMove: (c) => ({ power: (c.sourceMove?.power || 0) + c.parameters.bonus }),
    }),
  );
  const { b } = await setup(plugin);
  const options = b.attachments.options(b.homeSeat, 0);
  assert.equal(options.length, 1);
  assert(options[0].parameters);
});

test("state rollback restores form records and the attachment ledger", async () => {
  const { b, mon } = await setup();
  b.traits.run = (phase) => {
    if (phase === "after-action") throw new Error("injected after commit");
  };
  assert.throws(
    () =>
      b.act({
        kind: "move",
        index: 0,
        attachments: [{ id: "fixture-attachment:brace" }],
      }),
    /injected/,
  );
  assert.equal(b.forms.effective(mon).form, undefined);
  assert.equal(b.attachments.view().length, 0);
  assert.equal(mon.moves[0].pp, 20);
});
