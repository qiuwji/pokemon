import { matchesCondition } from "../../engine/conditions.js";
export const QUESTS = [
  {
    id: "rescue",
    destination: { map: "Route101", kind: "bag" },
    number: "01",
    title: "草丛里的求救声",
    description: "沿未白镇北边的小路前往 101 号道路，调查博士的背包。",
    complete: { flag: "rescued" },
  },
  {
    id: "rival",
    destination: { map: "Route103", x: 10, y: 3, kind: "rival" },
    number: "02",
    title: "与小遥初次交手",
    description:
      "穿过古辰镇，向北到 103 号道路找小遥。出发前可以去宝可梦中心恢复。",
    requires: { flag: "rescued" },
    complete: { flag: "rivalWon" },
  },
  {
    id: "pokedex",
    destination: { map: "LittlerootTown_ProfessorBirchsLab", objectId: "birch", x: 6, y: 4 },
    number: "03",
    title: "属于你的宝可梦图鉴",
    description: "返回未白镇研究所，向小田卷博士报告。他有一份礼物要给你。",
    requires: { flag: "rivalWon" },
    complete: { flag: "pokedex" },
  },
  {
    id: "explore",
    destination: { maps: ["Route101", "Route103"], kind: "grass" },
    number: "04",
    title: "记录丰缘的伙伴",
    description:
      "在 101 和 103 号道路探索草丛，捕捉伙伴。图鉴会记录你见过和捕获的宝可梦。",
    requires: { flag: "pokedex" },
  },
];
export function questFor(stateOrFlags) {
  const state = stateOrFlags.flags ? stateOrFlags : { flags: stateOrFlags };
  return QUESTS.find(
    (q) =>
      matchesCondition(q.requires, state) &&
      (!q.complete || !matchesCondition(q.complete, state)),
  );
}
