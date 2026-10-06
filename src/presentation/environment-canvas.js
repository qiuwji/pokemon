import { createDefaultPresentation } from "./default-presentation.js";
const DEFAULT_REGISTRY = createDefaultPresentation();
/** Only dispatches registered drawing; weather state and battle effects belong to the engine. */
export function drawWeather(
  ctx,
  visual,
  now,
  {
    width = 320,
    height = 170,
    reducedMotion = false,
    opacity = 1,
    registry = DEFAULT_REGISTRY,
  } = {},
) {
  if (!visual || opacity <= 0) return;
  ctx.save();
  try {
    if (opacity < 1) ctx.globalAlpha *= opacity;
    registry.draw(ctx, {
      kind: visual,
      now: reducedMotion ? 0 : now,
      width,
      height,
      reducedMotion,
    });
  } finally {
    ctx.restore();
  }
}
export function drawDaylight(
  ctx,
  hour,
  { indoor = false, width = 320, height = 224 } = {},
) {
  if (indoor) return;
  const night = hour < 6 || hour >= 20,
    dusk = hour >= 17 && hour < 20;
  if (!night && !dusk) return;
  ctx.save();
  ctx.fillStyle = night ? "#102850" : "#d88050";
  ctx.globalAlpha = night ? 0.25 : 0.12;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
