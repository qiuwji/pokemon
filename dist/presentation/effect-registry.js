import { readOnly, callSync } from "../engine/extensions/values.js";
import { validateMoveAnimation } from "../engine/extensions/visual-contracts.js";
/** Startup registrations only. Samples contain detached data; drawing never owns domain state. */
export class PresentationRegistry {
  constructor({ onError = () => {} } = {}) {
    this.effects = new Map();
    this.moves = new Map();
    this.sealed = false;
    this.onError = onError;
  }
  effect(id, draw) {
    if (
      this.sealed ||
      typeof id !== "string" ||
      !id ||
      this.effects.has(id) ||
      typeof draw !== "function"
    )
      throw new Error("Duplicate or invalid visual effect");
    this.effects.set(id, draw);
    return this;
  }
  move(id, definition) {
    if (this.sealed || typeof id !== "string" || !id || this.moves.has(id))
      throw new Error("Duplicate or invalid move animation");
    validateMoveAnimation(definition, (effect) => this.effects.has(effect));
    this.moves.set(id, readOnly(definition));
    return this;
  }
  seal() {
    this.sealed = true;
    return this;
  }
  animation(move, profile) {
    return (
      this.moves.get(move?.id) || {
        duration: 760,
        lunge: profile === "contact" ? 20 : 0,
        tracks: [{ effect: profile, anchor: "targets", start: 0, end: 1 }],
      }
    );
  }
  sampleMove(event, layout, t, profile = "contact") {
    const source = layout.get(event.actorSeat);
    if (!source) return [];
    const definition = this.animation(event.move, profile),
      result = [];
    for (const track of definition.tracks) {
      if (t < track.start || t > track.end) continue;
      const anchors =
        track.anchor === "targets"
          ? event.targetSeats || [event.targetSeat]
          : [event.actorSeat];
      for (const seat of anchors) {
        const target = layout.get(seat);
        if (!target) continue;
        result.push({
          kind: track.effect,
          ...track.parameters,
          source,
          target,
          sourceSeat: event.actorSeat,
          targetSeat: seat,
          side: source.back ? 0 : 1,
          type: event.move?.type || "normal",
          successful:
            event.move?.targetResults?.find((result) => result.seatId === seat)
              ?.successful ?? event.move?.successful !== false,
          t: (t - track.start) / (track.end - track.start),
        });
      }
    }
    return result;
  }
  draw(ctx, visual) {
    const draw = this.effects.get(visual.kind);
    if (!draw) {
      this.onError(new Error(`Unknown visual effect ${visual.kind}`));
      return false;
    }
    ctx.save();
    try {
      callSync(draw, [ctx, readOnly(visual)], this.onError);
      return true;
    } catch (error) {
      this.onError(error);
      return false;
    } finally {
      ctx.restore();
    }
  }
}
