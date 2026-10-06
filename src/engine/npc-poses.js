import { readOnly } from "./extensions/values.js";
export const NPC_POSES = {
  still: {},
  walk: {},
  spin: {},
  sleep: {},
  jog: { inPlace: true, periodMs: 160 },
  hop: { height: 4, periodMs: Math.PI * 260 },
  cheer: {
    inPlace: true,
    height: 4,
    periodMs: Math.PI * 260,
    stepPeriodMs: 160,
  },
};
/** Pure visual sampling. A pose never changes occupancy, speed or rule outcomes. */
export class NPCPoseRegistry {
  constructor(definitions = {}, { actors = {} } = {}) {
    this.definitions = new Map();
    for (const [id, d] of Object.entries({ ...NPC_POSES, ...definitions })) {
      if (
        !d ||
        Object.keys(d).some(
          (k) =>
            ![
              "inPlace",
              "height",
              "periodMs",
              "stepPeriodMs",
              "actor",
            ].includes(k),
        ) ||
        (d.inPlace !== undefined && typeof d.inPlace !== "boolean") ||
        (d.height !== undefined &&
          (!Number.isFinite(d.height) || d.height < 0 || d.height > 64)) ||
        ["periodMs", "stepPeriodMs"].some(
          (k) =>
            d[k] !== undefined &&
            (!Number.isFinite(d[k]) || d[k] < 80 || d[k] > 10000),
        ) ||
        (d.actor !== undefined && !actors[d.actor])
      )
        throw new Error(`Invalid NPC pose ${id}`);
      this.definitions.set(id, readOnly(d));
    }
  }
  sample(id, now, progress, moving, { reducedMotion = false } = {}) {
    const d = this.definitions.get(id);
    if (!d) throw new Error(`Unknown NPC pose ${id}`);
    const period = d.periodMs || 160,
      step = d.stepPeriodMs || period;
    return {
      progress: d.inPlace && !reducedMotion ? (now % step) / step : progress,
      moving: moving || (!!d.inPlace && !reducedMotion),
      lift: reducedMotion
        ? 0
        : Math.max(0, Math.sin((now / period) * Math.PI * 2)) * (d.height || 0),
      ...(d.actor ? { actor: d.actor } : {}),
    };
  }
}
