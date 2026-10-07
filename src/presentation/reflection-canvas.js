import { drawAppearance } from "./appearance-canvas.js";
/** Reflections activate below the current cell only; stepping away clears them immediately. */
export function drawReflection(renderer, frame, motion, x, y, lift, cells, {
  resourceFor, reducedMotion = false, opacity = 1, horizontalScale = 1, columnsFor, origins = [{ x, y }],
} = {}) {
  if (!frame || !cells.length) return;
  const bounds = frame.bounds || { left: 0, right: 16, top: -16, bottom: 16 };
  const width = Math.floor((bounds.right - bounds.left + 8) / 16);
  // The current grid cell is authoritative even before the departure step finishes.
  origins = origins.slice(0, 1);
  let surface;
  for (let col = 0; col < width && !surface; col++)
      for (const origin of origins) {
        for (const side of col ? [1, -1] : [0]) {
          surface = cells.find(cell => Math.abs(cell.x - origin.x - side * col * 16) < 0.01
            && Math.abs(cell.y - origin.y - 16) < 0.01);
          if (surface) break;
        }
        if (surface) break;
      }
  if (!surface) return;
  const reflected = Object.create(renderer);
  reflected.assets = Object.create(renderer.assets);
  const layers = frame.layers.filter(layer => {
    const resource = layer.kind === "actor" && resourceFor?.(layer.actor);
    if (!resource || !renderer.assets[resource]) return false;
    reflected.assets[`actor-${layer.actor}`] = renderer.assets[resource];
    return true;
  });
  if (!layers.length) return;
  const quantized = columnsFor && !reducedMotion && surface.wave;
  if (quantized) reflected.actorImage = (image, sx, sy, sw, sh, dx, dy, dw, dh) => {
    const columns = columnsFor(sw, horizontalScale);
    for (let column = 0; column < sw; column++) {
      const source = columns[column];
      if (source >= 0 && source < sw) renderer.ctx.drawImage(image, sx + source, sy, 1, sh,
        dx + column * dw / sw, dy, dw / sw, dh);
    }
  };
  const c = renderer.ctx, center = x + (bounds.left + bounds.right) / 2;
  const top = y + 30 - bounds.bottom + lift;
  c.save();
  try {
    // GBA affine-normal sprites keep their original bounding box during distortion.
    c.beginPath();
    c.rect(x + bounds.left, top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    c.clip();
    c.globalAlpha *= opacity;
    c.translate(center, 2 * (y + 15));
    c.scale(!quantized && !reducedMotion && surface.wave ? horizontalScale : 1, -1);
    c.translate(-center, 0);
    drawAppearance(reflected, { ...frame, layers }, motion, x, y - lift, { reducedMotion });
  } finally { c.restore(); }
}
