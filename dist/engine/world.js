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
  entryPreview(map) {
    return (
      this.prepareEntry?.(map) || {
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
  move(dir, { ignoreWarps = false, allowVacatedBy = null } = {}) {
    const [dx, dy] = DIRECTIONS[dir];
    const p = this.position;
    p.dir = dir;
    let x = p.x + dx,
      y = p.y + dy,
      m = this.map;
    const sourceElevation = this.cell(p.x, p.y)?.elevation;
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
        if (
          x < 0 ||
          y < 0 ||
          x >= dest.width ||
          y >= dest.height ||
          (this.elevation &&
            !this.elevation.canEnter(p.elevation, dest.blocks[i] >> 12)) ||
          !this.passage({
            cell: {
              block: dest.blocks[i],
              behavior: dest.behavior[i],
              collision: (dest.blocks[i] >> 10) & 3,
              elevation: dest.blocks[i] >> 12,
            },
            map: dest,
            mapId: id,
            dir,
            from: { ...p },
            warp: null,
          }) ||
          preview.objects.some((n) => this.occupied(dest, n, x, y))
        )
          return false;
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
        if (!this.commitEntry(target, preview)) return false;
        this.steps++;
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
    const obj = this.objects(p.map).find((n) =>
      this.occupied(m, n, x, y, { reservations: n.id !== allowVacatedBy }),
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
        warp,
      }) ||
      oneWay === dir
    ) {
      this.onBlocked(obj ? "object" : "wall", obj);
      return false;
    }
    this.beforeMove({ map: m, cell, dir });
    p.x = x;
    p.y = y;
    this.elevation?.advance(p, sourceElevation, cell.elevation);
    this.steps++;
    if (warp && !ignoreWarps) {
      const id = this.resolve(warp.dest_map);
      if (id) {
        const preview = this.entryPreview(id),
          destination = preview.map.warps[Number(warp.dest_warp_id)];
        if (destination) {
          const interior = !!preview.map.indoor;
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
            const dm = preview.map;
            if (
              nx >= 0 &&
              ny >= 0 &&
              nx < dm.width &&
              ny < dm.height &&
              ((dm.blocks[ny * dm.width + nx] >> 10) & 3) === 0 &&
              !dm.warps.some((w) => w.x === nx && w.y === ny) &&
              !preview.objects.some(
                (n) =>
                  (n.x === nx && n.y === ny) ||
                  n.reserved?.some((p) => p.x === nx && p.y === ny),
              )
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
          this.enter(id, tx, ty, target.dir, preview);
        }
      }
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
    const sign = this.map.signs.find((n) => n.x === x && n.y === y);
    return obj || (sign && { ...sign, kind: "sign" }) || null;
  }
}
// Compatibility export for existing engine consumers.
export { SaveStore } from "./save-store.js";
