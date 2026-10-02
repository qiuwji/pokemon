import {
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
      deferWarps,
      passage,
    });
    this.steps = 0;
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
  enter(map, x, y, dir = this.position.dir) {
    Object.assign(this.position, { map, x, y, dir });
    this.onMap(map);
  }
  move(dir, { ignoreWarps = false, allowVacatedBy = null } = {}) {
    const [dx, dy] = DIRECTIONS[dir];
    const p = this.position;
    p.dir = dir;
    let x = p.x + dx,
      y = p.y + dy,
      m = this.map;
    let cell = this.cell(x, y);
    if (!cell) {
      const c = m.connections.find((c) => c.direction === dir);
      const id = c && this.resolve(c.map);
      if (id) {
        const dest = this.maps[id];
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
        if (
          x < 0 ||
          y < 0 ||
          x >= dest.width ||
          y >= dest.height ||
          !this.passage({
            cell: {
              block: dest.blocks[i],
              behavior: dest.behavior[i],
              collision: (dest.blocks[i] >> 10) & 3,
              elevation: dest.blocks[i] >> 12,
            },
            map: dest,
            dir,
            from: { ...p },
            warp: null,
          }) ||
          this.objects(id).some(
            (n) =>
              (n.x === x && n.y === y) ||
              n.reserved?.some((p) => p.x === x && p.y === y),
          )
        )
          return false;
        this.beforeMove({
          map: dest,
          cell: {
            block: dest.blocks[i],
            behavior: dest.behavior[i],
            collision: (dest.blocks[i] >> 10) & 3,
          },
          dir,
        });
        this.steps++;
        this.enter(id, x, y, dir);
        this.onStep(this.cell(x, y));
        return true;
      }
      this.onBlocked("boundary");
      return false;
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
      this.onBlocked("unavailable");
      return false;
    }
    const obj = this.objects(p.map).find(
      (n) =>
        (n.x === x && n.y === y) ||
        (n.id !== allowVacatedBy &&
          n.reserved?.some((p) => p.x === x && p.y === y)),
    );
    const oneWay = blockedDirection(cell?.behavior);
    if (
      !cell ||
      obj ||
      !this.passage({ cell, map: m, dir, from: { ...p }, warp }) ||
      oneWay === dir
    ) {
      this.onBlocked(obj ? "object" : "wall", obj);
      return false;
    }
    this.beforeMove({ map: m, cell, dir });
    p.x = x;
    p.y = y;
    this.steps++;
    if (warp && !ignoreWarps) {
      const id = this.resolve(warp.dest_map);
      if (id) {
        const destination = this.maps[id].warps[Number(warp.dest_warp_id)];
        if (destination) {
          const interior = !!this.maps[id].indoor;
          const candidates = interior
            ? [
                [0, -1],
                [0, 1],
                [-1, 0],
                [1, 0],
              ]
            : [
                [0, 1],
                [0, -1],
                [-1, 0],
                [1, 0],
              ];
          let tx = destination.x,
            ty = destination.y;
          for (const [ox, oy] of candidates) {
            const nx = destination.x + ox,
              ny = destination.y + oy;
            const dm = this.maps[id];
            if (
              nx >= 0 &&
              ny >= 0 &&
              nx < dm.width &&
              ny < dm.height &&
              ((dm.blocks[ny * dm.width + nx] >> 10) & 3) === 0 &&
              !dm.warps.some((w) => w.x === nx && w.y === ny)
            ) {
              tx = nx;
              ty = ny;
              break;
            }
          }
          const target = {
            map: id,
            x: tx,
            y: ty,
            dir: interior ? "up" : "down",
          };
          if (this.deferWarps) return { jump, warp: target };
          this.enter(id, tx, ty, target.dir);
        }
      }
    }
    this.onStep(this.cell(p.x, p.y));
    return { jump };
  }
  interact() {
    const [dx, dy] = DIRECTIONS[this.position.dir];
    const x = this.position.x + dx,
      y = this.position.y + dy;
    let obj = this.objects().find((n) => n.x === x && n.y === y);
    // Counters keep attendants one extra tile away.
    if (!obj && isCounter(this.cell(x, y)?.behavior))
      obj = this.objects().find((n) => n.x === x + dx && n.y === y + dy);
    const sign = this.map.signs.find((n) => n.x === x && n.y === y);
    return obj || (sign && { ...sign, kind: "sign" }) || null;
  }
}
// Compatibility export for existing engine consumers.
export { SaveStore } from "./save-store.js";
