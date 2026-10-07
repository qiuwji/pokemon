export {
  validateTrainers,
  createTrainerTeam,
  createTrainerEncounter,
} from "../../engine/trainer-encounters.js";
/** Training encounter demonstrates team mechanics without changing the original rival team. */
export const TRAINERS = {
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
};

/** One persistent prize identity for story rewards, generic settlement and trainer sight. */
export function trainerRewardId(id) {
  if (typeof id !== "string" || !id)
    throw new Error("Trainer reward requires an ID");
  return `trainer.${id}.prize`;
}
