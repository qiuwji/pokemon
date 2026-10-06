import fs from "node:fs";
/** PNG metadata is checked without browser decoding or loading the read-only reference. */
export function assertContentAssets(
  db,
  root = new URL("../generated/assets/", import.meta.url),
) {
  for (const [id, tiles] of Object.entries(db.tilesets)) {
    const location = new URL(`tiles-${id}.png`, root),
      header = fs.readFileSync(location);
    if (header.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
      throw new Error(`Not PNG: ${location}`);
    const width = header.readUInt32BE(16),
      height = header.readUInt32BE(20);
    const atlas = tiles.atlas;
    if (
      !atlas ||
      width !== atlas.width ||
      height !== atlas.height ||
      width !== tiles.columns * tiles.tileSize ||
      height % tiles.tileSize ||
      !Number.isInteger(atlas.tileCount) ||
      atlas.tileCount <= 0 ||
      atlas.tileCount > (width * height) / tiles.tileSize ** 2
    )
      throw new Error(
        `Tileset ${id}: atlas dimensions disagree with ${location}`,
      );
    for (const index of [
      ...Object.values(tiles.lookup),
      ...Object.values(tiles.animations).flatMap((a) => a.frames),
    ])
      if (!Number.isInteger(index) || index < 0 || index >= atlas.tileCount)
        throw new Error(`Tileset ${id}: atlas index out of bounds: ${index}`);
  }
}
