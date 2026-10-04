import test from "node:test";
import assert from "node:assert/strict";
import { loadPluginCatalog } from "../dist/adapters/plugin-loader.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { loadContentSync } from "../tools/content-io.mjs";
const url = new URL("../dist/plugins/catalog.json", import.meta.url);
const content = loadContentSync();
const fixtureCatalog = {
  version: 1,
  plugins: [
    { id: "fixture-form", module: "../../tests/fixtures/extensions/form.js", export: "formFixture", enabled: true },
    { id: "fixture-augment", module: "../../tests/fixtures/extensions/augment.js", export: "augmentFixture", enabled: false },
    { id: "fixture-field", module: "../../tests/fixtures/extensions/field.js", export: "createFieldFixture", enabled: false,
      environment: "test", flag: "scenario", arguments: ["content:maps.LittlerootTown_ProfessorBirchsLab"] },
  ],
};
const loadFixtures = options => loadPluginCatalog({ url, content, readJSON: () => fixtureCatalog, ...options });
test("Empty production catalog starts without importing any optional plugin code", async () => {
  const plugins = await loadPluginCatalog({ url, readJSON: () => ({ version: 1, plugins: [] }), content,
    importModule: () => { throw new Error("Empty catalog must not import code"); } });
  assert.deepEqual(plugins, []);
  const { host } = createEmeraldPlugins(content, plugins);
  assert.equal(host.manifests.size, 0);
});
test("Test-only catalog entries require an explicit test environment and remain isolated", async () => {
  const parameters = new URLSearchParams("scenario=1");
  await assert.rejects(loadFixtures({ parameters }), /requires test environment/);
  const plugins = await loadFixtures({ parameters, environment: "test" });
  const { db } = createEmeraldPlugins(content, plugins);
  assert(db.maps["fixture-field:room"]);
  assert(db.maps.LittlerootTown.warps.every(warp => !warp.dest_map.startsWith("fixture-")));
});
test("Explicit enable/disable uses supplied catalog entries rather than fixed business plugins", async () => {
  const plugins = await loadFixtures({ parameters: new URLSearchParams("plugins=fixture-augment&disable-plugins=fixture-form") });
  assert.deepEqual(plugins.map(p => p.id), ["fixture-augment"]);
  const { catalog } = createEmeraldPlugins(content, plugins);
  assert(catalog.battleAugments["fixture-augment:burst"]);
  await assert.rejects(loadFixtures({ parameters: new URLSearchParams("plugins=typo") }), /Unknown catalog plugin/);
});
test("Dependency errors fail before importing code; enabled dependencies load in order", async () => {
  const descriptor = (id, requires = []) => ({ id, module: "./" + id + ".js", export: "plugin", enabled: true, requires });
  const calls = [];
  const importModule = async location => {
    const id = location.pathname.split("/").at(-1).replace(".js", "");
    calls.push(id);
    return { plugin: { id } };
  };
  const run = plugins => loadPluginCatalog({ url, content, readJSON: () => ({ version: 1, plugins }), importModule });
  await assert.rejects(run([descriptor("a", ["b"])]), /needs enabled b/);
  await assert.rejects(run([descriptor("a", ["b"]), descriptor("b", ["a"])]), /cycle/);
  assert.equal(calls.length, 0);
  assert.deepEqual((await run([descriptor("a", ["b"]), descriptor("b")])).map(p => p.id), ["b", "a"]);
});
