import { SpriteClips } from "../../../presentation/sprite-clips.js";
import { emeraldDetailSpriteClip } from "../../../packs/emerald/sprite-clip-content.js";
/** Host assembly combines authored clip content and explicitly registered plugin clips. */
export function createEmeraldSpriteClips(db, host = null) {
  const registry = new SpriteClips(db);
  for (const species of Object.keys(db.species)) {
    registry.register(`emerald.${species}.detail`, emeraldDetailSpriteClip(species),
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
