import { WEATHER_EFFECTS } from "./weather-effects.js";
import { PresentationRegistry } from "./effect-registry.js";
import { PIXEL_EFFECTS } from "./pixel-effects.js";
import { FIELD_ACTION_EFFECTS } from "./field-action-canvas.js";
export function createDefaultPresentation(options) {
  const registry = new PresentationRegistry(options);
  for (const [id, draw] of Object.entries({
    ...WEATHER_EFFECTS,
    ...PIXEL_EFFECTS,
    ...FIELD_ACTION_EFFECTS,
  }))
    registry.effect(id, draw);
  return registry.seal();
}
