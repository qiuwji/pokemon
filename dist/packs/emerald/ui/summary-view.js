import { experienceAt } from "../../../engine/model.js";
import { TYPE_NAMES, STATUS_NAMES, ABILITIES, NATURES } from "../pack.js";
const titles = ["宝可梦信息", "宝可梦能力", "战斗招式", "华丽大赛招式"];
const backgrounds = [
  "summary-background",
  "summary-skills",
  "summary-battle-moves",
  "summary-contest-moves",
];
/** Native summary pages format snapshots. Missing contest metadata remains explicit, never invented. */
export function summaryPage(
  mon,
  { db, items, page, escapeHTML: esc, playerName },
) {
  const species = db.species[mon.species],
    name = mon.egg ? "蛋" : mon.nickname || species.name;
  const heading = `<div class="summary-heading">${mon.egg ? "蛋的信息" : titles[page]}</div><div class="summary-navigation"><button data-summary-page="-1" aria-label="上一页">◀</button><button data-summary-page="1" aria-label="下一页">▶</button><button data-summary-back>返回</button></div>`;
  const identity = `<div class="summary-dex">No.${String(species.dex).padStart(3, "0")}</div><div class="summary-name">${esc(name)}</div><div class="summary-species">${esc(species.name)}</div><div class="summary-level">${mon.egg ? "" : `Lv.${mon.level} ${mon.gender === "male" ? "♂" : mon.gender === "female" ? "♀" : ""}`}</div>`;
  let content;
  if (mon.egg)
    content = `<img class="summary-sprite" src="assets/egg-front.png" alt="蛋"><div class="summary-right">宝可梦的蛋<br><br>${mon.egg.cycles > 10 ? "还需要一段时间才能孵化。" : "里面传来了声音，快要孵化了！"}</div>`;
  else if (page === 0)
    content = `<div class="summary-profile">训练家 ${esc(mon.originalTrainer === "player" ? playerName || "—" : "其他训练家")}</div><div class="summary-types">属性 ${species.types.map((t) => esc(TYPE_NAMES[t])).join(" / ")}</div><div class="summary-ability">${esc(ABILITIES[mon.ability] || mon.ability)}</div><div class="summary-memo">${esc(NATURES[mon.nature] || mon.nature)}性格。</div>`;
  else if (page === 1) {
    const base = experienceAt(mon.level, species.growth),
      next = experienceAt(Math.min(100, mon.level + 1), species.growth);
    content = `<div class="summary-held">${esc(items[mon.heldItem]?.name || "无")}</div><div class="summary-stats-left">${[
      ["hp", "HP"],
      ["atk", "攻击"],
      ["def", "防御"],
    ]
      .map(
        ([key, label]) =>
          `<div><span>${label}</span><span>${key === "hp" ? `${mon.hp}/` : ""}${mon.stats[key]}</span></div>`,
      )
      .join("")}</div><div class="summary-stats-right">${[
      ["spa", "特攻"],
      ["spd", "特防"],
      ["spe", "速度"],
    ]
      .map(
        ([key, label]) =>
          `<div><span>${label}</span><span>${mon.stats[key]}</span></div>`,
      )
      .join(
        "",
      )}</div><div class="summary-experience"><div><span>经验值</span><span>${mon.exp}</span></div><div><span>距离升级</span><span>${mon.level === 100 ? 0 : Math.max(0, next - mon.exp)}</span></div></div><div class="summary-exp-bar exp-track"><i style="width:${next === base ? 100 : Math.max(0, Math.min(100, ((mon.exp - base) / (next - base)) * 100))}%"></i></div>`;
  } else
    content = `<div class="summary-right summary-moves">${mon.moves
      .map((slot, index) => {
        const move = db.moves[slot.id];
        return `<button class="native-row" data-summary-move="${index}"><span class="summary-move-type">${page === 2 ? esc(TYPE_NAMES[move.type]) : esc(move.contest?.category || "—")}</span><span class="summary-move-name">${esc(move.name)}</span><small class="summary-move-pp">${page === 2 ? `PP ${slot.pp}/${move.pp}` : ""}</small></button>`;
      })
      .join(
        "",
      )}</div><div class="summary-move-values" data-summary-move-values></div><div class="summary-move-info" data-summary-move-info>${page === 2 ? "请选择招式。" : "华丽大赛资料随内容导入补充。"}</div>`;
  const tools = mon.egg
    ? ""
    : '<details class="summary-tools"><summary>其他操作</summary><div class="native-window"><button id="growth-options">成长</button><button id="held-item">道具</button><button id="lead">首发</button><button id="use-potion">伤药</button></div></details>';
  return `<div class="summary-native" data-summary-page-index="${page}" style="background-image:url('assets/ui/${mon.egg ? "summary-info-egg" : backgrounds[page]}.png')">${heading}${identity}${mon.egg ? "" : `<canvas id="detail-sprite" class="summary-sprite" width="64" height="64" role="img" aria-label="${esc(name)}"></canvas><span class="summary-status">${esc(STATUS_NAMES[mon.status] || "")}</span>`}${content}${tools}<div class="summary-extensions"><div data-extension-slot="monster.detail"></div><div data-extension-slot="monster.content"></div></div></div>`;
}
