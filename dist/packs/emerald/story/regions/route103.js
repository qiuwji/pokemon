import { dialog, battle, flag, not, all, talkEvent } from "../helpers.js";
import { PACK } from "../../pack.js";
export const REGIONS_ROUTE103_EVENTS = [
  talkEvent(
    "rival.challenge",
    "rival",
    (s, { object }) => [
      dialog("emerald:dialogues.regions.route103.1", { line0: object.text }),
      battle(PACK.rival[s.flags.starter], 5, {
        trainer: true,
        script: "rival",
      }),
    ],
    all(flag("rescued"), not("rivalWon")),
  ),
  talkEvent(
    "rival.wait",
    "rival",
    () => [dialog("emerald:dialogues.regions.route103.2", {})],
    not("rescued"),
  ),
  {
    id: "rival.victory",
    trigger: "battleResult",
    once: true,
    match: ({ battle: b }) => b.script === "rival" && b.result === "win",
    build: (s, { battle: b }) => [
      { type: "face", actor: "rival.route103", target: "player" },
      { type: "reward", id: "rival.prize", flags: { rivalWon: true }, money: 300 * (b.prizeMultiplier || 1) },
      dialog(`emerald:route103.after.${s.playerGender === "female" ? "female" : "male"}`, {}),
      { type: "script", id: `emerald:route103.exit.${s.position.dir === "up" ? "north" : s.position.dir === "down" ? "south" : "side"}` },
    ],
  },
];
