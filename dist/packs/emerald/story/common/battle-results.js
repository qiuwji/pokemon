import { dialog } from "../helpers.js";
import { RETURN_TO_CENTER } from "../../scenes.js";
export const COMMON_BATTLE_RESULTS_EVENTS = [
  {
    id: "battle.capture",
    priority: -100,
    trigger: "battleResult",
    match: ({ battle: b }) => b.result === "caught",
    build: (s, { battle: b, db }) => [
      { type: "captureMonster", monster: structuredClone(b.enemy) },
      dialog(
        s.party.length < 6
          ? "emerald:dialogues.capture.party"
          : "emerald:dialogues.capture.box",
        { species: db.species[b.enemy.species].name },
      ),
    ],
  },
  {
    id: "battle.loss",
    priority: -100,
    trigger: "battleResult",
    match: ({ battle: b }) => b.result === "loss",
    build: () => [{ type: "lossPenalty" }, ...RETURN_TO_CENTER],
  },
];
