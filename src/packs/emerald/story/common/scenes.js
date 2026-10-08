// Declarative choreography: actor IDs, grid positions and commands only. No rendering code.
const dialog = (dialogue, parameters = {}) => ({
  type: "dialog",
  dialogue,
  parameters,
});
// The whiteout return is still the Oldale centre, so its nurse is the one to turn there.
const OLDALE_CENTER_NURSE =
  "core:npc.OldaleTown_PokemonCenter_1F.LOCALID_OLDALE_NURSE";

export const OPEN_BAG = [
  { type: "move", actor: "player", to: { map: "Route101", x: 6, y: 14 } },
  { type: "face", actor: "player", dir: "right" },
  { type: "wait", ms: 180 },
  { type: "starter" },
];

export const RETURN_WITH_BIRCH = [
  // The danger theme (MUS_HELP) is over once the battle ends, but the rescue flag cannot move up
  // here: the pursuer/birch projections only exist while !rescued. So override the field music
  // directly for the walk back, then clear it on entering the lab so the lab's own theme plays.
  { type: "music", cue: "emerald-audio:mus_route101" },
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
  // Back on default: clearing the story cue lets emeraldMusic resolve the lab map's own theme.
  { type: "music" },
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

// Defeat white-out, from the original DoWhiteOut + CB2_WhiteOut (src/overworld.c): the battle
// screen clears to black, holds ~120 frames, then the party is restored and the player reappears
// at the last heal location with a fade in from black (money halved in StoryApplication.lossPenalty).
// We stage that arrival at the centre counter so the shared heal beat — the party being restored —
// is visible, without the earlier walk/emote/nurse dialogue.
export const RETURN_TO_CENTER = [
  {
    type: "scene",
    kind: "fade",
    coverMs: 220,
    holdMs: 2000,
    revealMs: 320,
    // The tile directly in front of the counter (the counter wall is row 3).
    position: {
      map: "OldaleTown_PokemonCenter_1F",
      x: 7,
      y: 4,
      dir: "up",
    },
  },
  { type: "face", actor: OLDALE_CENTER_NURSE, dir: "left" },
  { type: "heal", variant: "center" },
  { type: "face", actor: OLDALE_CENTER_NURSE, dir: "down" },
];

export function healingScene(object, map) {
  // The Pokémon Centre nurse runs the full machine animation (balls in, palette blink, out);
  // other healers (e.g. mom) keep the simple beat.
  if (object.kind === "heal")
    return [
      { type:"face", actor:object.id, target:"player" },
      dialog("emerald:dialogues.npc.heal.center.welcome", { speaker:object.name }),
      { type:"choice", name:object.name, prompt:"要让宝可梦休息一下吗？", cancel:"no", options:[
        { id:"yes", label:"是", commands:[
      dialog("emerald:dialogues.npc.heal.center.before", {
        speaker: object.name,
      }),
      // Turn the nurse this interaction belongs to toward the machine, then back.
      { type: "face", actor: object.id, dir: "left" },
      { type: "presentation", id: "emerald:nurse-left", payload: { map, id: object.id } },
      { type: "heal", variant: "center" },
      { type: "face", actor: object.id, dir: "down" },
      { type: "presentation", id: "emerald:nurse-down", payload: { map, id: object.id } },
      dialog("emerald:dialogues.npc.heal.center.after", {
        speaker: object.name,
      }),
      { type: "presentation", id: "emerald:nurse-bow", payload: { map, id: object.id } },
        ] },
        { id:"no", label:"否", commands:[] },
      ] },
      dialog("emerald:dialogues.npc.heal.center.goodbye", { speaker:object.name }),
    ];
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
