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
};
