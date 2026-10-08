import { sampleBattleOpening } from "./battle-opening.js";
import { sampleBattleActions } from "./battle-actions.js";
import { sampleBattleCapture } from "./battle-capture.js";
import { applyBattleFrame } from "./battle-frame.js";
import { frameSequencePlayer } from "./frame-sequence.js";
import { readOnly } from "../engine/extensions/values.js";

/** Resolves one event once. Existing explicit track registrations are compiled to frames;
 * a matched sequence failure propagates and can never select another presentation. */
export function compileBattleClip(event, previous, base, duration, ports) {
  const registry = ports.registry;
  const registered = registry?.eventAnimation(event);
  const moveAnimation = event.kind === "move" ? registry?.animation(event.move) : null;
  duration = event.duration || registered?.animation.duration || moveAnimation?.duration || duration;
  const sequence = registered?.mode === "replace" ? null :
    registry?.prepareSequence(event, previous, base.layout);
  if (sequence && !registered) return Object.freeze({ ...sequence, usesSequence: true });
  const full = registered?.mode === "append" ? Math.max(sequence?.duration || 0, duration) : sequence?.duration || duration;
  const fps = sequence?.fps || 60, count = Math.ceil(full * fps / 1000) + 1;
  if (!Number.isFinite(full) || full <= 0 || full > 60000 || count > 14401)
    throw new Error("Battle clip exceeds finite playback bounds");
  const subject = ["hurt", "heal", "faint", "switch", "form", "recall"].includes(event.kind) ? event.targetSeat : event.actorSeat;
  // Explicit generic event projections retain their existing appearance until individually
  // replaced by authored native clips. Unregistered moves have no fabricated effect.
  const definition = registered?.animation || (!sequence ? moveAnimation : null);
  const frames = Array.from({ length: count }, (_, frame) => {
    const now = Math.min(full, frame * 1000 / fps), t = now / full;
    const result = { ...base, combatants: structuredClone(base.combatants),
      actors: structuredClone(base.actors), trainers: structuredClone(base.trainers),
      statusBoxes: structuredClone(base.statusBoxes), effects: [], sprites: [] };
    const actor = result.actors.find(a => a.seatId === subject), pose = base.layout.get(subject);
    if (event.kind === "switch" && actor) actor.opacity = 1;
    if (sequence) applyBattleFrame(result, sequence.sample(now));
    else if (registered?.mode !== "replace") {
      const context = { e: event, previous, start: 0, duration: full, now, t, subject, actor, pose };
      sampleBattleOpening(result, context, ports) || sampleBattleActions(result, context, ports) || sampleBattleCapture(result, context, ports);
    }
    if (definition) {
      const sampled = registry.sampleAnimation(definition, event, base.layout, t);
      result.effects = registered?.mode === "append" ? [...result.effects, ...sampled.effects] : sampled.effects;
      for (const pose of sampled.poses) {
        const actor = result.actors.find(a => a.seatId === pose.seatId);
        if (actor) Object.assign(actor, pose);
      }
    }
    if (!sequence && ["hurt", "heal"].includes(event.kind)) {
      result.healthBars = result.combatants.flatMap(c => {
        const old = previous.combatants.find(p => p.seatId === c.seatId)?.monster;
        if (!c.monster || !old || c.monster.uid !== old.uid) return [];
        const hp = Math.round(old.hp + (c.monster.hp - old.hp) * Math.min(1, t / 0.8));
        return [{ seatId: c.seatId, hp, fraction: hp / c.monster.stats.hp }];
      });
    }
    const sample = { poses: result.actors, sprites: result.sprites, trainers: result.trainers,
      statusBoxes: result.statusBoxes, effects: result.effects, ball: result.ball,
      balls: result.balls, background: result.background, clip: result.clip,
      healthBars: result.healthBars,
      monsterViews: result.combatants.filter((c, i) => c.monster?.uid !== base.combatants[i].monster?.uid)
        .map(c => ({ seatId: c.seatId, monster: c.monster })),
    };
    // Internal projections are detached; absent cosmetic channels are omitted, not programs.
    return JSON.parse(JSON.stringify(sample));
  });
  const player = frameSequencePlayer(readOnly({ fps, frames, cues: [] }));
  return Object.freeze({ ...player, duration: full, usesSequence: !!sequence,
    holdFinal: !!sequence?.holdFinal, messageAt: sequence?.messageAt || "start", cues: sequence?.cues });
}
