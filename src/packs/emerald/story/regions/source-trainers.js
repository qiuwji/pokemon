import { TRAINERS, trainerRewardId } from "../../trainers.js";
import SOURCE_CAST from "../../native-source-data.json" with { type: "json" };

const ids = new Set(Object.values(SOURCE_CAST.trainers).filter(id => !["billy", "ivan", "darian", "lyle"].includes(id)));

export const SOURCE_TRAINER_EVENTS = [
  {
    id: "source-trainer.interact",
    trigger: "interact",
    priority: 12,
    selector: { kind: "sourceTrainer" },
    build: (state, { object }) => {
      if (!TRAINERS[object.trainerId] || !ids.has(object.trainerId))
        return [{ type: "dialog", name: object.name, lines: [object.text] }];
      const rewardId = trainerRewardId(object.trainerId);
      if (state.story.rewards.includes(rewardId))
        return [{ type: "dialog", name: object.name, lines: ["这次是我输了……你真的很强！"] }];
      const trainer = TRAINERS[object.trainerId];
      if (trainer.format === "doubles" && state.party.filter((mon) => mon.hp > 0 && !mon.egg).length < 2)
        return [{ type: "dialog", name: object.name, lines: ["要进行双打对战，队伍里至少需要两只可以战斗的宝可梦。"] }];
      return [
        { type: "dialog", name: object.name, lines: [object.text || "来吧！让我见识一下你的实力！"] },
        { type: "battle", trainerId: object.trainerId },
      ];
    },
  },
  {
    id: "source-trainer.result",
    trigger: "battleResult",
    priority: 12,
    match: ({ battle }) => ids.has(battle.trainerId) && battle.result === "win",
    build: (_state, { battle }) => [
      { type: "reward", id: trainerRewardId(battle.trainerId), money: TRAINERS[battle.trainerId].prize * (battle.prizeMultiplier || 1) },
      { type: "dialog", name: TRAINERS[battle.trainerId].name, lines: ["输了……你真强！"] },
    ],
  },
];
