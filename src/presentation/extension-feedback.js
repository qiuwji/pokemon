import { sampleVisual } from "./visual-timeline.js";
import { readOnly } from "../engine/extensions/values.js";
import { presentationPayload } from "../engine/extensions/presentation-contracts.js";
/** Plugin presentation registry consumer. Independent of domain RNG and outcome calculation. */
export class ExtensionFeedback {
  constructor(definitions, { now = () => 0, onError = () => {} } = {}) {
    Object.assign(this, { definitions, now, onError });
    this.active = [];
  }
  play(id, payload) {
    const definition = this.definitions.get(id);
    const data = presentationPayload(definition, payload, { feedback: true });
    if (this.active.length >= 32) this.active.shift();
    this.active.push({
      id,
      payload: data,
      start: this.now(),
      duration: definition.duration,
    });
  }
  draw(ctx, assets, view, now = this.now(), options = {}) {
    this.active = this.active.filter(
      (effect) => now - effect.start < effect.duration,
    );
    for (const effect of this.active) {
      ctx.save();
      try {
        const frame = sampleVisual(
          this.definitions.get(effect.id),
          now - effect.start,
          options,
        );
        this.definitions.get(effect.id).draw(
          ctx,
          readOnly({
            ...frame,
            view,
            payload: effect.payload,
            width: ctx.canvas.width,
            height: ctx.canvas.height,
          }),
          assets,
        );
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
