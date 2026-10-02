import fs from "node:fs/promises";
import path from "node:path";
const root = process.cwd(),
  source = path.join(root, "work/pokeemerald");
const [moves, pokedex, battleUtil] = await Promise.all([
  fs.readFile(path.join(source, "src/data/battle_moves.h"), "utf8"),
  fs.readFile(path.join(source, "src/data/pokemon/pokedex_entries.h"), "utf8"),
  fs.readFile(path.join(source, "src/battle_util.c"), "utf8"),
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
const soundMoves = new Set(
  [
    ...(battleUtil
      .match(/sSoundMovesTable\[\][\s\S]*?\};/)?.[0]
      .matchAll(/MOVE_([A-Z0-9_]+)/g) || []),
  ].map((m) => m[1].toLowerCase()),
);
if (!soundMoves.has("uproar")) throw new Error("Missing sound move reference");
for (const [, raw, body] of moves.matchAll(
  /\[MOVE_([A-Z0-9_]+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g,
)) {
  const id = raw.toLowerCase();
  if (id === "none") continue;
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
    depends: "user-or-selected",
    opponents_field: "opponents-field",
  };
  if (!targets[target]) throw new Error(`Unknown target ${id}: ${target}`);
  table[id] = {
    name: id.replaceAll("_", " "),
    effect: ["surf", "earthquake"].includes(id) ? id : word("effect", "EFFECT"),
    power: num("power"),
    type: word("type", "TYPE") === "mystery" ? "normal" : word("type", "TYPE"),
    accuracy: num("accuracy"),
    pp: num("pp"),
    chance: num("secondaryEffectChance"),
    priority: num("priority"),
    target: targets[target],
    contact: body.includes("FLAG_MAKES_CONTACT"),
    sound: soundMoves.has(id),
    flags: [...body.matchAll(/FLAG_([A-Z0-9_]+)/g)].map((m) =>
      m[1].toLowerCase(),
    ),
  };
}
if (Object.keys(table).length !== 354 || [...wanted].some((id) => !table[id]))
  throw new Error("Incomplete reference move metadata");
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
  `// Generated from read-only pret/pokeemerald 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881.\n// Curse's TYPE_MYSTERY uses normal metadata; its effect chooses the ghost/non-ghost branch.\n// Species weights are hectograms, as in the original.\nexport const GEN3_REFERENCE_MOVES = ${JSON.stringify(table, null, 2)};\nexport const NATURE_POWER_MOVES = Object.fromEntries(${JSON.stringify([...wanted])}.map(id => [id, GEN3_REFERENCE_MOVES[id]]));\nexport const SPECIES_WEIGHTS = ${JSON.stringify(weights, null, 2)};\n`,
);
console.log(
  JSON.stringify({
    moves: Object.keys(table).length,
    weights: Object.keys(weights).length,
  }),
);
