import { readOnly } from "./values.js";
/** Data contracts shared by descriptions and browser-independent presentation drivers. */
export const ANIMATION_EASINGS = Object.freeze([
  "linear",
  "in-quad",
  "out-quad",
  "in-out-quad",
  "smoothstep",
  "step-end",
]);
const anchors = ["actor", "targets", "field"];
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => keys.includes(key));
const easing = (id) => id === undefined || ANIMATION_EASINGS.includes(id);
function validateTiming(track) {
  if (
    !Number.isFinite(track.start) ||
    !Number.isFinite(track.end) ||
    track.start < 0 ||
    track.end > 1 ||
    track.end <= track.start ||
    !anchors.includes(track.anchor) ||
    !easing(track.easing) ||
    (track.when !== undefined &&
      !["always", "hit", "miss"].includes(track.when))
  )
    throw new Error("Invalid animation track timing");
}
function validateKeyframes(frames, pose = false) {
  if (frames === undefined && !pose) return;
  if (
    !Array.isArray(frames) ||
    frames.length < 2 ||
    frames.length > 64 ||
    frames[0].at !== 0 ||
    frames.at(-1).at !== 1
  )
    throw new Error("Invalid animation keyframes");
  const channels = Object.keys(frames[0].values || {}).sort();
  if (!channels.length || channels.length > 16)
    throw new Error("Invalid animation channels");
  let previous = -1;
  for (const frame of frames) {
    if (
      !exact(frame, ["at", "values", "easing"]) ||
      !Number.isFinite(frame.at) ||
      frame.at <= previous ||
      frame.at > 1 ||
      !easing(frame.easing) ||
      !exact(frame.values, channels) ||
      Object.keys(frame.values).length !== channels.length ||
      Object.values(frame.values).some((n) => !Number.isFinite(n))
    )
      throw new Error("Invalid animation keyframe");
    if (
      pose &&
      channels.some(
        (key) =>
          !["x", "y", "scale", "opacity"].includes(key) ||
          (key === "opacity" &&
            (frame.values[key] < 0 || frame.values[key] > 1)) ||
          (key === "scale" &&
            (frame.values[key] < 0 || frame.values[key] > 10)),
      )
    )
      throw new Error("Invalid animation pose channel");
    previous = frame.at;
  }
}
export function validateMoveAnimation(definition, hasEffect = () => true) {
  if (
    !exact(definition, ["duration", "lunge", "tracks", "poses"]) ||
    !Number.isFinite(definition.duration) ||
    definition.duration < 1 ||
    definition.duration > 10000 ||
    !Array.isArray(definition.tracks) ||
    definition.tracks.length > 64
  )
    throw new Error("Invalid move animation");
  for (const track of definition.tracks) {
    if (
      !exact(track, [
        "effect",
        "anchor",
        "start",
        "end",
        "parameters",
        "easing",
        "keyframes",
        "when",
      ]) ||
      typeof track.effect !== "string" ||
      !hasEffect(track.effect)
    )
      throw new Error("Invalid animation track");
    validateTiming(track);
    validateKeyframes(track.keyframes);
    if (
      track.parameters !== undefined &&
      !exact(track.parameters, Object.keys(track.parameters))
    )
      throw new Error("Invalid visual parameters");
  }
  if (definition.poses !== undefined) {
    if (!Array.isArray(definition.poses) || definition.poses.length > 64)
      throw new Error("Invalid animation poses");
    for (const pose of definition.poses) {
      if (
        !exact(pose, [
          "anchor",
          "start",
          "end",
          "easing",
          "keyframes",
          "when",
        ]) ||
        pose.anchor === "field"
      )
        throw new Error("Invalid animation pose");
      validateTiming(pose);
      validateKeyframes(pose.keyframes, true);
    }
  }
  if (
    definition.lunge !== undefined &&
    (!Number.isFinite(definition.lunge) || Math.abs(definition.lunge) > 100)
  )
    throw new Error("Invalid animation lunge");
  readOnly(definition);
  return definition;
}
export function validateBattleAnimation(definition, hasEffect = () => true) {
  if (
    !exact(definition, ["kind", "match", "priority", "mode", "animation"]) ||
    typeof definition.kind !== "string" ||
    !/^[a-z][a-z0-9_.:-]{0,127}$/.test(definition.kind) ||
    (definition.priority !== undefined &&
      (!Number.isInteger(definition.priority) ||
        Math.abs(definition.priority) > 1000)) ||
    (definition.mode !== undefined &&
      !["replace", "append"].includes(definition.mode))
  )
    throw new Error("Invalid battle animation");
  const match = readOnly(definition.match || {});
  if (
    !exact(match, Object.keys(match)) ||
    Object.keys(match).length > 16 ||
    Object.values(match).some(
      (value) =>
        value !== null &&
        !["number", "string", "boolean"].includes(typeof value),
    )
  )
    throw new Error("Invalid battle animation match");
  validateMoveAnimation(definition.animation, hasEffect);
  return definition;
}
/** Place a reusable fragment into a normalized interval without changing its local timing or data. */
export function placeAnimationTracks(tracks, start, end) {
  if (
    !Array.isArray(tracks) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end > 1 ||
    start >= end
  )
    throw new Error("Invalid animation fragment placement");
  return readOnly(tracks).map((track) => ({
    ...track,
    start: start + track.start * (end - start),
    end: start + track.end * (end - start),
  }));
}
