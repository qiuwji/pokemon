import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { session } from "../tests/helpers/session.js";
import { createFacilityContent } from "../dist/plugins/facility-content/index.js";
import { loadPluginCatalog } from "../dist/adapters/plugin-loader.js";
test("JSON-only facility plugin loads through the catalog and runs all three authored templates", async () => {
  const url = new URL("../dist/plugins/catalog.json", import.meta.url);
  const pack = JSON.parse(fs.readFileSync(new URL("../dist/plugins/facility-content/content.json", import.meta.url)));
  const plugins = await loadPluginCatalog({ url, parameters: new URLSearchParams("plugins=facility-content&disable-plugins=ai-control,emerald-audio"),
    readJSON: location => JSON.parse(fs.readFileSync(location)) });
  assert.deepEqual(plugins.map(p => p.id), ["facility-content"]);
  assert.equal(createFacilityContent(pack).id, plugins[0].id);
  const { game, bus, mon } = session(plugins); await new Promise(setImmediate);
  mon.level = 100; mon.hp = mon.stats.hp;
  for (const id of ["contest","slots","tower"]) {
    assert(bus.executeSync("core.facility.enter", { id: "facility-content:" + id, team: id === "slots" ? [] : [mon.uid] }).ok);
    const actions = id === "contest" ? ["charm","finish","charm"] : id === "slots" ? ["spin","stop-1","stop-2","stop-3"] : ["next","next"];
    for (const action of actions) {
      assert((await bus.execute("core.facility.action", { action })).ok);
      for (let turn = 0; game.battle && turn < 50; turn++) await bus.execute("core.battle.action", { kind: "move", index: 0 });
      assert.equal(game.battle, null);
    }
    if (game.facilityActive) assert(bus.executeSync("core.facility.claim", {}).ok);
    assert.equal(game.facilityActive, false);
  }
  assert.equal(game.facilityView().results.length, 3);
});
