import { isWater, isGrass, hasEncounterTerrain } from "../../engine/terrain.js";
/** Native opening-slice eligibility; the host does not know this flag or Gen III terrain values. */
export const EMERALD_ENCOUNTER_POLICIES = {
  "emerald-step": {
    channel: "step",
    priority: 0,
    decide(c) {
      if (
        !c.party.some((m) => !m.egg) ||
        !c.flags.rescued ||
        c.dialog ||
        c.steps - c.lastEncounterSteps <= 3
      )
        return null;
      if (
        c.mode === "surf" &&
        isWater(c.cell?.behavior) &&
        hasEncounterTerrain(c.cell?.behavior)
      )
        return { area: "water" };
      return isGrass(c.cell?.behavior) ? { area: "land" } : null;
    },
  },
};
