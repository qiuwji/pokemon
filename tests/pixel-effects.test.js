import test from "node:test";
import assert from "node:assert/strict";
import { PIXEL_EFFECTS } from "../src/presentation/pixel-effects.js";
/** Records draw calls and property writes so parameter effects can be asserted without a real canvas. */
function recorder() {
  const calls = [];
  const target = { calls };
  return new Proxy(target, {
    get: (t, key) =>
      key in t ? t[key] : (...args) => calls.push([key, ...args]),
    set: (t, key, value) => {
      t[key] = value;
      calls.push(["set", key, value]);
      return true;
    },
  });
}
const base = (extra = {}) => ({
  source: { x: 20, y: 100, back: true },
  target: { x: 200, y: 40 },
  t: 0.5,
  successful: true,
  type: "normal",
  ...extra,
});
const rects = (ctx) => ctx.calls.filter((c) => c[0] === "fillRect");
const strokes = (ctx) => ctx.calls.filter((c) => c[0] === "strokeRect");
const colours = (ctx, key) =>
  ctx.calls.filter((c) => c[0] === "set" && c[1] === key).map((c) => c[2]);

test("Contact/ring spread particles by count, keeps its legacy default and honours a colour override", () => {
  const small = recorder();
  PIXEL_EFFECTS.contact(small, base({ count: 6, color: "#123456" }));
  const large = recorder();
  PIXEL_EFFECTS.contact(large, base({ count: 12, color: "#123456" }));
  assert.equal(rects(small).length, 6);
  assert.equal(rects(large).length, 12);
  assert.deepEqual([...new Set(colours(small, "fillStyle"))], ["#123456"]);
  const legacy = recorder();
  PIXEL_EFFECTS.contact(legacy, base());
  assert.equal(rects(legacy).length, 16, "an unspecified count keeps the original ring");
  assert.deepEqual([...new Set(colours(legacy, "fillStyle"))], ["#fff8d8"], "no colour falls back to neutral");
});
test("Projectiles honour count, arc lift and colour, and burst only after the threshold", () => {
  const flat = recorder();
  PIXEL_EFFECTS.projectile(flat, base({ count: 5, arc: 0, burstAt: 2 }));
  const lifted = recorder();
  PIXEL_EFFECTS.projectile(lifted, base({ count: 5, arc: 40, burstAt: 2 }));
  assert.equal(rects(flat).length, 5);
  assert.equal(rects(lifted).length, 5);
  const minY = (ctx) => Math.min(...rects(ctx).map((c) => c[2]));
  assert(
    minY(lifted) < minY(flat) - 10,
    "an arc raises the flight path above the straight line",
  );
  const tinted = recorder();
  PIXEL_EFFECTS.projectile(tinted, base({ count: 3, color: "#abcdef", burstAt: 2 }));
  assert.deepEqual([...new Set(colours(tinted, "fillStyle"))], ["#abcdef"]);
  const burster = recorder();
  PIXEL_EFFECTS.projectile(burster, base({ count: 4, burstAt: 0.7, t: 0.8 }));
  assert(
    rects(burster).length > 4,
    "crossing burstAt adds an impact ring on top of the trail",
  );
  const legacy = recorder();
  PIXEL_EFFECTS.projectile(legacy, base({ burstAt: 2 }));
  assert.equal(
    new Set(colours(legacy, "fillStyle")).size,
    1,
    "a plain projectile paints one colour",
  );
  assert.equal(
    rects(legacy).length,
    8,
    "an unspecified count keeps the original trail length",
  );
});
test("Bubbles spread by count, cycle sizes, and read the palette override on the stroke", () => {
  const few = recorder();
  PIXEL_EFFECTS.bubbles(few, base({ count: 4, color: "#010203" }));
  const many = recorder();
  PIXEL_EFFECTS.bubbles(many, base({ count: 10, color: "#010203" }));
  assert.equal(strokes(few).length, 4);
  assert.equal(strokes(many).length, 10);
  assert.deepEqual([...new Set(colours(few, "strokeStyle"))], ["#010203"]);
  const sizes = new Set(strokes(many).map((c) => c[3]));
  assert(sizes.size > 1, "the size ramp varies bubble dimensions");
  const legacy = recorder();
  PIXEL_EFFECTS.bubbles(legacy, base());
  assert.equal(strokes(legacy).length, 9, "an unspecified count keeps the original stream");
  assert.deepEqual([...new Set(colours(legacy, "strokeStyle"))], ["#b8e8f8"]);
});
test("Flame adds an ember burst past its threshold and paints the secondary colour", () => {
  const early = recorder();
  PIXEL_EFFECTS.flame(
    early,
    base({ count: 2, burstAt: 2, color2: "#f8d850", t: 0.5 }),
  );
  const late = recorder();
  PIXEL_EFFECTS.flame(
    late,
    base({ count: 2, burstAt: 2, color2: "#f8d850", t: 0.9 }),
  );
  assert(rects(late).length > rects(early).length, "the burst adds embers");
  assert(colours(late, "fillStyle").includes("#f8d850"));
});
test("Slash sweeps more pixels with blades and steps, honours colour and draws nothing on a miss", () => {
  const few = recorder();
  PIXEL_EFFECTS.slash(few, base({ count: 2, steps: 6, color: "#ff00ff" }));
  const many = recorder();
  PIXEL_EFFECTS.slash(many, base({ count: 4, steps: 12, color: "#ff00ff" }));
  assert(rects(many).length > rects(few).length);
  assert.deepEqual([...new Set(colours(many, "fillStyle"))], ["#ff00ff"]);
  const miss = recorder();
  PIXEL_EFFECTS.slash(miss, base({ successful: false, count: 4, steps: 12 }));
  assert.equal(rects(miss).length, 0, "a miss draws no blade");
});
test("Bolt segments and colour follow the recipe parameters", () => {
  const small = recorder();
  PIXEL_EFFECTS.bolt(small, base({ count: 6, color: "#00e5ff" }));
  const large = recorder();
  PIXEL_EFFECTS.bolt(large, base({ count: 16, color: "#00e5ff" }));
  assert.equal(rects(small).length, 6);
  assert.equal(rects(large).length, 16);
  assert.deepEqual([...new Set(colours(large, "fillStyle"))], ["#00e5ff"]);
});
test("Beam width and reach are parameterised and it never overshoots the target", () => {
  const early = recorder();
  PIXEL_EFFECTS.beam(early, base({ t: 0.2, lineWidth: 7, color: "#3366ff" }));
  const late = recorder();
  PIXEL_EFFECTS.beam(late, base({ t: 0.9, lineWidth: 7, color: "#3366ff" }));
  const tip = (ctx) => ctx.calls.find((c) => c[0] === "lineTo").slice(1);
  assert(tip(late)[0] > tip(early)[0], "a later frame reaches further");
  assert.deepEqual(colours(late, "strokeStyle"), ["#3366ff"]);
  assert(colours(late, "lineWidth").includes(7));
});
test("Rocks and leaves scale with count and carry their palettes", () => {
  const rocks = recorder();
  PIXEL_EFFECTS.rocks(rocks, base({ count: 5, color: "#c8a068" }));
  assert.equal(rects(rocks).length, 5);
  assert.deepEqual([...new Set(colours(rocks, "fillStyle"))], ["#c8a068"]);
  const leaves = recorder();
  PIXEL_EFFECTS.leaves(
    leaves,
    base({ count: 8, color: "#58b858", color2: "#a8d850" }),
  );
  assert.equal(rects(leaves).length, 16, "each leaf paints a body and a highlight");
  assert.deepEqual(
    [...new Set(colours(leaves, "fillStyle"))].sort(),
    ["#58b858", "#a8d850"],
  );
});
test("Status rings and sparkles scale with count, and heal ignores the palette for its green", () => {
  const rings = recorder();
  PIXEL_EFFECTS.status(rings, base({ count: 5, color: "#b870c8" }));
  assert.equal(strokes(rings).length, 5);
  assert.deepEqual([...new Set(colours(rings, "strokeStyle"))], ["#b870c8"]);
  const sparks = recorder();
  PIXEL_EFFECTS.release(
    sparks,
    base({ kind: "release", count: 4, color: "#ffffff", target: { x: 100, y: 60 } }),
  );
  assert.equal(rects(sparks).length, 12, "each spark is three pixels");
  const heal = recorder();
  PIXEL_EFFECTS.heal(
    heal,
    base({ kind: "heal", count: 4, color: "#000000", target: { x: 100, y: 60 } }),
  );
  assert.deepEqual([...new Set(colours(heal, "fillStyle"))], ["#78d8a0"]);
});
test("Every registered pixel effect tolerates a bare visual with no parameters", () => {
  for (const [kind, draw] of Object.entries(PIXEL_EFFECTS)) {
    const ctx = recorder();
    assert.doesNotThrow(
      () =>
        draw(ctx, {
          kind,
          type: "steel",
          source: { x: 20, y: 100 },
          target: { x: 200, y: 30 },
          t: 0.7,
          status: "paralysis",
          amount: -1,
        }),
      `${kind} drew without parameters`,
    );
  }
});
