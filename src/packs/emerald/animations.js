import { WEATHER_EFFECTS } from "../../presentation/weather-effects.js";
import { PresentationRegistry } from "../../presentation/effect-registry.js";
import { PIXEL_EFFECTS } from "../../presentation/pixel-effects.js";
import { FIELD_ACTION_EFFECTS } from "../../presentation/field-action-canvas.js";
import { BATTLE_MESSAGE_TEMPLATES } from "./battle-messages.js";
const track = (effect, anchor = "targets", start = 0, end = 1, parameters) => ({
  effect,
  anchor,
  start,
  end,
  ...(parameters ? { parameters } : {}),
});
const script = (effect, { duration = 760, lunge = 0, extra = [] } = {}) => ({
  duration,
  lunge,
  tracks: [track(effect), ...extra],
});
/** Content choices belong to the pack. Effects and script interpreter remain reusable. */
export const MOVE_ANIMATIONS = Object.freeze({
  tackle: {
    duration: 760,
    lunge: 26,
    tracks: [
      track("contact", "targets", 0, 1, {
        count: 14,
        radius: 9,
        reach: 36,
        pixelSize: 3,
        squash: 0.9,
        color: "#fff8d8",
      }),
    ],
  },
  pound: {
    duration: 700,
    lunge: 16,
    tracks: [
      track("contact", "targets", 0, 1, {
        count: 12,
        radius: 9,
        reach: 32,
        pixelSize: 3,
        squash: 0.95,
        color: "#fff8d8",
      }),
    ],
  },
  quick_attack: {
    duration: 460,
    lunge: 44,
    tracks: [
      track("contact", "targets", 0, 1, {
        count: 10,
        radius: 8,
        reach: 30,
        pixelSize: 3,
        color: "#fff8e0",
      }),
      track("slash", "targets", 0.15, 0.6, {
        count: 2,
        steps: 7,
        color: "#fff8e8",
        pixelSize: 2,
      }),
    ],
  },
  scratch: {
    duration: 700,
    lunge: 16,
    tracks: [
      track("slash", "targets", 0, 1, {
        count: 3,
        steps: 9,
        color: "#fff8e8",
        pixelSize: 3,
      }),
    ],
  },
  slash: {
    duration: 850,
    lunge: 0,
    tracks: [
      track("slash", "targets", 0, 1, {
        count: 4,
        steps: 11,
        spread: 8,
        color: "#fff8e8",
        pixelSize: 3,
      }),
    ],
  },
  cut: {
    duration: 760,
    lunge: 14,
    tracks: [
      track("slash", "targets", 0, 1, {
        count: 3,
        steps: 10,
        color: "#e8f8e0",
        pixelSize: 3,
      }),
    ],
  },
  fury_swipes: {
    duration: 900,
    lunge: 20,
    tracks: [
      track("slash", "targets", 0, 0.34, { count: 2, steps: 6 }),
      track("slash", "targets", 0.33, 0.67, { count: 2, steps: 6 }),
      track("slash", "targets", 0.66, 1, { count: 2, steps: 6 }),
    ],
  },
  ember: {
    duration: 880,
    lunge: 0,
    tracks: [
      track("flame", "targets", 0.1, 0.86, {
        count: 4,
        lead: 0.04,
        span: 0.5,
        trail: 0.06,
        wobble: 3,
        wobbleSpeed: 12,
        pixelSize: 5,
        taper: 0.7,
        arc: 26,
        burstAt: 1.1,
        emberAt: 0.8,
        emberCount: 8,
        emberSpread: 12,
        emberRise: 38,
        emberSize: 3,
        emberGrow: 3,
        color: "#f87828",
        color2: "#f8d850",
      }),
    ],
  },
  flamethrower: script("flame", {
    duration: 1150,
    extra: [track("beam", "targets", 0.2, 0.8)],
  }),
  fire_blast: script("flame", {
    duration: 1250,
    extra: [track("wave", "targets", 0.55, 1)],
  }),
  blaze_kick: script("flame", { lunge: 24 }),
  water_gun: {
    duration: 760,
    lunge: 0,
    tracks: [
      track("bubbles", "targets", 0, 0.9, {
        count: 10,
        speed: 2.2,
        gap: 0.05,
        wobble: 6,
        wobbleSpeed: 10,
        pixelSize: 4,
        sizeStep: 1,
        cycle: 3,
        color: "#78c8f8",
      }),
    ],
  },
  bubble: {
    duration: 900,
    lunge: 0,
    tracks: [
      track("bubbles", "targets", 0, 0.9, {
        count: 12,
        speed: 1.6,
        gap: 0.05,
        wobble: 8,
        pixelSize: 5,
        sizeStep: 2,
        cycle: 3,
        color: "#98d8f8",
      }),
    ],
  },
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
  absorb: {
    duration: 1000,
    lunge: 0,
    tracks: [
      track("drain", "targets", 0, 0.75, {
        count: 8,
        gap: 0.08,
        wobble: 10,
        pixelSize: 4,
        color: "#58b858",
        color2: "#a8d850",
      }),
      track("heal", "actor", 0.6, 1, {
        count: 6,
        radius: 16,
        base: 16,
        rise: 44,
        pixelSize: 6,
      }),
    ],
  },
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
  mud_slap: {
    duration: 700,
    lunge: 0,
    tracks: [
      track("rocks", "targets", 0, 1, {
        count: 8,
        gap: 0.07,
        spread: 18,
        drop: 46,
        fall: 64,
        pixelSize: 4,
        phase: 3,
        color: "#c8a068",
      }),
    ],
  },
  rock_throw: {
    duration: 760,
    lunge: 0,
    tracks: [
      track("rocks", "targets", 0, 1, {
        count: 10,
        gap: 0.07,
        spread: 22,
        drop: 52,
        fall: 70,
        pixelSize: 5,
        color: "#b8a048",
      }),
    ],
  },
  rock_slide: script("rocks", { duration: 1000 }),
  earthquake: script("wave", { duration: 1100 }),
  ice_beam: script("beam"),
  icy_wind: script("wave"),
  gust: script("wave"),
  dragon_breath: script("beam"),
  growl: {
    duration: 650,
    lunge: 0,
    tracks: [
      track("wave", "targets", 0, 0.7, {
        count: 14,
        radius: 6,
        reach: 40,
        pixelSize: 3,
        squash: 0.8,
        color: "#f8f8d0",
      }),
    ],
  },
  leer: {
    duration: 650,
    lunge: 0,
    tracks: [
      track("status", "targets", 0, 1, {
        count: 3,
        base: 10,
        step: 9,
        reach: 16,
        lineWidth: 2,
        color: "#f8e070",
      }),
    ],
  },
  tail_whip: {
    duration: 650,
    lunge: 8,
    tracks: [
      track("status", "targets", 0, 1, {
        count: 3,
        base: 12,
        step: 10,
        reach: 14,
        color: "#f8d8a0",
      }),
    ],
  },
  howl: {
    duration: 700,
    lunge: 0,
    tracks: [
      track("wave", "actor", 0, 0.8, {
        count: 16,
        radius: 8,
        reach: 48,
        pixelSize: 3,
        squash: 0.85,
        color: "#f8f0c0",
      }),
    ],
  },
  harden: {
    duration: 700,
    lunge: 0,
    tracks: [
      track("status", "actor", 0, 0.9, {
        count: 3,
        base: 12,
        step: 8,
        reach: 10,
        color: "#d8c890",
      }),
    ],
  },
  focus_energy: {
    duration: 750,
    lunge: 0,
    tracks: [
      track("status", "actor", 0, 0.7, {
        count: 2,
        base: 14,
        step: 12,
        reach: 8,
        color: "#f8d050",
      }),
      track("release", "actor", 0.4, 1, {
        count: 5,
        radius: 18,
        base: 18,
        rise: 40,
        pixelSize: 6,
        color: "#f8d050",
      }),
    ],
  },
  sand_attack: {
    duration: 750,
    lunge: 0,
    tracks: [
      track("rocks", "targets", 0, 1, {
        count: 10,
        gap: 0.06,
        spread: 24,
        drop: 50,
        fall: 60,
        pixelSize: 4,
        phase: 3,
        color: "#c8a068",
      }),
    ],
  },
  string_shot: {
    duration: 750,
    lunge: 0,
    tracks: [
      track("beam", "targets", 0, 0.5, { lineWidth: 2, color: "#e8e8b0" }),
      track("status", "targets", 0.1, 0.9, {
        count: 3,
        base: 10,
        step: 9,
        reach: 14,
        color: "#e8e8b0",
      }),
    ],
  },
  poison_sting: {
    duration: 700,
    lunge: 18,
    tracks: [
      track("contact", "targets", 0, 1, {
        count: 12,
        radius: 8,
        reach: 30,
        pixelSize: 3,
        color: "#b870c8",
      }),
      track("release", "targets", 0.4, 0.9, {
        count: 4,
        radius: 14,
        base: 14,
        rise: 30,
        pixelSize: 5,
        color: "#b870c8",
      }),
    ],
  },
  peck: {
    duration: 700,
    lunge: 20,
    tracks: [
      track("contact", "targets", 0, 1, {
        count: 10,
        radius: 8,
        reach: 28,
        pixelSize: 3,
        color: "#f8e8c0",
      }),
      track("slash", "targets", 0.3, 0.8, {
        count: 2,
        steps: 6,
        color: "#f8e8c0",
        pixelSize: 2,
      }),
    ],
  },
  protect: script("shield"),
  detect: script("shield"),
  rain_dance: script("status", { duration: 1000 }),
  sunny_day: script("status", { duration: 1000 }),
});
export function createEmeraldPresentation({
  host = null,
  onError = () => {},
  typeColors = null,
} = {}) {
  const registry = new PresentationRegistry({ onError, typeColors });
  for (const [id, draw] of Object.entries({
    ...WEATHER_EFFECTS,
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
  for (const [id, format] of Object.entries(BATTLE_MESSAGE_TEMPLATES))
    registry.message(id, format);
  for (const definition of host?.battleMessages?.values() || [])
    registry.message(definition.target, definition.format);
  return registry.seal();
}

/** Original ball art selection belongs to the pack; custom ball items may supply their own resource. */
export function emeraldBallResource(event) {
  const ball = event.item?.replace(/_?ball$/, "") || "poke";
  return (
    "battle-ball-" +
    (ball === "poke" ||
    [
      "great",
      "safari",
      "ultra",
      "master",
      "net",
      "dive",
      "nest",
      "repeat",
      "timer",
      "luxury",
      "premier",
    ].includes(ball)
      ? ball
      : "poke")
  );
}
