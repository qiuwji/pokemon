/**
 * Emerald battle-background table (pack content), keyed by the battle environment's terrain.
 * `battle-canvas` draws it generically: `resource` wins, otherwise `sky`/`ground`/`platforms`.
 * Terrain keys a resource that is not installed fall through to the palette.
 */
const PLATFORMS = Object.freeze([
  Object.freeze([30, 151, 102]),
  Object.freeze([208, 69, 82]),
]);
const palette = (sky, ground) => ({ sky, ground, platforms: PLATFORMS });

export const EMERALD_BATTLE_BACKGROUNDS = Object.freeze({
  default: Object.freeze({ resource: "battle-bg" }),
  grass: Object.freeze({ resource: "battle-bg" }),
  long_grass: Object.freeze({ resource: "battle-bg" }),
  pond: Object.freeze({ resource: "battle-bg" }),
  mountain: Object.freeze({ resource: "battle-bg" }),
  cave: Object.freeze({ resource: "battle-bg-cave", ...palette("#706878", "#484050") }),
  water: Object.freeze({ resource: "battle-bg-water", ...palette("#b8e0f8", "#58a8c8") }),
  underwater: Object.freeze({ resource: "battle-bg-underwater", ...palette("#b8e0f8", "#58a8c8") }),
  sand: Object.freeze({ resource: "battle-bg-sand", ...palette("#f8e0b0", "#c8b078") }),
  forest: Object.freeze({ resource: "battle-bg-forest", ...palette("#b8d898", "#588860") }),
  snow: Object.freeze({ resource: "battle-bg-snow", ...palette("#e8f8ff", "#b8d8e8") }),
  indoor: Object.freeze({ resource: "battle-bg-indoor", ...palette("#d8d8e0", "#8898a8") }),
});
