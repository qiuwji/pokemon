import {
  calculateStats,
  experienceAt,
  healMonster,
} from "../../engine/model.js";
import { objectSchema } from "../../engine/extensions/values.js";
const id = { type: "string", minLength: 1, maxLength: 128 };
const progress = objectSchema(
  { round: { type: "integer", minimum: 0, maximum: 100 } },
  ["round"],
);
export const EMERALD_FACILITY_ACTIVITIES = {
  "core:battle-sequence": {
    parameters: objectSchema(
      {
        trainers: { type: "array", minItems: 1, maxItems: 100, items: id },
        money: { type: "integer", minimum: 0 },
        item: id,
      },
      ["trainers", "money"],
    ),
    state: progress,
    initial: { round: 0 },
    validate(definition, refs) {
      if (!definition.team)
        throw new Error("Battle facility requires a team policy");
      for (const id of definition.parameters.trainers) {
        const trainer = refs.trainers[id];
        if (
          !trainer ||
          definition.team.min <
            (trainer.requiresPartners || (trainer.format === "doubles" ? 2 : 1))
        )
          throw new Error("Invalid facility trainer or team size");
      }
      if (definition.parameters.item && !refs.items[definition.parameters.item])
        throw new Error("Unknown facility reward item");
    },
    actions: {
      next: {
        label: "开始下一场",
        schema: objectSchema(),
        decide: ({ data, parameters }) => {
          if (data.round >= parameters.trainers.length)
            throw new Error("Facility sequence already completed");
          return {
            data,
            battle: {
              trainerId: parameters.trainers[data.round],
              weather: null,
            },
          };
        },
      },
    },
    onBattle({ data, parameters }, result) {
      if (result === "loss") return { data, outcome: "loss" };
      const next = { round: data.round + 1 };
      return next.round === parameters.trainers.length
        ? {
            data: next,
            pendingReward: {
              money: parameters.money,
              ...(parameters.item ? { items: { [parameters.item]: 1 } } : {}),
            },
          }
        : { data: next };
    },
  },
};
export const EMERALD_FACILITIES = {
  "practice-series": {
    name: "两场连战练习",
    activity: "core:battle-sequence",
    requires: { flag: "rescued" },
    team: {
      min: 1,
      max: 3,
      levelCap: 20,
      uniqueSpecies: true,
      heldItems: true,
      items: false,
      healBetween: true,
    },
    parameters: {
      trainers: ["youngster", "youngster"],
      money: 240,
      item: "potion",
    },
  },
};
/** Temporary normalized team; no RNG and no write to an owned creature. */
export function projectFacilityTeam(members, definition, db) {
  return members.map((source) => {
    const mon = structuredClone(source);
    if (definition.team?.levelCap && mon.level > definition.team.levelCap) {
      mon.level = definition.team.levelCap;
      mon.exp = experienceAt(mon.level, db.species[mon.species].growth);
      mon.stats = calculateStats(mon, db.species[mon.species]);
    }
    if (definition.team?.heldItems === false) mon.heldItem = null;
    delete mon.pendingMoves;
    delete mon.pendingEvolution;
    healMonster(mon, db);
    return mon;
  });
}
