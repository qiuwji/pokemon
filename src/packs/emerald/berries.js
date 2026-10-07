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
  chesto_berry: { item:"chesto_berry", name:"零余果", durationMinutes:180, minYield:2, maxYield:3 },
  rawst_berry: { item:"rawst_berry", name:"莓莓果", durationMinutes:180, minYield:2, maxYield:3 },
  aspear_berry: { item:"aspear_berry", name:"利木果", durationMinutes:180, minYield:2, maxYield:3 },
  persim_berry: { item:"persim_berry", name:"柿仔果", durationMinutes:180, minYield:2, maxYield:3 },
  pinap_berry: { item:"pinap_berry", name:"凰梨果", durationMinutes:60, minYield:3, maxYield:6 },
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
/** Source road object slots and EventScript_ResetAllBerries; empty soil has no tree. */
export const EMERALD_NATIVE_BERRIES = [
  ["Route102",7,24,2,"oran_berry"], ["Route102",8,25,2,"pecha_berry"],
  ["Route103",7,58,5,"cheri_berry"], ["Route103",8,59,5,"leppa_berry"], ["Route103",9,60,5,"cheri_berry"],
  ["Route104",10,34,6,"cheri_berry"], ["Route104",11,35,6,null], ["Route104",12,36,6,"leppa_berry"],
  ["Route104",13,22,41,"oran_berry"], ["Route104",14,23,41,null], ["Route104",15,24,41,"pecha_berry"],
  ["Route104",17,3,22,null], ["Route104",18,3,23,"oran_berry"], ["Route104",19,3,24,null], ["Route104",20,3,25,"cheri_berry"],
  ["Route116",1,18,2,"pinap_berry"], ["Route116",2,19,2,"chesto_berry"], ["Route116",9,20,2,"chesto_berry"], ["Route116",10,21,2,"pinap_berry"],
].map(([map,localId,x,y,initial]) => ({
  map, id: `emerald.${map.toLowerCase()}.berry.${localId}`, sourceLocalId: String(localId), x,y,initial,
}));
export const EMERALD_BERRY_PLOTS = Object.fromEntries(EMERALD_NATIVE_BERRIES.map(p => [p.id, { map:p.map, objectId:p.id }]));
// Save migration data, consumed once during restore; never a crop runtime branch.
export const EMERALD_BERRY_MARKER_MIGRATIONS = [{
  fromFlag:"nativeRoute104Berries",
  plots:EMERALD_NATIVE_BERRIES.filter(p => p.map === "Route104").map(p => p.id),
}];
export function nativeBerryObjects(map) {
  return EMERALD_NATIVE_BERRIES.filter(p => p.map === map).map(p => ({
    id:p.id, plotId:p.id, sourceLocalId:p.sourceLocalId, x:p.x, y:p.y, elevation:3, kind:"berryPlot", actor:"BerryTreeLateStages", name:"树果土壤",
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
