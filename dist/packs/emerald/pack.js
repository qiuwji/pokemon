import { sourceObjectId, sourceLocalId } from "../../engine/world-object-index.js";
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
  version: 14,
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
  toxic: "剧毒",
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
  const obj = (x, y, actor, kind, dialogueId) => {
    const definition = db.stories.dialogues.dialogues[dialogueId];
    if (!definition)
      throw new Error(`Unknown native NPC dialogue: ${dialogueId}`);
    return {
      x,
      y,
      actor,
      kind,
      name: definition.name,
      text: definition.lines[0],
      dialogue: `emerald:dialogues.${dialogueId}`,
      dir: "down",
    };
  };
  if (map === "LittlerootTown")
    return [
      obj(16, 10, "Twin", "talk", "npc.talk.1"),
      obj(12, 13, "FatMan", "talk", "npc.talk.2"),
      obj(14, 17, "Boy2", "talk", "npc.talk.3"),
    ];
  if (map === "Route101")
    return [
      {
        ...obj(
          16,
          8,
          "Youngster",
          flag.rescued ? "trainer" : "talk",
          flag.rescued ? "npc.practice.4.after" : "npc.practice.4.before",
        ),
        ...(flag.rescued ? { trainerId: "youngster" } : {}),
      },
      ...(flag.rescued
        ? [
            {
              ...obj(18, 8, "Boy1", "arena", "npc.arena.5"),
              id: "emerald:arena.doubles",
              trainerId: "doubles",
              movement: { mode: "still", dir: "down", rangeX: 0, rangeY: 0 },
            },
            {
              ...obj(18, 10, "Boy2", "arena", "npc.arena.6"),
              id: "emerald:arena.freeForAll",
              trainerId: "freeForAll",
              movement: { mode: "still", dir: "down", rangeX: 0, rangeY: 0 },
            },
          ]
        : []),
      ...(!flag.rescued
        ? [
            {
              ...obj(9, 13, "ProfBirch", "rescue", "npc.rescue.7"),
              id: "birch",
            },
            {
              ...obj(7, 14, "BirchsBag", "starter", "npc.starter.8"),
              id: "birchBag",
            },
            {
              ...obj(10, 13, null, "wildObject", "npc.wildobject.9"),
              species: "zigzagoon",
              id: "pursuer",
            },
          ]
        : []),
    ];
  if (map === "OldaleTown")
    return [
      obj(16, 11, "Girl1", "talk", "npc.talk.10"),
      obj(13, 7, "Man3", "giftPotion", "npc.giftpotion.11"),
      obj(8, 9, "FatMan", "talk", "npc.talk.12"),
    ];
  if (map === "Route103")
    return !flag.rivalWon
      ? [obj(10, 3, "MayNormal", "rival", "npc.rival.13")]
      : [];
  if (map === "LittlerootTown_ProfessorBirchsLab")
    return [
      {
        ...obj(6, 4, "ProfBirch", "professor", "npc.professor.14"),
        id: "birch",
      },
      obj(
        9,
        8,
        "Scientist1",
        flag.pokedex ? "daycare" : "talk",
        "npc.practice.15",
      ),
    ];
  if (map === "LittlerootTown_BrendansHouse_1F")
    return [
      {
        ...obj(2, 6, "Mom", "healMom", "npc.healmom.16"),
        sourceLocalId: "LOCALID_PLAYERS_HOUSE_1F_MOM",
      },
    ];
  if (map === "OldaleTown_PokemonCenter_1F")
    return [
      obj(7, 2, "Nurse", "heal", "npc.heal.17"),
      obj(4, 4, "Gentleman", "talk", "npc.talk.18"),
      obj(10, 6, "Boy1", "talk", "npc.talk.19"),
    ];
  if (map === "OldaleTown_Mart")
    return [
      obj(1, 3, "Man3", "shop", "npc.shop.20"),
      obj(5, 5, "Woman1", "talk", "npc.talk.21"),
    ];
  return [];
}
// Ambient behavior is declared per actor from the original map's movement/range data.
export function objectsFor(state, db) {
  return baseObjects(state, db).map((n) => {
    const binding = n.id || `${n.kind}:${n.x},${n.y}`;
    if (n.movement) {
      if (!n.id) throw new Error(`Authored NPC needs an identity: ${binding}`);
      return n;
    }
    const map = state.position.map;
    const matches = db.maps[map].npcs.filter((o) =>
      n.sourceLocalId
        ? o.local_id === n.sourceLocalId
        : o.x === n.x && o.y === n.y,
    );
    if (matches.length !== 1 || !matches[0].movement_type)
      throw new Error(
        `Native NPC binding failed: ${map}/${n.sourceLocalId || binding}`,
      );
    const source = matches[0];
    const index = db.maps[map].npcs.indexOf(source);
    const id = n.id || sourceObjectId(map, "npc", source, index);
    const type = source.movement_type;
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
      x: source.x,
      sourceLocalId: sourceLocalId(source, index),
      script: source.script,
      y: source.y,
      ...(source.elevation !== undefined
        ? { elevation: source.elevation }
        : {}),
      id,
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
