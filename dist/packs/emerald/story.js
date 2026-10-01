import { PACK } from "./pack.js";
import {
  RESCUE_INTRO,
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
import { StoryEngine } from "../../engine/story.js";
import { QUESTS } from "./quests.js";
const flag = (name) => ({ flag: name });
const not = (name) => ({ not: flag(name) });
const all = (...conditions) => ({ all: conditions });
const talkEvent = (id, kind, build, requires) => ({
  id,
  trigger: "interact",
  requires,
  match: ({ object }) => object.kind === kind,
  build,
});
export const STORY_EVENTS = [
  {
    id: "rescue.intro",
    trigger: "step",
    once: true,
    requires: all(not("rescued"), not("heardBirch")),
    match: ({ map }) => map === "Route101",
    build: () => RESCUE_INTRO,
  },
  talkEvent("rescue.bag", "starter", () => OPEN_BAG, not("rescued")),
  talkEvent(
    "rival.challenge",
    "rival",
    (s, { object }) => [
      dialog("小遥", object.text),
      battle(PACK.rival[s.flags.starter], 5, {
        trainer: true,
        script: "rival",
      }),
    ],
    all(flag("rescued"), not("rivalWon")),
  ),
  talkEvent(
    "rival.wait",
    "rival",
    () => [dialog("小遥", "你的搭档呢？先去 101 号道路找我爸爸吧。")],
    not("rescued"),
  ),
  {
    ...talkEvent(
      "professor.pokedex",
      "professor",
      () => [
        dialog(
          "小田卷博士",
          "小遥说你已经很会照顾宝可梦了！这本宝可梦图鉴，就交给你吧。",
          "获得了宝可梦图鉴！小遥还送给你 5 个精灵球。",
          "先降低野生宝可梦的体力，再投出精灵球。去寻找新伙伴吧！",
        ),
        { type: "emote", actor: "player", kind: "exclamation", ms: 500 },
        {
          type: "reward",
          id: "professor.pokedex",
          flags: { pokedex: true },
          items: { pokeball: 5 },
        },
      ],
      all(flag("rescued"), flag("rivalWon"), not("pokedex")),
    ),
    once: true,
    after: ["rival.victory"],
  },
  talkEvent(
    "professor.away",
    "professor",
    () => [dialog("研究所留言", "博士去 101 号道路做野外调查了。")],
    not("rescued"),
  ),
  talkEvent(
    "professor.rival",
    "professor",
    () => [dialog("小田卷博士", "小遥正在 103 号道路做调查。去见见她吧！")],
    all(flag("rescued"), not("rivalWon")),
  ),
  talkEvent(
    "professor.report",
    "professor",
    (s) => [
      dialog(
        "小田卷博士",
        `已经捕获了 ${s.caught.length} 种宝可梦！每个伙伴都值得好好培养。`,
      ),
    ],
    flag("pokedex"),
  ),
  {
    ...talkEvent(
      "shop.gift",
      "giftPotion",
      (s, { object }) => [
        dialog(object.name, object.text, "获得了 1 瓶伤药！"),
        { type: "emote", actor: "player", kind: "exclamation", ms: 450 },
        {
          type: "reward",
          id: "shop.gift",
          flags: { potionGift: true },
          items: { potion: 1 },
        },
      ],
      not("potionGift"),
    ),
    once: true,
  },
  talkEvent(
    "shop.greeting",
    "giftPotion",
    (s, { object }) => [
      dialog(object.name, "需要道具的话，欢迎到蓝色屋顶的友好商店来。"),
    ],
    flag("potionGift"),
  ),
  talkEvent("shop.open", "shop", () => [{ type: "shop" }]),
  ...["heal", "healMom"].map((kind) =>
    talkEvent("healing." + kind, kind, (s, { object }) => healingScene(object)),
  ),
  talkEvent("rescue.pursuer", "wildObject", () => [
    dialog("蛇纹熊", "蛇纹熊正追着博士跑！快去调查旁边的背包。"),
  ]),
  ...["talk", "rescue"].map((kind) =>
    talkEvent("talk." + kind, kind, (s, { object }) => [
      dialog(object.name, object.text),
    ]),
  ),
  talkEvent("sign.read", "sign", (s, { object: o, mapTitle }) => {
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
  }),
  {
    id: "rescue.return",
    trigger: "battleResult",
    once: true,
    requires: not("rescued"),
    match: ({ battle: b }) =>
      b.script === "rescue" && ["win", "loss"].includes(b.result),
    build: () => RETURN_WITH_BIRCH,
  },
  {
    id: "rival.victory",
    trigger: "battleResult",
    once: true,
    match: ({ battle: b }) => b.script === "rival" && b.result === "win",
    build: () => [
      {
        type: "reward",
        id: "rival.prize",
        flags: { rivalWon: true },
        money: 300,
      },
      dialog(
        "小遥",
        "你和搭档配合得真不错！获得了 ¥300。",
        "爸爸一定也很高兴。我们回未白镇的研究所吧，我还有礼物要送给你！",
      ),
    ],
  },
  {
    id: "battle.capture",
    trigger: "battleResult",
    match: ({ battle: b }) => b.result === "caught",
    build: (s, { battle: b, db }) => [
      { type: "captureMonster", monster: structuredClone(b.enemy) },
      dialog(
        "捕捉成功",
        s.party.length < 6
          ? `${db.species[b.enemy.species].name} 加入了你的队伍！`
          : "队伍已经有 6 位伙伴。新宝可梦已传送到电脑盒子。",
      ),
    ],
  },
  {
    id: "battle.loss",
    trigger: "battleResult",
    match: ({ battle: b }) => b.result === "loss",
    build: () => [{ type: "lossPenalty" }, ...RETURN_TO_CENTER],
  },
];
export const EMERALD_STORY = new StoryEngine(STORY_EVENTS, QUESTS);
export function interaction(state, object, mapTitle) {
  return EMERALD_STORY.resolve("interact", state, { object, mapTitle });
}
export function battleOutcome(state, battle, db) {
  return EMERALD_STORY.resolve("battleResult", state, { battle, db });
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
