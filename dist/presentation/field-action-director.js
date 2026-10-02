/** Semantic action phases; no party qualifications, map mutation or encounter rolls. */
export class FieldActionDirector {
  constructor({ timeline, reducedMotion = () => false }) {
    Object.assign(this, { timeline, reducedMotion });
    this.active = null;
  }
  sample(now = this.timeline.now()) {
    if (!this.active) return null;
    const a = this.active;
    return {
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
    const phase = (name, ms) => {
      this.active = {
        id: plan.id,
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
      } else await commit();
      await phase("settle", this.reducedMotion() ? 40 : 160);
    } finally {
      this.active = null;
    }
  }
}
