export const TYPE_COLORS = Object.freeze({
  normal: "#fff8d8",
  fire: "#f87828",
  water: "#58b8f8",
  grass: "#60b850",
  electric: "#f8d830",
  psychic: "#e878c0",
  poison: "#b870c8",
  bug: "#90c050",
  ground: "#c8a068",
  fighting: "#c85838",
  flying: "#b0a0e8",
  rock: "#b8a048",
  ghost: "#7860a8",
  dragon: "#7860f8",
  dark: "#786858",
  steel: "#b8b8d0",
  ice: "#98e0e0",
});
export const pixel = (ctx, x, y, color, size = 3) => {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    Math.max(1, Math.round(size)),
    Math.max(1, Math.round(size)),
  );
};
const color = (e) => TYPE_COLORS[e.type] || TYPE_COLORS.normal;
const target = (e) => ({
  ...e.target,
  y: e.target.y + (e.successful === false ? -45 : 0),
});
function ring(ctx, e) {
  const p = target(e);
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      r = 8 + e.t * 30;
    pixel(ctx, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, color(e), 3);
  }
}
function projectile(ctx, e) {
  const p = target(e),
    t = Math.min(1, Math.max(0, (e.t - 0.1) / 0.65));
  for (let i = 0; i < 8; i++) {
    const u = Math.max(0, t - i * 0.025);
    pixel(
      ctx,
      e.source.x + (p.x - e.source.x) * u,
      e.source.y + (p.y - e.source.y) * u + Math.sin(e.t * 15 + i) * 5,
      color(e),
      6 - i * 0.5,
    );
  }
  if (e.t > 0.7 && e.successful !== false)
    ring(ctx, { ...e, t: (e.t - 0.7) / 0.3 });
}
function contact(ctx, e) {
  if (e.t < 0.5 || e.t > 0.9 || e.successful === false) return;
  ring(ctx, { ...e, t: (e.t - 0.5) / 0.4 });
}
function status(ctx, e) {
  for (let i = 0; i < 3; i++) {
    const d = 10 + i * 9 + e.t * 15;
    ctx.strokeStyle = color(e);
    ctx.lineWidth = 2;
    ctx.strokeRect(
      Math.round(e.source.x - d / 2),
      Math.round(e.source.y - d / 2),
      Math.round(d),
      Math.round(d),
    );
  }
}
function sparkle(ctx, e) {
  const p = e.target || e.source;
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4,
      t = (e.t + i / 7) % 1,
      x = p.x + Math.cos(a) * 25,
      y = p.y + 25 - t * 55,
      c = e.kind === "heal" ? "#78d8a0" : color(e);
    pixel(ctx, x - 3, y, c, 7);
    pixel(ctx, x, y - 3, c, 1);
    pixel(ctx, x - 1, y - 2, c, 3);
  }
}
function slash(ctx, e) {
  if (e.successful === false) return;
  const p = target(e);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 9; j++)
      if (j / 9 < e.t)
        pixel(ctx, p.x - 20 + i * 9 + j * 3, p.y - 20 + j * 4, "#fff8e8", 3);
}
function flame(ctx, e) {
  projectile(ctx, e);
  if (e.t > 0.65 && e.successful !== false) {
    const p = target(e);
    for (let i = 0; i < 10; i++) {
      const u = (e.t + i * 0.13) % 1;
      pixel(
        ctx,
        p.x + Math.sin(i * 3) * 14,
        p.y + 15 - u * 45,
        i % 2 ? "#f8d850" : "#e85830",
        4 + u * 3,
      );
    }
  }
}
function bubbles(ctx, e) {
  const p = target(e);
  for (let i = 0; i < 9; i++) {
    const t = Math.max(0, Math.min(1, e.t * 1.4 - i * 0.045)),
      x = e.source.x + (p.x - e.source.x) * t,
      y = e.source.y + (p.y - e.source.y) * t + Math.sin(i * 2 + t * 7) * 10;
    ctx.strokeStyle = "#b8e8f8";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      Math.round(x),
      Math.round(y),
      4 + (i % 3) * 2,
      4 + (i % 3) * 2,
    );
  }
}
function bolt(ctx, e) {
  if (e.successful === false) return;
  const p = target(e);
  for (let i = 0; i < 12; i++)
    pixel(ctx, p.x + (i % 2 ? 7 : -3), p.y - 45 + i * 4, "#f8e878", 5);
}
function leaves(ctx, e) {
  const p = target(e);
  for (let i = 0; i < 10; i++) {
    const t = (e.t + i * 0.07) % 1,
      x = e.source.x + (p.x - e.source.x) * t,
      y = e.source.y + (p.y - e.source.y) * t + Math.sin(t * 9 + i) * 14;
    pixel(ctx, x, y, "#58b858", 4);
    pixel(ctx, x + 2, y - 2, "#a8d850", 3);
  }
}
function beam(ctx, e) {
  const p = target(e);
  ctx.strokeStyle = color(e);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(e.source.x, e.source.y);
  ctx.lineTo(
    Math.round(e.source.x + (p.x - e.source.x) * Math.min(1, e.t * 2)),
    Math.round(e.source.y + (p.y - e.source.y) * Math.min(1, e.t * 2)),
  );
  ctx.stroke();
}
function rocks(ctx, e) {
  const p = target(e);
  for (let i = 0; i < 9; i++) {
    const t = (e.t + i * 0.08) % 1;
    pixel(
      ctx,
      p.x + Math.sin(i * 4) * 22,
      p.y - 55 + t * 70,
      color(e),
      5 + (i % 3),
    );
  }
}
function drain(ctx, e) {
  leaves(ctx, { ...e, source: e.target, target: e.source, type: "grass" });
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
