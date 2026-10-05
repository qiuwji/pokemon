import {
  arrowWarpDirection,
  ledgeDirection,
  blockedDirection,
  isWater,
  isCounter,
} from "./terrain.js";
export const DIRECTIONS = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};
export class World {
  constructor(
    maps,
    position,
    {
      objects = () => [],
      onStep = () => {},
      onBlocked = () => {},
      onMap = () => {},
      beforeMove = () => {},
      prepareEntry = null,
      elevation = null,
      deferWarps = false,
      passage = ({ cell, warp }) =>
        !isWater(cell.behavior) && (cell.collision === 0 || !!warp),
    } = {},
  ) {
    this.maps = maps;
    this.position = position;
    Object.assign(this, {
      objects,
      onStep,
      onBlocked,
      onMap,
      beforeMove,
      prepareEntry,
      elevation,
      deferWarps,
      passage,
    });
    this.steps = 0;
    elevation?.initialize(position, this.map);
  }
  get map() {
    return this.maps[this.position.map];
  }
  resolve(id) {
    return Object.keys(this.maps).find(
      (k) =>
        k.replace(/_/g, "").toUpperCase() ===
        id.replace(/^MAP_/i, "").replace(/_/g, "").toUpperCase(),
    );
  }
  cell(x, y) {
    const m = this.map;
    if (x < 0 || y < 0 || x >= m.width || y >= m.height) return null;
    const i = y * m.width + x;
    return {
      block: m.blocks[i],
      behavior: m.behavior[i],
      collision: (m.blocks[i] >> 10) & 3,
      elevation: m.blocks[i] >> 12,
    };
  }
  entryPreview(map, options = {}) {
    return (
      this.prepareEntry?.(map, options) || {
        map: this.maps[map],
        objects: this.objects(map),
      }
    );
  }
  enter(map, x, y, dir = this.position.dir, preview = this.entryPreview(map)) {
    const target = { map, x, y, dir };
    this.elevation?.initialize(target, preview.map);
    return this.commitEntry(target, preview);
  }
  commitEntry(target, preview) {
    if (preview.commit && preview.commit(target) === false) return false;
    Object.assign(this.position, target);
    preview.entered?.(target);
    this.onMap(target.map);
    return true;
  }
  block(reason, object) {
    this.lastBlocked = { reason, ...(object ? { objectId: object.id } : {}) };
    this.onBlocked(reason, object);
    return false;
  }
  warpArrival(preview, destination) {
    const m = preview.map, index = destination.y * m.width + destination.x;
    // Exit mats are safe arrival cells; stepping outward is a separate input.
    if (arrowWarpDirection(m.behavior[index]))
      return { x: destination.x, y: destination.y };
    const offsets = m.indoor ? [[0,-1],[0,1],[-1,0],[1,0]] : [[0,1],[0,-1],[-1,0],[1,0]];
    for (const [dx, dy] of offsets) {
      const x = destination.x + dx, y = destination.y + dy;
      if (x < 0 || y < 0 || x >= m.width || y >= m.height) continue;
      if ((m.blocks[y * m.width + x] >> 10) & 3) continue;
      if (m.warps.some(w => w.x === x && w.y === y)) continue;
      if (preview.objects.some(n => (n.x === x && n.y === y) || n.reserved?.some(p => p.x === x && p.y === y))) continue;
      return { x, y };
    }
    return { x: destination.x, y: destination.y };
  }
  traverseWarp(warp, jump = false) {
    const id = this.resolve(warp.dest_map);
    if (!id) return false;
    const preview = this.entryPreview(id), destination = preview.map.warps[Number(warp.dest_warp_id)];
    if (!destination) return false;
    const target = { map: id, ...this.warpArrival(preview, destination), dir: preview.map.indoor ? "up" : "down" };
    if (this.deferWarps) return { jump, warp: target };
    if (!this.enter(id, target.x, target.y, target.dir, preview)) return false;
    this.onStep(this.cell(target.x, target.y));
    return { jump };
  }
  move(dir, { ignoreWarps = false, allowVacatedBy = null, ignoreActors = [] } = {}) {
    this.lastBlocked = null;
    const [dx, dy] = DIRECTIONS[dir];
    const p = this.position;
    p.dir = dir;
    let x = p.x + dx,
      y = p.y + dy,
      m = this.map;
    const sourceCell = this.cell(p.x, p.y);
    const sourceWarp = m.warps.find((w) => w.x === p.x && w.y === p.y);
    if (!ignoreWarps && sourceWarp && arrowWarpDirection(sourceCell?.behavior) === dir) {
      return this.traverseWarp(sourceWarp) || this.block("unavailable");
    }
    const sourceElevation = sourceCell?.elevation;
    let cell = this.cell(x, y);
    if (!cell) {
      const c = m.connections.find((c) => c.direction === dir);
      const id = c && this.resolve(c.map);
      if (id) {
        const preview = this.entryPreview(id),
          dest = preview.map;
        if (dir === "up") {
          x = p.x - c.offset;
          y = dest.height - 1;
        }
        if (dir === "down") {
          x = p.x - c.offset;
          y = 0;
        }
        if (dir === "left") {
          x = dest.width - 1;
          y = p.y - c.offset;
        }
        if (dir === "right") {
          x = 0;
          y = p.y - c.offset;
        }
        const i = y * dest.width + x;
        if (x < 0 || y < 0 || x >= dest.width || y >= dest.height)
          return this.block("boundary");
        const targetCell = { block: dest.blocks[i], behavior: dest.behavior[i],
          collision: (dest.blocks[i] >> 10) & 3, elevation: dest.blocks[i] >> 12 };
        if (this.elevation && !this.elevation.canEnter(p.elevation, targetCell.elevation))
          return this.block("elevation");
        const object = preview.objects.find(n => this.occupied(dest, n, x, y));
        if (object) return this.block("object", object);
        if (!this.passage({ cell: targetCell, map: dest, mapId: id, dir, from: { ...p }, warp: null }))
          return this.block("wall");
        this.beforeMove({
          map: dest,
          cell: {
            block: dest.blocks[i],
            behavior: dest.behavior[i],
            collision: (dest.blocks[i] >> 10) & 3,
            elevation: dest.blocks[i] >> 12,
          },
          dir,
        });
        const target = { ...p, map: id, x, y, dir };
        this.elevation?.advance(target, sourceElevation, dest.blocks[i] >> 12);
        if (!this.commitEntry(target, preview)) return this.block("entry-rejected");
        this.steps++;
        this.onStep(this.cell(x, y));
        return true;
      }
      return this.block("boundary");
    }
    const jumpDir = ledgeDirection(cell.behavior);
    let jump = false;
    if (jumpDir === dir) {
      x += dx;
      y += dy;
      cell = this.cell(x, y);
      jump = true;
    }
    const warp = m.warps.find((w) => w.x === x && w.y === y);
    if (
      !ignoreWarps &&
      warp &&
      warp.dest_map !== "MAP_DYNAMIC" &&
      !this.resolve(warp.dest_map)
    ) {
      return this.block("unavailable");
    }
    const obj = this.objects(p.map).find((n) =>
      !ignoreActors.includes(n.id) && this.occupied(m, n, x, y, { reservations: n.id !== allowVacatedBy }),
    );
    const oneWay = blockedDirection(cell?.behavior);
    if (
      !cell ||
      obj ||
      (this.elevation &&
        !this.elevation.canEnter(p.elevation, cell.elevation)) ||
      !this.passage({
        cell,
        map: m,
        mapId: p.map,
        dir,
        from: { ...p },
        warp: warp || null,
      }) ||
      oneWay === dir
    ) {
      return this.block(obj ? "object" : !cell ? "boundary" :
        this.elevation && !this.elevation.canEnter(p.elevation, cell.elevation) ? "elevation" :
        oneWay === dir ? "one-way" : "wall", obj);
    }
    this.beforeMove({ map: m, cell, dir });
    p.x = x;
    p.y = y;
    this.elevation?.advance(p, sourceElevation, cell.elevation);
    this.steps++;
    if (warp && !ignoreWarps && !arrowWarpDirection(cell.behavior)) {
      const result = this.traverseWarp(warp, jump);
      if (result) return result;
    }
    this.onStep(this.cell(p.x, p.y));
    return { jump };
  }
  occupied(map, object, x, y, options = {}) {
    if (this.elevation)
      return this.elevation.occupies(
        map,
        object,
        x,
        y,
        this.position.elevation,
        options,
      );
    return (
      (object.x === x && object.y === y) ||
      (options.reservations !== false &&
        object.reserved?.some((p) => p.x === x && p.y === y))
    );
  }
  interact() {
    const [dx, dy] = DIRECTIONS[this.position.dir];
    const x = this.position.x + dx,
      y = this.position.y + dy;
    let obj = this.objects().find((n) =>
      this.occupied(this.map, n, x, y, { reservations: false }),
    );
    // Counters keep attendants one extra tile away.
    if (!obj && isCounter(this.cell(x, y)?.behavior))
      obj = this.objects().find((n) =>
        this.occupied(this.map, n, x + dx, y + dy, { reservations: false }),
      );
    const sign = this.map.signs.find((n) => n.x === x && n.y === y &&
      (!n.interactFacing || n.interactFacing === this.position.dir));
    return obj || (sign && { ...sign, kind: "sign" }) || null;
  }
}
// Compatibility export for existing engine consumers.
export { SaveStore } from "./save-store.js";
