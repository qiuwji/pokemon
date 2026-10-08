import { readOnly } from "./extensions/values.js";
/** Bounded grid selection. Callers supply content cells and decide what a selection means. */
export class RegionMapCursor {
  constructor(data, position = { x: 0, y: 0 }) {
    const { width, height, cells } = data;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        width > 128 || height > 128 || !Array.isArray(cells) || cells.length !== width * height ||
        cells.some(id => id !== null && typeof id !== "string")) throw new Error("Invalid region map grid");
    this.data = readOnly(data);
    this.select(position.x, position.y);
  }
  select(x, y) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error("Invalid region map cursor");
    this.x = Math.max(0, Math.min(this.data.width - 1, x));
    this.y = Math.max(0, Math.min(this.data.height - 1, y));
    return this.view();
  }
  move(direction) {
    const delta = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction];
    return delta ? this.select(this.x + delta[0], this.y + delta[1]) : this.view();
  }
  view() {
    return readOnly({ x: this.x, y: this.y, section: this.data.cells[this.y * this.data.width + this.x] });
  }
}
