const GLYPHS = {
  exclamation: ["00100", "00100", "00100", "00100", "00000", "00100", "00100"],
  question: ["01110", "10001", "00010", "00100", "00100", "00000", "00100"],
  heart: ["01010", "11111", "11111", "11111", "01110", "00100", "00000"],
};

/** Small pixel emotion bubble; presentation consumes a semantic cue, not story flags. */
export function drawFieldEmote(ctx, { kind, x, y }) {
  const glyph = GLYPHS[kind];
  if (!glyph) return;
  x = Math.round(x - 6);
  y = Math.round(y - 15);
  ctx.fillStyle = "#28384a";
  ctx.fillRect(x, y + 1, 13, 12);
  ctx.fillRect(x + 1, y, 11, 14);
  ctx.fillRect(x + 5, y + 14, 3, 2);
  ctx.fillStyle = "#fffbe7";
  ctx.fillRect(x + 1, y + 1, 11, 11);
  ctx.fillRect(x + 6, y + 12, 1, 2);
  ctx.fillStyle = kind === "heart" ? "#d95870" : "#28384a";
  glyph.forEach((row, gy) =>
    [...row].forEach((pixel, gx) => {
      if (pixel === "1") ctx.fillRect(x + 4 + gx, y + 3 + gy, 1, 1);
    }),
  );
}
