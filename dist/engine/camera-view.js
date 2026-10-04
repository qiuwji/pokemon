import { readOnly } from "./extensions/values.js";
export class CameraProfiles {
  constructor(definitions = {}) {
    this.definitions = new Map();
    for (const [id, d] of Object.entries(definitions)) {
      if (
        !d ||
        Object.keys(d).some(
          (k) => !["name", "columns", "rows", "zoom"].includes(k),
        ) ||
        typeof d.name !== "string" ||
        !d.name ||
        !Number.isSafeInteger(d.columns) ||
        d.columns < 4 ||
        d.columns > 100 ||
        !Number.isSafeInteger(d.rows) ||
        d.rows < 4 ||
        d.rows > 100 ||
        !Number.isFinite(d.zoom ?? 1) ||
        (d.zoom ?? 1) < 0.25 ||
        (d.zoom ?? 1) > 4
      )
        throw new Error(`Invalid camera profile ${id}`);
      this.definitions.set(id, readOnly({ ...d, zoom: d.zoom ?? 1 }));
    }
  }
  get(id) {
    const d = this.definitions.get(id);
    if (!d) throw new Error(`Unknown camera profile ${id}`);
    return d;
  }
}
/** One projection serves clipping, compositing and inverse pointer coordinates. Grid rules stay 16px. */
export function cameraProjection(
  profile,
  focus,
  { width = 320, height = 224 } = {},
) {
  const logicalWidth = (profile.columns * 16) / profile.zoom,
    logicalHeight = (profile.rows * 16) / profile.zoom;
  if (
    ![focus.x, focus.y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error("Invalid camera projection");
  const scale = Math.min(width / logicalWidth, height / logicalHeight);
  return readOnly({
    x: focus.x + 8 - logicalWidth / 2,
    y: focus.y + 8 - logicalHeight / 2,
    width: logicalWidth,
    height: logicalHeight,
    scale,
    offsetX: (width - logicalWidth * scale) / 2,
    offsetY: (height - logicalHeight * scale) / 2,
  });
}
export function projectWorld(point, view) {
  return {
    x: (point.x - view.x) * view.scale + view.offsetX,
    y: (point.y - view.y) * view.scale + view.offsetY,
  };
}
export function unprojectScreen(point, view) {
  const x = (point.x - view.offsetX) / view.scale,
    y = (point.y - view.offsetY) / view.scale;
  return x < 0 || y < 0 || x >= view.width || y >= view.height
    ? null
    : { x: x + view.x, y: y + view.y };
}
