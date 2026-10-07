import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { patrolLab } from "../src/plugins/patrol-lab/index.js";
import { loadPluginCatalog } from "../src/adapters/plugin-loader.js";
import { validateLayout } from "../src/engine/extensions/ui-registry.js";
import { session } from "../tests/helpers/session.js";

const report = s => s.bus.executeSync("patrol-lab:report");
const action = (s, name) => s.bus.execute(`patrol-lab:${name}`, {}, "plugin");
const at = async (s, time) => {
  await s.game.timeline.wait(time - s.game.timeline.now());
  s.game.tick(time, Object.keys(s.db.maps));
};
const start = async s => { await action(s, "start"); s.game.field.npcs.objects(s.game.state.position.map); };
const walk = async (s, direction) => {
  const from = { ...s.game.state.position };
  assert(await s.bus.execute("core.field.move", { direction }));
  await at(s, s.game.timeline.now() + 160);
  await at(s, s.game.timeline.now() + 160);
  return from;
};
const page = s => {
  const entry = s.host.ui.inSlot("menu").find(e => e.owner === "patrol-lab");
  assert.equal(entry.label, "跟随伙伴");
  const layout = s.host.runtime.evaluate(s.host.ui.pages.get(entry.page).render, s.host.runtime.view("patrol-lab"));
  validateLayout(layout, { actions: s.host.actions, resources: s.catalog.resources, themes: s.host.ui.themes });
  return layout;
};

test("catalog and normal menu summon exactly one companion beside the player through an atomic actor intent", async () => {
  const url = new URL("../src/plugins/catalog.json", import.meta.url);
  const plugins = await loadPluginCatalog({ url, readJSON: location => JSON.parse(fs.readFileSync(location)) });
  const s = session(plugins);
  assert.equal(report(s).member, null);
  const button = page(s).children.find(c => c.kind === "row").children[0];
  await s.bus.execute(button.action, {}, "plugin");
  const member = report(s).member;
  assert.deepEqual([member.x, member.y], [10, 11]);
  assert.equal(Object.keys(s.game.actors.list()).length, 1);
  await action(s, "start");
  assert.equal(report(s).member.uid, member.uid);
  assert.equal(Object.keys(s.game.actors.list()).length, 1);
  page(s);
});

test("the companion follows completed player steps through turns, keeps one tile separation and uses real interpolated animation", async () => {
  const s = session([patrolLab]);
  await start(s);
  const uid = report(s).member.uid;
  await s.bus.execute("core.field.move", { direction: "right" });
  await at(s, 80);
  assert.deepEqual([report(s).member.x, report(s).member.y], [10, 11], "does not occupy a player source reservation");
  await at(s, 160);
  const mid = s.game.field.npcs.view("LittlerootTown", 240).find(n => n.id === uid);
  assert.equal(mid.py, 10.5 * 16);
  assert.equal(mid.actor, "Boy1");
  await at(s, 320);
  for (const direction of ["up", "left", "left", "down"]) {
    const from = await walk(s, direction);
    const member = report(s).member;
    assert.deepEqual([member.map, member.x, member.y], [from.map, from.x, from.y]);
    const player = s.game.state.position;
    assert.equal(Math.abs(member.x - player.x) + Math.abs(member.y - player.y), 1);
  }
  const moves = report(s).records.filter(r => r.phase === "settled");
  assert.deepEqual(moves.map(r => r.direction), ["up", "right", "up", "left", "left"]);
  assert.equal(report(s).queued, 0);
});

test("blocking the next breadcrumb makes the companion wait without crossing actors and resume when the tile is vacated", async () => {
  const s = session([patrolLab]);
  await start(s);
  await s.bus.execute("core.field.move", { direction: "right" });
  await s.game.timeline.wait(160);
  s.game.field.tick(160);
  const { actor: blocker } = await s.bus.execute("core.actor.spawn", {
    template: "patrol-lab:companion", position: { map: "LittlerootTown", x: 10, y: 10, dir: "up" },
  });
  await at(s, 160);
  assert.deepEqual([report(s).member.x, report(s).member.y], [10, 11]);
  assert.equal(report(s).records.at(-1).phase, "blocked");
  await s.bus.execute("core.actor.remove", { uid: blocker.uid });
  await at(s, 260);
  await at(s, 420);
  assert.deepEqual([report(s).member.x, report(s).member.y], [10, 10]);
});

test("menu pause freezes autonomous animation and explicit waiting/continue retain the same companion", async () => {
  const s = session([patrolLab]);
  await start(s);
  await s.bus.execute("core.field.move", { direction: "right" });
  await at(s, 160);
  const uid = report(s).member.uid;
  s.game.ui.blocked = true;
  await at(s, 1000);
  assert.equal(report(s).records.filter(r => r.phase === "settled").length, 0);
  await action(s, "pause");
  s.game.ui.blocked = false;
  await at(s, 1160);
  await walk(s, "up");
  assert.deepEqual([report(s).member.x, report(s).member.y], [10, 10]);
  assert(report(s).member.data.paused);
  await action(s, "start");
  await at(s, 3000);
  await at(s, 3160);
  assert.equal(report(s).member.uid, uid);
  assert.equal(report(s).member.data.paused, false);
  assert.equal(Math.abs(report(s).member.x - s.game.state.position.x) + Math.abs(report(s).member.y - s.game.state.position.y), 1);
});

test("a door-style map visit rejoins at a legal neighboring tile without changing identity", async () => {
  const s = session([patrolLab]);
  await start(s);
  const uid = report(s).member.uid;
  s.game.enter({ map: "OldaleTown_House1", x: 3, y: 6, dir: "up" });
  await s.settle();
  await new Promise(setImmediate);
  const member = report(s).member;
  assert.equal(member.uid, uid);
  assert.equal(member.map, s.game.state.position.map);
  assert.equal(Math.abs(member.x - 3) + Math.abs(member.y - 6), 1);
  assert.equal(Object.keys(s.game.actors.list()).length, 1);
});

test("actual saved storage restores a waiting companion; removal persists and observation buffers are not serialized", async () => {
  const s = session([patrolLab]);
  await start(s);
  await walk(s, "right");
  await action(s, "pause");
  const expected = report(s).member;
  assert.deepEqual(Object.keys(s.game.state.extensions["patrol-lab"].data), ["member"]);
  const loaded = session([patrolLab]);
  loaded.game.loadDocument(JSON.parse([...s.saved.values()][0]));
  assert.deepEqual(report(loaded).member, expected);
  assert.equal(report(loaded).queued, 0);
  assert.deepEqual(report(loaded).records, []);
  await action(loaded, "remove");
  assert.equal(report(loaded).member, null);
  assert.equal(Object.keys(loaded.game.actors.list()).length, 0);
  loaded.game.loadDocument(JSON.parse([...loaded.saved.values()][0]));
  assert.equal(report(loaded).member, null);
});

test("disabling the companion plugin permits continued native play and re-enabling restores its actor and memory", async () => {
  const s = session([patrolLab]);
  await start(s);
  await action(s, "pause");
  const expected = report(s).member;
  const off = session();
  off.game.loadDocument(JSON.parse([...s.saved.values()][0]));
  assert.equal(Object.keys(off.game.actors.list()).length, 0);
  assert(off.game.state.suspendedContent.records.length > 0);
  await off.bus.execute("core.field.move", { direction: "left" });
  await at(off, 160);
  assert(off.game.save());
  const enabled = session([patrolLab]);
  enabled.game.loadDocument(JSON.parse([...off.saved.values()][0]));
  assert.deepEqual(report(enabled).member, expected);
});


test("neighboring roads keep the companion on its breadcrumb route rather than rejoining by teleport", async () => {
  const s = session([patrolLab]);
  s.game.enter({ map: "LittlerootTown", x: 10, y: 0, dir: "up" });
  await start(s);
  const uid = report(s).member.uid;
  const origin = { ...report(s).member };
  await s.bus.execute("core.field.move", { direction: "up" });
  await new Promise(setImmediate);
  assert.deepEqual(report(s).member, origin, "the world visit cannot teleport before player motion is published");
  await at(s, 160);
  await at(s, 320);
  assert.equal(report(s).member.map, "LittlerootTown");
  await s.bus.execute("core.field.move", { direction: "up" });
  await at(s, 480);
  await at(s, 640);
  assert.equal(report(s).member.uid, uid);
  assert.deepEqual([report(s).member.map, report(s).member.x, report(s).member.y], ["Route101", 10, 19]);
  const crossing = report(s).records.find(r => r.phase === "settled" && r.from.map !== r.to.map);
  assert(crossing);
  assert.equal(crossing.from.map, "LittlerootTown");
  assert.equal(crossing.to.map, "Route101");
});
