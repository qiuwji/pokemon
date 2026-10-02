import { pixel } from "./pixel-effects.js";
/** Clock-driven deterministic weather particles, shared by field and battle; no game RNG. */
export function drawWeather(
  ctx,
  kind,
  now,
  { width = 320, height = 170, reducedMotion = false } = {},
) {
  if (!kind) return;
  ctx.save();
  if (kind === "sun") {
    ctx.fillStyle = "#f8d858";
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0, 0, width, height);
  } else if (!reducedMotion) {
    ctx.globalAlpha = kind === "sand" ? 0.3 : 0.6;
    for (let i = 0; i < 48; i++) {
      const speed = kind === "rain" ? 0.22 : 0.06,
        x = (i * 73 + now * (kind === "sand" ? 0.09 : 0.025)) % width,
        y = (i * 47 + now * speed) % height;
      pixel(
        ctx,
        x,
        y,
        kind === "rain" ? "#a8d8f8" : kind === "sand" ? "#c8a060" : "#e8f8ff",
        kind === "rain" ? 1 : 2,
      );
      if (kind === "rain") {
        ctx.fillStyle = "#a8d8f8";
        ctx.fillRect(Math.round(x - 1), Math.round(y - 5), 1, 5);
      }
    }
  } else {
    ctx.fillStyle = kind === "rain" ? "#4880a8" : "#c8b898";
    ctx.globalAlpha = 0.08;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
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
