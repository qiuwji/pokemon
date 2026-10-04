import { readOnly } from "./extensions/values.js";
/** Detached grid projection. No renderer, traversal side effects, story or RNG. */
export class WorldQuery {
  constructor({ maps, objects, player, playerSource, elevation, revision = () => 0 }) {
    Object.assign(this, { maps, objects, player, playerSource, elevation, revision = () => 0 });
  }
  map(id) {
    if (!Object.hasOwn(this.maps, id)) throw new Error("Unknown query map");
    return this.maps[id];
  }
  bounds(id) {
    const m = this.map(id);
    return readOnly({
      id,
      revision: this.revision(),
      width: m.width,
      height: m.height,
      indoor: !!m.indoor,
      darkness: m.darkness || null,
    });
  }
  cells({ map, x, y, width, height }) {
    const m = this.map(map);
    if (
      ![x, y, width, height].every(Number.isInteger) ||
      x < 0 ||
      y < 0 ||
      width < 1 ||
      height < 1 ||
      width * height > 4096 ||
      x + width > m.width ||
      y + height > m.height
    )
      throw new Error("Invalid world query region");
    const occupants = this.objects(map).map((o) => ({
      id: o.id,
      x: o.x,
      y: o.y,
      elevation: this.elevation.level(o, m),
      reserved: o.reserved || [],
    }));
    const p = this.player(),
      source = this.playerSource();
    if (p.map === map)
      occupants.push({
        id: "player",
        ...p,
        reserved: source?.map === map ? [source] : [],
      });
    const buckets = new Map(),
      add = (x, y, record) => {
        const key = `${x}:${y}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(record);
      };
    for (const o of occupants) {
      add(o.x, o.y, {
        id: o.id,
        elevation: o.elevation ?? this.elevation.level(o, m),
        reserved: false,
      });
      for (const r of o.reserved)
        if (r.x !== o.x || r.y !== o.y)
          add(r.x, r.y, {
            id: o.id,
            elevation: r.elevation ?? o.elevation,
            reserved: true,
          });
    }
    const warps = new Set(m.warps.map((w) => `${w.x}:${w.y}`)),
      cells = [];
    for (let cy = y; cy < y + height; cy++)
      for (let cx = x; cx < x + width; cx++) {
        const index = cy * m.width + cx,
          block = m.blocks[index],
          level = (block >> 12) & 15;
        cells.push({
          x: cx,
          y: cy,
          block,
          appearance: m.appearances?.[index] ?? (block & 1023),
          tileset: m.tileset,
          resource: `tiles-${m.tileset}`,
          behavior: m.behavior[index],
          collision: (block >> 10) & 3,
          elevation: level,
          warp: warps.has(`${cx}:${cy}`),
          occupants: buckets.get(`${cx}:${cy}`) || [],
        });
      }
    return readOnly({ map, revision: this.revision(), x, y, width, height, cells });
  }
}
