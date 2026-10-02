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
    techniques: {
      wheelie: { name: "抬起前轮", pose: "wheelie" },
      hop: { name: "连续跳跃", pose: "hop", jump: true },
      "side-hop": { name: "侧向跳跃", pose: "side-hop", jump: true, keepFacing: true, oneStep: true },
    },
    allowed: (c) =>
      field(c) && c.map.allowBike !== false && capability("bike", c),
    traverse: land,
  },
  surf: {
    name: "冲浪",
    actor: "BrendanSurf",
    durations: [128],
    allowed: (c) => capability("surf", c),
    traverse: (c) =>
      (isWater(c.cell.behavior) &&
        !(c.cell.behavior === BEHAVIOR.WATERFALL && c.dir === "up")) ||
      land(c),
    afterStep: (c) => (isWater(c.cell.behavior) ? "surf" : "walk"),
  },
  dive: {
    name: "潜水",
    actor: "BrendanSurf",
    surface: "both",
    mapRequires: { underwater: true },
    durations: [128],
    allowed: (c) => !!c.map.underwater && capability("dive", c),
    traverse: (c) => c.cell.collision === 0,
  },
  waterfall: {
    name: "攀瀑",
    actor: "BrendanSurf",
    surface: "water",
    durations: [80],
    allowed: (c) => capability("waterfall", c),
    traverse: (c) => isWater(c.cell.behavior),
    afterStep: () => "surf",
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
