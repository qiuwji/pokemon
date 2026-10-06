/** Pure crossfade sampler. Interrupted transitions retain the sampled mixture; no state, rules or browser clock. */
export class WeatherDirector {
  constructor({ duration = 600 } = {}) {
    if (!Number.isFinite(duration) || duration < 0)
      throw new Error("Invalid weather transition duration");
    this.duration = duration;
    this.target = undefined;
    this.layers = [];
    this.startedAt = 0;
  }
  sample(now, target, { reducedMotion = false } = {}) {
    if (
      !Number.isFinite(now) ||
      (target !== null && typeof target !== "string")
    )
      throw new Error("Invalid weather frame");
    if (target !== this.target) {
      this.layers = this.target === undefined ? [] : this.current(now);
      this.target = target;
      this.startedAt = now;
    }
    if (reducedMotion || !this.duration) {
      this.layers = [];
      this.startedAt = now - this.duration;
      return target ? [{ visual: target, opacity: 1 }] : [];
    }
    return this.current(now);
  }
  current(now) {
    const t = Math.max(
      0,
      Math.min(1, (now - this.startedAt) / (this.duration || 1)),
    );
    const weights = new Map(
      this.layers.map((l) => [l.visual, l.opacity * (1 - t)]),
    );
    if (this.target)
      weights.set(this.target, (weights.get(this.target) || 0) + t);
    return [...weights]
      .filter(([, opacity]) => opacity > 0.0001)
      .map(([visual, opacity]) => ({ visual, opacity }));
  }
}
