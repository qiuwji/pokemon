import { inventoryQuantity } from "../../engine/inventory.js";
/** Inventory and badge/move qualifications are pack policy, shared by live movement and save validation. */
export const BIKE_ITEMS = Object.freeze({
  "mach-bike": "mach_bike",
  "acro-bike": "acro_bike",
});
export const ROD_ITEMS = Object.freeze({
  old: "old_rod",
  good: "good_rod",
  super: "super_rod",
});
export function emeraldFieldCapabilities(state) {
  const knows = (id) =>
    state.party.some((m) => !m.egg && m.moves.some((s) => s.id === id));
  return {
    run: !!state.flags.runningShoes,
    ...Object.fromEntries(
      Object.entries(BIKE_ITEMS).map(([mode, item]) => [
        mode,
        inventoryQuantity(state.bag, item) > 0,
      ]),
    ),
    surf: !!state.flags.badgeBalance && knows("surf"),
    fly: !!state.flags.badgeFeather && knows("fly"),
    dive: !!state.flags.badgeMind && knows("dive"),
    waterfall: !!state.flags.badgeRain && knows("waterfall"),
  };
}
