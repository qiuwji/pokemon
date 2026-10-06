import { dialog, flag, not, talkEvent } from "./helpers.js";
import { TRAINERS, trainerRewardId } from "../trainers.js";
export const TRAINING_EVENTS = [
  talkEvent(
    "trainer.arena",
    "arena",
    (s, { object }) =>
      s.party.filter((m) => m.hp > 0 && !m.egg).length < 2
        ? [dialog("emerald:dialogues.training.1", { speaker: object.name })]
        : [
            dialog("emerald:dialogues.training.2", {
              speaker: object.name,
              line0: object.text,
            }),
            { type: "battle", trainerId: object.trainerId },
          ],
    flag("rescued"),
  ),
  {
    id: "trainer.arena.result",
    trigger: "battleResult",
    match: ({ battle: b }) =>
      ["doubles", "freeForAll"].includes(b.trainerId) && b.result === "win",
    build: (s, { battle: b }) => {
      const id = b.trainerId,
        trainer = TRAINERS[id];
      return [
        {
          type: "reward",
          id: trainerRewardId(id),
          money: trainer.prize * (b.prizeMultiplier || 1),
        },
        dialog(
          s.story.rewards.includes(trainerRewardId(id))
            ? "emerald:dialogues.training.repeat"
            : "emerald:dialogues.training.victory",
          {
            speaker: trainer.name,
            prize: trainer.prize * (b.prizeMultiplier || 1),
          },
        ),
      ];
    },
  },
  talkEvent(
    "trainer.practice",
    "trainer",
    (s, { object }) => [
      dialog("emerald:dialogues.training.4", {
        speaker: object.name,
        line0: object.text,
      }),
      { type: "battle", trainerId: object.trainerId },
    ],
    flag("rescued"),
  ),
  {
    id: "trainer.practice.prize",
    trigger: "battleResult",
    once: true,
    requires: not("practiceWon"),
    match: ({ battle: b }) => b.trainerId === "youngster" && b.result === "win",
    build: (s, { battle: b }) => [
      {
        type: "reward",
        id: trainerRewardId(b.trainerId),
        flags: { practiceWon: true },
        money: TRAINERS.youngster.prize * (b.prizeMultiplier || 1),
      },
      dialog("emerald:dialogues.training.5", {
        "line0.0": TRAINERS.youngster.prize * (b.prizeMultiplier || 1),
      }),
    ],
  },
  {
    id: "trainer.practice.rematch",
    trigger: "battleResult",
    requires: flag("practiceWon"),
    match: ({ battle: b }) => b.trainerId === "youngster" && b.result === "win",
    build: () => [dialog("emerald:dialogues.training.6", {})],
  },
];
