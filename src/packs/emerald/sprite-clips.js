import { SpriteClips } from "../../presentation/sprite-clips.js";
import { DETAIL_SPRITE_FRAMES } from "../../../generated/packs/emerald/detail-sprite-frames.js";
/** Pack asset layout and baseline selection, independent of rules and the generic playback host. */
export function createEmeraldSpriteClips(db, host = null) {
  const registry = new SpriteClips(db);
  for (const species of Object.keys(db.species)) {
    const count = DETAIL_SPRITE_FRAMES[species] || 1;
    registry.register(
      `emerald.${species}.detail`,
      {
        width: 64,
        height: 64,
        loop: false,
        match: { species, view: "detail" },
        // Play the entrance once, then rest on the first pose. Plugin clips can
        // still explicitly loop through the generic SpriteClips contract.
        frames: [...Array.from({ length: count }, (_, index) => index), ...(count > 1 ? [0] : [])].map(index => ({
          resource: species + (Object.hasOwn(DETAIL_SPRITE_FRAMES, species) ? "-detail" : "-front"),
          rect: { x: 0, y: index * 64, width: 64, height: 64 },
          durationMs: 125,
        })),
      },
      { fallback: true },
    );
  }
  for (const [
    id,
    { id: registered, owner, ...definition },
  ] of host?.spriteClips || [])
    registry.register(id, definition);
  return registry.seal();
}
