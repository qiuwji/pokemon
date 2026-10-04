import {
  calculateStats,
  experienceAt,
  healMonster,
} from "../../engine/model.js";
import { battleSequence } from "../../engine/extensions/facility-templates/battle-sequence.js";
export const EMERALD_FACILITY_ACTIVITIES = {
  "core:battle-sequence": battleSequence({ trainers: ["youngster", "youngster"], money: 240, item: "potion" }),
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
