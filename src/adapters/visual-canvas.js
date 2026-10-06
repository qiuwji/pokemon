import { VisualTimeline } from "../presentation/visual-timeline.js";
import { readOnly } from "../engine/extensions/values.js";

/** Mounted visual; its owner supplies frames and disposal, never a second RAF loop. */
export class VisualCanvas {
  constructor({
    canvas,
    definition,
    payload,
    context,
    assets,
    onError = () => {},
  }) {
    Object.assign(this, {
      canvas,
      definition,
      payload,
      context: readOnly(context),
      assets,
      onError,
    });
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) throw new Error("Visual Canvas unavailable");
    this.timeline = new VisualTimeline(definition);
    this.previous = null;
    this.disposed = false;
  }
  render(now, options) {
    if (this.disposed) return;
    try {
      const frame = this.timeline.sample(now, options);
      if (!frame) return;
      if (
        this.previous?.complete &&
        frame.complete &&
        this.previous.reducedMotion === frame.reducedMotion
      )
        return;
      const ctx = this.ctx;
      ctx.save();
      try {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.imageSmoothingEnabled = false;
        this.definition.draw(
          ctx,
          readOnly({
            ...frame,
            width: this.canvas.width,
            height: this.canvas.height,
            payload: this.payload,
            view: this.context,
          }),
          this.assets,
        );
      } finally {
        ctx.restore();
      }
      this.previous = frame;
    } catch (error) {
      this.dispose();
      this.onError(error);
    }
  }
  dispose() {
    this.disposed = true;
  }
  pause() {
    this.timeline.pause();
  }
}

/** Native keyboard activation targets the center; pointer hit testing uses the actual CSS rectangle. */
export function canvasPointer(canvas, event) {
  if (!event || event.detail === 0)
    return { x: canvas.width / 2, y: canvas.height / 2, source: "keyboard" };
  const r = canvas.getBoundingClientRect();
  if (
    !(r.width > 0) ||
    !(r.height > 0) ||
    !Number.isFinite(event.clientX) ||
    !Number.isFinite(event.clientY)
  )
    return null;
  const x = ((event.clientX - r.left) / r.width) * canvas.width,
    y = ((event.clientY - r.top) / r.height) * canvas.height;
  return x >= 0 && y >= 0 && x < canvas.width && y < canvas.height
    ? { x, y, source: "pointer" }
    : null;
}
