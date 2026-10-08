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
    const visual = a.frames?.[Math.min(a.frames.length - 1, Math.floor(t * a.frames.length + 1e-7))];
    return {
      kind: a.kind,
      phase: a.phase,
      opacity: a.phase === "cover" ? t : a.phase === "reveal" ? 1 - t : 1,
      covered: a.phase === "hold",
      ...visual,
    };
  }
  async run(kind, commit, { coverMs, holdMs, revealMs, settleMs = 96, fps = 60, coverFrames, revealFrames, prepare = null } = {}) {
    if (this.busy) return false;
    if (prepare !== null && typeof prepare !== "function") throw new Error("Invalid transition preparation");
    const reduced = this.reducedMotion();
    if (!Number.isInteger(fps) || fps < 1 || fps > 240 || !Number.isFinite(settleMs) || settleMs < 0 || settleMs > 60000)
      throw new Error("Invalid transition clock");
    const coverTrack = transitionFrames(coverFrames, 1), revealTrack = transitionFrames(revealFrames, 0);
    if ([coverTrack, revealTrack].some(track => track && track.length * 1000 / fps > 60000))
      throw new Error("Transition frames exceed duration bounds");
    for (const ms of [coverMs, revealMs])
      if (ms !== undefined && (!Number.isFinite(ms) || ms <= 0 || ms > 60000))
        throw new Error("Invalid transition duration");
    // A covered hold may legitimately be zero (no pause), unlike the cover/reveal fades.
    if (holdMs !== undefined && (!Number.isFinite(holdMs) || holdMs < 0 || holdMs > 60000))
      throw new Error("Invalid transition hold");
    const duration = reduced ? 100 : coverTrack ? coverTrack.length * 1000 / fps : coverMs ?? (kind === "encounter" ? 480 : 220);
    const revealDuration = reduced ? 100 : revealTrack ? revealTrack.length * 1000 / fps : revealMs ?? duration;
    const holdDuration = reduced ? 32 : holdMs ?? 32;
    const phase = (name) => {
      this.active = {
        kind: reduced ? "fade" : kind,
        phase: name,
        start: this.timeline.now(),
        duration: name === "reveal" ? revealDuration : duration,
        frames: reduced ? null : name === "cover" ? coverTrack : name === "reveal" ? revealTrack : null,
      };
    };
    let preparation;
    try {
      preparation = prepare?.();
      if (preparation != null && (typeof preparation !== "object" || Array.isArray(preparation) ||
          Object.keys(preparation).some(key => !["ready", "release"].includes(key)) ||
          (preparation.release !== undefined && typeof preparation.release !== "function")))
        throw new Error("Invalid transition preparation lease");
      phase("cover");
      await this.timeline.wait(duration);
      phase("hold");
      // Hold the covered frame (the original black-out pauses) before changing scenes.
      await this.timeline.wait(holdDuration);
      await preparation?.ready;
      await commit();
      if (settleMs) await this.timeline.wait(settleMs);
      phase("reveal");
      await this.timeline.wait(revealDuration);
      return true;
    } finally {
      try { preparation?.release?.(); } finally { this.active = null; }
    }
  }
}
import { transitionFrames } from "./transition-frames.js";
