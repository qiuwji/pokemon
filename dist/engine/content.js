/** Structural content contract, checked before loading assets or starting a game. */
export function validateContent(db) {
  const errors = [];
  const check = (condition, path) => {
    if (!condition) errors.push(path);
  };
  for (const key of [
    "maps",
    "tilesets",
    "actors",
    "species",
    "moves",
    "typeChart",
  ]) {
    check(db?.[key] && typeof db[key] === "object", key);
  }
  if (errors.length) return errors;
  for (const [id, map] of Object.entries(db.maps)) {
    const path = `maps.${id}`;
    check(
      Number.isInteger(map.width) &&
        map.width > 0 &&
        Number.isInteger(map.height) &&
        map.height > 0,
      path + ".size",
    );
    check(map.blocks?.length === map.width * map.height, path + ".blocks");
    check(map.behavior?.length === map.width * map.height, path + ".behavior");
    const tiles = db.tilesets[map.tileset];
    check(!!tiles, path + ".tileset");
    check(map.border?.length === 4, path + ".border");
    for (const key of ["connections", "warps", "npcs", "signs"])
      check(Array.isArray(map[key]), path + "." + key);
    if (tiles)
      for (const block of [...(map.blocks || []), ...(map.border || [])])
        check(
          tiles.metatiles[block & 1023]?.length === 8,
          path + `.metatile[${block & 1023}]`,
        );
    for (const encounter of map.encounters || [])
      check(
        !!db.species[encounter.species] &&
          encounter.min >= 1 &&
          encounter.max >= encounter.min &&
          encounter.weight > 0,
        path + ".encounter",
      );
  }
  for (const [id, tiles] of Object.entries(db.tilesets)) {
    check(
      tiles.tileSize === 8 && tiles.gridSize === 16 && tiles.columns > 0,
      `tilesets.${id}.grid`,
    );
    for (const values of Object.values(tiles.metatiles))
      for (const value of values)
        check(
          tiles.lookup[value & ~3072] !== undefined,
          `tilesets.${id}.lookup[${value & ~3072}]`,
        );
  }
  for (const [id, species] of Object.entries(db.species)) {
    check(
      Array.isArray(species.types) && species.types.length > 0,
      `species.${id}.types`,
    );
    for (const stat of ["hp", "atk", "def", "spa", "spd", "spe"])
      check(
        Number.isFinite(species.stats?.[stat]) && species.stats[stat] > 0,
        `species.${id}.stats.${stat}`,
      );
    for (const row of species.learnset || [])
      check(!!db.moves[row.move], `species.${id}.learnset.${row.move}`);
  }
  for (const [id, evolution] of Object.entries(db.evolutions || {}))
    check(
      !!db.species[id] && !!db.species[evolution.to] && evolution.level > 0,
      `evolutions.${id}`,
    );
  return [...new Set(errors)];
}
export function assertContent(db) {
  const errors = validateContent(db);
  if (errors.length)
    throw new Error("Invalid content: " + errors.slice(0, 12).join(", "));
  return db;
}
