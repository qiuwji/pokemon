import { NATIVE_BATTLE_ASSETS } from "../../../../generated/packs/emerald/battle-animation-assets.js";

export const sin = (index, amplitude) => (NATIVE_BATTLE_ASSETS.sine[index & 255] * amplitude) >> 8;
/** battle_anim_mons.c uses the low bit of a 24.8 delta as its direction flag. */
export function linearDelta(from, to, duration, frame) {
  let delta = Math.trunc(Math.abs(to - from) * 256 / duration);
  delta = to < from ? delta | 1 : delta & ~1;
  const value = ((delta * frame) & 65535) >> 8;
  return to < from ? -value : value;
}
export function coordinate(position, offsetX = 0, offsetY = 0, respectPicture = true) {
  return {
    x: position.x + offsetX * (position.back ? 1 : -1),
    // GetBattlerSpriteFinal_Y(..., TRUE) adds eight pixels to player-side effect anchors.
    y: (respectPicture ? position.y + (position.back ? 8 : 0) : position.baseY ?? position.y) + offsetY,
  };
}
