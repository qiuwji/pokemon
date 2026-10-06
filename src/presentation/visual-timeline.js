/** Pure sampling shared by mounted visuals and finite feedback. No browser, state or RNG. */
export function sampleVisual(
  definition,
  elapsedMs,
  { reducedMotion = false } = {},
) {
  if (!Number.isFinite(elapsedMs)) throw new Error("Invalid visual time");
  const elapsed = Math.max(0, elapsedMs);
  if (reducedMotion)
    return Object.freeze({
      elapsedMs: 0,
      progress: 0,
      cycle: 0,
      complete: true,
      reducedMotion: true,
    });
  return Object.freeze({
    elapsedMs: elapsed,
    progress: definition.loop
      ? (elapsed % definition.duration) / definition.duration
      : Math.min(1, elapsed / definition.duration),
    cycle: definition.loop ? Math.floor(elapsed / definition.duration) : 0,
    complete: !definition.loop && elapsed >= definition.duration,
    reducedMotion: false,
  });
}

/** Each mount owns presentation time; hidden intervals and backwards host clocks add no duration. */
export class VisualTimeline {
  constructor(definition) {
    this.definition = definition;
    this.elapsed = 0;
    this.last = null;
    this.visible = false;
    this.reduced = false;
  }
  pause() {
    this.visible = false;
  }
  sample(now, { visible = true, reducedMotion = false } = {}) {
    if (!Number.isFinite(now)) throw new Error("Invalid visual time");
    if (
      this.last !== null &&
      visible &&
      this.visible &&
      !reducedMotion &&
      !this.reduced
    )
      this.elapsed += Math.max(0, now - this.last);
    this.last = this.last === null ? now : Math.max(now, this.last);
    this.visible = visible;
    this.reduced = reducedMotion;
    return visible
      ? sampleVisual(this.definition, this.elapsed, { reducedMotion })
      : null;
  }
}
