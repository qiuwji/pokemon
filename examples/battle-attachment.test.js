import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";

test("authoring: a registered battle attachment is chosen and applied before ordering", async () => {
  const plugin = manifest("stance-demo", (api) => {
    const form = api.content.register("forms", "stance", {
      species: "mudkip",
      name: "战术姿态",
      scope: "battle",
      baseStats: { spe: 200 },
      oncePerController: true,
      clearOn: ["leave", "faint"],
    });
    api.content.register("battleAttachments", "brace", {
      name: "战术姿态",
      commitPoint: "beforeOrder",
      limit: { scope: "controller", max: 1 },
      transition: { form },
    });
  });
  const s = session([plugin]);
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  const b = s.game.battle,
    mon = s.game.state.party[0];
  const choices = await s.bus.execute("core.battle.attachments", { index: 0 });
  assert.equal(choices[0].id, "stance-demo:brace");
  assert.equal(choices[0].commitPoint, "beforeOrder");
  await s.bus.execute("core.battle.action", {
    kind: "move",
    index: 0,
    attachments: [{ id: choices[0].id }],
  });
  assert.equal(b.attachments.view()[0].count, 1);
  assert.equal(b.forms.effective(mon).form, "stance-demo:stance");
  assert(b.events.some((e) => e.kind === "attachment"));
  const after = await s.bus.execute("core.battle.attachments", { index: 0 });
  assert.equal(after.length, 0);
});

test("authoring: two attachments and JSON parameters pass the public battle command", async () => {
  const plugin = manifest("multi-cmd", (api) => {
    api.content.register("battleAttachments", "focus", {
      name: "focus",
      commitPoint: "moveStart",
      parameters: objectSchema(
        { bonus: { type: "integer", minimum: 0, maximum: 100 } },
        ["bonus"],
      ),
      deriveMove: (c) => ({ power: (c.sourceMove?.power || 0) + c.parameters.bonus }),
    });
    api.content.register("battleAttachments", "ward", {
      name: "ward",
      commitPoint: "moveStart",
      modifiers: [{ phase: "damage-modifier", modify: (value) => value }],
    });
  });
  const s = session([plugin]);
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  const b = s.game.battle;
  await s.bus.execute("core.battle.action", {
    kind: "move",
    index: 0,
    attachments: [
      { id: "multi-cmd:focus", parameters: JSON.stringify({ bonus: 30 }) },
      { id: "multi-cmd:ward" },
    ],
  });
  const move = b.events.find((e) => e.kind === "move");
  assert.equal(move.move.power, b.db.moves.tackle.power + 30);
});

test("authoring: a derived move raises power while the source slot pays once", async () => {
  const plugin = manifest("surge-demo", (api) => {
    api.content.register("battleAttachments", "surge", {
      name: "蓄能",
      commitPoint: "moveStart",
      deriveMove: (c) => ({ power: (c.sourceMove?.power || 0) + 20 }),
    });
  });
  const s = session([plugin]);
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  const b = s.game.battle,
    mon = s.game.state.party[0],
    pp = mon.moves[0].pp;
  const choices = await s.bus.execute("core.battle.attachments", { index: 0 });
  assert.equal(choices[0].derives, true);
  await s.bus.execute("core.battle.action", {
    kind: "move",
    index: 0,
    attachments: [{ id: choices[0].id }],
  });
  const move = b.events.find((e) => e.kind === "move");
  assert.equal(move.move.power, b.db.moves.tackle.power + 20);
  assert.equal(move.move.id, "tackle");
  assert.equal(mon.moves[0].pp, pp - 1);
});
