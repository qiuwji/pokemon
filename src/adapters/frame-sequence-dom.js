import { FrameClipDirector } from "../presentation/frame-clip-director.js";
import { createFrameSpritePainter } from "../presentation/frame-sprite-canvas.js";
import { validateFrameSequence } from "../engine/extensions/frame-sequence-contracts.js";

/** Transparent finite sprite overlay; shares the game's clock and projection. */
export class FrameSequenceDOM {
  constructor({ document, host, surface, assets, timeline, clock, projection, reducedMotion }) {
    Object.assign(this, { document, host, surface, assets, clock, projection });
    this.director = new FrameClipDirector(timeline, { reducedMotion });
    this.paint = createFrameSpritePainter(() => document.createElement("canvas"), { channelBits: 5 });
    this.handle = null;
  }
  async play(sequence, { onCue, resources, sounds } = {}) {
    if (this.canvas) throw new Error("Field sprite overlay already active");
    sequence = validateFrameSequence(sequence, { event: { combatants: [] }, resources, sounds });
    const canvas = this.document.createElement("canvas");
    canvas.width = this.surface.width; canvas.height = this.surface.height;
    canvas.className = "field-sequence";
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Field sprite Canvas unavailable");
    ctx.imageSmoothingEnabled = false;
    this.canvas = canvas;
    this.host.append(canvas);
    let failure;
    const render = () => {
      try {
      const frame = this.director.sample(), view = this.projection();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (frame) {
        ctx.save();
        try {
          ctx.translate(view.offsetX, view.offsetY);
          ctx.scale(view.scale, view.scale);
          for (const sprite of frame.sprites || []) this.paint(ctx, this.assets[sprite.resource], sprite);
        } finally { ctx.restore(); }
      }
      this.handle = this.clock.request(render);
      } catch (error) { failure = error; this.handle = null; }
    };
    try {
      const playback = this.director.play(sequence, { onCue });
      render();
      await playback;
      if (failure) throw failure;
    } finally {
      if (this.handle !== null) this.clock.cancel(this.handle);
      this.handle = null; this.canvas = null; canvas.remove();
    }
  }
}
