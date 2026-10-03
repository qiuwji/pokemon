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
  for (const map of Object.values(catalog.maps))
    for (const object of map.elements || [])
      if (
        object.kind === "berryPlot" &&
        (!plots[object.plotId] ||
          plots[object.plotId].objectId !== object.id ||
          plots[object.plotId].map !== map.id)
      )
        throw new Error("Unknown berry plot reference");
}
