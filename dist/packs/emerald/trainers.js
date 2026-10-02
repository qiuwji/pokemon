import { createMonster } from "../../engine/model.js";
import { teamRoster } from "../../engine/battle/roster.js";
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
export function validateTrainers(definitions, db) {
  for (const [id, trainer] of Object.entries(definitions)) {
    if (
      trainer.format !== undefined &&
      !["singles", "doubles"].includes(trainer.format)
    )
      throw new Error(`Invalid trainer format ${id}`);
    const sideIds = new Set(["home", "away"]);
    for (const rival of trainer.rivals || []) {
      if (!/^[a-zA-Z0-9_.:-]+$/.test(rival.id || "") || sideIds.has(rival.id))
        throw new Error(`Invalid rival ID ${rival.id}`);
      sideIds.add(rival.id);
    }
    for (const rival of trainer.rivals || [])
      validateTrainers(
        { [rival.id]: { ...rival, script: "rival", prize: 0 } },
        db,
      );
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

/** Content constructs topology; the battle engine only consumes it. */
export function createTrainerEncounter(trainer, { party, bag, db, rng }) {
  validateTrainers({ selected: trainer }, db);
  if (
    party.filter((m) => m.hp > 0 && !m.egg).length <
    (trainer.requiresPartners || 1)
  )
    throw new Error("需要两位还能战斗的伙伴才能参加这场练习。");
  const enemyParty = createTrainerTeam(trainer, db, rng);
  const seats = trainer.format === "doubles" ? 2 : 1;
  const topology = teamRoster(party, enemyParty, bag, seats);
  for (const rival of trainer.rivals || []) {
    const team = createTrainerTeam(
        { ...rival, script: "rival", prize: 0 },
        db,
        rng,
      ),
      controllerId = `${rival.id}:controller`;
    topology.sides.push({
      id: rival.id,
      allianceId: rival.id,
      controllers: [{ id: controllerId, kind: "ai", party: team }],
      seats: Array.from({ length: Math.min(seats, team.length) }, (_, i) => ({
        id: `${rival.id}:${i}`,
        controllerId,
      })),
    });
  }
  return {
    enemyParty,
    topology,
    trainer: true,
    script: trainer.script,
    format: trainer.format || "singles",
  };
}
