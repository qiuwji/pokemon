import { jsonValue } from "./extensions/values.js";
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const color = (value) =>
  typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
const shortText = (value, max = 240) =>
  typeof value === "string" && value.length <= max;
const resource = (value) =>
  typeof value === "string" && /^[a-z][a-z0-9_.-]{0,127}$/.test(value);
const keys = (node, allowed) => Object.keys(node).every((key) => allowed.includes(key));
const point = (value) =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every(finite);
const pointList = (value) =>
  Array.isArray(value) &&
  value.length >= 1 &&
  value.length <= 64 &&
  value.every(point);
const optional = (value, check) => value === undefined || check(value);
const optionalColor = (value) => optional(value, color);
const optionalFinite = (value) => optional(value, finite);
const optionalText = (value) => optional(value, (v) => shortText(v));

/** Frame node kinds the host knows how to draw. Plugins never receive the canvas context. */
export const FRAME_NODE_KINDS = Object.freeze([
  "rect",
  "panel",
  "line",
  "circle",
  "ellipse",
  "arc",
  "polygon",
  "text",
  "meter",
  "sprite",
]);

const VALIDATORS = {
  rect: (n) =>
    keys(n, ["kind", "x", "y", "width", "height", "color"]) &&
    [n.x, n.y, n.width, n.height].every(finite) &&
    optionalColor(n.color),
  panel: (n) =>
    keys(n, ["kind", "x", "y", "width", "height", "background", "border", "borderWidth"]) &&
    [n.x, n.y, n.width, n.height].every(finite) &&
    optionalColor(n.background) &&
    optionalColor(n.border) &&
    optionalFinite(n.borderWidth),
  line: (n) =>
    keys(n, ["kind", "x1", "y1", "x2", "y2", "width", "color"]) &&
    [n.x1, n.y1, n.x2, n.y2, n.width].every(finite) &&
    optionalColor(n.color),
  circle: (n) =>
    keys(n, ["kind", "x", "y", "radius", "color", "fill"]) &&
    [n.x, n.y, n.radius].every(finite) &&
    optionalColor(n.color) &&
    (n.fill === undefined || typeof n.fill === "boolean"),
  ellipse: (n) =>
    keys(n, ["kind", "x", "y", "radiusX", "radiusY", "color", "fill"]) &&
    [n.x, n.y, n.radiusX, n.radiusY].every(finite) &&
    optionalColor(n.color) &&
    (n.fill === undefined || typeof n.fill === "boolean"),
  arc: (n) =>
    keys(n, ["kind", "x", "y", "radius", "startAngle", "endAngle", "width", "color"]) &&
    [n.x, n.y, n.radius, n.startAngle, n.endAngle].every(finite) &&
    optionalFinite(n.width) &&
    optionalColor(n.color),
  polygon: (n) =>
    keys(n, ["kind", "points", "color", "fill", "width"]) &&
    pointList(n.points) &&
    optionalColor(n.color) &&
    (n.fill === undefined || typeof n.fill === "boolean") &&
    optionalFinite(n.width),
  text: (n) =>
    keys(n, ["kind", "x", "y", "text", "color", "size", "align"]) &&
    [n.x, n.y].every(finite) &&
    shortText(n.text) &&
    optionalColor(n.color) &&
    optionalFinite(n.size) &&
    optional(n.align, (v) => ["left", "center", "right"].includes(v)),
  meter: (n) =>
    keys(n, ["kind", "x", "y", "width", "height", "value", "color", "background"]) &&
    [n.x, n.y, n.width, n.height, n.value].every(finite) &&
    optionalColor(n.color) &&
    optionalColor(n.background),
  sprite: (n) =>
    keys(n, ["kind", "x", "y", "resource", "width", "height", "frame"]) &&
    [n.x, n.y].every(finite) &&
    resource(n.resource) &&
    optionalFinite(n.width) &&
    optionalFinite(n.height) &&
    optional(n.frame, (v) => Number.isSafeInteger(v) && v >= 0 && v <= 4096),
};

/** Structural, bounded and finite FrameData; a bad node is rejected before drawing. */
export function validateFrameData(data, { maxNodes = 512 } = {}) {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Invalid FrameData");
  if (
    Object.keys(data).some((key) => !["nodes", "statusText"].includes(key)) ||
    !Array.isArray(data.nodes) ||
    data.nodes.length > maxNodes ||
    !optionalText(data.statusText)
  )
    throw new Error("Invalid FrameData");
  for (const node of data.nodes) {
    const check = node && typeof node === "object" ? VALIDATORS[node.kind] : null;
    if (!check) throw new Error("Unknown frame node");
    if (!check(node)) throw new Error(`Invalid frame node ${node.kind}`);
  }
  return jsonValue(data);
}
