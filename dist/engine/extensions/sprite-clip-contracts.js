import { readOnly } from "./values.js";
const integer = (n, min, max) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => keys.includes(k));
/** Clips contain resource references and timing only; decoded image bounds belong to the drawing host. */
export function validateSpriteClip(d) {
  if (
    !exact(d, ["width", "height", "frames", "loop", "match"]) ||
    !integer(d.width, 1, 512) ||
    !integer(d.height, 1, 512) ||
    !Array.isArray(d.frames) ||
    !d.frames.length ||
    d.frames.length > 256 ||
    (d.loop !== undefined && typeof d.loop !== "boolean")
  )
    throw new Error("Invalid sprite clip");
  if (
    d.match !== undefined &&
    (!exact(d.match, ["species", "view"]) ||
      typeof d.match.species !== "string" ||
      !d.match.species ||
      typeof d.match.view !== "string" ||
      !d.match.view ||
      d.match.view.length > 64)
  )
    throw new Error("Invalid sprite clip binding");
  let duration = 0;
  for (const f of d.frames) {
    if (
      !exact(f, ["resource", "rect", "durationMs"]) ||
      typeof f.resource !== "string" ||
      !f.resource ||
      !integer(f.durationMs, 1, 10000) ||
      (duration += f.durationMs) > 60000
    )
      throw new Error("Invalid sprite clip frame");
    if (
      f.rect !== undefined &&
      (!exact(f.rect, ["x", "y", "width", "height"]) ||
        !integer(f.rect.x, 0, 8192) ||
        !integer(f.rect.y, 0, 8192) ||
        !integer(f.rect.width, 1, 8192) ||
        !integer(f.rect.height, 1, 8192))
    )
      throw new Error("Invalid sprite clip rectangle");
  }
  return readOnly({ ...d, loop: d.loop ?? false });
}
