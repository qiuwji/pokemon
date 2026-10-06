import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
export function buildInputs(root) {
  const files = new Map();
  function walk(directory, base) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === ".DS_Store" || entry.name.startsWith(".import-")) continue;
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Build input symlink: ${file}`);
      if (entry.isDirectory()) walk(file, base);
      else if (entry.isFile()) {
        const relative = path.relative(base, file).split(path.sep).join("/");
        if (relative === ".build-manifest.json" || files.has(relative))
          throw new Error(`Duplicate/reserved build output: ${relative}`);
        files.set(relative, file);
      }
    }
  }
  for (const name of ["src", "generated"]) walk(path.join(root, name), path.join(root, name));
  return files;
}
export function build(root = projectRoot, { check = false } = {}) {
  const inputs = buildInputs(root), output = path.join(root, "dist");
  const manifest = Object.fromEntries([...inputs].map(([relative, source]) => [relative, {
    source: path.relative(root, source).split(path.sep).join("/"),
    sha256: digest(fs.readFileSync(source)),
  }]));
  if (check) {
    const expected = JSON.stringify(manifest);
    const installed = JSON.parse(fs.readFileSync(path.join(output, ".build-manifest.json"), "utf8"));
    if (JSON.stringify(installed) !== expected) throw new Error("Build inputs changed; rebuild dist");
    const actual = new Set();
    function verify(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name), relative = path.relative(output, file).split(path.sep).join("/");
        if (entry.isSymbolicLink()) throw new Error(`Build output symlink: ${relative}`);
        if (entry.isDirectory()) verify(file);
        else if (relative !== ".build-manifest.json") {
          if (!manifest[relative] || digest(fs.readFileSync(file)) !== manifest[relative].sha256)
            throw new Error(`Unexpected/modified build output: ${relative}`);
          actual.add(relative);
        }
      }
    }
    verify(output);
    if (actual.size !== inputs.size) throw new Error("Missing build outputs");
    return inputs.size;
  }
  // Materialize independently: a failed copy leaves the previous build available.
  const stage = fs.mkdtempSync(path.join(root, ".build-"));
  fs.chmodSync(stage, 0o755);
  const previous = `${stage}-previous`;
  let installed = false;
  try {
    for (const [relative, source] of inputs) {
      const target = path.join(stage, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
    fs.writeFileSync(path.join(stage, ".build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    if (fs.existsSync(output)) fs.renameSync(output, previous);
    try { fs.renameSync(stage, output); installed = true; }
    catch (error) {
      if (fs.existsSync(previous)) fs.renameSync(previous, output);
      throw error;
    }
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
    if (installed) fs.rmSync(previous, { recursive: true, force: true });
  }
  return inputs.size;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Build ${process.argv.includes("--check") ? "verified" : "complete"}: ${build(projectRoot, { check: process.argv.includes("--check") })} files.`);
}
