import { DETAIL_SPRITE_FRAMES } from "../../../generated/packs/emerald/detail-sprite-frames.js";
/** Authored entrance timing; native species-specific animation scripts remain pending. */
export function emeraldDetailSpriteClip(species) {
  const count = DETAIL_SPRITE_FRAMES[species] || 1;
  return {
    width: 64, height: 64, loop: false, match: { species, view: "detail" },
    frames: [...Array.from({ length: count }, (_, index) => index), ...(count > 1 ? [0] : [])].map(index => ({
      resource: species + (Object.hasOwn(DETAIL_SPRITE_FRAMES, species) ? "-detail" : "-front"),
      rect: { x: 0, y: index * 64, width: 64, height: 64 }, durationMs: 125,
    })),
  };
}
