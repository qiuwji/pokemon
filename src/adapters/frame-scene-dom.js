import { FrameClipDirector } from "../presentation/frame-clip-director.js";
import { createFrameSpritePainter } from "../presentation/frame-sprite-canvas.js";
import { validateFrameSequence } from "../engine/extensions/frame-sequence-contracts.js";

/** A logical canvas which retains a clip's final frame between awaited UI steps. */
export class FrameSceneDOM {
  constructor({ document, host, width, height, assets, resources, sounds, timeline, clock, reducedMotion }) {
    if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 1024))
      throw new Error("Invalid frame scene size");
    Object.assign(this, { assets, resources, sounds, clock });
    this.director = new FrameClipDirector(timeline, { reducedMotion });
    this.paint = createFrameSpritePainter(() => document.createElement("canvas"), { channelBits: 5 });
    this.canvas = document.createElement("canvas");
    this.canvas.width = width; this.canvas.height = height;
    this.canvas.className = "frame-scene";
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) throw new Error("Frame scene Canvas unavailable");
    this.ctx.imageSmoothingEnabled = false;
    this.handle = null;
    this.disposed = false;
    this.playing = false;
    host.append(this.canvas);
  }
  validate(sequence) {
    const value = validateFrameSequence(sequence, { event: { combatants: [] }, resources: this.resources, sounds: this.sounds });
    if (value.frames.some(frame => ["poses", "healthBars", "statusBoxes"].some(key => frame[key]?.length) ||
      frame.scenes?.some(scene => Object.keys(scene).some(key => key !== "clip"))))
      throw new Error("Frame scene supports sprites and a clip rectangle only");
    return value;
  }
  draw(frame) {
    if (this.disposed) throw new Error("Frame scene disposed");
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const clip = frame.scenes?.[0]?.clip;
    this.ctx.save();
    try {
      if (clip) { this.ctx.beginPath(); this.ctx.rect(clip.x, clip.y, clip.width, clip.height); this.ctx.clip(); }
      for (const sprite of frame.sprites || []) {
        const image = this.assets[sprite.resource];
        if (!image || sprite.width > image.width || (sprite.tileFrame || 0) * sprite.height + sprite.height > image.height)
          throw new Error(`Frame scene image unavailable: ${sprite.resource}`);
        this.paint(this.ctx, image, sprite);
      }
    } finally { this.ctx.restore(); }
  }
  stage(sequence) {
    if (this.playing) throw new Error("Frame scene already playing");
    const value = this.validate(sequence);
    this.draw(value.frames.at(-1));
  }
  async play(sequence, { onCue = () => {} } = {}) {
    if (this.disposed || this.playing) throw new Error("Frame scene unavailable");
    const value = this.validate(sequence);
    this.playing = true;
    const lease = {};
    this.lease = lease;
    const interrupted = new Promise((_, reject) => { this.interrupt = reject; });
    const render = () => {
      if (this.disposed || this.lease !== lease) return;
      try {
        const frame = this.director.sample();
        if (frame) this.draw(frame);
        this.handle = this.clock.request(render);
      } catch (error) { this.interrupt?.(error); }
    };
    try {
      const playback = this.director.play(value, { onCue: id => this.disposed ? undefined : onCue(id) });
      render();
      await Promise.race([playback, interrupted]);
      this.draw(value.frames.at(-1));
    } finally {
      if (this.handle !== null) this.clock.cancel(this.handle);
      this.handle = null; this.interrupt = null; this.playing = false;
      this.lease = null;
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.handle !== null) this.clock.cancel(this.handle);
    this.handle = null;
    this.interrupt?.(new Error("Frame scene disposed"));
    this.canvas.remove();
  }
}
