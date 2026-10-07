const shade = "#000";
const fill = (ctx, x, y, w, h) =>
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
export const TRANSITION_PATTERNS = Object.freeze({
  fade(ctx, { opacity, width, height }) {
    ctx.globalAlpha = opacity;
    fill(ctx, 0, 0, width, height);
  },
  shutter(ctx, { opacity, width, height }) {
    for (let i = 0; i < 8; i++) {
      const w =
        width * Math.min(1, Math.max(0, opacity * 1.25 - (i % 2) * 0.25));
      fill(ctx, i % 2 ? width - w : 0, (i * height) / 8, w, height / 8);
    }
  },
  blinds(ctx, { opacity, width, height }) {
    for (let i = 0; i < 12; i++)
      fill(ctx, 0, (i * height) / 12, width, (height / 12) * opacity);
  },
  mosaic(ctx, { opacity, width, height }) {
    const cell = 16;
    for (let y = 0; y < height; y += cell)
      for (let x = 0; x < width; x += cell) {
        const delay = (((x / cell) * 7 + (y / cell) * 11) % 13) / 26,
          t = Math.max(0, Math.min(1, opacity * 1.5 - delay));
        fill(
          ctx,
          x + ((1 - t) * cell) / 2,
          y + ((1 - t) * cell) / 2,
          cell * t,
          cell * t,
        );
      }
  },
  wave(ctx, { opacity, width, height }) {
    for (let y = 0; y < height; y += 4) {
      const w =
        width *
        Math.max(
          0,
          Math.min(
            1,
            opacity + Math.sin(y / 16) * 0.15 * Math.sin(opacity * Math.PI),
          ),
        );
      fill(ctx, 0, y, w, 4);
    }
  },
  iris(ctx, { opacity, width, height }) {
    const r = ((1 - opacity) * Math.hypot(width, height)) / 2;
    for (let y = 0; y < height; y += 2) {
      const dy = y - height / 2,
        half = Math.sqrt(Math.max(0, r * r - dy * dy));
      fill(ctx, 0, y, width / 2 - half, 2);
      fill(ctx, width / 2 + half, y, width / 2 - half, 2);
    }
  },
});
/** Registry owns appearance only; transition clock retains commit coverage ownership. */
export class TransitionPatterns {
  constructor(definitions = TRANSITION_PATTERNS) {
    this.patterns = new Map(Object.entries(definitions));
  }
  register(id, draw) {
    if (this.patterns.has(id) || typeof draw !== "function")
      throw new Error("Invalid transition pattern");
    this.patterns.set(id, draw);
    return this;
  }
  draw(ctx, kind, frame) {
    ctx.save();
    try {
      ctx.fillStyle = shade;
      if (frame.opacity >= 1) fill(ctx, 0, 0, frame.width, frame.height);
      else (this.patterns.get(kind) || this.patterns.get("fade"))(ctx, frame);
    } finally {
      ctx.restore();
    }
  }
}
