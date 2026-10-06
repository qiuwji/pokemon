import { objectSchema } from "../../extensions/values.js";
import { BEHAVIOR as B } from "../../terrain.js";
import {
  bikeFrames as frames,
  bikeFrameAge,
  canBikeFace,
} from "./bike-input-helpers.js";
const opposite = { up: "down", down: "up", left: "right", right: "left" };
const phases = [
  "normal",
  "turning",
  "wheelie",
  "hop",
  "wheelie-moving",
  "side-jump",
  "turn-jump",
];
const initial = {
  phase: "normal",
  running: false,
  backupDirection: "down",
  turnStartMs: 0,
  chargeStartMs: 0,
  directionChangedMs: 0,
  secondaryChangedMs: 0,
};
const action = (kind, direction, technique = "normal", durationMs) => ({
  kind,
  direction,
  technique,
  ...(durationMs ? { durationMs } : {}),
});
const faceDirection = (c, d) =>
  canBikeFace(c.cell.behavior, d) ? d : c.position.dir;
const turning = (c, s) => {
  const dir = s.backupDirection;
  if (bikeFrameAge(c.timeMs - s.turnStartMs) >= 6) {
    s.phase = "normal";
    s.running = false;
    return action("turn", faceDirection(c, dir), "normal", frames(1));
  }
  // Source histories start at 1: current + next 3 frames qualify, the fifth does not.
  if (
    c.input.direction === dir &&
    c.input.secondary &&
    bikeFrameAge(c.timeMs - s.directionChangedMs) < 4 &&
    bikeFrameAge(c.timeMs - s.secondaryChangedMs) < 4
  ) {
    const backwards = dir === opposite[c.position.dir];
    s.phase = backwards ? "turn-jump" : "side-jump";
    s.running = !backwards;
    return action(
      backwards ? "turn" : "step",
      dir,
      backwards ? "turn-jump" : "side-hop",
      frames(16),
    );
  }
  return null;
};
const normal = (c, s) => {
  const dir = c.input.direction;
  if (!dir) {
    s.running = false;
    if (c.input.secondary && !c.previousInput.secondary) {
      s.phase = "wheelie";
      s.chargeStartMs = c.timeMs + frames(8);
      return action("turn", c.position.dir, "wheelie-rise", frames(8));
    }
    return action("pose", c.position.dir);
  }
  if (dir === c.position.dir && c.input.secondary) {
    s.phase = "wheelie-moving";
    s.running = true;
    return action("step", dir, "wheelie-rise", frames(8));
  }
  if (dir !== c.position.dir && !s.running) {
    s.phase = "turning";
    s.turnStartMs = c.timeMs;
    s.backupDirection = dir;
    return turning(c, s);
  }
  if (!canBikeFace(c.cell.behavior, dir)) return action("pose", c.position.dir);
  s.running = true;
  return action("step", dir, "normal", frames(6));
};
const wheelie = (c, s) => {
  s.running = false;
  if (!c.input.secondary && c.cell.behavior !== B.BUMPY_SLOPE) {
    s.phase = "normal";
    return action("turn", c.position.dir, "wheelie-lower", frames(8));
  }
  if (c.input.secondary && bikeFrameAge(c.timeMs - s.chargeStartMs) >= 40) {
    s.phase = "hop";
    return action("turn", c.position.dir, "hop", frames(16));
  }
  const dir = c.input.direction;
  if (dir === c.position.dir) {
    s.phase = "wheelie-moving";
    s.running = true;
    return action("step", dir, "wheelie", frames(8));
  }
  return action(
    "pose",
    dir ? faceDirection(c, dir) : c.position.dir,
    "wheelie",
  );
};
const hop = (c, s) => {
  if (!c.input.secondary) {
    s.running = false;
    if (c.cell.behavior === B.BUMPY_SLOPE) {
      s.phase = "wheelie";
      s.chargeStartMs = c.timeMs;
      return wheelie(c, s);
    }
    s.phase = "normal";
    return action("turn", c.position.dir, "wheelie-lower", frames(8));
  }
  if (c.blocked) return action("turn", c.position.dir, "hop", frames(16));
  const dir = c.input.direction;
  if (!dir || (dir !== c.position.dir && !s.running)) {
    s.running = false;
    return action(
      "turn",
      dir ? faceDirection(c, dir) : c.position.dir,
      "hop",
      frames(16),
    );
  }
  if (!canBikeFace(c.cell.behavior, dir))
    return action("turn", c.position.dir, "hop", frames(16));
  s.running = true;
  return action("step", dir, "hop", frames(16));
};
const wheelieMoving = (c, s) => {
  const dir = c.input.direction;
  if (!c.input.secondary && c.cell.behavior !== B.BUMPY_SLOPE) {
    s.phase = "normal";
    if (!dir || (dir !== c.position.dir && !s.running)) {
      s.running = false;
      return action("turn", c.position.dir, "wheelie-lower", frames(8));
    }
    s.running = true;
    return action("step", dir, "wheelie-lower", frames(8));
  }
  if (!dir) {
    s.phase = "wheelie";
    s.running = false;
    s.chargeStartMs = c.timeMs;
    return action("pose", c.position.dir, "wheelie");
  }
  if (!canBikeFace(c.cell.behavior, dir))
    return action("pose", c.position.dir, "wheelie");
  s.running = true;
  return action("step", dir, "wheelie", frames(8));
};
const handlers = {
  normal,
  turning,
  wheelie,
  hop,
  "wheelie-moving": wheelieMoving,
  "side-jump": (c, s) => {
    s.phase = "normal";
    return normal(c, s);
  },
  "turn-jump": (c, s) => {
    s.phase = "normal";
    return normal(c, s);
  },
};
/** Pure Acro input state machine; timed history and semantics are separate from sprite playback. */
export const GEN3_ACRO_INPUT = {
  schema: objectSchema(
    {
      phase: { type: "string", enum: phases },
      running: { type: "boolean" },
      backupDirection: {
        type: "string",
        enum: ["up", "down", "left", "right"],
      },
      ...Object.fromEntries(
        [
          "turnStartMs",
          "chargeStartMs",
          "directionChangedMs",
          "secondaryChangedMs",
        ].map((k) => [k, { type: "number", minimum: 0 }]),
      ),
    },
    Object.keys(initial),
  ),
  initialState: initial,
  decide(c) {
    const s = { ...c.state };
    if (c.input.direction !== c.previousInput.direction)
      s.directionChangedMs = c.timeMs;
    if (c.input.secondary !== c.previousInput.secondary)
      s.secondaryChangedMs = c.timeMs;
    if (c.blocked && !c.busy && s.phase === "side-jump") {
      s.phase = "normal";
      s.running = false;
      return {
        state: s,
        action: action(
          "turn",
          c.input.direction || c.position.dir,
          "normal",
          frames(1),
        ),
      };
    }
    if (
      c.blocked &&
      !c.busy &&
      s.phase === "wheelie-moving" &&
      c.input.secondary
    ) {
      s.running = false;
      return {
        state: s,
        action: action("turn", c.position.dir, "wheelie", frames(8)),
      };
    }
    if (c.blocked) {
      s.running = false;
      if (s.phase === "wheelie-moving") {
        s.phase = "wheelie";
        s.chargeStartMs = c.timeMs;
      }
      if (["side-jump", "turn-jump"].includes(s.phase)) s.phase = "normal";
    }
    return { state: s, action: c.busy ? null : handlers[s.phase](c, s) };
  },
};
