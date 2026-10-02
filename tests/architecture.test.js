import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const base = new URL("../dist/", import.meta.url);
function modules(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? modules(file)
      : file.endsWith(".js")
        ? [file]
        : [];
  });
}
test("Engine dependency direction is enforced: no DOM, Canvas, pack or presentation imports", () => {
  for (const file of modules(new URL("engine/", base).pathname)) {
    const source = fs.readFileSync(file, "utf8");
    assert(
      !/\b(document|window|localStorage|HTMLCanvasElement|Image)\b/.test(
        source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""),
      ),
      file + " must remain browser-independent",
    );
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (x) => x[1],
    );
    assert(
      imports.every(
        (x) =>
          !x.includes("packs/") &&
          !x.includes("game-pack") &&
          !x.includes("adapters/") &&
          !x.includes("presentation/"),
      ),
      file + " dependency direction",
    );
  }
});
test("Presentation modules do not calculate battle outcomes or consume gameplay RNG", () => {
  for (const file of fs
    .readdirSync(new URL("presentation/", base))
    .filter((x) => x.endsWith(".js"))) {
    const source = fs.readFileSync(
      new URL("presentation/" + file, base),
      "utf8",
    );
    assert(
      !/\b(damage|captureCheck|createMonster|Random)\s*\(/.test(source),
      file,
    );
    assert(!/from\s+["'][^"']*packs\//.test(source), file);
  }
});
test("Composition root does not own story, inventory or damage rules", () => {
  const source = fs.readFileSync(new URL("app.js", base), "utf8");
  assert(
    !/flags\.(rescued|rivalWon)|createMonster|damage\(|captureCheck|state\.money\s*[-+]?=/.test(
      source,
    ),
  );
});
test("Every local ES module import resolves after refactors", () => {
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(".js")) {
        const source = fs.readFileSync(file, "utf8");
        for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g))
          assert(
            fs.existsSync(path.resolve(dir, match[1])),
            file + " -> " + match[1],
          );
      }
    }
  }
  walk(new URL("../dist/", import.meta.url).pathname);
});
test("Emerald UI sends commands and does not directly mutate persisted game state", () => {
  const source = fs.readFileSync(
    new URL("packs/emerald/interface.js", base),
    "utf8",
  );
  assert(
    !/game\.state(?:\.[A-Za-z_$]\w*|\[[^\]]+\])*\s*(?:=(?!=)|\+\+|--|\+=|-=)/.test(
      source,
    ),
  );
  assert(
    !/\bmon\.(?:hp|species|stats|moves|evolutionSkipped)\s*(?:=(?!=)|\+=)/.test(
      source,
    ),
  );
});

// Examples are real extension consumers: they cannot reach application internals or browser globals.
test("Example plugins depend only on public extension utilities", () => {
  for (const file of modules(new URL("plugins/", base).pathname)) {
    const source = fs
      .readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    assert(
      !/\b(document|window|localStorage|EmeraldAdventure)\b/.test(source),
      file,
    );
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (x) => x[1],
    );
    assert(
      imports.every((x) => x.startsWith("../engine/extensions/")),
      file,
    );
  }
});
