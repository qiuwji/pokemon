/** Generation III policy values, shared by creation and battle. Packs may override hooks. */
export const CREATION_POLICY = {
  individualValue: ({ trainer, rng }) => (trainer ? 0 : rng.int(32)),
  nature: ({ personality }) => personality % 25,
  gender: ({ species, personality }) =>
    species.genderless
      ? "—"
      : (personality & 255) < Math.floor((species.femaleRatio ?? 0.5) * 256)
        ? "♀"
        : "♂",
  ability: ({ species, personality }) =>
    species.abilities[personality & 1] || species.abilities[0],
};
export const BATTLE_POLICY = {
  forcedReplacementFree: true, // Replacement after fainting is not a voluntary switch turn.
  thawChance: 0.2,
  paralysisChance: 0.25,
  paralysisSpeedMultiplier: 0.25,
  confusionChance: 0.5,
  criticalChances: [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2],
  residualDivisor: 8,
  protectSuccessRates: [65535, 32767, 16383, 8191],
  trapDivisor: 16,
  canCapture: ({ trainer, script }) => !trainer && script !== "rescue",
  canEscape: ({ trainer, script }) => !trainer && script !== "rescue",
  canSteal: ({ battle, actorSeat, item }) =>
    battle.roster.owner(actorSeat).kind === "human" &&
    item !== "enigma_berry" &&
    !item.endsWith("_mail"),
  statusAllowed: ({ status, target, types }) =>
    !target.status &&
    !(
      status === "poison" &&
      (types.includes("poison") || types.includes("steel"))
    ) &&
    !(status === "burn" && types.includes("fire")) &&
    !(status === "freeze" && types.includes("ice")),
};
