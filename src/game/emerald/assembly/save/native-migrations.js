import { EMERALD_BERRY_MARKER_MIGRATIONS, EMERALD_BERRY_PLOTS, EMERALD_CROPS, EMERALD_CROP_POLICY, emeraldBerryYield } from "../../../../packs/emerald/berries.js";
import { CropRegistry, CropService } from "../../domain/crop-growth.js";

// The first imported Pinap definition used 180 minutes and a 2–3 yield.
// Accept only a tree valid under that released definition; other damage remains invalid.
export function migrateNativeCropDefinitions(state, catalog) {
  const definition = catalog.crops?.pinap_berry;
  if (!definition || definition.durationMinutes !== 60 || definition.minYield !== 3 || definition.maxYield !== 6)
    return state;
  const current = new CropRegistry({ pinap_berry: definition }, { items: catalog.items });
  const legacy = new CropRegistry({ pinap_berry: { ...EMERALD_CROPS.pinap_berry, durationMinutes: 180, minYield: 2, maxYield: 3 } }, { items: catalog.items });
  const valid = (registry, id, tree) => {
    try {
      new CropService({ registry, state: { trees: { [id]: tree } }, policy: EMERALD_CROP_POLICY, calculateYield: emeraldBerryYield });
      return true;
    } catch { return false; }
  };
  for (const [id, tree] of Object.entries(state.crops?.trees || {})) {
    if (!EMERALD_BERRY_PLOTS[id] || tree?.kind !== "pinap_berry" || valid(current, id, tree) || !valid(legacy, id, tree)) continue;
    tree.remainingMinutes = Math.max(1, Math.ceil(tree.remainingMinutes / 3));
    if (tree.stage === "ripe") tree.yield = Math.max(definition.minYield, tree.yield);
  }
  return state;
}

/** Project old pack-owned receipts into current receipts without reseeding any tree. */
export function migrateNativeBerryMarkers(state) {
  for (const {fromFlag,plots} of EMERALD_BERRY_MARKER_MIGRATIONS) {
    if (state.flags[fromFlag] !== true) continue;
    for (const id of plots) state.flags[`nativeBerryInitialized.${id}`] = true;
    delete state.flags[fromFlag];
  }
  return state;
}
