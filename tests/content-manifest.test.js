import { assertContentAssets } from "../tools/check-content-assets.mjs";
import { validateContentReferences } from "../src/engine/content-references.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { CONTENT_MANIFEST, loadContentSync } from "../tools/content-io.mjs";
import {
  contentFiles,
  contentFileURL,
  assembleContent,
} from "../src/engine/content-manifest.js";
import { loadContent } from "../src/adapters/content-loader.js";
const manifest = JSON.parse(fs.readFileSync(CONTENT_MANIFEST));
const values = () =>
  manifest.files.map((entry) =>
    JSON.parse(fs.readFileSync(contentFileURL(entry, CONTENT_MANIFEST))),
  );
test("Browser and Node assemble the same production pack from readable metadata and generated grids", async () => {
  const readJSON = (url) => JSON.parse(fs.readFileSync(url));
  const db = await loadContent(CONTENT_MANIFEST, { readJSON });
  assert.deepEqual(db, loadContentSync());
  // The reference opening map InsideOfTruck joins the imported set.
  assert.deepEqual(Object.keys(db.maps).sort(), [...new Set(manifest.files.filter(f => f.section === "maps").map(f => f.key))].sort());
  assert(Object.keys(db.maps).every((id) => !id.startsWith("E2E")));
  assert(
    db.maps.LittlerootTown.warps.every((w) => !w.dest_map.startsWith("E2E")),
  );
  const rows = manifest.files.filter(
    (entry) => entry.section === "maps" && entry.key === "LittlerootTown",
  );
  assert.equal(rows.length, 2);
  assert.equal(rows.filter((row) => row.generated).length, 1);
  assert.equal(
    db.maps.LittlerootTown.blocks.length,
    db.maps.LittlerootTown.width * db.maps.LittlerootTown.height,
  );
});
test("Content deployment prefixes are preserved and file failures identify the failing fragment", async () => {
  const url = new URL(
    "https://example.test/games/emerald/src/content/manifest.json",
  );
  const data = new Map(
    manifest.files.map((entry, i) => [
      contentFileURL(entry, url).href,
      values()[i],
    ]),
  );
  const seen = [];
  const readJSON = async (location) => {
    seen.push(location.href);
    return location.href === url.href ? manifest : data.get(location.href);
  };
  assert.deepEqual(await loadContent(url, { readJSON }), loadContentSync());
  assert(
    seen.every((location) =>
      location.startsWith("https://example.test/games/emerald/"),
    ),
  );
  const broken = async (location) => {
    if (location.href.endsWith("grid.json")) throw new Error("404");
    return readJSON(location);
  };
  await assert.rejects(
    loadContent(url, { readJSON: broken }),
    /Content maps: failed .*grid.json/,
  );
});
test("Manifest rejects missing sections, duplicate paths, escapes and unsafe identities", () => {
  for (const edit of [
    (value) => {
      value.version = 2;
    },
    (value) => {
      value.files = value.files.filter((row) => row.section !== "species");
    },
    (value) => {
      value.files.push(value.files[0]);
    },
    (value) => {
      value.files[0].path = "../outside.json";
    },
    (value) => {
      value.files[0].path = "https://outside.test/a.json";
    },
    (value) => {
      value.files[0].key = "__proto__";
    },
  ]) {
    const copy = structuredClone(manifest);
    edit(copy);
    assert.throws(() => contentFiles(copy), /content/i);
  }
});
test("Fragments cannot overwrite existing fields or succeed with an unfilled file", () => {
  const list = values(),
    duplicate = structuredClone(list);
  duplicate[1].title = duplicate[0].title;
  assert.throws(() => assembleContent(manifest, duplicate), /Duplicate.*title/);
  assert.throws(
    () => assembleContent(manifest, list.slice(1)),
    /count mismatch/,
  );
  list[0] = null;
  assert.throws(
    () => assembleContent(manifest, list),
    /Expected content object/,
  );
});
test("A missing or malformed local fragment cannot silently produce a partial pack", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "emerald-content-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.cpSync(new URL("./", CONTENT_MANIFEST), directory, { recursive: true });
  const url = pathToFileURL(path.join(directory, "manifest.json"));
  const target = path.join(directory, manifest.files[0].path);
  fs.writeFileSync(target, "{");
  assert.throws(() => loadContentSync(url), /Content maps: failed/);
  fs.unlinkSync(target);
  assert.throws(() => loadContentSync(url), /Content maps: failed/);
});
test("Python content writers enforce ownership, no-write previews, changed-file scope and rollback", () => {
  const result = spawnSync(
    "python3",
    ["-m", "unittest", "discover", "-s", "tools/tests", "-p", "test_*.py"],
    {
      cwd: new URL("../", import.meta.url),
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
test("Missing map/script references and duplicate warps are rejected unless explicitly classified", () => {
  for (const edit of [
    (db) => {
      db.maps.LittlerootTown.warps[0].dest_map = "typo";
    },
    (db) => {
      db.maps.LittlerootTown.warps.push(db.maps.LittlerootTown.warps[0]);
    },
    (db) => {
      db.maps.LittlerootTown.npcs[0].script = "typo";
    },
    (db) => {
      db.maps.Route101.connections[0].map = "typo";
    },
    (db) => {
      db.maps.LittlerootTown.warps[1].dest_warp_id = "999";
    },
  ]) {
    const db = loadContentSync();
    edit(db);
    assert(validateContentReferences(db).length > 0);
  }
  const db = loadContentSync();
  assert(Object.keys(db.references.maps).length > 0);
  assert(Object.keys(db.references.maps).every(id => !db.maps[id]));
  assert.equal(validateContentReferences(db).length, 0);
});
test("Atlas metadata and frame indices must match actual PNG dimensions", () => {
  const db = loadContentSync();
  assert.doesNotThrow(() => assertContentAssets(db));
  const tiles = db.tilesets["general-petalburg"];
  tiles.atlas.height += 8;
  assert.throws(() => assertContentAssets(db), /dimensions disagree/);
  tiles.atlas.height -= 8;
  tiles.lookup[0] = tiles.atlas.tileCount;
  assert.throws(() => assertContentAssets(db), /out of bounds/);
});
