import { nativePartySummary } from "./party-summary.js";
import { NATIVE_MOVE_IDS, nativeMoveSequence } from "./move-choreography.js";
import { nativeControllerSequence } from "./controller-animation.js";
import { NATIVE_BATTLE_ASSETS } from "../../../../generated/packs/emerald/battle-animation-assets.js";
import { FrameSequenceBuilder } from "../../../engine/extensions/frame-sequence-builder.js";
import { nativeOpeningSlide, nativeOpeningSend, nativeTrainerReturn } from "./opening-choreography.js";

/** The pack consumes the same registration boundary as external animation authors. */
export function registerEmeraldBattleSequences(registry, { host, sounds, soundFrames = id => NATIVE_BATTLE_ASSETS.audioFrames[id] || 0 } = {}) {
  const hasSound = id => !sounds || sounds.get(id)?.kind === "sound";
  const overrides = new Set([...host?.moveAnimations?.values() || []].map(definition => definition.moveId));
  for (const [phase, prepare] of [["slide", nativeOpeningSlide], ["send", nativeOpeningSend]])
    registry.sequence("emerald:entry-" + phase, { kind: "entry", match: { introPhase: phase }, priority: -1000,
      prepare: context => prepare(context, { hasSound, soundFrames }) });
  registry.sequence("emerald:party-summary", { kind: "entry", match: { introPhase: "summary" }, priority: -1000, prepare: context => nativePartySummary(context, { hasSound }) });
  registry.sequence("emerald:trainer-return", { kind: "trainer-slide", priority: -1000, prepare: nativeTrainerReturn });
  registry.sequence("emerald:party-defeated", { kind: "end", match: { "message.id": "party-defeated" }, priority: -1000,
    prepare: () => new FrameSequenceBuilder().build() });
  for (const moveId of NATIVE_MOVE_IDS)
    if (!overrides.has(moveId)) registry.sequence("emerald:" + moveId, {
      kind: "move", match: { moveId }, priority: -1000,
      prepare: context => nativeMoveSequence(context, { hasSound, soundFrames }),
    });
  for (const kind of ["hurt", "heal", "faint"])
    registry.sequence("emerald:" + kind, { kind, priority: -1000,
      prepare: context => nativeControllerSequence(context, { hasSound }),
    });
  for (const message of ["critical-hit", "super-effective", "not-very-effective", "no-effect"])
    registry.sequence("emerald:" + message, { kind: "text", match: { "message.id": message }, priority: -1000,
      prepare: () => new FrameSequenceBuilder().build({ frames: 64 }),
    });
  for (const [id, definition] of host?.battleSequences || []) {
    const { id: _id, owner: _owner, ...sequence } = definition;
    registry.sequence(id, sequence);
  }
}
