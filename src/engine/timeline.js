/** Awaitable animation clock. Domain rules never import this module. */
export class Timeline {
  constructor({
    now = () => performance.now(),
    wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = {}) {
    this.now = now;
    this.wait = wait;
  }
  async play(duration, start = () => {}, finish = () => {}) {
    start(this.now(), duration);
    try {
      await this.wait(duration);
    } finally {
      finish();
    }
  }
}

/** Scene commits occur only while the transition is fully opaque. */
export class TransitionController {
  constructor(timeline, { reducedMotion = () => false } = {}) {
    this.timeline = timeline;
    this.reducedMotion = reducedMotion;
    this.active = null;
  }
  get busy() {
    return this.active !== null;
  }
  sample(now = this.timeline.now()) {
    if (!this.active) return { opacity: 0, kind: "fade", covered: false };
    const a = this.active;
    const t = Math.min(1, Math.max(0, (now - a.start) / a.duration));
    return {
      kind: a.kind,
      phase: a.phase,
      opacity: a.phase === "cover" ? t : a.phase === "reveal" ? 1 - t : 1,
      covered: a.phase === "hold",
    };
  }
  async run(kind, commit, { coverMs, holdMs, revealMs } = {}) {
    if (this.busy) return false;
    const reduced = this.reducedMotion();
    for (const ms of [coverMs, revealMs])
      if (ms !== undefined && (!Number.isFinite(ms) || ms <= 0 || ms > 60000))
        throw new Error("Invalid transition duration");
    // A covered hold may legitimately be zero (no pause), unlike the cover/reveal fades.
    if (holdMs !== undefined && (!Number.isFinite(holdMs) || holdMs < 0 || holdMs > 60000))
      throw new Error("Invalid transition hold");
    const duration = reduced ? 100 : coverMs ?? (kind === "encounter" ? 480 : 220);
    const revealDuration = reduced ? 100 : revealMs ?? duration;
    const holdDuration = reduced ? 32 : holdMs ?? 32;
    const phase = (name) => {
      this.active = {
        kind: reduced ? "fade" : kind,
        phase: name,
        start: this.timeline.now(),
        duration: name === "reveal" ? revealDuration : duration,
      };
    };
    try {
      phase("cover");
      await this.timeline.wait(duration);
      phase("hold");
      // Hold the covered frame (the original black-out pauses) before changing scenes.
      await this.timeline.wait(holdDuration);
      await commit();
      await this.timeline.wait(96);
      phase("reveal");
      await this.timeline.wait(revealDuration);
      return true;
    } finally {
      this.active = null;
    }
  }
}
