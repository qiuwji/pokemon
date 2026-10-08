/** Host playback policy; no map, song or native driver identities cross this boundary. */
export function validateMusicTransition(value) {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).some(key => !["mode", "fadeOutMs", "fadeInMs", "steps"].includes(key)) ||
      !["after-fade", "crossfade"].includes(value.mode) ||
      ["fadeOutMs", "fadeInMs"].some(key => value[key] !== undefined &&
        (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 10000)) ||
      (value.steps !== undefined && (!Number.isInteger(value.steps) || value.steps < 1 || value.steps > 256)))
    throw new Error("Invalid music transition");
  return Object.freeze({ ...value });
}
