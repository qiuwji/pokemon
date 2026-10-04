import { manifest, objectSchema } from "../../helpers/session.js";
/** Test-only non-battle activity for RNG/economy/lifecycle checks. */
export const facilityFixture = manifest("fixture-facility", api => {
  const activity = api.content.register("facilityActivities", "reels", {
    parameters: objectSchema({ bet: { type: "integer", minimum: 1, maximum: 1000 } }, ["bet"]),
    state: objectSchema({ spins: { type: "integer", minimum: 0 },
      reels: { type: "array", minItems: 3, maxItems: 3, items: { type: "integer", minimum: 0, maximum: 5 } },
      payout: { type: "integer", minimum: 0 } }, ["spins", "reels", "payout"]),
    initial: { spins: 0, reels: [0, 0, 0], payout: 0 },
    actions: { spin: { label: "Fixture action", schema: objectSchema(), draws: [6, 6, 6],
      decide({ data, parameters, rolls }) {
        const payout = rolls.every(v => v === rolls[0]) ? parameters.bet * 10 : 0;
        return { data: { spins: data.spins + 1, reels: rolls, payout }, cost: { money: parameters.bet },
          ...(payout ? { reward: { money: payout } } : {}) };
      },
    } },
  });
  api.content.register("facilities", "game-room", { name: "Fixture activity", activity, parameters: { bet: 20 } });
}, ["facilities"]);
