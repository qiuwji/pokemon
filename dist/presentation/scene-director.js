import { readOnly, validateValue } from "../engine/extensions/values.js";
/** Generic full-screen scene clock. Rewards and game state belong to surrounding story commands. */
export class SceneDirector {
  constructor({
    timeline,
    definitions = new Map(),
    reducedMotion = () => false,
    onCue = () => {},
  }) {
    Object.assign(this, { timeline, definitions, reducedMotion, onCue });
    this.active = null;
  }
  get busy() {
    return this.active !== null;
  }
  has(id) {
    return this.definitions.has(id);
  }
  validate(id, payload = {}) {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown presentation scene ${id}`);
    const data = readOnly(payload);
    validateValue(definition.schema, data);
    return { definition, data };
  }
  async play(id, payload = {}) {
    if (this.busy) throw new Error("Scene presentation is already active");
    const { definition, data } = this.validate(id, payload),
      duration = this.reducedMotion()
        ? Math.min(240, definition.duration)
        : definition.duration;
    try {
      this.active = { id, payload: data, duration, start: this.timeline.now() };
      this.onCue(definition.sound || null);
      await this.timeline.wait(duration);
      return { ok: true };
    } finally {
      this.active = null;
    }
  }
  sample(now = this.timeline.now()) {
    if (!this.active) return null;
    return {
      ...this.active,
      progress: Math.max(
        0,
        Math.min(1, (now - this.active.start) / this.active.duration),
      ),
      reducedMotion: this.reducedMotion(),
    };
  }
}
