import { readOnly } from "./extensions/values.js";

/** Optional immutable colour/coverage tracks. The transition owner still commits only under full coverage. */
export function transitionFrames(frames, endpoint) {
  if (frames === undefined) return null;
  const data = readOnly(frames);
  if (!Array.isArray(data) || data.length < 1 || data.length > 3600 || data.some(frame =>
    !frame || Object.keys(frame).some(key => !["opacity", "colorOffset"].includes(key)) ||
    !Number.isFinite(frame.opacity) || frame.opacity < 0 || frame.opacity > 1 ||
    (frame.colorOffset !== undefined && (!Array.isArray(frame.colorOffset) || frame.colorOffset.length !== 3 ||
      frame.colorOffset.some(n => !Number.isInteger(n) || n < -255 || n > 255)))) || data.at(-1).opacity !== endpoint)
    throw new Error("Invalid transition frames or coverage endpoint");
  return data;
}
