// The Emerald slice is a content pack. Engine classes know nothing about these characters.
export const PACK = {
  id: "emerald-hoenn-01",
  playerActors: {
    walk: "BrendanNormal",
    run: "BrendanRun",
    "mach-bike": "BrendanMachBike",
    "acro-bike": "BrendanAcroBike",
    surf: "BrendanSurf",
  },
  travelActor: "FlyBird",
  version: 7,
  title: "绿宝石 · 丰缘序章",
  start: { map: "LittlerootTown", x: 10, y: 10, dir: "up" },
  starters: ["treecko", "torchic", "mudkip"],
  rival: { treecko: "torchic", torchic: "mudkip", mudkip: "treecko" },
};
export const TYPE_NAMES = {
  normal: "一般",
  grass: "草",
  fire: "火",
  water: "水",
  fighting: "格斗",
  flying: "飞行",
  poison: "毒",
  ground: "地面",
  rock: "岩石",
  bug: "虫",
  ghost: "幽灵",
  steel: "钢",
  electric: "电",
  psychic: "超能力",
  ice: "冰",
  dragon: "龙",
  dark: "恶",
};
export const STATUS_NAMES = {
  poison: "中毒",
  burn: "灼伤",
  paralysis: "麻痹",
  sleep: "睡眠",
  freeze: "冰冻",
};
export { ABILITY_NAMES as ABILITIES } from "./ability-names.js";
export const NATURES = [
  "勤奋",
  "怕寂寞",
  "勇敢",
  "固执",
  "顽皮",
  "大胆",
  "坦率",
  "悠闲",
  "淘气",
  "乐天",
  "胆小",
  "急躁",
  "认真",
  "爽朗",
  "天真",
  "内敛",
  "慢吞吞",
  "冷静",
  "害羞",
  "马虎",
  "温和",
  "温顺",
  "自大",
  "慎重",
  "浮躁",
];
export { ITEMS } from "./items.js";
export { questFor } from "./quests.js";
export { validateSave } from "./save-contract.js";
function baseObjects(state, db) {
  const map = state.position.map,
    flag = state.flags;
  const obj = (x, y, actor, kind, name, text = "") => ({
    x,
    y,
    actor,
    kind,
    name,
    text,
    dir: "down",
  });
  if (map === "LittlerootTown")
    return [
      obj(
        16,
        10,
        "Twin",
        "talk",
        "小女孩",
        "北边就是 101 号道路。刚才好像传来了求救声！",
      ),
      obj(
        12,
        13,
        "FatMan",
        "talk",
        "居民",
        "小田卷博士经常到野外研究宝可梦。研究所就在西南边。",
      ),
      obj(
        14,
        17,
        "Boy2",
        "talk",
        "男孩",
        "草丛里有野生宝可梦。等你有了搭档，就能踏上冒险了。",
      ),
    ];
  if (map === "Route101")
    return [
      obj(
        16,
        8,
        "Youngster",
        flag.rescued ? "trainer" : "talk",
        "练习训练家",
        flag.rescued
          ? "我有两位伙伴。来打一场练习赛吧！击败第一只之后，对战还会继续。"
          : "在草丛里行走会遇到野生宝可梦。先削弱它，再用精灵球！",
      ),
      ...(flag.rescued
        ? [
            {
              ...obj(
                18,
                8,
                "Boy1",
                "arena",
                "双打练习员",
                "双打中，两位伙伴先分别选择行动，再一起结算。准备好两位伙伴再来挑战！",
              ),
              trainerId: "doubles",
            },
            {
              ...obj(
                18,
                10,
                "Boy2",
                "arena",
                "混战练习员",
                "三支队伍各自为战。你可以选择任意对方席位，也可以用群体招式。",
              ),
              trainerId: "freeForAll",
            },
          ]
        : []),
      ...(!flag.rescued
        ? [
            {
              ...obj(
                9,
                13,
                "ProfBirch",
                "rescue",
                "小田卷博士",
                "救命啊！那边的包里有精灵球，快选一只来帮我！",
              ),
              id: "birch",
            },
            {
              ...obj(7, 14, "BirchsBag", "starter", "博士的背包"),
              id: "birchBag",
            },
            {
              ...obj(10, 13, null, "wildObject", "蛇纹熊"),
              species: "zigzagoon",
              id: "pursuer",
            },
          ]
        : []),
    ];
  if (map === "OldaleTown")
    return [
      obj(
        16,
        11,
        "Girl1",
        "talk",
        "女孩",
        "红色屋顶的宝可梦中心可以免费恢复体力和招式 PP。",
      ),
      obj(
        13,
        7,
        "Man3",
        "giftPotion",
        "商店店员",
        "欢迎来到古辰镇！这是友好商店送你的伤药。",
      ),
      obj(
        8,
        9,
        "FatMan",
        "talk",
        "研究足迹的人",
        "我在调查珍稀宝可梦的足迹。向北走可以到 103 号道路。",
      ),
    ];
  if (map === "Route103")
    return !flag.rivalWon
      ? [
          obj(
            10,
            3,
            "MayNormal",
            "rival",
            "小遥",
            "你就是爸爸说的新训练家吧！来对战一下，看看你和搭档配合得怎么样！",
          ),
        ]
      : [];
  if (map === "LittlerootTown_ProfessorBirchsLab")
    return [
      { ...obj(6, 4, "ProfBirch", "professor", "小田卷博士"), id: "birch" },
      obj(
        9,
        8,
        "Scientist1",
        flag.pokedex ? "daycare" : "talk",
        "研究员",
        "博士研究宝可梦在自然环境中的生活。发现新宝可梦，就用图鉴记录下来。",
      ),
    ];
  if (map === "LittlerootTown_BrendansHouse_1F")
    return [
      obj(4, 4, "Mom", "healMom", "妈妈", "一路辛苦了！先在家休息一下吧。"),
    ];
  if (map === "OldaleTown_PokemonCenter_1F")
    return [
      obj(
        7,
        2,
        "Nurse",
        "heal",
        "乔伊小姐",
        "欢迎来到宝可梦中心！我会让你的宝可梦恢复精神。",
      ),
      obj(
        4,
        4,
        "Gentleman",
        "talk",
        "绅士",
        "招式有使用次数。没有 PP 的时候，就去找乔伊小姐吧。",
      ),
      obj(
        10,
        6,
        "Boy1",
        "talk",
        "少年",
        "不同属性之间有克制关系。选对招式，能让战斗轻松很多！",
      ),
    ];
  if (map === "OldaleTown_Mart")
    return [
      obj(1, 3, "Man3", "shop", "店员"),
      obj(
        5,
        5,
        "Woman1",
        "talk",
        "顾客",
        "我喜欢多带几瓶伤药。战斗中使用道具也会占用一回合。",
      ),
    ];
  return [];
}
// Ambient behavior is declared per actor from the original map's movement/range data.
export function objectsFor(state, db) {
  return baseObjects(state, db).map((n) => {
    const source = db.maps[state.position.map].npcs.find(
      (o) => o.x === n.x && o.y === n.y,
    );
    const type = source?.movement_type || "MOVEMENT_TYPE_FACE_DOWN";
    const direction = type.includes("RIGHT")
      ? "right"
      : type.includes("LEFT")
        ? "left"
        : type.includes("UP")
          ? "up"
          : "down";
    let mode = type.includes("WANDER")
      ? "wander"
      : type.includes("WALK_LEFT_AND_RIGHT")
        ? "horizontal"
        : type.includes("WALK_DOWN_AND_UP")
          ? "vertical"
          : type.includes("LOOK_AROUND")
            ? "look"
            : type.includes("JOG")
              ? "jog"
              : "still";
    if (n.kind === "starter") mode = "still";
    if (n.kind === "wildObject") {
      mode = "jog";
    }
    if (n.kind === "rival") mode = "look";
    return {
      ...n,
      id: n.id || `${n.kind}:${n.x},${n.y}`,
      dir: n.kind === "wildObject" ? "left" : direction,
      movement: {
        mode,
        dir: direction,
        rangeX: source?.movement_range_x ?? 1,
        rangeY: source?.movement_range_y ?? 1,
      },
    };
  });
}
