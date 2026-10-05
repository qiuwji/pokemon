/** field_control_avatar.c: behavior-driven furniture interactions exist even without a BG event. */
const SCRIPTS = new Map([
  [0x85, "EventScript_RegionMap"],
  [0x86, "EventScript_TV"],
  [0xe0, "EventScript_PictureBookShelf"],
  [0xe1, "EventScript_BookShelf"],
  [0xe2, "EventScript_PokemonCenterBookShelf"],
]);

export function nativeBackgrounds(map) {
  const signs = [...(map.signs || [])];
  map.behavior.forEach((behavior, index) => {
    const script = SCRIPTS.get(behavior);
    const x = index % map.width, y = Math.floor(index / map.width);
    if (!script || signs.some(sign => sign.x === x && sign.y === y)) return;
    signs.push({ type: "sign", x, y, elevation: 0,
      player_facing_dir: "BG_EVENT_PLAYER_FACING_NORTH", script });
  });
  const facings = { BG_EVENT_PLAYER_FACING_NORTH: "up", BG_EVENT_PLAYER_FACING_SOUTH: "down",
    BG_EVENT_PLAYER_FACING_WEST: "left", BG_EVENT_PLAYER_FACING_EAST: "right" };
  return signs.map(sign => ({ ...sign,
    ...(facings[sign.player_facing_dir] ? { interactFacing: facings[sign.player_facing_dir] } : {}) }));
}
