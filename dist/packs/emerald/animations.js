import { PresentationRegistry } from "../../presentation/effect-registry.js";
import { PIXEL_EFFECTS } from "../../presentation/pixel-effects.js";
import { FIELD_ACTION_EFFECTS } from "../../presentation/field-action-canvas.js";
const track = (effect, anchor = "targets", start = 0, end = 1) => ({
  effect,
  anchor,
  start,
  end,
});
const script = (effect, { duration = 760, lunge = 0, extra = [] } = {}) => ({
  duration,
  lunge,
  tracks: [track(effect), ...extra],
});
/** Content choices belong to the pack. Effects and script interpreter remain reusable. */
export const MOVE_ANIMATIONS = Object.freeze({
  tackle: script("contact", { lunge: 24 }),
  pound: script("contact", { lunge: 15 }),
  quick_attack: script("contact", { duration: 500, lunge: 40 }),
  scratch: script("slash", { lunge: 14 }),
  slash: script("slash", { duration: 850 }),
  cut: script("slash"),
  fury_swipes: script("slash"),
  ember: script("flame", { duration: 880 }),
  flamethrower: script("flame", {
    duration: 1150,
    extra: [track("beam", "targets", 0.2, 0.8)],
  }),
  fire_blast: script("flame", {
    duration: 1250,
    extra: [track("wave", "targets", 0.55, 1)],
  }),
  blaze_kick: script("flame", { lunge: 24 }),
  water_gun: script("bubbles"),
  bubble: script("bubbles", { duration: 900 }),
  bubble_beam: script("bubbles", {
    duration: 1050,
    extra: [track("beam", "targets", 0.3, 0.8)],
  }),
  surf: script("wave", {
    duration: 1100,
    extra: [track("bubbles", "targets", 0.15, 0.9)],
  }),
  hydro_pump: script("beam", {
    duration: 1000,
    extra: [track("bubbles", "targets", 0.4, 1)],
  }),
  absorb: script("drain", {
    duration: 1000,
    extra: [track("heal", "actor", 0.6, 1)],
  }),
  mega_drain: script("drain", { duration: 1100 }),
  giga_drain: script("drain", { duration: 1200 }),
  razor_leaf: script("leaves"),
  bullet_seed: script("leaves", { duration: 700 }),
  vine_whip: script("slash"),
  thunder_shock: script("bolt"),
  thunderbolt: script("bolt", {
    duration: 950,
    extra: [track("wave", "targets", 0.5, 1)],
  }),
  thunder: script("bolt", { duration: 1200 }),
  spark: script("bolt", { lunge: 24 }),
  confusion: script("wave"),
  psybeam: script("beam"),
  psychic: script("wave", {
    duration: 1000,
    extra: [track("status", "actor", 0, 0.4)],
  }),
  mud_slap: script("rocks"),
  rock_throw: script("rocks"),
  rock_slide: script("rocks", { duration: 1000 }),
  earthquake: script("wave", { duration: 1100 }),
  ice_beam: script("beam"),
  icy_wind: script("wave"),
  gust: script("wave"),
  dragon_breath: script("beam"),
  growl: script("wave", { duration: 650 }),
  leer: script("status", { duration: 650 }),
  tail_whip: script("status", { duration: 650, lunge: 6 }),
  protect: script("shield"),
  detect: script("shield"),
  rain_dance: script("status", { duration: 1000 }),
  sunny_day: script("status", { duration: 1000 }),
});
export function createEmeraldPresentation({
  host = null,
  onError = () => {},
} = {}) {
  const registry = new PresentationRegistry({ onError });
  for (const [id, draw] of Object.entries({
    ...PIXEL_EFFECTS,
    ...FIELD_ACTION_EFFECTS,
  }))
    registry.effect(id, draw);
  for (const [id, definition] of host?.visualEffects || [])
    registry.effect(id, definition.draw);
  const overrides = new Map();
  for (const definition of host?.moveAnimations?.values() || []) {
    if (overrides.has(definition.moveId))
      throw new Error(`Duplicate move visual override ${definition.moveId}`);
    overrides.set(definition.moveId, definition.animation);
  }
  for (const [id, definition] of Object.entries(MOVE_ANIMATIONS))
    registry.move(id, overrides.get(id) || definition);
  for (const [id, definition] of overrides)
    if (!Object.hasOwn(MOVE_ANIMATIONS, id)) registry.move(id, definition);
  for (const [id, definition] of host?.battleAnimations || []) {
    const { id: registrationId, owner, ...choreography } = definition;
    registry.battle(id, choreography);
  }
  return registry.seal();
}
