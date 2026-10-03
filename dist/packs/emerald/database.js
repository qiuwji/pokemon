import { MACHINE_LEARNSETS } from "../../engine/rules/gen3/machine-learning.js";
import { GEN3_REFERENCE_MOVES } from "../../engine/rules/gen3/reference-metadata.js";
/** One pack bootstrap for both browser/plugin assembly and headless sessions. Native machine compatibility comes from the full reference table; new species supply their own machineMoves. */
export function emeraldDatabase(db) {
  return {
    ...db,
    species: Object.fromEntries(
      Object.entries(db.species).map(([id, species]) => [
        id,
        {
          ...species,
          machineMoves: MACHINE_LEARNSETS[id] ?? species.machineMoves ?? [],
        },
      ]),
    ),
    moves: Object.fromEntries(
      Object.entries({ ...GEN3_REFERENCE_MOVES, ...db.moves }).map(
        ([id, move]) => [id, { ...GEN3_REFERENCE_MOVES[id], ...move }],
      ),
    ),
  };
}
