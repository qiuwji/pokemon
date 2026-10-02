import { isWater, BEHAVIOR } from "../../engine/terrain.js";
/** Emerald-specific permissions. Another game can supply a different registry to the same field session. */
const land = ({ cell, warp }) =>
  !isWater(cell.behavior) && (cell.collision === 0 || !!warp);
const field = ({ map }) => !map.indoor;
const capability = (id, c) => c.scripted || !!c.capabilities?.[id];
export const MOVEMENT_MODES = {
  walk: {
    name: "步行",
    actor: "BrendanNormal",
    durations: [160],
    allowed: () => true,
    traverse: land,
  },
  run: {
    name: "跑步",
    actor: "BrendanRun",
    durations: [96],
    allowed: (c) => field(c) && capability("run", c),
    traverse: land,
  },
  "mach-bike": {
    name: "音速自行车",
    actor: "BrendanMachBike",
    durations: [128, 96, 64],
    allowed: (c) =>
      field(c) && c.map.allowBike !== false && capability("bike", c),
    traverse: (c) => land(c) && c.cell.behavior !== BEHAVIOR.LONG_GRASS,
  },
  "acro-bike": {
    name: "越野自行车",
    actor: "BrendanAcroBike",
    durations: [96],
    allowed: (c) =>
      field(c) && c.map.allowBike !== false && capability("bike", c),
    traverse: land,
  },
  surf: {
    name: "冲浪",
    actor: "BrendanSurf",
    durations: [128],
    allowed: (c) => capability("surf", c),
    traverse: (c) => isWater(c.cell.behavior) || land(c),
    afterStep: (c) => (isWater(c.cell.behavior) ? "surf" : "walk"),
  },
};
export const TRAVEL_DESTINATIONS = {
  LittlerootTown: {
    name: "未白镇",
    position: { map: "LittlerootTown", x: 10, y: 10, dir: "down" },
  },
  OldaleTown: {
    name: "古辰镇",
    position: { map: "OldaleTown", x: 6, y: 9, dir: "down" },
  },
};
