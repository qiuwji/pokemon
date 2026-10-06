import test from "node:test";
import assert from "node:assert/strict";
import { validateFrameData, FRAME_NODE_KINDS } from "../src/engine/frame-data.js";

const sample = {
  nodes: [
    { kind: "rect", x: 0, y: 0, width: 10, height: 10, color: "#fff" },
    { kind: "panel", x: 0, y: 0, width: 20, height: 18, background: "#101820", border: "#ffffff", borderWidth: 1 },
    { kind: "line", x1: 0, y1: 0, x2: 5, y2: 5, width: 1, color: "#ffffff" },
    { kind: "circle", x: 1, y: 1, radius: 2, fill: false },
    { kind: "ellipse", x: 1, y: 1, radiusX: 2, radiusY: 3 },
    { kind: "arc", x: 1, y: 1, radius: 4, startAngle: 0, endAngle: 3.14, width: 2 },
    { kind: "polygon", points: [[0, 0], [4, 0], [2, 4]], color: "#abcabc", fill: false, width: 1 },
    { kind: "text", x: 2, y: 2, text: "命中", color: "#ffffff", size: 8, align: "center" },
    { kind: "meter", x: 0, y: 0, width: 30, height: 6, value: 0.5, color: "#f2d94e", background: "#333333" },
    { kind: "sprite", x: 0, y: 0, resource: "hero", width: 16, height: 16, frame: 1 },
  ],
  statusText: "按 Z 确认",
};

test("all declared frame primitives validate", () => {
  assert.deepEqual(new Set(FRAME_NODE_KINDS), new Set(sample.nodes.map((n) => n.kind)));
  const normalized = validateFrameData(sample);
  assert.equal(normalized.nodes.length, sample.nodes.length);
  assert.equal(normalized.statusText, "按 Z 确认");
});

test("invalid frame data is rejected before drawing", () => {
  for (const bad of [
    null,
    [],
    { nodes: [], extra: 1 },
    { nodes: [{ kind: "star", x: 0, y: 0 }] },
    { nodes: [{ kind: "rect", x: 0, y: 0, width: 1 }] },
    { nodes: [{ kind: "rect", x: 0, y: 0, width: 1, height: 1, color: "red" }] },
    { nodes: [{ kind: "rect", x: 0, y: 0, width: Infinity, height: 1 }] },
    { nodes: [{ kind: "polygon", points: [[0, 0], [1]] }] },
    { nodes: [{ kind: "sprite", x: 0, y: 0, resource: "BAD ID" }] },
    { nodes: [{ kind: "circle", x: 0, y: 0, radius: 1, fill: "yes" }] },
    { nodes: [{ kind: "rect", x: 0, y: 0, width: 1, height: 1, fill: true }] },
    { nodes: Array.from({ length: 513 }, () => ({ kind: "rect", x: 0, y: 0, width: 1, height: 1 })) },
  ])
    assert.throws(() => validateFrameData(bad), /Invalid FrameData|Unknown frame node|Invalid frame node/);
});
