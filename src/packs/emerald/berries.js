// Gen3 berry.c: four water stages, ripe duration x4, ten regrowths and the 71-duration offline cutoff.
export const EMERALD_CROP_POLICY = {
  stages: [
    { id: "planted", duration: 1, water: true, next: "sprouted" },
    { id: "sprouted", duration: 1, water: true, next: "taller" },
    { id: "taller", duration: 1, water: true, next: "flowering" },
    { id: "flowering", duration: 1, water: true, next: "ripe" },
    { id: "ripe", duration: 4, harvest: true, cycle: true, next: "sprouted" },
  ],
  maxCycles: 10,
  expireAfterDurations: 71,
};
export function emeraldBerryYield(
  { definition: { minYield, maxYield }, watered },
  random,
) {
  if (!watered) return minYield;
  const sample = random();
  if (!Number.isInteger(sample) || sample < 0 || sample >= 65536)
    throw new Error("Invalid berry random sample");
  const spread = maxYield - minYield,
    value = spread * (watered - 1) + (sample % (spread + 1));
  return minYield + Math.floor(value / 4) + (value % 4 >= 2 ? 1 : 0);
}
export const EMERALD_CROPS = {
  pecha_berry: { item: "pecha_berry", name: "桃桃果", durationMinutes: 180, minYield: 2, maxYield: 3 },
  leppa_berry: { item: "leppa_berry", name: "苹野果", durationMinutes: 240, minYield: 2, maxYield: 3 },
  oran_berry: {
    item: "oran_berry",
    name: "橙橙果",
    durationMinutes: 180,
    minYield: 2,
    maxYield: 3,
  },
  cheri_berry: {
    item: "cheri_berry",
    name: "樱子果",
    durationMinutes: 180,
    minYield: 2,
    maxYield: 3,
  },
};
/** Source Route104 object slots and EventScript_ResetAllBerries; empty soil has no tree. */
export const EMERALD_NATIVE_BERRIES = [
  [10,34,6,"cheri_berry"], [11,35,6,null], [12,36,6,"leppa_berry"],
  [13,22,41,"oran_berry"], [14,23,41,null], [15,24,41,"pecha_berry"],
  [17,3,22,null], [18,3,23,"oran_berry"], [19,3,24,null], [20,3,25,"cheri_berry"],
].map(([localId,x,y,initial]) => ({
  map: "Route104", id: `emerald.route104.berry.${localId}`, sourceLocalId: String(localId), x,y,initial,
}));
export const EMERALD_BERRY_PLOTS = Object.fromEntries(EMERALD_NATIVE_BERRIES.map(p => [p.id, { map:p.map, objectId:p.id }]));
export function nativeBerryObjects(map) {
  return EMERALD_NATIVE_BERRIES.filter(p => p.map === map).map(p => ({
    id:p.id, plotId:p.id, sourceLocalId:p.sourceLocalId, x:p.x, y:p.y, kind:"berryPlot", actor:"BerryTreeLateStages", name:"树果土壤",
    movement:{ mode:"still",dir:"down",rangeX:0,rangeY:0 },
  }));
}
/** Plots refer to existing map objects; plugins extend maps through the normal content contract. */
export function validateBerryPlots(plots, catalog) {
  for (const [id, plot] of Object.entries(plots || {})) {
    const map = catalog.maps[plot.map],
      object = map?.elements?.find((e) => e.id === plot.objectId);
    if (
      Object.keys(plot).some((k) => !["map", "objectId"].includes(k)) ||
      !object ||
      object.kind !== "berryPlot" ||
      object.plotId !== id
    )
      throw new Error(`Invalid berry plot ${id}`);
  }
  for (const [mapId, map] of Object.entries(catalog.maps))
    for (const object of map.elements || [])
      if (
        object.kind === "berryPlot" &&
        (!plots[object.plotId] ||
          plots[object.plotId].objectId !== object.id ||
          plots[object.plotId].map !== mapId)
      )
        throw new Error("Unknown berry plot reference");
}
