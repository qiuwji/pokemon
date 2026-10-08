import { EMERALD_REGION_MAP } from "../../../generated/packs/emerald/region-map-data.js";
export const EMERALD_REGION_GRID = EMERALD_REGION_MAP;
const names = {
  LITTLEROOT_TOWN: "未白镇", OLDALE_TOWN: "古辰镇", DEWFORD_TOWN: "武斗镇", LAVARIDGE_TOWN: "釜炎镇",
  FALLARBOR_TOWN: "秋叶镇", VERDANTURF_TOWN: "绿荫镇", PACIFIDLOG_TOWN: "暮水镇", PETALBURG_CITY: "橙华市",
  SLATEPORT_CITY: "凯那市", MAUVILLE_CITY: "紫堇市", RUSTBORO_CITY: "卡那兹市", FORTREE_CITY: "茵郁市",
  LILYCOVE_CITY: "水静市", MOSSDEEP_CITY: "绿岭市", SOOTOPOLIS_CITY: "琉璃市", EVER_GRANDE_CITY: "彩幽市",
  BATTLE_FRONTIER: "对战开拓区", MT_CHIMNEY: "烟囱山", SAFARI_ZONE: "狩猎地带", SOUTHERN_ISLAND: "南方孤岛",
};
export function emeraldRegionName(section) {
  if (!section) return "";
  const key = section.replace(/^MAPSEC_/, "");
  return names[key] || (/^ROUTE_\d+$/.test(key) ? key.slice(6) + " 号道路" : EMERALD_REGION_MAP.sections[section]?.name || "");
}
export function emeraldRegionLocation(position, maps) {
  if (!position) return null;
  const map = maps[position.map], original = EMERALD_REGION_MAP.bindings[position.map];
  const id = EMERALD_REGION_MAP.aliases[original] || original, section = EMERALD_REGION_MAP.sections[id];
  if (!map || !section?.width || !section?.height) return null;
  let x = 0, y = 0;
  if (!map.indoor && id === original) {
    x = Math.min(section.width - 1, Math.floor(position.x / Math.max(1, Math.floor(map.width / section.width))));
    y = Math.min(section.height - 1, Math.floor(position.y / Math.max(1, Math.floor(map.height / section.height))));
    // Nonuniform source region sections (InitMapBasedOnPlayerLocation).
    if (id === "MAPSEC_ROUTE_114" && y) x = 0;
    if (["MAPSEC_ROUTE_126", "MAPSEC_UNDERWATER_126"].includes(id)) {
      x = Number(position.x > 32) + Number(position.x > 51);
      y = Number(position.y > 37) + Number(position.y > 56);
    }
    if (id === "MAPSEC_ROUTE_121") x = Number(position.x > 14) + Number(position.x > 28) + Number(position.x > 54);
  }
  return { x: section.x + x, y: section.y + y, section: id };
}
