/** Pure timeline sampler; the drawing host chooses the texture and never derives gameplay. */
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
  return { index: frame.index, flip: direction === "right" };
}
