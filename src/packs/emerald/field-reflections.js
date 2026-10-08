import { REFLECTION_PICTURES } from "../../../generated/presentation/battle-assets.js";
/** MetatileBehavior_IsReflective; ocean/current tiles do not reflect. */
export function emeraldReflectionSurface(behavior) {
  return [0x10, 0x16, 0x1a, 0x20, 0x14, 0x2b].includes(behavior)
    ? { wave: behavior !== 0x20 }
    : null;
}
export function emeraldReflectionResource(actor) {
  return REFLECTION_PICTURES[actor] || null;
}

/** The shared 48-frame affine distortion in field_effect_objects.h (8.8 scale). */
export function emeraldReflectionScale(timeMs) {
  const t = Math.floor(timeMs * 60 / 1000 + 1e-7) % 48;
  const delta = t < 4 ? -t : t < 12 ? -4 : t < 16 ? t - 16 : t < 24 ? 0
    : t < 28 ? t - 24 : t < 36 ? 4 : t < 40 ? 40 - t : 0;
  return (256 + delta) / 256;
}

/** GBA affine texture lookup truncates signed 8.8 coordinates; Canvas nearest scaling can erase this shimmer. */
export function emeraldReflectionColumns(width, scale) {
  const inverse = Math.trunc(256 / scale), center = width / 2;
  return Array.from({ length: width }, (_, column) => Math.floor(center + (column - center) * inverse / 256));
}

/** MB_REFLECTION_UNDER_BRIDGE is water under the deck (elevation 3), not a reflective deck. */
export function emeraldReflectionVisible(surface, actor) {
  return !((surface.behavior === 0x2b || actor.behavior === 0x2b) && actor.elevation >= 3);
}
