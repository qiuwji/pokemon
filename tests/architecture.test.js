import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const base = new URL("../src/", import.meta.url);
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
          !x.includes("game/") &&
          !x.includes("ui/") &&
          !x.includes("game-pack") &&
          !x.includes("adapters/") &&
          !x.includes("presentation/"),
      ),
      file + " dependency direction",
    );
  }
});
test("Crop and fishing gameplay stay outside the reusable engine", () => {
  for (const file of modules(new URL("engine/", base).pathname)) {
    const source = fs.readFileSync(file, "utf8");
    assert(!/\b(?:class\s+(?:CropRegistry|CropService|FishingSession)|function\s+gen3(?:CanFish|FishingRules))\b/.test(source), file);
    assert(!/\bstate\.crops\b|\bresult\.fishing\b/.test(source), file);
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
    assert(!/from\s+["'][^"']*(?:packs|game|ui)\//.test(source), file);
    assert(
      !/Math\.random\s*\(/.test(source),
      file + " presentation must be deterministic",
    );
    assert(
      !/Math\.random\s*\(/.test(source),
      file + " presentation must be deterministic",
    );
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
  walk(new URL("../src/", import.meta.url).pathname);
  walk(new URL("../generated/", import.meta.url).pathname);
});
test("Every Emerald page and UI shell sends commands without mutating persisted state", () => {
  const files = modules(new URL("ui/emerald/", base).pathname).filter(
    (file) =>
      file.endsWith("-interface.js") ||
      ["interface.js", "ui-shell.js"].includes(path.basename(file)),
  );
  assert(files.length >= 20, "UI ownership scan must include the real page controllers");
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert(
      !/game\.state(?:\.[A-Za-z_$]\w*|\[[^\]]+\])*\s*(?:=(?!=)|\+\+|--|\+=|-=)/.test(
        source,
      ),
      file,
    );
    assert(
      !/game\.state(?:\.[A-Za-z_$]\w*|\[[^\]]+\])*\.(?:push|pop|splice|shift|unshift|sort|reverse)\s*\(/.test(
        source,
      ),
      file,
    );
    assert(
      !/\bmon\.(?:hp|species|stats|moves|evolutionSkipped)\s*(?:=(?!=)|\+=)/.test(
        source,
      ),
      file,
    );
  }
});

test("Emerald content depends only on public author capabilities and content assets", () => {
  const files = modules(new URL("packs/emerald/", base).pathname);
  assert(files.length > 50);
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const target = path.resolve(path.dirname(file), match[1]);
      if (target.startsWith(base.pathname)) assert(
        target.startsWith(new URL("packs/", base).pathname) ||
        target.startsWith(new URL("engine/extensions/", base).pathname), file + " -> " + match[1]);
    }
    assert(!/\b(document|window|localStorage|setTimeout|requestAnimationFrame)\b/.test(
      source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "")), file);
    assert(!/new\s+(?:[A-Za-z]+Registry|StoryEngine|PluginHost|AudioAdapter|SaveStore)\b/.test(source), file);
  }
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
      imports.every((x) => {
        const target = path.resolve(path.dirname(file), x);
        return target.startsWith(new URL("engine/extensions/", base).pathname) ||
          (path.dirname(file) !== new URL("plugins/", base).pathname && target.startsWith(path.dirname(file) + path.sep));
      }),
      file,
    );
  }
});

test("Inventory quantities cannot be mutated as count dictionaries; UI cannot commit domain plans", () => {
  for (const file of modules(base.pathname)) {
    const source = fs
      .readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    assert(
      !/\bbag(?:\[[^\]]+\]|\.(?!pockets\b)[A-Za-z_$]\w*)\s*(?:=(?!=)|\+\+|--|\+=|-=)/.test(
        source,
      ),
      file,
    );
    if (
      file.endsWith("-interface.js") ||
      ["interface.js", "ui-shell.js"].includes(path.basename(file))
    ) {
      assert(!/\binventory\.(?:apply|prepare|commit)\s*\(/.test(source), file);
      assert(
        !/\.pockets(?:\.[A-Za-z_$]\w*|\[[^\]]+\])*\s*(?:=(?!=)|\+\+|--|\+=|-=)/.test(
          source,
        ),
        file,
      );
    }
  }
});

// Product plugins may be removed without changing engine contract test support.
test("Core tests and fixtures do not import installed plugins or authoring examples", () => {
  for (const file of modules(new URL(".", import.meta.url).pathname)) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const target = path.resolve(path.dirname(file), match[1]);
      assert(!target.startsWith(new URL("../src/plugins/", import.meta.url).pathname), file);
      assert(!target.startsWith(new URL("../generated/plugins/", import.meta.url).pathname), file);
      assert(!target.startsWith(new URL("../examples/", import.meta.url).pathname), file);
    }
  }
});
