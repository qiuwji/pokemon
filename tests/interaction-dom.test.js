import test from "node:test";
import assert from "node:assert/strict";
import { InteractionDOM } from "../src/adapters/interaction-dom.js";
import { validateFrameData } from "../src/engine/frame-data.js";

function stubCanvas() {
  const ops = [];
  const ctx = {
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "left",
    save: () => ops.push("save"),
    restore: () => ops.push("restore"),
    clearRect: () => ops.push("clearRect"),
    fillRect: () => ops.push("fillRect"),
    strokeRect: () => ops.push("strokeRect"),
    beginPath: () => ops.push("beginPath"),
    closePath: () => ops.push("closePath"),
    moveTo: () => ops.push("moveTo"),
    lineTo: () => ops.push("lineTo"),
    arc: () => ops.push("arc"),
    ellipse: () => ops.push("ellipse"),
    fill: () => ops.push("fill"),
    stroke: () => ops.push("stroke"),
    fillText: () => ops.push("fillText"),
    drawImage: () => ops.push("drawImage"),
  };
  const canvas = { width: 240, height: 160, hidden: true, getContext: () => ctx };
  return { canvas, ops };
}

const frame = validateFrameData({
  nodes: [
    { kind: "rect", x: 0, y: 0, width: 10, height: 4 },
    { kind: "panel", x: 0, y: 0, width: 20, height: 12, border: "#ffffff", borderWidth: 1 },
    { kind: "line", x1: 0, y1: 0, x2: 5, y2: 5, width: 1 },
    { kind: "circle", x: 1, y: 1, radius: 2, fill: false },
    { kind: "ellipse", x: 1, y: 1, radiusX: 2, radiusY: 3 },
    { kind: "arc", x: 1, y: 1, radius: 4, startAngle: 0, endAngle: 3.14, width: 2 },
    { kind: "polygon", points: [[0, 0], [4, 0], [2, 4]], fill: false, width: 1 },
    { kind: "text", x: 2, y: 2, text: "命中" },
    { kind: "meter", x: 0, y: 0, width: 30, height: 6, value: 0.5 },
    { kind: "sprite", x: 4, y: 4, resource: "hero" },
  ],
});

test("the overlay draws every frame primitive without touching plugin code", () => {
  const { canvas, ops } = stubCanvas();
  const dom = new InteractionDOM({
    canvas,
    assets: { hero: { width: 16, height: 16 } },
    onError: (error) => {
      throw error;
    },
  });
  dom.render({ data: frame });
  assert.equal(canvas.hidden, false);
  for (const op of ["fillRect", "strokeRect", "arc", "ellipse", "fill", "stroke", "fillText", "drawImage"])
    assert(ops.includes(op), `expected ${op}`);
  dom.clear();
  assert.equal(canvas.hidden, true);
});

test("a missing sprite resource is skipped and a bad frame is isolated", () => {
  const { canvas, ops } = stubCanvas();
  const dom = new InteractionDOM({ canvas, assets: {}, onError: () => {} });
  dom.render({ data: validateFrameData({ nodes: [{ kind: "sprite", x: 0, y: 0, resource: "missing" }] }) });
  assert(!ops.includes("drawImage"));
  dom.render(null);
  assert.equal(canvas.hidden, true);
});
