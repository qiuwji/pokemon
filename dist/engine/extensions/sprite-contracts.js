import { readOnly } from "./values.js";
const directions = ["up", "down", "left", "right"];
const exact = (o, keys) =>
  o &&
  typeof o === "object" &&
  !Array.isArray(o) &&
  Object.keys(o).every((k) => keys.includes(k));
/** Declarative sprite timelines; safe to validate before a browser/image exists. */
export function validateSpriteAnimations(actor) {
  if (actor.animations === undefined) return;
  readOnly(actor.animations, 65536);
  if (
    !Number.isInteger(actor.frameCount) ||
    actor.frameCount < 1 ||
    actor.frameCount > 4096 ||
    !exact(actor.animations, Object.keys(actor.animations)) ||
    Object.keys(actor.animations).length > 64
  )
    throw new Error("Invalid sprite animation catalog");
  for (const [pose, states] of Object.entries(actor.animations)) {
    if (
      !/^[a-zA-Z0-9_.:-]{1,128}$/.test(pose) ||
      !exact(states, ["idle", "move"]) ||
      !states.idle
    )
      throw new Error("Invalid sprite pose");
    for (const sequence of Object.values(states)) {
      if (
        !exact(sequence, ["loop", "directions"]) ||
        typeof sequence.loop !== "boolean" ||
        !exact(sequence.directions, directions) ||
        directions.some((d) => !sequence.directions[d])
      )
        throw new Error("Invalid directional sprite animation");
      for (const frames of Object.values(sequence.directions)) {
        if (
          !Array.isArray(frames) ||
          !frames.length ||
          frames.length > 128 ||
          frames.some(
            (f) =>
              !exact(f, ["index", "durationMs"]) ||
              !Number.isInteger(f.index) ||
              f.index < 0 ||
              f.index >= actor.frameCount ||
              !Number.isFinite(f.durationMs) ||
              f.durationMs <= 0 ||
              f.durationMs > 60000,
          )
        )
          throw new Error("Invalid sprite frame sequence");
      }
    }
  }
}
