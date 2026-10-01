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
      opacity: a.phase === "cover" ? t : a.phase === "reveal" ? 1 - t : 1,
      covered: a.phase === "hold",
    };
  }
  async run(kind, commit) {
    if (this.busy) return false;
    const reduced = this.reducedMotion();
    const duration = reduced ? 100 : kind === "encounter" ? 480 : 220;
    const phase = (name) => {
      this.active = {
        kind: reduced ? "fade" : kind,
        phase: name,
        start: this.timeline.now(),
        duration,
      };
    };
    try {
      phase("cover");
      await this.timeline.wait(duration);
      phase("hold");
      // Give the rendering adapter a fully covered frame before changing scenes.
      await this.timeline.wait(32);
      await commit();
      await this.timeline.wait(96);
      phase("reveal");
      await this.timeline.wait(duration);
      return true;
    } finally {
      this.active = null;
    }
  }
}
