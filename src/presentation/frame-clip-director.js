import { frameSequencePlayer } from "./frame-sequence.js";
import { playTimedCues } from "./timed-cues.js";

/** A finite, precompiled clip clock. Domains retain ownership of locks and commits. */
export class FrameClipDirector {
  constructor(timeline, { reducedMotion = () => false } = {}) {
    Object.assign(this, { timeline, reducedMotion });
    this.active = null;
  }
  sample(now = this.timeline.now()) {
    if (!this.active) return null;
    const { player, start, duration } = this.active;
    return player.sample(this.reducedMotion() ? player.duration : Math.min(duration, Math.max(0, now - start)));
  }
  async play(sequence, { onCue = () => {} } = {}) {
    if (this.active) throw new Error("Frame clip already active");
    const player = frameSequencePlayer(sequence), reduced = this.reducedMotion();
    const duration = reduced ? Math.min(240, player.duration) : player.duration;
    const pending = [];
    try {
      await playTimedCues(this.timeline, duration,
        start => { this.active = { player, start, duration }; }, () => {},
        reduced ? [] : player.cues,
        id => { pending.push(Promise.resolve(onCue(id)).then(
          () => ({ ok: true }), error => ({ ok: false, error }))); });
      const results = await Promise.all(pending);
      const failure = results.find(result => !result.ok);
      if (failure) throw failure.error;
    } finally { this.active = null; }
  }
}
