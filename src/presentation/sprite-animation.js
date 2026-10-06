/**
 * @typedef {{index:number,durationMs:number}} SpriteFrame
 * @typedef {{loop:boolean,clock?:"elapsed"|"stride",directions:Record<string,readonly SpriteFrame[]>}} SpriteSequence
 * @typedef {Record<string,{idle:SpriteSequence,move?:SpriteSequence}>} SpriteAnimations
 */
/**
 * @param {SpriteAnimations | undefined} animations
 * @param {string} pose
 * @param {string} direction
 * @param {number} elapsedMs
 * @param {boolean} moving
 * @param {{reducedMotion?:boolean,progress?:number,foot?:number}} options
 */
export function sampleSpriteAnimation(
  animations,
  pose,
  direction,
  elapsedMs,
  moving,
  { reducedMotion = false, progress, foot = 0 } = {},
) {
  const definition = animations?.[pose];
  if (!definition) return null;
  const sequence = moving
      ? definition.move || definition.idle
      : definition.idle,
    frames = sequence.directions[direction];
  if (!frames) return null;
  const duration = frames.reduce((n, f) => n + f.durationMs, 0);
  // A stride spans two grid steps. Sampling by progress retains alternate feet
  // across steps without restarting the first half of a looping clip.
  let t = reducedMotion ? duration
    : moving && sequence.clock === "stride" && progress !== undefined
      ? ((foot % 2) + Math.max(0, Math.min(1, progress))) * duration / 2
      : Math.max(0, elapsedMs);
  if (sequence.loop && !reducedMotion) t %= duration;
  const frame =
    frames.find((f) => {
      t -= f.durationMs;
      // Ignore only floating-point residue at a declared frame boundary.
      return t < -1e-7;
    }) || frames.at(-1);
  if (!frame) return null;
  return { index: frame.index, flip: direction === "right" };
}
