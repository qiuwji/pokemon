import { sampleSpriteClip } from "../presentation/sprite-clips.js";
/** One Canvas/clock owner. Images are preloaded resources, not loaded independently per page. */
export class SpriteCanvas {
  constructor({
    canvas,
    assets,
    clock,
    reducedMotion = () => false,
    onError = () => {},
  }) {
    Object.assign(this, { canvas, assets, clock, reducedMotion, onError });
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) throw new Error("Sprite Canvas unavailable");
    this.handle = null;
    this.epoch = 0;
    this.lastIndex = -1;
  }
  play(clip) {
    this.stop();
    for (const f of clip.frames) this.validateFrame(f);
    this.clip = clip;
    this.started = this.clock.now();
    this.canvas.width = clip.width;
    this.canvas.height = clip.height;
    this.ctx.imageSmoothingEnabled = false;
    this.lastIndex = -1;
    this.update();
  }
  validateFrame(frame) {
    const image = this.assets[frame.resource];
    if (!image || !(image.width > 0) || !(image.height > 0))
      throw new Error(`Missing sprite image ${frame.resource}`);
    const rect = frame.rect;
    if (
      rect &&
      (rect.x + rect.width > image.width || rect.y + rect.height > image.height)
    )
      throw new Error(`Sprite rectangle outside image ${frame.resource}`);
  }
  update() {
    const reducedMotion = this.reducedMotion(),
      s = sampleSpriteClip(this.clip, this.clock.now() - this.started, {
        reducedMotion,
      });
    if (s.index !== this.lastIndex) {
      const image = this.assets[s.frame.resource],
        r = s.frame.rect || {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        },
        scale = Math.min(
          this.canvas.width / r.width,
          this.canvas.height / r.height,
        );
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(
        image,
        r.x,
        r.y,
        r.width,
        r.height,
        (this.canvas.width - r.width * scale) / 2,
        (this.canvas.height - r.height * scale) / 2,
        r.width * scale,
        r.height * scale,
      );
      this.lastIndex = s.index;
    }
    if (!s.complete && this.clip.frames.length > 1 && !reducedMotion)
      this.schedule();
  }
  schedule() {
    if (this.handle !== null) return;
    const epoch = this.epoch;
    this.handle = this.clock.request(() => {
      if (epoch !== this.epoch) return;
      this.handle = null;
      try {
        this.update();
      } catch (error) {
        this.stop();
        this.onError(error);
      }
    });
  }
  stop() {
    this.epoch++;
    if (this.handle !== null) this.clock.cancel(this.handle);
    this.handle = null;
    this.clip = null;
  }
}
