/** Two independent colour coefficients; quantization is a renderer policy, not game state. */
export function blendSpritePixels(backdrop, foreground, [source, destination], { channelBits = 8 } = {}) {
  const shift = 8 - channelBits, maximum = (1 << channelBits) - 1;
  for (let i = 0; i < backdrop.length; i += 4) {
    if (!foreground[i + 3]) continue;
    for (let channel = 0; channel < 3; channel++)
      backdrop[i + channel] = Math.min(maximum, Math.floor(((foreground[i + channel] >> shift) * source +
        (backdrop[i + channel] >> shift) * destination) / 16)) << shift;
    backdrop[i + 3] = 255;
  }
  return backdrop;
}

function paint(ctx, image, sprite, x, y) {
  ctx.save();
  try {
    ctx.translate(x, y);
    if (sprite.rotation) ctx.rotate(sprite.rotation);
    ctx.globalAlpha = sprite.opacity ?? 1;
    ctx.scale((sprite.flipX ? -1 : 1) * (sprite.scaleX || 1), (sprite.flipY ? -1 : 1) * (sprite.scaleY || 1));
    ctx.drawImage(image, 0, (sprite.tileFrame || 0) * sprite.height, sprite.width, sprite.height,
      -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
  } finally { ctx.restore(); }
}

/** Palette interpolation is a generic colour operation; the pack supplies the colour and coefficient. */
export function tintSpritePixels(pixels, { color, amount }, { channelBits = 8 } = {}) {
  const shift = 8 - channelBits;
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    for (let c = 0; c < 3; c++) {
      const original = pixels[i + c] >> shift, target = color[c] >> shift;
      pixels[i + c] = (original + Math.floor((target - original) * amount / 16)) << shift;
    }
  }
  return pixels;
}

/** Bounded sprite sheets. One reusable scratch surface keeps pixel compositing at logical resolution. */
export function createFrameSpritePainter(createSurface, { channelBits = 8 } = {}) {
  let scratch = null;
  return (ctx, image, sprite) => {
    if (!image || (sprite.tileFrame || 0) * sprite.height + sprite.height > image.height || sprite.width > image.width) return;
    const x = Math.round(sprite.x), y = Math.round(sprite.y);
    if (!sprite.alpha && !sprite.tint) { paint(ctx, image, sprite, x, y); return; }
    scratch ||= createSurface();
    const w = sprite.width * (sprite.scaleX || 1), h = sprite.height * (sprite.scaleY || 1),
      cos = Math.abs(Math.cos(sprite.rotation || 0)), sin = Math.abs(Math.sin(sprite.rotation || 0)),
      width = Math.ceil(w * cos + h * sin), height = Math.ceil(h * cos + w * sin);
    if (scratch.width !== width) scratch.width = width;
    if (scratch.height !== height) scratch.height = height;
    const c = scratch.getContext("2d", { willReadFrequently: true });
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, width, height);
    paint(c, image, sprite, width / 2, height / 2);
    const left = Math.round(x - width / 2), top = Math.round(y - height / 2), front = c.getImageData(0, 0, width, height);
    if (sprite.tint) tintSpritePixels(front.data, sprite.tint, { channelBits });
    if (!sprite.alpha) {
      c.putImageData(front, 0, 0);
      ctx.drawImage(scratch, left, top);
      return;
    }
    const back = ctx.getImageData(left, top, width, height);
    blendSpritePixels(back.data, front.data, sprite.alpha, { channelBits });
    c.putImageData(back, 0, 0);
    // drawImage obeys the scene clip; putImageData on the destination would bypass it.
    ctx.drawImage(scratch, left, top);
  };
}
