import { createMonster } from "../../engine/model.js";
/** Training encounter demonstrates team mechanics without changing the original rival team. */
export const TRAINERS = {
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
export function validateTrainers(definitions, db) {
  for (const [id, trainer] of Object.entries(definitions)) {
    if (
      !trainer.name ||
      !trainer.script ||
      !Number.isInteger(trainer.prize) ||
      trainer.prize < 0 ||
      !Array.isArray(trainer.party) ||
      !trainer.party.length ||
      trainer.party.length > 6 ||
      trainer.party.some(
        (m) =>
          !db.species[m.species] ||
          !Number.isInteger(m.level) ||
          m.level < 1 ||
          m.level > 100,
      )
    )
      throw new Error(`Invalid trainer ${id}`);
  }
}
export function createTrainerTeam(trainer, db, rng) {
  validateTrainers({ selected: trainer }, db);
  return trainer.party.map(({ species, level }) =>
    createMonster(species, level, db, rng, { trainer: true }),
  );
}
