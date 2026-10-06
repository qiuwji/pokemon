import { loadContentSync } from "./content-io.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MOVE_EFFECTS } from "../src/engine/move-effects.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(
  process.argv[2] || path.join(root, "work/pokeemerald"),
);
const [constants, moves, content] = await Promise.all([
  fs.readFile(
    path.join(source, "include/constants/battle_move_effects.h"),
    "utf8",
  ),
  fs.readFile(path.join(source, "src/data/battle_moves.h"), "utf8"),
  Promise.resolve(loadContentSync()),
]);
const original = [
  ...moves.matchAll(/\[MOVE_([A-Z0-9_]+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g),
]
  .filter((m) => m[1] !== "NONE")
  .map((m) => ({
    id: m[1].toLowerCase(),
    effect: m[2].match(/\.effect\s*=\s*EFFECT_([A-Z0-9_]+)/)?.[1].toLowerCase(),
  }));
if (!original.length || original.some((m) => !m.effect))
  throw new Error("Reference move table could not be parsed");
const rows = [
  ...constants.matchAll(/^#define EFFECT_([A-Z0-9_]+)\s+(\d+)/gm),
].map((m) => {
  const id = m[1].toLowerCase(),
    users = original.filter((move) => move.effect === id),
    definition = MOVE_EFFECTS[id];
  return {
    id,
    code: Number(m[2]),
    moves: users.map((m) => m.id),
    imported: users.filter((m) => content.moves[m.id]).map((m) => m.id),
    status: !definition
      ? "missing"
      : definition.supported === false
        ? "disabled"
        : "registered-unverified",
  };
});
const counts = Object.fromEntries(
  ["missing", "disabled", "registered-unverified"].map((k) => [
    k,
    rows.filter((r) => r.status === k && r.moves.length).length,
  ]),
);
await fs.mkdir(path.join(root, "docs/engine/battle"), { recursive: true });
await fs.writeFile(
  path.join(root, "docs/engine/battle/move-audit.json"),
  JSON.stringify(
    {
      reference: "pret/pokeemerald",
      revision: "731ad5bfd6e6f265508d0efcca0ba42f9dcf5881",
      moveCount: original.length,
      effectCount: rows.length,
      usedEffectCount: rows.filter((r) => r.moves.length).length,
      counts,
      effects: rows,
    },
    null,
    2,
  ) + "\n",
);
const labels = {
  missing: "尚无同名效果定义",
  disabled: "已登记但禁用",
  "registered-unverified": "已登记；原作一致性待核对",
};
await fs.writeFile(
  path.join(root, "docs/engine/battle/MOVE_AUDIT.md"),
  `# 原作招式效果基线\n\n来源：pret/pokeemerald 固定修订 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881 的 include/constants/battle_move_effects.h 与 src/data/battle_moves.h。由 tools/audit-mechanisms.mjs 生成，仅读取参考资料。\n\n原作 ${original.length} 个招式（不含 NONE），${rows.length} 个效果编号，其中 ${rows.filter((r) => r.moves.length).length} 个实际被招式使用。\n\n这是按原始效果名称与本项目 MOVE_EFFECTS 对照的结构基线，不是行为正确性证明：同义别名可能已有部分实现；已登记也可能缺少边界。具体缺口须核对脚本与规则，不能直接把 missing 数量当作全部未实现数量。当前导入的 87 个招式不是全作范围。\n\n实际使用效果：同名未登记 ${counts.missing}，明确禁用 ${counts.disabled}，已登记待核对 ${counts["registered-unverified"]}。详细数据见 move-audit.json。\n\n| 原作效果 | 编号 | 原作招式数 | 已导入数量 | 当前结构状态 |\n| --- | --- | --- | --- | --- |\n${rows.map((r) => `| ${r.id} | ${r.code} | ${r.moves.length} | ${r.imported.length} | ${r.moves.length ? labels[r.status] : "原作未使用"} |`).join("\n")}\n`,
);
console.log(
  JSON.stringify({ moves: original.length, effects: rows.length, counts }),
);
