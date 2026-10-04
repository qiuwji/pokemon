import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadPluginCatalog } from "../dist/adapters/plugin-loader.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { loadContentSync } from "../tools/content-io.mjs";
const url = new URL("../dist/plugins/catalog.json", import.meta.url);
const readJSON = (location) => JSON.parse(fs.readFileSync(location));
const content = loadContentSync();
test("Default data catalog composes actual plugins without loading scenario rewards or fixture maps", async () => {
  const plugins = await loadPluginCatalog({ url, readJSON, content });
  assert.deepEqual(
    plugins.map((plugin) => plugin.id),
    ["companion-care", "facility-games", "field-journal"],
  );
  const { db, host } = createEmeraldPlugins(content, plugins);
  assert(!Object.keys(db.maps).some((id) => id.includes("e2e")));
  assert(!host.actions.has("e2e-support:unlock"));
});
test("Explicit test environment loads isolated fixture maps through real registration", async () => {
  const parameters = new URLSearchParams("e2e=1");
  await assert.rejects(
    loadPluginCatalog({ url, readJSON, content, parameters }),
    /requires test environment/,
  );
  const plugins = await loadPluginCatalog({
    url,
    readJSON,
    content,
    parameters,
    environment: "test",
  });
  const { db } = createEmeraldPlugins(content, plugins);
  assert.equal(
    Object.keys(db.maps).filter((id) => id.startsWith("e2e-support:")).length,
    5,
  );
  assert(
    db.maps.LittlerootTown.warps.every(
      (warp) => !warp.dest_map.includes("e2e"),
    ),
  );
});
test("Additional enabled plugins and explicit disabling use the catalog without editing app.js", async () => {
  const parameters = new URLSearchParams(
    "plugins=integration-lab,canvas-gallery&disable-plugins=field-journal",
  );
  const plugins = await loadPluginCatalog({
    url,
    readJSON,
    content,
    parameters,
  });
  const { db } = createEmeraldPlugins(content, plugins);
  assert(db.maps["integration-lab:room"]);
  assert(!plugins.some((plugin) => plugin.id === "field-journal"));
  await assert.rejects(
    loadPluginCatalog({
      url,
      readJSON,
      content,
      parameters: new URLSearchParams("plugins=typo"),
    }),
    /Unknown catalog plugin/,
  );
});
test("Dependency errors fail before importing code; enabled dependencies load in order", async () => {
  const descriptor = (id, requires = []) => ({
    id,
    module: "./" + id + ".js",
    export: "plugin",
    enabled: true,
    requires,
  });
  const calls = [];
  const importModule = async (location) => {
    const id = location.pathname.split("/").at(-1).replace(".js", "");
    calls.push(id);
    return { plugin: { id } };
  };
  const run = (plugins) =>
    loadPluginCatalog({
      url,
      content,
      readJSON: () => ({ version: 1, plugins }),
      importModule,
    });
  await assert.rejects(run([descriptor("a", ["b"])]), /needs enabled b/);
  await assert.rejects(
    run([descriptor("a", ["b"]), descriptor("b", ["a"])]),
    /cycle/,
  );
  assert.equal(calls.length, 0);
  assert.deepEqual(
    (await run([descriptor("a", ["b"]), descriptor("b")])).map(
      (plugin) => plugin.id,
    ),
    ["b", "a"],
  );
});
