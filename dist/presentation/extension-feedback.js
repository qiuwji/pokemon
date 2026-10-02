/** Plugin presentation registry consumer. Independent of domain RNG and outcome calculation. */
export class ExtensionFeedback {
  constructor(definitions, { now = () => 0, onError = () => {} } = {}) {
    Object.assign(this, { definitions, now, onError });
    this.active = [];
  }
  play(id, payload) {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error("Unknown extension feedback");
    if (this.active.length >= 32) this.active.shift();
    this.active.push({
      id,
      payload,
      start: this.now(),
      duration: definition.duration,
    });
  }
  draw(ctx, assets, view, now = this.now()) {
    this.active = this.active.filter(
      (effect) => now - effect.start < effect.duration,
    );
    for (const effect of this.active) {
      ctx.save();
      try {
        this.definitions.get(effect.id).draw(ctx, {
          assets,
          view,
          payload: effect.payload,
          progress: Math.max(
            0,
            Math.min(1, (now - effect.start) / effect.duration),
          ),
        });
      } catch (error) {
        this.active = this.active.filter((e) => e !== effect);
        this.onError(error);
      } finally {
        ctx.restore();
      }
    }
  }
  clear() {
    this.active = [];
  }
}
