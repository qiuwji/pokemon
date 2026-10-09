import { HOENN_DEX, LAUNCH_MENU_BACKGROUND } from "../../../generated/packs/emerald/launch-art.js";
export { LAUNCH_MENU_BACKGROUND };
const BADGES = ["badgeStone", "badgeKnuckle", "badgeDynamo", "badgeHeat", "badgeBalance", "badgeFeather", "badgeMind", "badgeRain"];
const regional = new Set(HOENN_DEX);
function saveSummary(state, species) {
  return state ? { name: state.playerName, gender: state.playerGender,
      time: `${Math.min(999, Math.floor(state.playSeconds / 3600))}:${String(Math.floor(state.playSeconds / 60) % 60).padStart(2, "0")}`,
      dex: state.flags.pokedex ? new Set(state.caught.filter(id => regional.has(species[id]?.dex))).size : null,
      badges: BADGES.filter(id => state.flags[id]).length } : null;
}
/** Original main_menu.c window dimensions, extended with one direct Continue card per save. */
export function emeraldLaunchMenu(saveDocument, species, { saves } = {}) {
  const entries = saves ? saves.map(save => ({ id: `continue:${save.id}`, saveId: save.id,
    label: saves.length > 1 ? `继续游戏 · 存档 ${save.number}` : "继续游戏",
    height: 64, summary: saveSummary(save.state, species) })) :
    saveDocument?.state ? [{ id: "continue", label: "继续游戏", height: 64,
      summary: saveSummary(saveDocument.state, species) }] : [];
  let top = 0;
  return [...entries, { id: "new", label: "新游戏", height: 32 },
    { id: "options", label: "设置", height: 32 }].map(entry => {
    const positioned = { ...entry, top }; top += entry.height; return positioned;
  });
}
