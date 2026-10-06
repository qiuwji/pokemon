import { BEHAVIOR as B } from "../../terrain.js";
export const bikeFrames = (n) => (n * 1000) / 60;
// Round only floating-point residue at frame boundaries, not actual sub-frame delays.
export const bikeFrameAge = (ms) =>
  Math.floor((ms * 60) / 1000 + Number.EPSILON * 1024);
export const canBikeFace = (behavior, direction) => {
  if ([B.ISOLATED_VERTICAL_RAIL, B.VERTICAL_RAIL].includes(behavior))
    return ["up", "down"].includes(direction);
  if ([B.ISOLATED_HORIZONTAL_RAIL, B.HORIZONTAL_RAIL].includes(behavior))
    return ["left", "right"].includes(direction);
  return true;
};
