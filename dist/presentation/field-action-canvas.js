/** Pixel cues over a grid target; presentation never reads field qualifications or writes world state. */
function pulse(ctx, { x, y, t, color }) {
  const radius = 3 + 12 * t;
  ctx.save();
  ctx.globalAlpha = 1 - t * 0.7;
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4,
      px = Math.round(x + Math.cos(angle) * radius),
      py = Math.round(y + Math.sin(angle) * radius);
    ctx.fillRect(px - 1, py - 1, 3, 3);
  }
  ctx.restore();
}
const water = (ctx, visual) => pulse(ctx, { ...visual, color: "#78d5ed" });
const impact = (ctx, visual) => pulse(ctx, { ...visual, color: "#ffe596" });
export const FIELD_ACTION_EFFECTS = Object.freeze({
  "field-impact": impact,
  "field-bike": impact,
  "field-fall": (ctx, visual) => pulse(ctx, { ...visual, color: "#a58c73" }),
  "field-dive": water,
  "field-water": water,
  "field-fishing": water,
  "field-cut": (ctx, visual) => {
    impact(ctx, visual);
    ctx.fillStyle = "#fffbe7";
    for (let i = 0; i < 12; i++)
      ctx.fillRect(
        Math.round(visual.x - 6 + i),
        Math.round(visual.y + 6 - i),
        2,
        2,
      );
  },
});
export function drawFieldAction(ctx, frame, point, registry) {
  if (!frame || frame.phase !== "effect") return;
  registry.draw(ctx, {
    kind: frame.cue,
    t: frame.progress,
    ...point,
    source: point,
    target: point,
    phase: frame.phase,
    actionId: frame.id,
    scope: "field",
  });
}
