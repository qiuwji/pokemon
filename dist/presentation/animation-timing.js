/**
 * @typedef {'linear'|'in-quad'|'out-quad'|'in-out-quad'|'smoothstep'|'step-end'} EasingName
 * @typedef {{at:number,easing?:EasingName,values:Record<string,number>}} AnimationKeyframe
 * @typedef {{start:number,end:number,easing?:EasingName,when?:'hit'|'miss',parameters?:Record<string,unknown>,keyframes?:AnimationKeyframe[]}} AnimationTrack
 */
/** @param {number} t */
const clamp = (t) => Math.max(0, Math.min(1, t));
/** Pure timing functions. No clocks, render targets, random stream or game state. */
/** @type {Readonly<Record<EasingName,(t:number)=>number>>} */
export const EASINGS = Object.freeze({
  linear: (t) => t,
  "in-quad": (t) => t * t,
  "out-quad": (t) => t * (2 - t),
  "in-out-quad": (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  smoothstep: (t) => t * t * (3 - 2 * t),
  "step-end": (t) => (t === 1 ? 1 : 0),
});
/** @param {AnimationTrack} track @param {number} time @param {{successful?:boolean}} options */
export function sampleAnimationTrack(track, time, { successful = true } = {}) {
  if (
    time < track.start ||
    time > track.end ||
    (track.when === "hit" && !successful) ||
    (track.when === "miss" && successful)
  )
    return null;
  const progress = clamp((time - track.start) / (track.end - track.start)),
    t = EASINGS[track.easing || "linear"](progress);
  const parameters = structuredClone(track.parameters || {});
  if (track.keyframes) {
    const frames = track.keyframes;
    let index = 1;
    while (index < frames.length - 1 && frames[index].at < t) index++;
    const a = frames[index - 1],
      b = frames[index],
      local = EASINGS[a.easing || "linear"](clamp((t - a.at) / (b.at - a.at)));
    for (const key of Object.keys(a.values))
      parameters[key] = a.values[key] + (b.values[key] - a.values[key]) * local;
  }
  return { t, progress, parameters };
}
