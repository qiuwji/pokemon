// Declarative choreography: actor IDs, grid positions and commands only. No rendering code.
const dialog = (dialogue, parameters = {}) => ({
  type: "dialog",
  dialogue,
  parameters,
});

export const RESCUE_INTRO = [
  dialog("emerald:dialogues.scenes.1", {}),
  { type: "cameraTo", actor: "birch", ms: 420 },
  {
    type: "parallel",
    commands: [
      { type: "move", actor: "birch", path: ["down", "down", "up"] },
      { type: "move", actor: "pursuer", path: ["down", "down", "up"] },
      { type: "emote", actor: "birch", kind: "exclamation", ms: 550 },
    ],
  },
  { type: "face", actor: "birch", dir: "right" },
  dialog("emerald:dialogues.scenes.2", {}),
  { type: "cameraFollow", ms: 420 },
  { type: "flag", key: "heardBirch", value: true },
];

export const OPEN_BAG = [
  { type: "move", actor: "player", to: { map: "Route101", x: 6, y: 14 } },
  { type: "face", actor: "player", dir: "right" },
  { type: "wait", ms: 180 },
  { type: "starter" },
];

export const RETURN_WITH_BIRCH = [
  { type: "hide", actor: "pursuer" },
  { type: "approach", actor: "birch", target: "player" },
  {
    type: "parallel",
    commands: [
      { type: "face", actor: "birch", target: "player" },
      { type: "face", actor: "player", target: "birch" },
    ],
  },
  { type: "emote", actor: "birch", kind: "exclamation", ms: 450 },
  dialog("emerald:dialogues.scenes.3", {}),
  { type: "heal" },
  { type: "cameraFollow", ms: 220 },
  { type: "escort", actor: "birch", to: { map: "Route101", x: 10, y: 17 } },
  { type: "wait", ms: 180 },
  {
    type: "scene",
    kind: "door",
    position: {
      map: "LittlerootTown_ProfessorBirchsLab",
      x: 6,
      y: 11,
      dir: "up",
    },
    actors: [
      {
        id: "birch",
        actor: "ProfBirch",
        kind: "professor",
        name: "小田卷博士",
        x: 6,
        y: 10,
        dir: "up",
      },
    ],
  },
  { type: "wait", ms: 180 },
  {
    type: "escort",
    actor: "birch",
    to: { map: "LittlerootTown_ProfessorBirchsLab", x: 6, y: 4 },
  },
  {
    type: "parallel",
    commands: [
      { type: "face", actor: "birch", dir: "down" },
      { type: "face", actor: "player", dir: "up" },
    ],
  },
  { type: "wait", ms: 200 },
  { type: "flag", key: "rescued", value: true },
  dialog("emerald:dialogues.scenes.4", {}),
];

export const RETURN_TO_CENTER = [
  {
    type: "scene",
    kind: "door",
    position: { map: "OldaleTown_PokemonCenter_1F", x: 7, y: 7, dir: "up" },
  },
  { type: "move", actor: "player", to: { x: 7, y: 5 } },
  { type: "emote", actor: "player", kind: "heart", ms: 650 },
  { type: "heal" },
  dialog("emerald:dialogues.scenes.5", {}),
];

export function healingScene(object) {
  return [
    dialog("emerald:dialogues.scenes.6", {
      speaker: object.name,
      line0: object.text,
    }),
    { type: "emote", actor: "player", kind: "heart", ms: 650 },
    { type: "heal" },
    { type: "wait", ms: 200 },
    dialog("emerald:dialogues.scenes.7", { speaker: object.name }),
  ];
}
