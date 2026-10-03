import { GEN3_MACH_DURATIONS } from "../../engine/rules/gen3/bike-input.js";
import { isWater, BEHAVIOR } from "../../engine/terrain.js";
/** Emerald-specific permissions. Another game can supply a different registry to the same field session. */
const land = ({ cell, warp }) =>
  !isWater(cell.behavior) && (cell.collision === 0 || !!warp);
const field = ({ map }) => !map.indoor;
const lowJump = [0, 2, 3, 4, 5, 6, 6, 6, 5, 5, 4, 3, 2, 0, 0, 0];
const normalJump = [2, 4, 6, 8, 9, 10, 10, 10, 9, 8, 6, 5, 3, 2, 0, 0];
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
    durations: GEN3_MACH_DURATIONS,
    inputRule: "mach-bike",
    allowed: (c) =>
      field(c) && c.map.allowBike !== false && capability("bike", c),
    traverse: (c) => land(c) && c.cell.behavior !== BEHAVIOR.LONG_GRASS,
  },
  "acro-bike": {
    name: "越野自行车",
    actor: "BrendanAcroBike",
    durations: [6000 / 60],
    inputRule: "acro-bike",
    ledge: {
      durationMs: 32000 / 60,
      liftFrames: [4, 6, 8, 10, 11, 12, 12, 12, 11, 10, 9, 8, 6, 4, 0, 0],
    },
    techniques: {
      "wheelie-rise": { name: "抬轮", menu: false, pose: "wheelie-rise" },
      "wheelie-lower": { name: "收轮", menu: false, pose: "wheelie-lower" },
      "turn-jump": {
        name: "转向跳",
        menu: false,
        pose: "turn-jump",
        jump: true,
        oneStep: true,
        turnAt: 0.5,
        liftFrames: normalJump,
      },
      wheelie: { name: "抬起前轮", pose: "wheelie" },
      hop: { name: "连续跳跃", pose: "hop", jump: true, liftFrames: lowJump },
      "side-hop": {
        name: "侧向跳跃",
        pose: "side-hop",
        jump: true,
        keepFacing: true,
        liftFrames: normalJump,
        oneStep: true,
      },
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
