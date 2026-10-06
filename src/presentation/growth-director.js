/** Growth visual state is transient; exactly one domain commit occurs under the white flash. */
export class GrowthDirector {
  constructor({ timeline, reducedMotion = () => false }) {
    Object.assign(this, { timeline, reducedMotion });
    this.active = null;
  }
  get busy() {
    return !!this.active;
  }
  sample(now = this.timeline.now()) {
    if (!this.active) return null;
    const a = this.active,
      t = Math.max(0, Math.min(1, (now - a.start) / a.duration));
    return {
      kind: a.kind,
      phase: a.phase,
      from: a.from,
      to: a.to,
      progress: t,
    };
  }
  async play({ kind, from, to, commit }) {
    if (this.busy) throw new Error("Growth presentation is already active");
    if (!["hatch", "evolution", "receive", "trade"].includes(kind))
      throw new Error("Unknown growth presentation");
    const shortened = this.reducedMotion(),
      phase = (name, ms) =>
        (this.active = {
          kind,
          from,
          to,
          phase: name,
          start: this.timeline.now(),
          duration: shortened ? Math.min(ms, 100) : ms,
        });
    try {
      phase("prepare", 260);
      await this.timeline.wait(this.active.duration);
      phase("transform", kind === "receive" ? 440 : 1600);
      await this.timeline.wait(this.active.duration);
      phase("covered", 32);
      await this.timeline.wait(32);
      const result = await commit();
      if (!result || result.ok === false)
        throw new Error(result?.reason || "Growth conditions changed");
      phase("reveal", 640);
      await this.timeline.wait(this.active.duration);
      return result;
    } finally {
      this.active = null;
    }
  }
}
