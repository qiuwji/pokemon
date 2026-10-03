import { objectSchema } from "../../extensions/values.js";
import { BEHAVIOR as B } from "../../terrain.js";
const frames = (n) => (n * 1000) / 60;
export const GEN3_MACH_DURATIONS = Object.freeze([
  frames(16),
  frames(8),
  frames(4),
]);
const standing = () => ({ counter: 0, speed: 0, running: false });
const canFace = (behavior, direction) => {
  if ([B.ISOLATED_VERTICAL_RAIL, B.VERTICAL_RAIL].includes(behavior))
    return ["up", "down"].includes(direction);
  if ([B.ISOLATED_HORIZONTAL_RAIL, B.HORIZONTAL_RAIL].includes(behavior))
    return ["left", "right"].includes(direction);
  return true;
};
/** bike.c: Mach transitions retain speed during turns and coast through 4/8/16-frame steps. */
export const GEN3_MOVEMENT_INPUTS = {
  "mach-bike": {
    schema: objectSchema(
      {
        counter: { type: "integer", minimum: 0, maximum: 2 },
        speed: { type: "integer", minimum: 0, maximum: 3 },
        running: { type: "boolean" },
      },
      ["counter", "speed", "running"],
    ),
    initialState: standing(),
    decide(c) {
      let s = c.blocked ? standing() : { ...c.state };
      if (c.busy) return { state: s, action: null };
      let direction = c.input.direction;
      if (!direction || !canFace(c.cell.behavior, direction)) {
        if (!s.speed) return { state: standing(), action: null };
        direction = c.position.dir;
        s.speed--;
        s.counter = s.speed;
        s.running = true;
        return {
          state: s,
          action: {
            kind: "step",
            direction,
            durationMs: GEN3_MACH_DURATIONS[s.counter],
          },
        };
      }
      if (direction !== c.position.dir && !s.running && s.speed === 0)
        return {
          state: standing(),
          action: { kind: "turn", direction, durationMs: frames(1) },
        };
      const counter = s.counter;
      s.running = true;
      s.speed = counter + (counter >> 1);
      s.counter = Math.min(2, counter + 1);
      return {
        state: s,
        action: {
          kind: "step",
          direction,
          durationMs: GEN3_MACH_DURATIONS[counter],
        },
      };
    },
  },
};
