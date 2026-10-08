import { DIRECTIONS } from "./world.js";
import { isWater } from "./terrain.js";

/** Validated destination plans; timing and rendering belong to the presentation port. */
export class TravelService {
  constructor({
    maps,
    destinations,
    position,
    context,
    objects = () => [],
    preview = null,
    enter = null,
  }) {
    Object.assign(this, { maps, position, context, objects, preview });
    this.enter =
      enter ||
      ((target) => {
        Object.assign(this.position, target);
        return true;
      });
    this.destinations = new Map();
    this.plans = new WeakMap();
    for (const [id, definition] of Object.entries(destinations)) {
      const p = definition.position,
        map = maps[p?.map];
      if (
        !id ||
        !map ||
        !Number.isInteger(p.x) ||
        !Number.isInteger(p.y) ||
        p.x < 0 ||
        p.y < 0 ||
        p.x >= map.width ||
        p.y >= map.height ||
        !DIRECTIONS[p.dir]
      )
        throw new Error(`Invalid travel destination ${id}`);
      this.destinations.set(
        id,
        Object.freeze({ ...definition, position: Object.freeze({ ...p }) }),
      );
    }
  }
  check(id) {
    const definition = this.destinations.get(id),
      context = this.context();
    if (
      !definition ||
      !context.capabilities?.fly ||
      !context.visited?.includes(id)
    )
      return { ok: false, reason: "还不能飞往这里。" };
    if (this.maps[this.position.map].indoor)
      return { ok: false, reason: "请先走到室外。" };
    const p = definition.position,
      view = this.preview?.(p.map),
      map = view?.map || this.maps[p.map],
      i = p.y * map.width + p.x;
    if (
      ((map.blocks[i] >> 10) & 3) !== 0 ||
      isWater(map.behavior[i]) ||
      map.warps.some((w) => w.x === p.x && w.y === p.y) ||
      (view?.objects || this.objects(p.map)).some(
        (n) =>
          (n.x === p.x && n.y === p.y) ||
          n.reserved?.some((v) => v.x === p.x && v.y === p.y),
      )
    )
      return { ok: false, reason: "降落的位置现在被占用了。" };
    return { ok: true, definition };
  }
  list() {
    return [...this.destinations]
      .map(([id, d]) => ({ id, name: d.name, position: d.position, ...this.check(id) }))
      .map(({ definition, ...entry }) => entry);
  }
  prepare(id) {
    const result = this.check(id);
    if (!result.ok) return result;
    const plan = Object.freeze({
      id,
      name: result.definition.name,
      position: result.definition.position,
    });
    this.plans.set(plan, { from: JSON.stringify(this.position) });
    return { ok: true, plan };
  }
  commit(plan) {
    const state = this.plans.get(plan);
    if (!state || state.from !== JSON.stringify(this.position))
      return { ok: false, reason: "飞行计划已失效。" };
    const result = this.check(plan.id);
    if (!result.ok) return result;
    if (!this.enter(plan.position))
      return { ok: false, reason: "降落的位置现在无法进入。" };
    this.plans.delete(plan);
    return { ok: true, position: { ...this.position } };
  }
}
