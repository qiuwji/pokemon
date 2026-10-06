import { dialog, flag, not, all, talkEvent } from "../helpers.js";
import { OPEN_BAG, RETURN_WITH_BIRCH } from "../common/scenes.js";
export const REGIONS_LITTLEROOT_EVENTS = [
  {
    id: "rescue.intro",
    trigger: "step",
    once: true,
    requires: all(not("rescued"), not("heardBirch")),
    match: ({ map, position }) => map === "Route101" &&
      position.y === 19 && [10, 11].includes(position.x),
    build: () => [{ type: "script", id: "emerald:route101.rescue-intro" }],
  },
  talkEvent("rescue.bag", "starter", () => OPEN_BAG, not("rescued")),
  // Route101/map.json: VAR_ROUTE101_STATE=2 coordinate events; the C
  // applymovement ignores object occupancy, including the bag south of (7,13).
  ...[
    { edge: "south", dir: "up", cells: [[10, 18], [11, 18]] },
    { edge: "west", dir: "right", cells: [[6, 15], [6, 16], [6, 17], [6, 18]] },
    { edge: "north", dir: "down", cells: [[7, 13]] },
  ].map(({ edge, dir, cells }) => ({
    id: `rescue.prevent-exit.${edge}`,
    trigger: "step",
    requires: all(flag("heardBirch"), not("rescued")),
    match: ({ map, position }) => map === "Route101" &&
      cells.some(([x, y]) => position.x === x && position.y === y),
    build: () => [
      dialog("emerald:dialogues.rescue.dont-leave", {}),
      { type: "move", actor: "player", path: [dir], ignoreActors: ["birchBag"] },
    ],
  })),
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
