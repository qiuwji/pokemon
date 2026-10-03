import { drawWeather } from "./environment-canvas.js";
import { createDefaultPresentation } from "./default-presentation.js";
const DEFAULT_REGISTRY = createDefaultPresentation();
/** Canvas adapter for presentation poses; no access to domain state. */
export function drawBattle(ctx, assets, frame) {
  const { view, actors, effect, ball } = frame;
  ctx.fillStyle = "#e8f9db";
  ctx.fillRect(0, 0, 320, 224);
  drawBattleBackground(ctx, assets, view.environment);
  const registry = frame.registry || DEFAULT_REGISTRY;
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
  for (const trainer of frame.trainers || []) {
    const image = assets[`actor-${trainer.actor}`];
    if (!image) continue;
    ctx.save();
    ctx.globalAlpha = trainer.opacity;
    ctx.drawImage(
      image,
      0,
      0,
      trainer.width || 16,
      trainer.height || 32,
      Math.round(trainer.x - 16),
      Math.round(trainer.y - 48),
      32,
      64,
    );
    ctx.restore();
  }
  for (let i = combatants.length - 1; i >= 0; i--) {
    const mon = combatants[i].monster,
      pose = actors[i],
      position = layout.get(combatants[i].seatId);
    if (!mon || !position) continue;
    const image =
      assets[
        (position.back ? mon.sprites?.back : mon.sprites?.front) ||
          mon.species + (position.back ? "-back" : "-front")
      ];
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
    registry.draw(ctx, visual);
  const phase = ((frame.now || 0) / 1200) % 1;
  for (const c of combatants) {
    const pose = actors.find((a) => a.seatId === c.seatId),
      p = layout.get(c.seatId);
    if (!c.monster || !p || !(pose?.opacity > 0)) continue;
    if (c.monster.status)
      registry.draw(ctx, {
        kind: "ailment",
        status: c.monster.status,
        target: p,
        t: frame.reducedMotion ? 0.5 : phase,
      });
    if (c.monster.volatile?.protected)
      registry.draw(ctx, { kind: "shield", target: p, t: 0.5 });
    for (const shield of c.monster.volatile?.barriers || [])
      registry.draw(ctx, { kind: "shield", shield, target: p, t: 0.5 });
    if (c.monster.volatile?.substitute)
      registry.draw(ctx, {
        kind: "shield",
        shield: "substitute",
        target: p,
        t: 0.5,
      });
  }
  drawWeather(ctx, view.environment?.weatherVisual, frame.now || 0, {
    reducedMotion: frame.reducedMotion,
    registry,
  });
  if (ball) drawBall(ctx, ball);
}
export function drawBattleBackground(ctx, assets, environment = {}) {
  const terrain = environment?.terrain || "grass",
    custom = assets[`battle-bg-${terrain}`];
  if (custom || terrain === "grass") {
    const image = custom || assets["battle-bg"];
    if (image) ctx.drawImage(image, 0, 0, 320, 170);
    return;
  }
  const palettes = {
    water: ["#b8e0f8", "#58a8c8"],
    sand: ["#f8e0b0", "#c8b078"],
    cave: ["#706878", "#484050"],
    indoor: ["#d8d8e0", "#8898a8"],
    forest: ["#b8d898", "#588860"],
    snow: ["#e8f8ff", "#b8d8e8"],
  };
  const [sky, ground] = palettes[terrain] || palettes.indoor;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 320, 110);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 110, 320, 60);
  for (const [x, y, w] of [
    [30, 151, 102],
    [208, 69, 82],
  ]) {
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, 10);
    ctx.fillRect(x + 7, y - 4, w - 14, 18);
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
