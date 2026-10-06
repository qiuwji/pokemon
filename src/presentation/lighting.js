/** Pure row mask, including overlapping lights. It never erases the already drawn world. */
export function lightMask(width, height, lights) {
  const rectangles = [];
  for (let y = 0; y < height; y++) {
    const intervals = lights
      .flatMap((l) => {
        const dy = y - l.y;
        if (Math.abs(dy) > l.radius) return [];
        const dx = Math.sqrt(l.radius * l.radius - dy * dy);
        return [
          [
            Math.max(0, Math.ceil(l.x - dx)),
            Math.min(width, Math.floor(l.x + dx) + 1),
          ],
        ];
      })
      .filter(([start, end]) => start < end)
      .sort((a, b) => a[0] - b[0]);
    let cursor = 0;
    for (const [start, end] of intervals) {
      if (start > cursor)
        rectangles.push({ x: cursor, y, width: start - cursor, height: 1 });
      cursor = Math.max(cursor, end);
    }
    if (cursor < width)
      rectangles.push({ x: cursor, y, width: width - cursor, height: 1 });
  }
  return rectangles;
}
export class LightingDirector {
  constructor({ duration = 480 } = {}) {
    this.duration = duration;
    this.active = null;
  }
  sample(
    map,
    now,
    darkness,
    presentations = [],
    { reducedMotion = false } = {},
  ) {
    if (!darkness) {
      this.active = null;
      return null;
    }
    const radius = Math.max(
      darkness.radius,
      ...presentations
        .filter(
          (p) =>
            p?.kind === "light-radius" &&
            Number.isFinite(p.radius) &&
            p.radius >= 0 &&
            p.radius <= 512,
        )
        .map((p) => p.radius),
    );
    if (!this.active || this.active.map !== map)
      this.active = { map, from: radius, to: radius, start: now };
    if (radius !== this.active.to)
      this.active = { map, from: this.radius(now), to: radius, start: now };
    if (reducedMotion)
      this.active = { map, from: radius, to: radius, start: now };
    return { radius: this.radius(now), opacity: darkness.opacity ?? 1 };
  }
  radius(now) {
    const a = this.active,
      t = Math.max(
        0,
        Math.min(1, (now - a.start) / Math.max(1, this.duration)),
      );
    return a.from + (a.to - a.from) * t;
  }
}
export function drawLighting(ctx, { width, height, lights, opacity = 1 }) {
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.globalAlpha *= opacity;
  for (const r of lightMask(width, height, lights))
    ctx.fillRect(r.x, r.y, r.width, r.height);
  ctx.restore();
}
