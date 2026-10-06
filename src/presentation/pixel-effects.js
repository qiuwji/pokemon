/** Neutral tone used when a recipe and the injected palette both leave a colour unspecified. */
const NEUTRAL_COLOR = "#fff8d8";
export const pixel = (ctx, x, y, color, size = 3) => {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    Math.max(1, Math.round(size)),
    Math.max(1, Math.round(size)),
  );
};
const num = (value, fallback) => (Number.isFinite(value) ? value : fallback);
/** A recipe colour wins; otherwise the palette colour injected at sampling time; else neutral. */
const color = (e) => e.color || NEUTRAL_COLOR;
const target = (e) => ({
  ...e.target,
  y: e.target.y + (e.successful === false ? -45 : 0),
});
function ring(ctx, e) {
  const p = target(e),
    count = Math.max(4, Math.round(num(e.count, 16))),
    begin = num(e.radius, 8),
    reach = num(e.reach, 30),
    size = num(e.pixelSize, 3),
    squash = num(e.squash, 1),
    c = color(e);
  for (let i = 0; i < count; i++) {
    const a = (i * Math.PI * 2) / count,
      r = begin + e.t * reach;
    pixel(ctx, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * squash, c, size);
  }
}
function projectile(ctx, e) {
  const p = target(e),
    lead = num(e.lead, 0.1),
    span = num(e.span, 0.65),
    t = Math.min(1, Math.max(0, (e.t - lead) / span)),
    count = Math.max(1, Math.round(num(e.count, 8))),
    trail = num(e.trail, 0.025),
    wobble = num(e.wobble, 5),
    wobbleSpeed = num(e.wobbleSpeed, 15),
    head = num(e.pixelSize, 6),
    taper = num(e.taper, 0.5),
    arc = num(e.arc, 0),
    burstAt = num(e.burstAt, 0.7),
    c = color(e);
  for (let i = 0; i < count; i++) {
    const u = Math.max(0, t - i * trail);
    pixel(
      ctx,
      e.source.x + (p.x - e.source.x) * u,
      e.source.y +
        (p.y - e.source.y) * u +
        Math.sin(e.t * wobbleSpeed + i) * wobble -
        arc * Math.sin(Math.PI * u),
      c,
      Math.max(1, head - i * taper),
    );
  }
  if (e.t > burstAt && e.successful !== false)
    ring(ctx, {
      ...e,
      t: (e.t - burstAt) / (1 - burstAt),
      count: e.burstCount,
      radius: e.burstRadius,
      reach: e.burstReach,
      pixelSize: e.burstSize,
    });
}
function contact(ctx, e) {
  if (e.t < 0.5 || e.t > 0.9 || e.successful === false) return;
  ring(ctx, { ...e, t: (e.t - 0.5) / 0.4 });
}
function status(ctx, e) {
  const count = Math.max(1, Math.round(num(e.count, 3))),
    base = num(e.base, 10),
    step = num(e.step, 9),
    reach = num(e.reach, 15);
  ctx.strokeStyle = color(e);
  ctx.lineWidth = num(e.lineWidth, 2);
  for (let i = 0; i < count; i++) {
    const d = base + i * step + e.t * reach;
    ctx.strokeRect(
      Math.round(e.source.x - d / 2),
      Math.round(e.source.y - d / 2),
      Math.round(d),
      Math.round(d),
    );
  }
}
function sparkle(ctx, e) {
  const p = e.target ||
      e.source || { x: e.side === 0 ? 73 : 250, y: e.side === 0 ? 136 : 56 },
    count = Math.max(1, Math.round(num(e.count, 7))),
    phase = num(e.spread, 2.4),
    radius = num(e.radius, 25),
    base = num(e.base, 25),
    rise = num(e.rise, 55),
    size = num(e.pixelSize, 7),
    c = e.kind === "heal" ? "#78d8a0" : color(e);
  for (let i = 0; i < count; i++) {
    const a = i * phase,
      t = (e.t + i / count) % 1,
      x = p.x + Math.cos(a) * radius,
      y = p.y + base - t * rise;
    pixel(ctx, x - 3, y, c, size);
    pixel(ctx, x, y - 3, c, Math.max(1, size - 6));
    pixel(ctx, x - 1, y - 2, c, Math.max(1, size - 4));
  }
}
function slash(ctx, e) {
  if (e.successful === false) return;
  const p = target(e),
    blades = Math.max(1, Math.round(num(e.count, 3))),
    steps = Math.max(1, Math.round(num(e.steps, 9))),
    stepX = num(e.stepX, 3),
    stepY = num(e.stepY, 4),
    spread = num(e.spread, 9),
    originX = num(e.originX, -20),
    originY = num(e.originY, -20),
    size = num(e.pixelSize, 3),
    c = e.color || "#fff8e8";
  for (let i = 0; i < blades; i++)
    for (let j = 0; j < steps; j++)
      if (j / steps < e.t)
        pixel(
          ctx,
          p.x + originX + i * spread + j * stepX,
          p.y + originY + j * stepY,
          c,
          size,
        );
}
function flame(ctx, e) {
  projectile(ctx, e);
  const at = num(e.emberAt, 0.65);
  if (e.t > at && e.successful !== false) {
    const p = target(e),
      count = Math.max(1, Math.round(num(e.emberCount, 10))),
      spread = num(e.emberSpread, 14),
      rise = num(e.emberRise, 45),
      size = num(e.emberSize, 4),
      grow = num(e.emberGrow, 3),
      c1 = e.color || "#e85830",
      c2 = e.color2 || "#f8d850";
    for (let i = 0; i < count; i++) {
      const u = (e.t + i * 0.13) % 1;
      pixel(
        ctx,
        p.x + Math.sin(i * 3) * spread,
        p.y + 15 - u * rise,
        i % 2 ? c2 : c1,
        size + u * grow,
      );
    }
  }
}
function bubbles(ctx, e) {
  const p = target(e),
    count = Math.max(1, Math.round(num(e.count, 9))),
    speed = num(e.speed, 1.4),
    gap = num(e.gap, 0.045),
    wobble = num(e.wobble, 10),
    wobbleSpeed = num(e.wobbleSpeed, 7),
    wobblePhase = num(e.wobblePhase, 2),
    size = num(e.pixelSize, 4),
    sizeStep = num(e.sizeStep, 2),
    cycle = Math.max(1, Math.round(num(e.cycle, 3)));
  ctx.strokeStyle = e.color || "#b8e8f8";
  ctx.lineWidth = 2;
  for (let i = 0; i < count; i++) {
    const t = Math.max(0, Math.min(1, e.t * speed - i * gap)),
      x = e.source.x + (p.x - e.source.x) * t,
      y =
        e.source.y +
        (p.y - e.source.y) * t +
        Math.sin(i * wobblePhase + t * wobbleSpeed) * wobble,
      d = size + (i % cycle) * sizeStep;
    ctx.strokeRect(Math.round(x), Math.round(y), d, d);
  }
}
function bolt(ctx, e) {
  if (e.successful === false) return;
  const p = target(e),
    count = Math.max(1, Math.round(num(e.count, 12))),
    drop = num(e.drop, 45),
    step = num(e.step, 4),
    zig = num(e.zig, 7),
    zag = num(e.zag, -3),
    size = num(e.pixelSize, 5),
    c = e.color || "#f8e878";
  for (let i = 0; i < count; i++)
    pixel(ctx, p.x + (i % 2 ? zig : zag), p.y - drop + i * step, c, size);
}
function leaves(ctx, e) {
  const p = target(e),
    count = Math.max(1, Math.round(num(e.count, 10))),
    gap = num(e.gap, 0.07),
    wobble = num(e.wobble, 14),
    wobbleSpeed = num(e.wobbleSpeed, 9),
    size = num(e.pixelSize, 4),
    c1 = e.color || "#58b858",
    c2 = e.color2 || "#a8d850";
  for (let i = 0; i < count; i++) {
    const t = (e.t + i * gap) % 1,
      x = e.source.x + (p.x - e.source.x) * t,
      y =
        e.source.y +
        (p.y - e.source.y) * t +
        Math.sin(t * wobbleSpeed + i) * wobble;
    pixel(ctx, x, y, c1, size);
    pixel(ctx, x + 2, y - 2, c2, Math.max(1, size - 1));
  }
}
function beam(ctx, e) {
  const p = target(e),
    reach = Math.min(1, e.t * num(e.growth, 2));
  ctx.strokeStyle = color(e);
  ctx.lineWidth = num(e.lineWidth, 4);
  ctx.beginPath();
  ctx.moveTo(e.source.x, e.source.y);
  ctx.lineTo(
    Math.round(e.source.x + (p.x - e.source.x) * reach),
    Math.round(e.source.y + (p.y - e.source.y) * reach),
  );
  ctx.stroke();
}
function rocks(ctx, e) {
  const p = target(e),
    count = Math.max(1, Math.round(num(e.count, 9))),
    gap = num(e.gap, 0.08),
    spread = num(e.spread, 22),
    drop = num(e.drop, 55),
    fall = num(e.fall, 70),
    size = num(e.pixelSize, 5),
    sizeStep = num(e.sizeStep, 1),
    phase = num(e.phase, 4),
    c = color(e);
  for (let i = 0; i < count; i++) {
    const t = (e.t + i * gap) % 1;
    pixel(
      ctx,
      p.x + Math.sin(i * phase) * spread,
      p.y - drop + t * fall,
      c,
      size + (i % 3) * sizeStep,
    );
  }
}
function drain(ctx, e) {
  leaves(ctx, { ...e, source: e.target, target: e.source });
}
function stages(ctx, e) {
  const p = e.target,
    d = e.amount < 0 ? 1 : -1;
  for (let i = 0; i < 4; i++) {
    const y = p.y + 20 + d * ((e.t + i / 4) % 1) * 50,
      c = d < 0 ? "#f8a858" : "#78b8f8";
    pixel(ctx, p.x - 19 + i * 12, y, c, 3);
    pixel(ctx, p.x - 22 + i * 12, y - d * 3, c, 3);
    pixel(ctx, p.x - 16 + i * 12, y - d * 3, c, 3);
  }
}
function shield(ctx, e) {
  const p = e.target;
  ctx.strokeStyle = e.shield === "lightScreen" ? "#f8e080" : "#88d8e8";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.3 + Math.sin(e.t * Math.PI) * 0.25;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillRect(p.x - 23, p.y - 25, 46, 55);
  ctx.strokeRect(p.x - 23, p.y - 25, 46, 55);
}
function ailment(ctx, e) {
  const p = e.target,
    t = e.t;
  if (e.status === "burn") {
    for (let i = 0; i < 3; i++)
      pixel(
        ctx,
        p.x - 12 + i * 10,
        p.y + 10 - ((t + i / 3) % 1) * 20,
        "#f87848",
        4,
      );
  } else if (e.status === "paralysis") {
    for (let i = 0; i < 4; i++)
      pixel(
        ctx,
        p.x + Math.cos(i * 2) * 22,
        p.y + Math.sin(i * 2 + t * 6) * 16,
        "#f8d830",
        3,
      );
  } else if (e.status === "freeze") {
    ctx.strokeStyle = "#b8e8f8";
    ctx.strokeRect(p.x - 20, p.y - 20, 40, 44);
  } else if (e.status === "sleep") {
    for (let i = 0; i < 3; i++)
      pixel(
        ctx,
        p.x + 8 + i * 5,
        p.y - 16 - ((t + i / 3) % 1) * 12,
        "#a8b8d8",
        3,
      );
  } else {
    for (let i = 0; i < 5; i++)
      pixel(
        ctx,
        p.x + Math.sin(i * 2) * 18,
        p.y + 18 - ((t + i / 5) % 1) * 35,
        "#b878c8",
        3,
      );
  }
}
export const PIXEL_EFFECTS = Object.freeze({
  projectile,
  contact,
  status,
  release: sparkle,
  stars: sparkle,
  heal: sparkle,
  slash,
  flame,
  bubbles,
  bolt,
  leaves,
  beam,
  wave: ring,
  rocks,
  drain,
  stages,
  shield,
  ailment,
});
