/** Generation III policy values, shared by creation and battle. Packs may override hooks. */
export const CREATION_POLICY = {
  individualValue: ({ trainer, rng }) => (trainer ? 0 : rng.int(32)),
  nature: ({ rng }) => rng.int(25),
  ability: ({ species }) => species.abilities[0],
};
export const BATTLE_POLICY = {
  forcedReplacementFree: true, // Replacement after fainting is not a voluntary switch turn.
  thawChance: 0.2,
  paralysisChance: 0.25,
  paralysisSpeedMultiplier: 0.25,
  confusionChance: 0.5,
  criticalChances: [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2],
  residualDivisor: 8,
  trapDivisor: 16,
  canCapture: ({ trainer, script }) => !trainer && script !== "rescue",
  canEscape: ({ trainer, script }) => !trainer && script !== "rescue",
  statusAllowed: ({ status, target, types }) =>
    !target.status &&
    !(
      status === "poison" &&
      (types.includes("poison") || types.includes("steel"))
    ) &&
    !(status === "burn" && types.includes("fire")) &&
    !(status === "freeze" && types.includes("ice")),
};
