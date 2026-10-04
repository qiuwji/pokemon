/** Frame-local drawing; effects are registered independently from layer ownership. */
export function drawEnvironmentLayers(
  ctx,
  layers,
  now,
  { width, height, reducedMotion = false, registry },
) {
  for (const l of layers) {
    ctx.save();
    try {
      ctx.globalAlpha *= l.opacity;
      registry.draw(ctx, {
        kind: l.visual,
        parameters: l.data,
        now: reducedMotion ? 0 : now,
        width,
        height,
        reducedMotion,
      });
    } finally {
      ctx.restore();
    }
  }
}
