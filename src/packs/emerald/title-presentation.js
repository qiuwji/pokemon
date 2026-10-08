import { FrameSequenceBuilder } from "../../engine/extensions/frame-sequence-builder.js";
import { LAUNCH_RESOURCES } from "../../../generated/packs/emerald/launch-art.js";
import { sin } from "./battle/animation-math.js";
export { LAUNCH_RESOURCES };
const clamp = (n, max) => Math.max(0, Math.min(max, n));
const image = (name, width, height, x, y, extra = {}) => ({ resource: "launch-" + name, width, height, x, y, ...extra });
const solid = color => image("solid", 240, 160, 120, 80, { tint: { color, amount: 16 } });
const compile = (frames, sample) => new FrameSequenceBuilder().track({ frames, sample: n => ({ sprites: sample(n) }) }).build();

/** Source task boundaries are compiled content; playback only reads immutable frames. */
export function emeraldTitleClip(id, start = 0, frames = 240) {
  if (!Number.isInteger(start) || start < 0 || !Number.isInteger(frames) || frames < 1 || frames > 3600)
    throw new Error("Invalid title interval");
  if (id === "copyright") return compile(157, frame => [image("copyright", 256, 256, 128, 128,
    { tint: { color: frame >= 140 ? [0, 0, 0] : [248, 248, 248], amount: frame >= 140 ? clamp(frame - 139, 16) : clamp(16 - frame, 16) } })]);
  if (id === "arrival") return compile(432, frame => {
    const age = frame - 32, phase2 = age >= 256, slide = clamp(age - 256 + 1, 64);
    const shineAge = age < 80 ? age : age < 192 ? age - 80 : age - 192;
    const mode = age >= 80 && age < 192 ? "double" : "single";
    const shining = !phase2 && shineAge >= 0 && shineAge < (mode === "double" ? 45 : 69);
    const x = 4 * shineAge, gray = x < 120 ? Math.min(31, (shineAge + 1) * 2) : Math.max(0, 31 - (shineAge - 29) * 2);
    const bg = age >= 80 && x < 272 ? x >= 132 && x <= 144 ? [192, 248, 96] : [gray * 8, gray * 8, gray * 8] : [0, 0, 0];
    const sprites = [solid(bg), image(shining ? `title-shine-${mode}` : "title-logo", 256, 256, 157, 160 - Math.floor(slide / 2),
      shining ? { tileFrame: shineAge } : {})];
    if (phase2) {
      const idx = clamp(64 - slide, 63), alpha = idx >= 32 ? [0, 16] : idx >= 16 ? [31 - idx, 16] : [16, idx];
      sprites.push(image("title-version", 128, 32, 130, 2 + slide, { alpha }));
    }
    return sprites.map(sprite => frame < 32 ? { ...sprite, tint: { color: [248, 248, 248], amount: 16 - Math.floor((frame + 1) / 2) } } : sprite);
  });
  if (id === "idle" || id === "exit") return compile(id === "exit" ? 16 : frames, local => {
    const frame = start + local, counter = frame & 255, scroll = Math.floor((frame + 1) / 4) % 256;
    const intensity = sin((counter & ~3) + 64, 128) + 128;
    const color = [(31 - (intensity * 31 >> 8)) * 8, (31 - (intensity * 22 >> 8)) * 8, 96];
    const sprites = [solid([0, 0, 0]), image("title-rayquaza", 256, 256, 128, 128),
      image("title-clouds", 256, 256, 128, 128 - scroll, { alpha: [6, 15] }),
      image("title-clouds", 256, 256, 128, 384 - scroll, { alpha: [6, 15] }),
      image("title-logo", 256, 256, 157, 128), image("title-version", 128, 32, 130, 66),
      image("title-copyright", 160, 8, 128, 148)];
    // The marking is a palette-index replacement, supplied as a separate transparent mask.
    sprites.splice(2, 0, image("title-marking", 256, 256, 128, 128, { tint: { color, amount: 16 } }));
    if ((frame + 1) & 16) sprites.push(image("press-start", 160, 8, 128, 108));
    return id === "exit" ? sprites.map(s => ({ ...s, tint: { color: [248, 248, 248], amount: local + 1 } })) : sprites;
  });
  if (["fade-white", "fade-black"].includes(id)) return compile(16, frame => [
    image("solid", 240, 160, 120, 80, { opacity: (frame + 1) / 16, tint: { color: id === "fade-white" ? [248, 248, 248] : [0, 0, 0], amount: 16 } })]);
  throw new Error(`Unknown title clip: ${id}`);
}
