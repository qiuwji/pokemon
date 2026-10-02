import {
  damage,
  captureCheck,
  grantExperience,
  accuracyMultiplier,
} from "./model.js";
import { BATTLE_POLICY } from "./rule-policy.js";
export const BATTLE_RULES = {
  payDayReward: ({ result, coins, multiplier }) =>
    result === "win" ? coins * multiplier : 0,
  rewardCurrency: ({ current, amount }) => Math.min(999999, current + amount),
  ...BATTLE_POLICY,
  outcome: ({
    homeAlive,
    awayAlive,
    livingAlliances,
    homeAlliance,
    interactiveAlliances,
  }) => {
    if (!livingAlliances)
      return !homeAlive ? "loss" : !awayAlive ? "win" : null;
    if (livingAlliances.length <= 1)
      return {
        result: homeAlive ? "win" : "loss",
        winner: livingAlliances[0] || null,
      };
    return !homeAlive && !interactiveAlliances.size
      ? { result: "loss", winner: null }
      : null;
  },
  experienceAward: ({ species, level }) =>
    Math.floor((species.expYield * level) / 7),
  experienceFinal: ({ amount, trainer, traded }) => {
    if (trainer) amount = Math.floor(amount * 1.5);
    if (traded) amount = Math.floor(amount * 1.5);
    return amount;
  },
  damage,
  captureCheck,
  grantExperience,
  accuracy: ({ move, stages, rng, modifier = (v) => v }) =>
    !move.accuracy ||
    rng.int(100) <
      modifier(
        Math.floor(
          move.accuracy * accuracyMultiplier(Math.max(-6, Math.min(6, stages))),
        ),
      ),
  critical: ({ stage, rng, chances }) =>
    rng.next() < chances[Math.min(chances.length - 1, stage)],
  environmentPower: ({ power, type, waterSport, mudSport }) =>
    (waterSport && type === "fire") || (mudSport && type === "electric")
      ? Math.max(1, Math.floor(power / 2))
      : power,
};
