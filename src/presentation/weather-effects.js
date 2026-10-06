/** Reusable deterministic pixel weather primitives; the registry selects artists, never gameplay rules. */
const tint = (ctx, color, alpha, f) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha *= alpha;
  ctx.fillRect(0, 0, f.width, f.height);
  ctx.restore();
};
const particles =
  ({
    color,
    count = 48,
    vx = 0.025,
    vy = 0.06,
    size = 2,
    streak = 0,
    tintColor = color,
  }) =>
  (ctx, f) => {
    tint(ctx, tintColor, f.reducedMotion ? 0.1 : 0.035, f);
    if (f.reducedMotion) return;
    ctx.fillStyle = color;
    ctx.globalAlpha *= 0.5;
    for (let i = 0; i < count; i++) {
      const x =
        ((((i * 73 + f.now * vx) % (f.width + 16)) + f.width + 16) %
          (f.width + 16)) -
        8;
      const y =
        ((((i * 47 + f.now * vy) % (f.height + 16)) + f.height + 16) %
          (f.height + 16)) -
        8;
      ctx.fillRect(Math.round(x), Math.round(y), size, streak || size);
    }
  };
const mist =
  (diagonal = false) =>
  (ctx, f) => {
    tint(ctx, "#d8e8e0", 0.08, f);
    ctx.fillStyle = "#d8e8e0";
    ctx.globalAlpha *= 0.16;
    for (let i = 0; i < 6; i++) {
      const x = f.reducedMotion
        ? i * 70
        : ((i * 97 + f.now * 0.008) % (f.width + 120)) - 120;
      ctx.fillRect(
        Math.round(x),
        Math.round(i * 37 + (diagonal ? x * 0.15 : 0)),
        120,
        26,
      );
    }
  };
const rain = particles({
  color: "#a8d8f8",
  vy: 0.22,
  size: 1,
  streak: 6,
  tintColor: "#284060",
});
export const WEATHER_EFFECTS = {
  "weather.rain": rain,
  "weather.downpour": particles({
    color: "#98c8e8",
    count: 88,
    vx: -0.05,
    vy: 0.3,
    size: 1,
    streak: 8,
    tintColor: "#203850",
  }),
  "weather.thunderstorm": (ctx, f) => {
    rain(ctx, f);
    tint(
      ctx,
      "#203850",
      0.08,
      f,
    ); /* No flashing: readable for reduced motion and light sensitivity. */
  },
  "weather.sun": (ctx, f) =>
    tint(
      ctx,
      "#f8c848",
      f.reducedMotion ? 0.12 : 0.12 + 0.025 * Math.sin(f.now / 1200),
      f,
    ),
  "weather.sand": particles({
    color: "#c8a060",
    vx: 0.12,
    vy: 0.035,
    count: 64,
  }),
  "weather.snow": particles({ color: "#e8f8ff", vx: 0.018, vy: 0.035 }),
  "weather.hail": particles({ color: "#e8f8ff", vx: 0.025, vy: 0.15, size: 3 }),
  "weather.ash": particles({
    color: "#b0a0a0",
    vx: -0.022,
    vy: 0.045,
    count: 32,
  }),
  "weather.bubbles": particles({
    color: "#a0e0ef",
    vx: 0.01,
    vy: -0.045,
    count: 24,
  }),
  "weather.underwater": (ctx, f) => tint(ctx, "#206890", 0.16, f),
  "weather.shade": (ctx, f) => tint(ctx, "#183848", 0.14, f),
  "weather.fog": mist(),
  "weather.fog-diagonal": mist(true),
  "weather.clouds": (ctx, f) => {
    ctx.fillStyle = "#203848";
    ctx.globalAlpha *= 0.08;
    const x = f.reducedMotion ? 0 : ((f.now * 0.012) % (f.width + 160)) - 160;
    ctx.fillRect(Math.round(x), 0, 160, f.height);
  },
};
