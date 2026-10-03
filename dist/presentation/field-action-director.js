import { sampleAnimationTrack } from "./animation-timing.js";
/** Semantic action phases; no party qualifications, map mutation or encounter rolls. */
export class FieldActionDirector {
  constructor({ timeline, reducedMotion = () => false }) {
    Object.assign(this, { timeline, reducedMotion });
    this.active = null;
  }
  sample(now = this.timeline.now()) {
    if (!this.active) return null;
    const a = this.active;
    const player = {};
    if (a.phase !== "settle" && !this.reducedMotion()) {
      const time = Math.max(
        0,
        Math.min(1, (now - a.actionStart) / Math.max(1, a.totalDuration)),
      );
      for (const pose of a.avatar || [])
        Object.assign(
          player,
          sampleAnimationTrack(pose, time)?.parameters || {},
        );
    }
    return {
      objects: (a.motion?.objects || []).map((m) => ({
        id: m.object,
        map: m.to.map,
        x:
          (m.from.x - m.to.x) *
          16 *
          (1 - Math.max(0, Math.min(1, (now - a.start) / a.duration))),
        y:
          (m.from.y - m.to.y) *
          16 *
          (1 - Math.max(0, Math.min(1, (now - a.start) / a.duration))),
      })),
      player,
      id: a.id,
      cue: a.cue,
      target: a.target,
      phase: a.phase,
      progress: Math.max(
        0,
        Math.min(1, (now - a.start) / Math.max(1, a.duration)),
      ),
    };
  }
  async play(plan, commit, { transitions }) {
    if (this.active)
      throw new Error("A field action presentation is already active");
    const duration = this.reducedMotion()
      ? Math.min(100, plan.duration)
      : plan.duration;
    const actionStart = this.timeline.now();
    const phase = (name, ms, motion = null) => {
      this.active = {
        motion,
        id: plan.id,
        avatar: plan.avatar,
        actionStart,
        totalDuration: duration,
        cue: plan.cue,
        target: plan.target,
        phase: name,
        start: this.timeline.now(),
        duration: ms,
      };
      return this.timeline.wait(ms);
    };
    try {
      await phase("prepare", duration * 0.4);
      await phase("effect", duration * 0.6);
      if (plan.operation.kind === "travel") {
        const changed = await transitions.run("dive", commit);
        if (!changed) throw new Error("Field transition is busy");
      } else {
        const result = await commit();
        await phase(
          "settle",
          result?.motion?.duration || (this.reducedMotion() ? 40 : 160),
          result?.motion,
        );
        return;
      }
      await phase("settle", this.reducedMotion() ? 40 : 160);
    } finally {
      this.active = null;
    }
  }
}
