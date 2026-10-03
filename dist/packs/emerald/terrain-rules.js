import { BEHAVIOR } from "../../engine/terrain.js";
const walk = {
  [BEHAVIOR.WALK_EAST]: "right",
  [BEHAVIOR.WALK_WEST]: "left",
  [BEHAVIOR.WALK_NORTH]: "up",
  [BEHAVIOR.WALK_SOUTH]: "down",
};
const slide = {
  [BEHAVIOR.SLIDE_EAST]: "right",
  [BEHAVIOR.SLIDE_WEST]: "left",
  [BEHAVIOR.SLIDE_NORTH]: "up",
  [BEHAVIOR.SLIDE_SOUTH]: "down",
};
const currents = {
  [BEHAVIOR.CURRENT_EAST]: "right",
  [BEHAVIOR.CURRENT_WEST]: "left",
  [BEHAVIOR.CURRENT_NORTH]: "up",
  [BEHAVIOR.CURRENT_SOUTH]: "down",
};
const railAxis = (behavior) =>
  [BEHAVIOR.ISOLATED_VERTICAL_RAIL, BEHAVIOR.VERTICAL_RAIL].includes(behavior)
    ? "vertical"
    : [BEHAVIOR.ISOLATED_HORIZONTAL_RAIL, BEHAVIOR.HORIZONTAL_RAIL].includes(
          behavior,
        )
      ? "horizontal"
      : null;
const aligned = (axis, direction) =>
  !axis ||
  (axis === "vertical" ? ["up", "down"] : ["left", "right"]).includes(
    direction,
  );
const noBike = (cell, level = cell.elevation) =>
  [
    BEHAVIOR.NO_RUNNING,
    BEHAVIOR.LONG_GRASS,
    BEHAVIOR.HOT_SPRINGS,
    BEHAVIOR.PACIFIDLOG_LOG_TOP,
    BEHAVIOR.PACIFIDLOG_LOG_BOTTOM,
    BEHAVIOR.PACIFIDLOG_LOG_LEFT,
    BEHAVIOR.PACIFIDLOG_LOG_RIGHT,
  ].includes(cell.behavior) ||
  (cell.behavior === BEHAVIOR.FORTREE_BRIDGE && (level & 1) === 0);

/** Generation III terrain policy; the field executor is independent of these behavior IDs and vehicle names. */
export const EMERALD_TERRAIN_RULES = {
  ice: {
    when: (c) =>
      [BEHAVIOR.ICE, BEHAVIOR.SLIPPERY_FLOOR].includes(c.cell.behavior),
    after: (c) => ({
      direction: c.dir,
      duration: 96,
      freezeAnimation: true,
      pose: "slide",
    }),
  },
  conveyor: {
    when: (c) => !!walk[c.cell.behavior],
    after: (c) => ({ direction: walk[c.cell.behavior], duration: 160 }),
  },
  slide: {
    when: (c) => !!slide[c.cell.behavior],
    after: (c) => ({
      direction: slide[c.cell.behavior],
      duration: 96,
      keepFacing: true,
      freezeAnimation: true,
      pose: "slide",
    }),
  },
  current: {
    when: (c) => !!currents[c.cell.behavior],
    after: (c) => ({
      direction: currents[c.cell.behavior],
      duration: 64,
      pose: "current",
    }),
  },
  "mud-slope": {
    when: (c) => c.cell.behavior === BEHAVIOR.MUDDY_SLOPE,
    after: (c) =>
      c.mode === "mach-bike" && c.dir === "up" && c.momentum.steps >= 3
        ? null
        : {
            direction: "down",
            duration: 96,
            keepFacing: true,
            resetMomentum: true,
            pose: "slide",
          },
  },
  "no-bike": {
    priority: 100,
    when: (c) =>
      c.mode.endsWith("bike") &&
      noBike(c.cell, c.actor?.previousElevation ?? c.cell.elevation),
    before: () => ({ allowed: false }),
  },
  "no-run": {
    when: (c) =>
      c.mode === "run" &&
      (noBike(c.cell, c.actor?.previousElevation ?? c.cell.elevation) ||
        c.map.allowRunning === false),
    before: () => ({ duration: 160, pose: "walk" }),
  },
  "bumpy-slope": {
    priority: 100,
    when: (c) => c.cell.behavior === BEHAVIOR.BUMPY_SLOPE,
    before: (c) => ({
      allowed:
        c.mode === "acro-bike" &&
        ["wheelie", "hop"].includes(c.technique) &&
        c.cell.collision === 0,
      jump: c.technique === "hop",
      pose: c.technique,
    }),
  },
  rails: {
    priority: 100,
    when: (c) =>
      !!railAxis(c.cell.behavior) || !!railAxis(c.sourceCell.behavior),
    before: (c) => ({
      allowed:
        c.mode === "acro-bike" &&
        c.cell.collision === 0 &&
        (c.technique === "side-hop" ||
          (aligned(railAxis(c.cell.behavior), c.dir) &&
            aligned(railAxis(c.sourceCell.behavior), c.dir))),
      jump: c.technique === "side-hop",
      keepFacing: c.technique === "side-hop",
      pose: c.technique,
    }),
  },
};
