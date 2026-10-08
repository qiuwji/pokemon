import { WEATHER_EFFECTS } from "../../presentation/weather-effects.js";
import { PresentationRegistry } from "../../presentation/effect-registry.js";
import { PIXEL_EFFECTS } from "../../presentation/pixel-effects.js";
import { FIELD_ACTION_EFFECTS } from "../../presentation/field-action-canvas.js";
import { BATTLE_MESSAGE_TEMPLATES } from "./battle-messages.js";
import { registerEmeraldBattleSequences } from "./battle/sequences.js";
import { createEmeraldAudio } from "./audio-library.js";
export function createEmeraldPresentation({
  host = null,
  onError = () => {},
  typeColors = null,
  resources = host?.catalog?.compiled?.resources || null,
} = {}) {
  const sounds = createEmeraldAudio(host);
  const registry = new PresentationRegistry({ onError, typeColors, resources, sounds });
  registerEmeraldBattleSequences(registry, { host, sounds });
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
  for (const [id, definition] of overrides)
    registry.move(id, definition);
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
