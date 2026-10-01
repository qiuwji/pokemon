// Declarative choreography: actor IDs, grid positions and commands only. No rendering code.
const dialog = (name, ...lines) => ({ type: "dialog", name, lines });

export const RESCUE_INTRO = [
  dialog("远处传来的声音", "救命啊！"),
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
  dialog("小田卷博士", "那边的包里有精灵球，快选一只来帮我！"),
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
  dialog(
    "小田卷博士",
    "你救了我！真是太感谢你了。",
    "这里说话不方便，跟我到研究所来吧！",
  ),
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
  dialog(
    "小田卷博士",
    "这只宝可梦就送给你，成为你的搭档吧。",
    "小遥在 103 号道路做野外调查。沿 101 号道路向北，穿过古辰镇去找她吧！",
  ),
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
  dialog("乔伊小姐", "你被送到了宝可梦中心。伙伴们已经恢复体力，重新出发吧！"),
];

export function healingScene(object) {
  return [
    dialog(object.name, object.text),
    { type: "emote", actor: "player", kind: "heart", ms: 650 },
    { type: "heal" },
    { type: "wait", ms: 200 },
    dialog(object.name, "好了！宝可梦的体力和招式 PP 都恢复了。欢迎随时再来！"),
  ];
}
