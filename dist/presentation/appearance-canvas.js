/** Draw prepared layers using one shared motion sample. Recipes cannot write gameplay state. */
const PAINTERS = Object.freeze({
  actor: (renderer, layer, p, x, y) =>
    renderer.actor(
      layer.actor,
      x,
      y,
      p.dir,
      p.progress,
      p.foot,
      p.moving && !p.freezeAnimation,
      { pose: p.pose, timeMs: p.timeMs },
    ),
  image: (renderer, layer, _p, x, y) => {
    const image = renderer.assets[layer.resource];
    if (!image)
      throw new Error(`Missing appearance resource ${layer.resource}`);
    if (layer.rect) {
      const r = layer.rect;
      if (r.x + r.width > image.width || r.y + r.height > image.height)
        throw new Error(
          `Appearance source rectangle exceeds ${layer.resource}`,
        );
      renderer.ctx.drawImage(
        image,
        r.x,
        r.y,
        r.width,
        r.height,
        Math.round(x),
        Math.round(y),
        layer.size.width,
        layer.size.height,
      );
    } else
      renderer.ctx.drawImage(
        image,
        Math.round(x),
        Math.round(y),
        layer.size.width,
        layer.size.height,
      );
  },
});
export function drawAppearance(
  renderer,
  frame,
  motion,
  x,
  y,
  { reducedMotion = false } = {},
) {
  if (!frame) return;
  for (const layer of frame.layers) {
    const c = renderer.ctx,
      bob =
        layer.bob && !reducedMotion
          ? Math.sin((motion.timeMs / layer.bob.periodMs) * Math.PI * 2) *
            layer.bob.amplitude
          : 0;
    c.save();
    try {
      c.globalAlpha *= layer.opacity ?? 1;
      PAINTERS[layer.kind](
        renderer,
        layer,
        motion,
        x + (layer.x || 0),
        y + (layer.y || 0) + bob,
      );
    } finally {
      c.restore();
    }
  }
}
