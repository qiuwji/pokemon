import {
  readOnly,
  validateValue,
  callSync,
} from "../engine/extensions/values.js";
/** Generic full-screen scene clock. Rewards and game state belong to surrounding story commands. */
export class SceneDirector {
  constructor({
    timeline,
    definitions = new Map(),
    reducedMotion = () => false,
    onCue = () => {},
    onError = () => {},
  }) {
    Object.assign(this, {
      timeline,
      definitions,
      reducedMotion,
      onCue,
      onError,
    });
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
      this.failedField = false;
      this.active = { id, payload: data, duration, start: this.timeline.now() };
      this.onCue(definition.sound || null);
      await this.timeline.wait(duration);
      return { ok: true };
    } finally {
      this.active = null;
    }
  }
  fieldTransform(now = this.timeline.now()) {
    const neutral = () => ({ x: 0, y: 0, zoom: 1 });
    const frame = this.sample(now),
      definition = frame && this.definitions.get(frame.id);
    if (!definition?.field || frame.reducedMotion || this.failedField)
      return neutral();
    try {
      const value = readOnly(callSync(definition.field, [readOnly(frame)]));
      if (
        !value ||
        Array.isArray(value) ||
        Object.keys(value).some((k) => !["x", "y", "zoom"].includes(k)) ||
        ["x", "y"].some(
          (k) =>
            value[k] !== undefined &&
            (!Number.isFinite(value[k]) || Math.abs(value[k]) > 64),
        ) ||
        (value.zoom !== undefined &&
          (!Number.isFinite(value.zoom) || value.zoom < 0.25 || value.zoom > 4))
      )
        throw new Error(`Invalid field presentation transform ${frame.id}`);
      return { x: value.x ?? 0, y: value.y ?? 0, zoom: value.zoom ?? 1 };
    } catch (error) {
      this.failedField = true;
      this.onError(error);
      return neutral();
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
