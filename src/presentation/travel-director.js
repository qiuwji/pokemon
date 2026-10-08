/** Flight choreography consumes a domain commit callback without knowing destinations or permissions. */
export class TravelDirector {
  constructor({ timeline, transitions, reducedMotion = () => false }) {
    Object.assign(this, { timeline, transitions, reducedMotion });
    this.active = null;
  }
  get busy() {
    return !!this.active;
  }
  sample(now = this.timeline.now()) {
    if (!this.active) return null;
    const a = this.active,
      t = Math.max(0, Math.min(1, (now - a.start) / a.duration));
    const progress = a.phase === "depart" ? t : 1 - t;
    return {
      phase: a.phase,
      lift: Math.round(144 * progress * progress),
      carrier: true,
    };
  }
  async fly(commit, { prepare = null } = {}) {
    if (this.busy || this.transitions.busy) return false;
    const duration = this.reducedMotion() ? 100 : 720;
    const phase = (name) =>
      (this.active = { phase: name, start: this.timeline.now(), duration });
    try {
      phase("depart");
      await this.timeline.wait(duration);
      const changed = await this.transitions.run("flight", async () => {
        await commit();
        phase("arrive");
        // Land during the reveal, followed by a short settling motion.
        this.active.start = this.timeline.now() + 96;
      }, { prepare });
      if (changed) await this.timeline.wait(Math.max(0, duration - 220));
      return changed;
    } catch (error) {
      phase("arrive");
      await this.timeline.wait(duration);
      throw error;
    } finally {
      this.active = null;
    }
  }
}
