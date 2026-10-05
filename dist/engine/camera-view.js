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
  { width = 320, height = 224, raster = false } = {},
) {
  const logicalWidth = (profile.columns * 16) / profile.zoom,
    logicalHeight = (profile.rows * 16) / profile.zoom;
  if (
    ![focus.x, focus.y, width, height].every(Number.isFinite) ||
    typeof raster !== "boolean" ||
    width <= 0 ||
    height <= 0
  )
    throw new Error("Invalid camera projection");
  const scale = Math.min(width / logicalWidth, height / logicalHeight);
  return readOnly(pixelProjection({
    x: focus.x + 8 - logicalWidth / 2,
    y: focus.y + 8 - logicalHeight / 2,
    width: logicalWidth,
    height: logicalHeight,
    scale,
    offsetX: (width - logicalWidth * scale) / 2,
    offsetY: (height - logicalHeight * scale) / 2,
  }, { width, height }, raster && profile.zoom === 1));
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

/** Normal pixel-art view uses whole device pixels; custom zoom and tiny screens still fit. */
export function pixelProjection(view, surface, enabled = true) {
  if (!enabled || view.scale < 1) return view;
  const scale = Math.floor(view.scale);
  return {
    ...view,
    scale,
    offsetX: Math.round((surface.width - view.width * scale) / 2),
    offsetY: Math.round((surface.height - view.height * scale) / 2),
    x: Math.round(view.x * scale) / scale,
    y: Math.round(view.y * scale) / scale,
  };
}
