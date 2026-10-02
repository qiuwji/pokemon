import { PresentationRegistry } from "./effect-registry.js";
import { PIXEL_EFFECTS } from "./pixel-effects.js";
export function createDefaultPresentation(options) {
  const registry = new PresentationRegistry(options);
  for (const [id, draw] of Object.entries(PIXEL_EFFECTS))
    registry.effect(id, draw);
  return registry.seal();
}
