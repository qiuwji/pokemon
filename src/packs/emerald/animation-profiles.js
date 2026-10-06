export const ANIMATION_PROFILES = {
  tackle: "contact",
  scratch: "contact",
  pound: "contact",
  quick_attack: "contact",
  ember: "projectile",
  water_gun: "projectile",
  mud_slap: "projectile",
  poison_sting: "projectile",
  gust: "projectile",
  confusion: "projectile",
  absorb: "projectile",
  growl: "status",
  leer: "status",
  tail_whip: "status",
};

/** Per-move profiles above win; this only classifies the remaining moves by type. */
const PROJECTILE_TYPES = Object.freeze([
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
]);
export const emeraldMoveProfile = (type) =>
  PROJECTILE_TYPES.includes(type) ? "projectile" : "contact";
