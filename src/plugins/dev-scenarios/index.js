import { objectSchema } from "../../engine/extensions/values.js";

/**
 * Developer test tools. A disabled-by-default plugin that places a "测试员" object on several maps
 * and opens a nested menu of scenarios through the real story entry system — teleport, heal, wild
 * encounters, practice battles and, for the battle-presentation work, one demo trainer per move so
 * a single move animation can be triggered deterministically. Only public APIs (content + story
 * bundles) are used; no private imports, no per-plugin branches. Enable in the plugin manager or
 * with `?plugins=dev-scenarios`.
 */
const TERMINALS = Object.freeze([
  { label: "未白镇", map: "LittlerootTown", x: 10, y: 1, stand: { x: 10, y: 2 } },
  { label: "古辰镇", map: "OldaleTown", x: 8, y: 1, stand: { x: 8, y: 2 } },
  { label: "101 号道路", map: "Route101", x: 8, y: 1, stand: { x: 8, y: 2 } },
  { label: "103 号道路", map: "Route103", x: 4, y: 2, stand: { x: 4, y: 3 } },
  {
    label: "研究所",
    map: "LittlerootTown_ProfessorBirchsLab",
    x: 1,
    y: 2,
    stand: { x: 1, y: 3 },
  },
  {
    label: "宝可梦中心",
    map: "OldaleTown_PokemonCenter_1F",
    x: 1,
    y: 2,
    stand: { x: 1, y: 3 },
  },
]);

/** Move showcase: one demo trainer per move, grouped by the grammar the effects use. */
const MOVE_GROUPS = Object.freeze([
  {
    label: "普通/接触",
    moves: [
      ["tackle", "撞击"],
      ["pound", "拍击"],
      ["scratch", "抓"],
      ["quick_attack", "电光一闪"],
      ["slash", "劈开"],
    ],
  },
  { label: "火系", moves: [["ember", "火花"], ["flamethrower", "喷射火焰"]] },
  { label: "水系", moves: [["water_gun", "水枪"], ["bubble", "泡沫"]] },
  { label: "草系", moves: [["absorb", "吸取"], ["razor_leaf", "飞叶快刀"]] },
  { label: "电系", moves: [["thunder_shock", "电击"], ["thunderbolt", "十万伏特"]] },
  {
    label: "岩石/地面",
    moves: [
      ["mud_slap", "撒泥"],
      ["rock_throw", "投掷岩石"],
      ["sand_attack", "撒沙"],
    ],
  },
  {
    label: "变化/状态",
    moves: [
      ["growl", "叫声"],
      ["leer", "瞪眼"],
      ["howl", "长嚎"],
      ["harden", "变硬"],
      ["focus_energy", "集气"],
      ["poison_sting", "毒针"],
      ["string_shot", "吐丝"],
      ["peck", "啄"],
    ],
  },
]);

/** Wild-encounter demos exercise each species' own learnset animation. */
const WILD = Object.freeze([
  ["poochyena", 3, "土狼犬 Lv3"],
  ["zigzagoon", 4, "蛇纹熊 Lv4"],
  ["wurmple", 4, "刺尾虫 Lv4"],
  ["ralts", 4, "拉鲁拉丝 Lv4"],
  ["taillow", 5, "傲骨燕 Lv5"],
  ["wingull", 5, "长翅鸥 Lv5"],
]);

// A bulky, low-offence dummy so the demo mon survives long enough to act each turn.
const DEMO = Object.freeze({ species: "wurmple", level: 20 });

/**
 * Progress checkpoints live in the core story bundle `emerald:progress` (the pack owns the
 * flags/reward ledger); the tester only picks a chapter and calls that script by id.
 */
const PROGRESS_PRESETS = Object.freeze([
  ["pokedex", "拿到图鉴（未白镇）"],
  ["oldale", "古辰镇（图鉴+跑步鞋）"],
  ["petalburg", "橙华市（小光教学前）"],
  ["wallydone", "小光教学完成（橙华道馆）"],
]);

const terminalId = (index) => `dev-scenarios:terminal.${index}`;
const moveTrainer = (moveId) => `dev-scenarios:move.${moveId}`;
const teleport = (map, x, y) => ({
  type: "scene",
  kind: "fade",
  position: { map, x, y, dir: "up" },
});
const call = (script) => ({ type: "call", script });
const choice = (prompt, options, cancel) => ({
  type: "choice",
  name: "测试员",
  prompt,
  cancel,
  options,
});
// Story call cycles are rejected at assembly, so submenus close rather than call back to the root;
// reopen the menu by interacting with the tester again.
const closeOption = { id: "close", label: "关闭", commands: [] };

export function devScenarios(api) {
  TERMINALS.forEach((t, index) =>
    api.content.register("mapExtensions", `patch.${index}`, {
      map: t.map,
      elements: [
        {
          id: terminalId(index),
          x: t.x,
          y: t.y,
          actor: "Scientist1",
          dir: "down",
          kind: "talk",
          name: "测试员",
          text: "",
          movement: { mode: "still", rangeX: 0, rangeY: 0 },
        },
      ],
    }),
  );

  for (const group of MOVE_GROUPS)
    for (const [moveId] of group.moves)
      api.content.register("trainers", `move.${moveId}`, {
        name: `招式演示·${moveId}`,
        script: "dev-scenarios:demo",
        prize: 0,
        party: [{ ...DEMO, moves: [moveId] }],
      });

  // One flat menu; the native window is scrollable and keyboard navigation scrolls the focused
  // row into view, so every entry stays reachable.
  const scripts = {
    menu: {
      parameters: objectSchema(),
      commands: [
        choice("开发测试菜单", [
          ...PROGRESS_PRESETS.map(([preset, label]) => ({
            id: `progress.${preset}`,
            label: `进度·${label}`,
            commands: [{ type: "script", id: `emerald:progress.${preset}` }],
          })),
          {
            id: "practice",
            label: "训练家入场（抛球）",
            commands: [
              teleport(TERMINALS[0].map, TERMINALS[0].stand.x, TERMINALS[0].stand.y),
              { type: "battle", trainerId: "youngster" },
            ],
          },
          { id: "wild", label: "遇敌演示", commands: [call("wild")] },
          { id: "moves", label: "招式演示", commands: [call("movemenu")] },
          { id: "travel", label: "仅传送·不改进度", commands: [call("travel")] },
          { id: "healdemo", label: "治疗画面（宝可梦中心）", commands: [call("healdemo")] },
          {
            id: "itemdemo",
            label: "获得道具（特写）",
            commands: [
              {
                type: "reward",
                id: "dev-scenarios:item.potion",
                items: { potion: 1 },
              },
            ],
          },
          { id: "heal", label: "恢复队伍", commands: [{ type: "heal" }] },
          closeOption,
        ], "close"),
      ],
    },
    travel: {
      parameters: objectSchema(),
      commands: [
        choice("传送到", [
          ...TERMINALS.map((t, index) => ({
            id: `go${index}`,
            label: t.label,
            commands: [teleport(t.map, t.stand.x, t.stand.y)],
          })),
          closeOption,
        ], "close"),
      ],
    },
    wild: {
      parameters: objectSchema(),
      commands: [
        choice("选择野生宝可梦", [
          ...WILD.map(([species, level, label], index) => ({
            id: `wild${index}`,
            label,
            commands: [{ type: "battle", species, level }],
          })),
          closeOption,
        ], "close"),
      ],
    },
    movemenu: {
      parameters: objectSchema(),
      commands: [
        choice("招式演示：选择分类", [
          ...MOVE_GROUPS.map((group, index) => ({
            id: `group${index}`,
            label: group.label,
            commands: [call(`movegroup${index}`)],
          })),
          closeOption,
        ], "close"),
      ],
    },
    healdemo: {
      parameters: objectSchema(),
      commands: [
        {
          type: "scene",
          kind: "fade",
          coverMs: 220,
          holdMs: 400,
          revealMs: 320,
          position: {
            map: "OldaleTown_PokemonCenter_1F",
            x: 7,
            y: 4,
            dir: "up",
          },
        },
        { type: "heal", variant: "center" },
      ],
    },
  };
  MOVE_GROUPS.forEach((group, index) => {
    scripts[`movegroup${index}`] = {
      parameters: objectSchema(),
      commands: [
        choice(`招式演示 · ${group.label}`, [
          ...group.moves.map(([moveId, label]) => ({
            id: moveId,
            label,
            commands: [{ type: "battle", trainerId: moveTrainer(moveId) }],
          })),
          closeOption,
        ], "close"),
      ],
    };
  });

  // Menu page: grant a second party member so switch/double-battle animations can be tested.
  const giveMon = api.actions.register("give-mon", {
    schema: objectSchema(),
    run: (ctx) =>
      ctx.intent({
        kind: "createMonster",
        species: "zigzagoon",
        level: 20,
        placement: "party",
      }),
  });
  const panel = api.ui.page("panel", {
    title: "开发者",
    render: () => ({
      kind: "panel",
      children: [
        { kind: "heading", text: "开发者工具" },
        { kind: "button", text: "加入一只 Lv20 测试宝可梦", action: giveMon },
        { kind: "text", text: "加入后进入战斗，用「宝可梦」菜单替换即可看到换人动画。" },
        { kind: "text", text: "进度跳转：与地图上的「测试员」交互选「通关进度」。" },
      ],
    }),
  });
  api.ui.entry("panel", { slot: "menu", label: "开发者", page: panel });

  api.story.registerBundle("tools", {
    version: 1,
    dialogues: { greeting: { name: "测试员", lines: ["这里是开发测试点。"] } },
    scripts,
    entries: Object.fromEntries(
      TERMINALS.map((t, index) => [
        `terminal.${index}`,
        {
          trigger: "interact",
          selector: { objectId: terminalId(index) },
          script: "menu",
        },
      ]),
    ),
  });
}

export const devScenariosPlugin = {
  id: "dev-scenarios",
  apiVersion: 1,
  version: "1.2.0",
  dataVersion: 1,
  permissions: ["createMonster"],
  setup: devScenarios,
};
