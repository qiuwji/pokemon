import fs from "node:fs/promises";
import path from "node:path";
const root = process.cwd(),
  source = path.join(root, "work/pokeemerald");
const [moves, pokedex] = await Promise.all([
  fs.readFile(path.join(source, "src/data/battle_moves.h"), "utf8"),
  fs.readFile(path.join(source, "src/data/pokemon/pokedex_entries.h"), "utf8"),
]);
const wanted = new Set([
  "stun_spore",
  "razor_leaf",
  "earthquake",
  "hydro_pump",
  "surf",
  "bubble_beam",
  "rock_slide",
  "shadow_ball",
  "swift",
]);
const table = {};
for (const [, raw, body] of moves.matchAll(
  /\[MOVE_([A-Z0-9_]+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g,
)) {
  const id = raw.toLowerCase();
  if (!wanted.has(id)) continue;
  const num = (field) =>
    Number(body.match(new RegExp("\\." + field + "\\s*=\\s*(-?\\d+)"))?.[1]);
  const word = (field, prefix) =>
    body
      .match(
        new RegExp("\\." + field + "\\s*=\\s*" + prefix + "_([A-Z0-9_]+)"),
      )?.[1]
      .toLowerCase();
  const target = word("target", "MOVE_TARGET");
  const targets = {
    selected: "selected",
    both: "opponents",
    random: "random",
    user: "self",
    foes_and_ally: "all-others",
  };
  if (!targets[target]) throw new Error(`Unknown target ${id}: ${target}`);
  table[id] = {
    name: id.replaceAll("_", " "),
    effect: id === "surf" ? "surf" : word("effect", "EFFECT"),
    power: num("power"),
    type: word("type", "TYPE"),
    accuracy: num("accuracy"),
    pp: num("pp"),
    chance: num("secondaryEffectChance"),
    priority: num("priority"),
    target: targets[target],
    contact: body.includes("FLAG_MAKES_CONTACT"),
    sound: body.includes("FLAG_SOUND"),
  };
}
if (Object.keys(table).length !== wanted.size)
  throw new Error("Incomplete required move metadata");
const weights = Object.fromEntries(
  [
    ...pokedex.matchAll(
      /\[NATIONAL_DEX_([A-Z0-9_]+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g,
    ),
  ]
    .filter((m) => m[1] !== "NONE")
    .map((m) => [
      m[1].toLowerCase(),
      Number(m[2].match(/\.weight\s*=\s*(\d+)/)?.[1]),
    ]),
);
await fs.writeFile(
  path.join(root, "dist/engine/rules/gen3/reference-metadata.js"),
  `// Generated from read-only pret/pokeemerald 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881.\n// Move dependencies of Nature Power; species weights are hectograms, as in the original.\nexport const NATURE_POWER_MOVES = ${JSON.stringify(table, null, 2)};\nexport const SPECIES_WEIGHTS = ${JSON.stringify(weights, null, 2)};\n`,
);
console.log(
  JSON.stringify({
    moves: Object.keys(table).length,
    weights: Object.keys(weights).length,
  }),
);
