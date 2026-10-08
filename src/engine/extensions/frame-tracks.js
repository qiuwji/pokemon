/** Public, pure building blocks. They produce detached poses/images, never action or outcome state. */
import { callSync } from "./values.js";
export const poseFrames = (seatId, frames, sample) => ({ frames, sample: age => ({ poses: [{ seatId, ...callSync(sample, [age]) }] }) });
export const spriteFrames = (sprite, frames, sample = () => ({})) => ({ frames,
  sample: age => ({ sprites: [{ ...sprite, ...callSync(sample, [age]) }] }) });

export function shakePose(seatId, { x = 0, y = 0, toggles, delay, opposed = false }) {
  return poseFrames(seatId, toggles * (delay + 1) - 1, age => {
    const togglesDone = Math.floor((age + 1) / (delay + 1));
    const multiplier = opposed ? (togglesDone % 2 ? -1 : 1) : (togglesDone % 2 ? 0 : 1);
    return { x: x * multiplier, y: y * multiplier };
  });
}
export function ellipsePose(seatId, { width, height, cycles, framesPerCycle, period = Math.PI * 2,
  sine = (angle, amplitude) => Math.sin(angle) * amplitude }) {
  return poseFrames(seatId, framesPerCycle * cycles - 1, age => ({
    x: sine(age * period / framesPerCycle, width), y: height - sine(age * period / framesPerCycle + period / 4, height),
  }));
}
/** Explicit integer-frame keyframes preserve intentional holds. */
export function keyframePose(seatId, frames, keys) {
  return poseFrames(seatId, frames, age => {
    const next = keys.findIndex(key => key.frame > age);
    if (next <= 0) return { ...keys[next < 0 ? keys.length - 1 : 0].values };
    const a = keys[next - 1], b = keys[next], t = (age - a.frame) / (b.frame - a.frame);
    return Object.fromEntries(Object.keys(a.values).map(key => [key, a.values[key] + (b.values[key] - a.values[key]) * t]));
  });
}
