import { HOENN_DEX, LAUNCH_MENU_BACKGROUND } from "../../../generated/packs/emerald/launch-art.js";
export { LAUNCH_MENU_BACKGROUND };
const BADGES = ["badgeStone", "badgeKnuckle", "badgeDynamo", "badgeHeat", "badgeBalance", "badgeFeather", "badgeMind", "badgeRain"];
const regional = new Set(HOENN_DEX);
/** Original main_menu.c tile origins and conditional saved-game projection. */
export function emeraldLaunchMenu(saveDocument, species) {
  const state = saveDocument?.state;
  const entries = state ? [{ id: "continue", label: "继续游戏", top: 0, height: 64,
    summary: { name: state.playerName, gender: state.playerGender,
      time: `${Math.min(999, Math.floor(state.playSeconds / 3600))}:${String(Math.floor(state.playSeconds / 60) % 60).padStart(2, "0")}`,
      dex: state.flags.pokedex ? new Set(state.caught.filter(id => regional.has(species[id]?.dex))).size : null,
      badges: BADGES.filter(id => state.flags[id]).length } }] : [];
  return [...entries, { id: "new", label: "新游戏", top: state ? 64 : 0, height: 32 },
    { id: "options", label: "设置", top: state ? 96 : 32, height: 32 }];
}
