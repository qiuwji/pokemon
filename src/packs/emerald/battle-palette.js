/** Original damage-type colours consumed by move and impact effects. Content owns the table; the
 * presentation layer only receives an opaque colour through the injected palette port. */
export const EMERALD_TYPE_COLORS = Object.freeze({
  normal: "#fff8d8",
  fire: "#f87828",
  water: "#58b8f8",
  grass: "#60b850",
  electric: "#f8d830",
  psychic: "#e878c0",
  poison: "#b870c8",
  bug: "#90c050",
  ground: "#c8a068",
  fighting: "#c85838",
  flying: "#b0a0e8",
  rock: "#b8a048",
  ghost: "#7860a8",
  dragon: "#7860f8",
  dark: "#786858",
  steel: "#b8b8d0",
  ice: "#98e0e0",
});

/** Palette lookup for a damage-type id; unknown types fall back to the neutral tone. */
export const emeraldTypeColor = (type) =>
  EMERALD_TYPE_COLORS[type] || EMERALD_TYPE_COLORS.normal;
