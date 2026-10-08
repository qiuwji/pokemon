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
  default: Object.freeze({ resource: "battle-anim-board_grass", width: 512, height: 112 }),
  ...Object.fromEntries(["grass", "long_grass", "pond", "mountain", "cave", "water", "underwater", "sand", "indoor", "plain"].map(terrain =>
    [terrain, Object.freeze({ resource: "battle-anim-board_" + terrain, width: 512, height: 112 })])),
  forest: Object.freeze({ resource: "battle-bg-forest", ...palette("#b8d898", "#588860") }),
  snow: Object.freeze({ resource: "battle-bg-snow", ...palette("#e8f8ff", "#b8d8e8") }),
});
