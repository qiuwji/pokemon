import { objectSchema } from "../engine/extensions/values.js";
/** Non-battle extension example. Virtual game money only; intentionally not original game-room rules. */
export const facilityGames = {
  id: "facility-games",
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: ["facilities"],
  setup(api) {
    const state = objectSchema(
      {
        spins: { type: "integer", minimum: 0 },
        reels: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "integer", minimum: 0, maximum: 5 },
        },
        payout: { type: "integer", minimum: 0 },
      },
      ["spins", "reels", "payout"],
    );
    const activity = api.content.register("facilityActivities", "reels", {
      parameters: objectSchema(
        { bet: { type: "integer", minimum: 1, maximum: 1000 } },
        ["bet"],
      ),
      state,
      initial: { spins: 0, reels: [0, 0, 0], payout: 0 },
      actions: {
        spin: {
          label: "转动（每次 ¥20）",
          schema: objectSchema(),
          draws: [6, 6, 6],
          decide({ data, parameters, rolls }) {
            const payout = rolls.every((v) => v === rolls[0])
              ? parameters.bet * 10
              : 0;
            return {
              data: { spins: data.spins + 1, reels: rolls, payout },
              cost: { money: parameters.bet },
              ...(payout ? { reward: { money: payout } } : {}),
            };
          },
        },
      },
    });
    api.content.register("facilities", "game-room", {
      name: "游戏厅 · 转轮示例",
      activity,
      parameters: { bet: 20 },
    });
  },
};
