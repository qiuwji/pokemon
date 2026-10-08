import { NATIVE_BATTLE_ASSETS } from "../../../../generated/packs/emerald/battle-animation-assets.js";
import { spriteFrames } from "../../../engine/extensions/frame-tracks.js";
import { coordinate, linearDelta, sin } from "./animation-math.js";

function art(id, point, values = {}) {
  const { resource, width, height } = NATIVE_BATTLE_ASSETS.assets[id];
  return { resource, width, height, x: point.x, y: point.y, tileFrame: 0, ...values };
}
export function hitSplat(position, { water = false, size = 2, alpha = [12, 8] } = {}) {
  const scale = 256 / [256, 216, 176, 128][size];
  return spriteFrames(art(water ? "water_impact" : "impact", coordinate(position), { scaleX: scale, scaleY: scale, alpha }), 10);
}
export function scratchMarks(position) {
  return spriteFrames(art("scratch", coordinate(position), { alpha: [12, 8] }), 22,
    age => ({ tileFrame: Math.min(4, Math.floor(age / 4)) }));
}
export function cryLine(position, { x = 24, y = 0, direction }) {
  const sign = position.back ? 1 : -1;
  return spriteFrames(art("noise_line", { x: position.x + x * sign, y: (position.baseY ?? position.y) + y },
    { flipX: sign < 0, flipY: direction === 1 }), 15, age => ({
    x: position.x + (x + (age * 640 >> 8)) * sign,
    y: (position.baseY ?? position.y) + y + (direction === 2 ? 0 : ((age * (direction === 0 ? -640 : 640)) >> 8)),
    tileFrame: (direction === 2 ? 2 : 0) + Math.floor(age / 3) % 2,
  }));
}
function movingArt(id, from, to, duration, { leadFrames = 2, extra = () => ({}) } = {}) {
  return spriteFrames(art(id, from), duration + leadFrames + 1, age => {
    const step = Math.max(0, Math.min(duration, age - leadFrames + 2));
    return { x: from.x + linearDelta(from.x, to.x, duration, step),
      y: from.y + linearDelta(from.y, to.y, duration, step), ...extra(age) };
  });
}
export function emberShot(source, target, offsetX) {
  return movingArt("small_ember", coordinate(source, 20, 0),
    { x: target.x + offsetX * (source.back ? 1 : -1), y: (target.baseY ?? target.y) + 24 }, 20);
}
export function emberFlare(source, target) {
  return movingArt("small_ember", coordinate(target, -24, 24, false),
    { x: target.x + 24 * (source.back ? 1 : -1), y: (target.baseY ?? target.y) + 24 }, 20,
    { leadFrames: 1, extra: age => ({ tileFrame: Math.floor(age / 4) % 5 }) });
}
export function waterShot(source, target) {
  const from = coordinate(source, 20, 0), to = coordinate(target), duration = 40;
  return spriteFrames(art("small_bubbles", from, { alpha: [12, 8] }), 41, age => ({
    x: from.x + linearDelta(from.x, to.x, duration, age),
    y: from.y + linearDelta(from.y, to.y, duration, age) + sin((Math.trunc(32768 / duration) * age) >> 8, -25),
  }));
}
export function waterDroplet(target, { x, y, duration }) {
  const from = coordinate(target, x, y);
  // The source uses duration as destination-Y too; retaining that observable quirk is content policy.
  return movingArt("small_bubbles", from, { x: from.x, y: from.y + duration }, duration, { extra: age => {
    const phase = age % 12, delta = phase < 6 ? phase * 16 : (12 - phase) * 16;
    return { tileFrame: 1, scaleX: 256 / (256 - delta), scaleY: 256 / (256 + delta), alpha: [12, 8] };
  } });
}
