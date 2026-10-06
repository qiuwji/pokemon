import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadPluginCatalog } from "../src/adapters/plugin-loader.js";
import { loadContentSync } from "../tools/content-io.mjs";
import { session } from "../tests/helpers/session.js";

test("Installed plugin catalog references existing modules and default startup composes its actual contents", async () => {
  const url = new URL("../src/plugins/catalog.json", import.meta.url);
  const readJSON = location => JSON.parse(fs.readFileSync(location));
  const catalog = readJSON(url);
  for (const entry of catalog.plugins)
    assert(fs.existsSync(new URL(entry.module, url)), `Missing plugin module: ${entry.id}`);
  const plugins = await loadPluginCatalog({ url, readJSON, content: loadContentSync() });
  const { game, host, bus } = session(plugins);
  assert.equal(host.manifests.size, plugins.length);
  assert.equal(game.battle, null);
  assert.equal(bus.executeSync("core.query").party[0].uid, game.state.party[0].uid);
  assert.doesNotThrow(() => game.exportDocument());
});
