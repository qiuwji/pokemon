import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { session } from "../examples/helpers/session.js";
import { createMonster } from "../dist/engine/model.js";
import { createIntegrationLab } from "../dist/plugins/integration-lab.js";
import { createFieldJournal } from "../dist/plugins/field-journal.js";

const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const room = "integration-lab:room",
  lever = "integration-lab:lever";
const trainer = "integration-lab:researcher",
  prize = `trainer.${trainer}.prize`;

function fixture() {
  const s = session([createIntegrationLab(base.maps.LittlerootTown)]);
  const lead = createMonster("mudkip", 100, s.db, s.game.rng);
  // Test arrangement only: deterministic strong party, without replacing battle rules/results.
  lead.moves = [{ id: "aerial_ace", pp: s.db.moves.aerial_ace.pp }];
  s.game.state.party = [lead];
  const facts = [];
  s.host.events.on("core:device-fact", (e) => facts.push(e.payload));
  async function move(direction) {
    assert.equal(await s.bus.execute("core.field.move", { direction }), true);
    await s.game.timeline.wait(s.game.motion.duration + 1);
    s.game.tick(s.game.timeline.now());
    await s.settle();
  }
  async function interact() {
    await s.bus.execute("core.field.interact", {});
    await s.settle();
  }
  async function enter() {
    assert(s.game.enter({ map: "LittlerootTown", x: 10, y: 9, dir: "up" }));
    await move("up");
    assert.equal(s.game.state.position.map, room);
  }
  async function openGate() {
    await move("up");
    await move("left");
    await interact();
    assert.equal(s.game.state.devices.records[lever].open, true);
    await move("right");
    await move("up");
    await move("up");
  }
  return { ...s, lead, facts, move, interact, enter, openGate };
}

test("Upper-layer plugin composes real map travel, device, branch, trainer bench, once reward and a fresh saved session", async () => {
  const s = fixture(),
    money = s.game.state.money;
  await s.enter();
  // East guide reads the closed device through a registered scalar query.
  await s.move("right");
  await s.move("up");
  assert.equal(
    await s.bus.execute("core.field.move", { direction: "right" }),
    false,
  );
  await s.interact();
  assert.match(s.dialogs.at(-1).lines[0], /先面向/);
  await s.move("left");
  await s.move("left");
  await s.interact();
  assert.equal(s.facts.at(-1).kind, "gate-opened");
  assert.equal(s.game.state.devices.records[lever].open, true);
  await s.move("right");
  await s.move("right");
  assert.equal(
    await s.bus.execute("core.field.move", { direction: "right" }),
    false,
  );
  await s.interact();
  assert.match(s.dialogs.at(-1).lines[0], /通道已打开/);
  await s.move("left");
  await s.move("up");
  await s.move("up");
  await s.interact();
  assert.equal(
    s.game.state.story.variables["integration-lab.choice"],
    "challenge",
  );
  assert.equal(s.game.battle.trainerId, trainer);
  assert.equal(s.game.state.money, money);
  assert.equal(s.game.state.story.rewards.includes(prize), false);
  await s.bus.execute("core.battle.action", { kind: "move", index: 0 });
  assert.equal(s.game.battle.enemyParty.filter((m) => m.hp > 0).length, 1);
  assert.equal(s.game.state.money, money);
  await s.bus.execute("core.battle.action", { kind: "move", index: 0 });
  await s.settle();
  assert.equal(s.game.battle, null);
  assert.equal(s.game.state.money, money + 120);
  assert.equal(
    s.bus.executeSync("core.query", {}).bag["integration-lab:biscuit"],
    1,
  );
  await s.interact();
  assert.match(s.dialogs.at(-1).lines[0], /已经完成/);
  assert.equal(s.game.state.money, money + 120);
  assert.equal(s.game.state.story.rewards.filter((r) => r === prize).length, 1);
  const saved = s.game.exportDocument(),
    restored = fixture();
  restored.game.loadDocument(saved);
  assert.deepEqual(restored.game.state.position, s.game.state.position);
  assert.equal(restored.game.state.devices.records[lever].open, true);
  assert.equal(restored.game.state.party[0].uid, s.lead.uid);
  await restored.interact();
  assert.equal(restored.game.battle, null);
  assert.equal(restored.game.state.money, money + 120);
  assert.equal(
    restored.bus.executeSync("core.query", {}).bag["integration-lab:biscuit"],
    1,
  );
  await restored.move("down");
  await restored.move("down");
  await restored.move("down");
  await restored.move("down");
  assert.equal(restored.game.state.position.map, "LittlerootTown");
});

test("The author plugin rejects distant device use and can cancel challenge without rewards or battle", async () => {
  const s = fixture();
  await s.enter();
  const before = structuredClone(s.game.state.worldState);
  assert.equal(
    (await s.bus.execute("core.device.interact", { id: lever })).ok,
    false,
  );
  assert.deepEqual(s.game.state.worldState, before);
  assert.equal(s.game.state.devices.records[lever], undefined);
  await s.openGate();
  s.game.ui.choose = async () => "later";
  const money = s.game.state.money;
  await s.interact();
  assert.equal(s.game.battle, null);
  assert.equal(s.game.state.story.variables["integration-lab.choice"], "later");
  assert.equal(s.game.state.money, money);
  assert.equal(s.game.state.story.rewards.includes(prize), false);
  s.game.ui.choose = async () => "challenge";
  await s.interact();
  assert.equal(s.game.battle.trainerId, trainer);
});

test("Integration content coexists with the journal and its HUD consumes the actual public view shape", () => {
  const s = session([
    createIntegrationLab(base.maps.LittlerootTown),
    createFieldJournal(base.maps.LittlerootTown_ProfessorBirchsLab),
  ]);
  const hud = s.host.ui.hud.get("integration-lab:directions"),
    view = s.host.runtime.view("integration-lab");
  assert.equal(hud.when(view), false);
  assert(s.game.enter({ map: room, x: 2, y: 5, dir: "left" }));
  assert.equal(hud.when(view), true);
  assert.match(hud.render(view).text, /异色格/);
  assert.equal(
    s.bus.executeSync("core.device.interact", { id: lever }).ok,
    true,
  );
  assert.match(hud.render(view).text, /通道已打开/);
  assert(s.db.maps["field-journal:annex"]);
  assert.equal(s.db.maps.LittlerootTown.warps.at(-1).dest_map, room);
  assert.equal(
    s.db.maps.LittlerootTown_ProfessorBirchsLab.warps.at(-1).dest_map,
    "field-journal:annex",
  );
});
