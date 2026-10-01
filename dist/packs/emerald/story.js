import { PACK } from "./pack.js";
import {
  OPEN_BAG,
  RETURN_WITH_BIRCH,
  RETURN_TO_CENTER,
  healingScene,
} from "./scenes.js";

// Content emits commands; it never imports DOM, Canvas, timers or animation code.
const dialog = (name, ...lines) => ({ type: "dialog", name, lines });
const battle = (species, level, options) => ({
  type: "battle",
  species,
  level,
  options,
});
export function interaction(state, object, mapTitle) {
  const { flags } = state,
    o = object;
  switch (o.kind) {
    case "talk":
    case "rescue":
      return [dialog(o.name, o.text)];
    case "starter":
      return OPEN_BAG;
    case "wildObject":
      return [dialog("蛇纹熊", "蛇纹熊正追着博士跑！快去调查旁边的背包。")];
    case "rival":
      return flags.rescued
        ? [
            dialog("小遥", o.text),
            battle(PACK.rival[flags.starter], 5, {
              trainer: true,
              script: "rival",
            }),
          ]
        : [dialog("小遥", "你的搭档呢？先去 101 号道路找我爸爸吧。")];
    case "professor":
      if (!flags.rescued)
        return [dialog("研究所留言", "博士去 101 号道路做野外调查了。")];
      if (!flags.rivalWon)
        return [
          dialog("小田卷博士", "小遥正在 103 号道路做调查。去见见她吧！"),
        ];
      if (!flags.pokedex)
        return [
          dialog(
            "小田卷博士",
            "小遥说你已经很会照顾宝可梦了！这本宝可梦图鉴，就交给你吧。",
            "获得了宝可梦图鉴！小遥还送给你 5 个精灵球。",
            "先降低野生宝可梦的体力，再投出精灵球。去寻找新伙伴吧！",
          ),
          { type: "emote", actor: "player", kind: "exclamation", ms: 500 },
          { type: "grant", flag: "pokedex", item: "pokeball", amount: 5 },
        ];
      return [
        dialog(
          "小田卷博士",
          `已经捕获了 ${state.caught.length} 种宝可梦！每个伙伴都值得好好培养。`,
        ),
      ];
    case "heal":
    case "healMom":
      return healingScene(o);
    case "giftPotion":
      return flags.potionGift
        ? [dialog(o.name, "需要道具的话，欢迎到蓝色屋顶的友好商店来。")]
        : [
            dialog(o.name, o.text, "获得了 1 瓶伤药！"),
            { type: "emote", actor: "player", kind: "exclamation", ms: 450 },
            { type: "grant", flag: "potionGift", item: "potion", amount: 1 },
          ];
    case "shop":
      return [{ type: "shop" }];
    case "sign": {
      const text = o.script.includes("TownSign")
        ? mapTitle + " · 每一段旅程都从小镇开始。"
        : o.script.includes("LabSign")
          ? "小田卷博士研究所 · 宝可梦野外研究"
          : o.script.includes("HouseSign")
            ? o.script.includes("May")
              ? "小遥的家"
              : "小悠的家"
            : o.script.includes("Route")
              ? mapTitle + " · 请小心草丛里的野生宝可梦。"
              : "丰缘地区 · 与宝可梦一起旅行。";
      return [dialog("路边的告示", text)];
    }
    default:
      return [];
  }
}
export function battleOutcome(state, b, db) {
  if (b.result === "caught") {
    const mon = structuredClone(b.enemy);
    if (!state.caught.includes(mon.species)) state.caught.push(mon.species);
    const party = state.party.length < 6;
    (party ? state.party : state.box).push(mon);
    return [
      dialog(
        "捕捉成功",
        party
          ? `${db.species[mon.species].name} 加入了你的队伍！`
          : "队伍已经有 6 位伙伴。新宝可梦已传送到电脑盒子。",
      ),
    ];
  }
  if (b.script === "rescue" && ["win", "loss"].includes(b.result)) {
    return RETURN_WITH_BIRCH;
  }
  if (b.result === "win" && b.script === "rival") {
    state.flags.rivalWon = true;
    state.money += 300;
    return [
      dialog(
        "小遥",
        "你和搭档配合得真不错！获得了 ¥300。",
        "爸爸一定也很高兴。我们回未白镇的研究所吧，我还有礼物要送给你！",
      ),
    ];
  }
  if (b.result === "loss") {
    state.money = Math.max(
      0,
      state.money - Math.max(...state.party.map((m) => m.level)) * 8,
    );
    return RETURN_TO_CENTER;
  }
  return [];
}

export const ANIMATION_PROFILES = {
  tackle: "contact",
  scratch: "contact",
  pound: "contact",
  quick_attack: "contact",
  ember: "projectile",
  water_gun: "projectile",
  mud_slap: "projectile",
  poison_sting: "projectile",
  gust: "projectile",
  confusion: "projectile",
  absorb: "projectile",
  growl: "status",
  leer: "status",
  tail_whip: "status",
};
