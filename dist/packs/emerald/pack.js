import { nativeCast } from "./native-cast.js";
import { bindNativeObjects } from "./native-object-bindings.js";
// The Emerald slice is a content pack. Engine classes know nothing about these characters.
export const PACK = {
  id: "emerald-hoenn-01",
  playerActors: {
    walk: "BrendanNormal",
    run: "BrendanRun",
    "mach-bike": "BrendanMachBike",
    "acro-bike": "BrendanAcroBike",
    surf: "BrendanSurf",
  },
  travelActor: "FlyBird",
  version: 15,
  title: "绿宝石 · 丰缘序章",
  // WarpToTruck() starts at the centre of the truck interior.
  start: { map: "InsideOfTruck", x: 2, y: 2, dir: "down" },
  starters: ["treecko", "torchic", "mudkip"],
  rival: { treecko: "torchic", torchic: "mudkip", mudkip: "treecko" },
};
export const TYPE_NAMES = {
  normal: "一般",
  grass: "草",
  fire: "火",
  water: "水",
  fighting: "格斗",
  flying: "飞行",
  poison: "毒",
  ground: "地面",
  rock: "岩石",
  bug: "虫",
  ghost: "幽灵",
  steel: "钢",
  electric: "电",
  psychic: "超能力",
  ice: "冰",
  dragon: "龙",
  dark: "恶",
};
export const STATUS_NAMES = {
  poison: "中毒",
  toxic: "剧毒",
  burn: "灼伤",
  paralysis: "麻痹",
  sleep: "睡眠",
  freeze: "冰冻",
};
export { ABILITY_NAMES as ABILITIES } from "./ability-names.js";
export const NATURES = [
  "勤奋",
  "怕寂寞",
  "勇敢",
  "固执",
  "顽皮",
  "大胆",
  "坦率",
  "悠闲",
  "淘气",
  "乐天",
  "胆小",
  "急躁",
  "认真",
  "爽朗",
  "天真",
  "内敛",
  "慢吞吞",
  "冷静",
  "害羞",
  "马虎",
  "温和",
  "温顺",
  "自大",
  "慎重",
  "浮躁",
];
export { ITEMS } from "./items.js";
export { questFor } from "./quests.js";
export { validateSave } from "./save-contract.js";
// Assembly only: gameplay roles and native binding are separate responsibilities.
export function objectsFor(state, db) {
  const map = state.position.map;
  return bindNativeObjects(map, nativeCast(state, db), db.maps[map].npcs);
}
