import { dialog, flag, not, all, talkEvent } from "../helpers.js";
import { RESCUE_INTRO, OPEN_BAG, RETURN_WITH_BIRCH } from "../../scenes.js";
export const REGIONS_LITTLEROOT_EVENTS = [
  {
    id: "rescue.intro",
    trigger: "step",
    once: true,
    requires: all(not("rescued"), not("heardBirch")),
    match: ({ map }) => map === "Route101",
    build: () => RESCUE_INTRO,
  },
  talkEvent("rescue.bag", "starter", () => OPEN_BAG, not("rescued")),
  {
    ...talkEvent(
      "professor.pokedex",
      "professor",
      () => [{ type: "script", id: "emerald:professor-lab.give-dex" }],
      all(flag("rescued"), { reward: "rival.prize" }, not("pokedex")),
    ),
    once: true,
  },
  talkEvent(
    "professor.away",
    "professor",
    () => [dialog("emerald:dialogues.regions.littleroot.2", {})],
    not("rescued"),
  ),
  talkEvent(
    "professor.rival",
    "professor",
    () => [dialog("emerald:dialogues.regions.littleroot.3", {})],
    all(flag("rescued"), not("rivalWon")),
  ),
  talkEvent(
    "professor.report",
    "professor",
    (s) => [
      dialog("emerald:dialogues.regions.littleroot.4", {
        "line0.0": s.caught.length,
      }),
    ],
    flag("pokedex"),
  ),
  talkEvent("rescue.pursuer", "wildObject", () => [
    dialog("emerald:dialogues.regions.littleroot.5", {}),
  ]),
  {
    id: "rescue.return",
    priority: 20,
    trigger: "battleResult",
    once: true,
    requires: not("rescued"),
    match: ({ battle: b }) =>
      b.script === "rescue" && ["win", "loss"].includes(b.result),
    build: () => RETURN_WITH_BIRCH,
  },
];
