import SOURCE_TRAINERS from "./native-trainers-data.json" with { type: "json" };

export {
  validateTrainers,
  createTrainerTeam,
  createTrainerEncounter,
} from "../../engine/trainer-encounters.js";
/** Training encounter demonstrates team mechanics without changing the original rival team. */
export const TRAINERS = {
  ...Object.fromEntries(SOURCE_TRAINERS.map(({ id, name, script, prize, party, doubleBattle, actor }) => [id, {
    name, script, prize, party, actor,
    ...(doubleBattle ? { format: "doubles", requiresPartners: 2 } : {}),
  }])),
  doubles: {
    name: "双打练习员",
    script: "arena:doubles",
    prize: 240,
    format: "doubles",
    requiresPartners: 2,
    party: [
      { species: "zigzagoon", level: 4 },
      { species: "poochyena", level: 4 },
      { species: "wurmple", level: 3 },
    ],
  },
  freeForAll: {
    name: "混战练习员",
    script: "arena:freeForAll",
    prize: 300,
    format: "doubles",
    requiresPartners: 2,
    party: [
      { species: "zigzagoon", level: 4 },
      { species: "poochyena", level: 4 },
    ],
    rivals: [
      {
        id: "third",
        name: "第三阵营",
        party: [
          { species: "wurmple", level: 4 },
          { species: "ralts", level: 4 },
        ],
      },
    ],
  },
  youngster: {
    name: "练习训练家",
    script: "practice",
    prize: 160,
    party: [
      { species: "zigzagoon", level: 3 },
      { species: "poochyena", level: 4 },
    ],
  },
  // Route 102 sight trainers: reference opponents TRAINER_CALVIN_1/RICK/TIANA/ALLEN.
  calvin: {
    actor: "Youngster",
    name: "短裤小子",
    script: "route102.calvin",
    prize: 80,
    party: [{ species: "poochyena", level: 5 }],
  },
  rick: {
    actor: "BugCatcher",
    name: "捕虫少年",
    script: "route102.rick",
    prize: 96,
    party: [
      { species: "wurmple", level: 4 },
      { species: "wurmple", level: 4 },
    ],
  },
  tiana: {
    actor: "Lass",
    name: "少女",
    script: "route102.tiana",
    prize: 80,
    party: [
      { species: "zigzagoon", level: 4 },
      { species: "shroomish", level: 4 },
    ],
  },
  allen: {
    actor: "Youngster",
    name: "短裤小子",
    script: "route102.allen",
    prize: 80,
    party: [
      { species: "zigzagoon", level: 4 },
      { species: "taillow", level: 3 },
    ],
  },
  // TRAINER_GRUNT_PETALBURG_WOODS: TRAINER_CLASS_TEAM_AQUA, lv. 9 Poochyena.
  aquaPetalburgWoods: {
    actor: "AquaMemberM",
    name: "水舰队手下",
    script: "petalburg-woods-aqua",
    prize: 180,
    party: [{ species: "poochyena", level: 9 }],
  },
  haley: {
    script: "route104.haley",
    actor: "Lass",
    name: "少女 海莉",
    prize: 96,
    party: [
      { species: "lotad", level: 6 },
      { species: "shroomish", level: 6 },
    ],
  },
  ivan: {
    script: "route104.ivan",
    actor: "Fisherman",
    name: "渔夫 伊凡",
    prize: 280,
    party: [
      { species: "magikarp", level: 5 },
      { species: "magikarp", level: 6 },
      { species: "magikarp", level: 7 },
    ],
  },
  billy: {
    script: "route104.billy",
    actor: "Youngster",
    name: "短裤小子 比利",
    prize: 112,
    party: [
      { species: "zigzagoon", level: 5 },
      { species: "seedot", level: 7 },
    ],
  },
  ginaAndMia: {
    script: "route104.gina-and-mia",
    actor: "Twin",
    name: "双胞胎姐妹 吉娜与米娅",
    prize: 144,
    format: "doubles",
    requiresPartners: 2,
    party: [
      { species: "seedot", level: 6 },
      { species: "lotad", level: 6 },
    ],
  },
  winston: {
    script: "route104.winston",
    actor: "RichBoy",
    name: "富家少爷 温斯顿",
    prize: 1400,
    party: [{ species: "zigzagoon", level: 7 }],
  },
  cindy: {
    script: "route104.cindy",
    actor: "Woman2",
    name: "大小姐 辛迪",
    prize: 1400,
    party: [{ species: "zigzagoon", level: 7 }],
  },
  darian: {
    script: "route104.darian",
    actor: "Fisherman",
    name: "渔夫 达里安",
    prize: 360,
    party: [{ species: "magikarp", level: 9 }],
  },
  lyle: {
    script: "petalburg-woods.lyle",
    actor: "BugCatcher",
    name: "捕虫少年 莱尔",
    prize: 48,
    party: Array.from({ length: 4 }, () => ({ species: "wurmple", level: 3 })),
  },
  james: {
    script: "petalburg-woods.james",
    actor: "BugCatcher",
    name: "捕虫少年 詹姆斯",
    prize: 48,
    party: [
      { species: "nincada", level: 6 },
      { species: "nincada", level: 6 },
    ],
  },
};

/** One persistent prize identity for story rewards, generic settlement and trainer sight. */
export function trainerRewardId(id) {
  if (typeof id !== "string" || !id)
    throw new Error("Trainer reward requires an ID");
  return `trainer.${id}.prize`;
}
