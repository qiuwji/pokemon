import { validDarkness } from "./map-lighting.js";
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
    if (map.darkness !== undefined)
      check(validDarkness(map.darkness), path + ".darkness");
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
    for (const encounter of [
      ...(map.encounters || []),
      ...(map.waterEncounters || []),
    ])
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
  for (const [id, actor] of Object.entries(db.actors)) {
    const prefix = `actors.${id}`;
    check(
      Number.isInteger(actor.w) &&
        actor.w > 0 &&
        actor.w % 8 === 0 &&
        Number.isInteger(actor.h) &&
        actor.h > 0 &&
        actor.h % 8 === 0,
      prefix + ".grid",
    );
    for (const key of ["offsetX", "offsetY"])
      check(
        actor[key] === undefined || Number.isInteger(actor[key]),
        prefix + "." + key,
      );
    if (actor.frames)
      for (const direction of ["down", "up", "left", "right"]) {
        check(
          Number.isInteger(actor.frames.facing?.[direction]) &&
            actor.frames.facing[direction] >= 0,
          prefix + ".facing." + direction,
        );
        check(
          Array.isArray(actor.frames.walk?.[direction]) &&
            actor.frames.walk[direction].length > 0 &&
            actor.frames.walk[direction].every(
              (v) => Number.isInteger(v) && v >= 0,
            ),
          prefix + ".walk." + direction,
        );
      }
    const visited = new Set([id]);
    let underlay = actor.underlay;
    while (underlay) {
      const valid = !!db.actors[underlay.actor] && !visited.has(underlay.actor);
      check(valid, prefix + ".underlay");
      if (!valid) break;
      visited.add(underlay.actor);
      underlay = db.actors[underlay.actor].underlay;
    }
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
    if (species.machineMoves !== undefined) {
      check(Array.isArray(species.machineMoves), `species.${id}.machineMoves`);
      if (Array.isArray(species.machineMoves)) {
        check(
          new Set(species.machineMoves).size === species.machineMoves.length,
          `species.${id}.machineMoves duplicates`,
        );
        for (const move of species.machineMoves)
          check(!!db.moves[move], `species.${id}.machineMoves.${move}`);
      }
    }
    for (const row of species.learnset || [])
      check(!!db.moves[row.move], `species.${id}.learnset.${row.move}`);
  }
  for (const [id, move] of Object.entries(db.moves)) {
    const path = `moves.${id}`;
    check(
      typeof move.name === "string" && move.name.length > 0,
      path + ".name",
    );
    check(
      typeof move.effect === "string" && move.effect.length > 0,
      path + ".effect",
    );
    check(Number.isInteger(move.power) && move.power >= 0, path + ".power");
    check(
      Number.isInteger(move.accuracy) &&
        move.accuracy >= 0 &&
        move.accuracy <= 100,
      path + ".accuracy",
    );
    check(Number.isInteger(move.pp) && move.pp > 0, path + ".pp");
    check(Number.isInteger(move.priority), path + ".priority");
    check(
      Number.isInteger(move.chance) && move.chance >= 0 && move.chance <= 100,
      path + ".chance",
    );
  }
  for (const [id, value] of Object.entries(db.evolutions || {})) {
    for (const rule of Array.isArray(value) ? value : [value])
      check(
        !!db.species[id] &&
          !!db.species[rule.to] &&
          (Array.isArray(value)
            ? typeof rule.id === "string" &&
              ["level", "item", "trade"].includes(rule.trigger) &&
              Array.isArray(rule.conditions)
            : rule.level > 0),
        `evolutions.${id}`,
      );
  }
  return [...new Set(errors)];
}
export function assertContent(db) {
  const errors = validateContent(db);
  if (errors.length)
    throw new Error("Invalid content: " + errors.slice(0, 12).join(", "));
  return db;
}
