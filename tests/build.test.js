import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { build } from "../tools/build.mjs";
function project(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "emerald-build-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const tree of ["src", "generated"]) fs.mkdirSync(path.join(root, tree));
  fs.writeFileSync(path.join(root, "src/app.js"), "import './native.js';\n");
  fs.writeFileSync(path.join(root, "generated/native.js"), "export const n = 1;\n");
  return root;
}
test("Build is deterministic, portable and removes retired outputs", t => {
  const root = project(t);
  build(root);
  const manifest = fs.readFileSync(path.join(root, "dist/.build-manifest.json"), "utf8");
  assert.equal(build(root, { check: true }), 2);
  build(root);
  assert.equal(fs.readFileSync(path.join(root, "dist/.build-manifest.json"), "utf8"), manifest);
  assert.equal(JSON.parse(manifest)["native.js"].source, "generated/native.js");
  fs.unlinkSync(path.join(root, "generated/native.js"));
  build(root);
  assert(!fs.existsSync(path.join(root, "dist/native.js")));
});
test("Duplicate source paths fail before replacing the previous build", t => {
  const root = project(t);
  build(root);
  fs.writeFileSync(path.join(root, "src/native.js"), "conflict");
  assert.throws(() => build(root), /Duplicate/);
  assert.equal(fs.readFileSync(path.join(root, "dist/native.js"), "utf8"), "export const n = 1;\n");
});
test("Edited, extra or missing deployment files are detected", t => {
  const root = project(t);
  build(root);
  fs.writeFileSync(path.join(root, "dist/app.js"), "edited");
  assert.throws(() => build(root, { check: true }), /modified/);
  build(root);
  fs.writeFileSync(path.join(root, "dist/extra.js"), "extra");
  assert.throws(() => build(root, { check: true }), /Unexpected/);
  build(root);
  fs.unlinkSync(path.join(root, "dist/app.js"));
  assert.throws(() => build(root, { check: true }), /Missing/);
});
