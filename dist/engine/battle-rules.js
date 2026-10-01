import {
  damage,
  captureCheck,
  grantExperience,
  accuracyMultiplier,
} from "./model.js";
import { BATTLE_POLICY } from "./rule-policy.js";
export const BATTLE_RULES = {
  ...BATTLE_POLICY,
  outcome: ({ homeAlive, awayAlive }) =>
    !homeAlive ? "loss" : !awayAlive ? "win" : null,
  experienceAward: ({ species, level, trainer }) =>
    Math.floor((species.expYield * level * (trainer ? 1.5 : 1)) / 7),
  damage,
  captureCheck,
  grantExperience,
  accuracy: ({ move, stages, rng }) =>
    !move.accuracy ||
    rng.next() * 100 <
      move.accuracy * accuracyMultiplier(Math.max(-6, Math.min(6, stages))),
  critical: ({ stage, rng, chances }) =>
    rng.next() < chances[Math.min(chances.length - 1, stage)],
  environmentPower: ({ power, type, waterSport, mudSport }) =>
    (waterSport && type === "fire") || (mudSport && type === "electric")
      ? Math.max(1, Math.floor(power / 2))
      : power,
};
