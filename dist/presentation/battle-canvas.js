const COLORS = {
  fire: "#f87828",
  water: "#58b8f8",
  grass: "#60b850",
  electric: "#f8d830",
  psychic: "#e878c0",
  normal: "#fff8d8",
  poison: "#b870c8",
  bug: "#90c050",
  ground: "#c8a068",
};
const POSITIONS = [
  { x: 73, y: 136 },
  { x: 250, y: 56 },
];

/** Canvas adapter for presentation poses; no access to domain state. */
export function drawBattle(ctx, assets, frame) {
  const { view, actors, effect, ball } = frame;
  ctx.fillStyle = "#e8f9db";
  ctx.fillRect(0, 0, 320, 224);
  ctx.drawImage(assets["battle-bg"], 0, 0, 320, 170);
  const combatants = frame.combatants || [
    { seatId: "home:0", monster: view.player },
    { seatId: "away:0", monster: view.enemy },
  ];
  const layout =
    frame.layout ||
    new Map([
      ["home:0", { x: 73, baseline: 182, size: 92, back: true }],
      ["away:0", { x: 250, baseline: 97, size: 85, back: false }],
    ]);
  for (let i = combatants.length - 1; i >= 0; i--) {
    const mon = combatants[i].monster,
      pose = actors[i],
      position = layout.get(combatants[i].seatId);
    if (!mon || !position) continue;
    const image = assets[mon.species + (position.back ? "-back" : "-front")];
    if (!image || pose.opacity <= 0 || pose.scale <= 0 || pose.flash) continue;
    const size = position.size * pose.scale,
      x = position.x + pose.x - size / 2,
      y = position.baseline + pose.y - size;
    ctx.save();
    ctx.globalAlpha = pose.opacity;
    ctx.drawImage(
      image,
      0,
      0,
      64,
      64,
      Math.round(x),
      Math.round(y),
      Math.round(size),
      Math.round(size),
    );
    ctx.restore();
  }
  for (const visual of frame.effects || (effect ? [effect] : []))
    drawEffect(ctx, visual);
  if (ball) drawBall(ctx, ball);
}
function pixel(ctx, x, y, color, size = 3) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}
function star(ctx, x, y, color) {
  pixel(ctx, x - 4, y, color, 9);
  pixel(ctx, x, y - 4, color, 1);
  pixel(ctx, x - 1, y - 3, color, 3);
  pixel(ctx, x - 1, y + 1, color, 3);
}
function drawEffect(ctx, e) {
  const source = e.source || POSITIONS[e.side],
    target = { ...(e.target || POSITIONS[1 - e.side]) },
    t = e.t,
    color = COLORS[e.type] || COLORS.normal;
  if (e.successful === false) target.y -= 45;
  if (e.kind === "projectile") {
    const travel = Math.min(1, Math.max(0, (t - 0.1) / 0.65));
    for (let i = 0; i < 8; i++) {
      const p = Math.max(0, travel - i * 0.025),
        x = source.x + (target.x - source.x) * p,
        y = source.y + (target.y - source.y) * p;
      pixel(ctx, x, y + Math.sin(t * 15 + i) * 5, color, 6 - i * 0.5);
    }
    if (t > 0.7 && e.successful !== false)
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          d = (t - 0.7) * 65;
        pixel(
          ctx,
          target.x + Math.cos(a) * d,
          target.y + Math.sin(a) * d,
          color,
          4,
        );
      }
  } else if (
    e.kind === "contact" &&
    t > 0.5 &&
    t < 0.9 &&
    e.successful !== false
  ) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        d = 7 + (t - 0.5) * 40;
      pixel(
        ctx,
        target.x + Math.cos(a) * d,
        target.y + Math.sin(a) * d,
        "#f8f8e0",
        4,
      );
      pixel(
        ctx,
        target.x + Math.cos(a) * (d + 5),
        target.y + Math.sin(a) * (d + 5),
        "#e8a050",
        2,
      );
    }
  } else if (e.kind === "status") {
    for (let i = 0; i < 3; i++) {
      const d = 10 + i * 9 + t * 15;
      ctx.strokeStyle = "#a090b8";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.round(source.x - d / 2),
        Math.round(source.y - d / 2),
        d,
        d,
      );
    }
  } else if (!["contact", "projectile"].includes(e.kind)) {
    const p = e.source || POSITIONS[e.side];
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4,
        tick = (t + i / 7) % 1;
      star(
        ctx,
        p.x + Math.cos(a) * 25,
        p.y + 25 - tick * 55,
        e.kind === "heal" ? "#78d8a0" : "#f8e878",
      );
    }
  }
}
function drawBall(ctx, b) {
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y));
  ctx.rotate(b.angle);
  // Deliberately composed of whole pixels, including its stepped silhouette.
  ctx.fillStyle = "#283038";
  ctx.fillRect(-5, -7, 10, 14);
  ctx.fillRect(-7, -5, 14, 10);
  ctx.fillStyle = b.sealed ? "#a06068" : "#e85858";
  ctx.fillRect(-4, -5, 8, 4);
  ctx.fillRect(-5, -4, 10, 3);
  ctx.fillStyle = "#f8f8e8";
  ctx.fillRect(-5, 1, 10, 3);
  ctx.fillRect(-4, 4, 8, 1);
  ctx.fillStyle = "#283038";
  ctx.fillRect(-6, -1, 12, 2);
  ctx.fillRect(-2, -3, 4, 6);
  ctx.fillStyle = b.sealed ? "#f8d850" : "#f8f8e8";
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}
