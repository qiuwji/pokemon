/**
 * @typedef {{index:number,durationMs:number}} SpriteFrame
 * @typedef {{loop:boolean,directions:Record<string,readonly SpriteFrame[]>}} SpriteSequence
 * @typedef {Record<string,{idle:SpriteSequence,move?:SpriteSequence}>} SpriteAnimations
 */
/**
 * @param {SpriteAnimations | undefined} animations
 * @param {string} pose
 * @param {string} direction
 * @param {number} elapsedMs
 * @param {boolean} moving
 * @param {{reducedMotion?:boolean}} options
 */
export function sampleSpriteAnimation(
  animations,
  pose,
  direction,
  elapsedMs,
  moving,
  { reducedMotion = false } = {},
) {
  const definition = animations?.[pose];
  if (!definition) return null;
  const sequence = moving
      ? definition.move || definition.idle
      : definition.idle,
    frames = sequence.directions[direction];
  if (!frames) return null;
  const duration = frames.reduce((n, f) => n + f.durationMs, 0);
  let t = reducedMotion ? duration : Math.max(0, elapsedMs);
  if (sequence.loop && !reducedMotion) t %= duration;
  const frame =
    frames.find((f) => {
      t -= f.durationMs;
      return t < 0;
    }) || frames.at(-1);
  if (!frame) return null;
  return { index: frame.index, flip: direction === "right" };
}
