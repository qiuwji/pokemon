import { readOnly, callSync } from "../engine/extensions/values.js";
import {
  validateMoveAnimation,
  validateBattleAnimation,
} from "../engine/extensions/visual-contracts.js";
import { sampleAnimationTrack } from "./animation-timing.js";
/** Startup registrations only. Samples contain detached data; drawing never owns domain state. */
export class PresentationRegistry {
  constructor({ onError = () => {}, typeColors = null } = {}) {
    this.effects = new Map();
    this.moves = new Map();
    this.battleAnimations = new Map();
    this.messages = new Map();
    this.sealed = false;
    this.onError = onError;
    // Injected palette port: the pack maps an opaque damage-type id to a colour; the
    // presentation layer never carries the type table itself.
    this.typeColors = typeColors;
  }
  /**
   * Register a battle narration template (id -> params => text). Assembly order is
   * pack base first, then plugin overrides, so a later registration replaces an earlier one.
   */
  message(id, format) {
    if (
      this.sealed ||
      typeof id !== "string" ||
      !id ||
      typeof format !== "function"
    )
      throw new Error("Invalid battle message");
    this.messages.set(id, format);
    return this;
  }
  /** Resolve an event's `message:{id,params}` through registered templates, else fall back to text. */
  resolveMessage(event) {
    const message = event?.message;
    if (message && this.messages.has(message.id))
      return this.messages.get(message.id)(message.params || {});
    return event?.text || "";
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
  battle(id, definition) {
    if (
      this.sealed ||
      typeof id !== "string" ||
      !id ||
      this.battleAnimations.has(id)
    )
      throw new Error("Duplicate or invalid battle animation");
    validateBattleAnimation(definition, (effect) => this.effects.has(effect));
    const normalized = readOnly({
      ...definition,
      match: definition.match || {},
      priority: definition.priority || 0,
      mode: definition.mode || "replace",
    });
    for (const existing of this.battleAnimations.values())
      if (
        existing.kind === normalized.kind &&
        JSON.stringify(Object.entries(existing.match).sort()) ===
          JSON.stringify(Object.entries(normalized.match).sort())
      )
        throw new Error("Duplicate battle animation selector");
    this.battleAnimations.set(id, normalized);
    return this;
  }
  eventAnimation(event) {
    return (
      [...this.battleAnimations.entries()]
        .filter(
          ([, definition]) =>
            definition.kind === event.kind &&
            Object.entries(definition.match).every(
              ([key, value]) => event[key] === value,
            ),
        )
        .sort(
          ([a, x], [b, y]) =>
            y.priority - x.priority ||
            Object.keys(y.match).length - Object.keys(x.match).length ||
            (a < b ? -1 : a > b ? 1 : 0),
        )[0]?.[1] || null
    );
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
    if (!layout.has(event.actorSeat)) return [];
    return this.sampleAnimation(
      this.animation(event.move, profile),
      event,
      layout,
      t,
    ).effects;
  }
  sampleAnimation(
    definition,
    event,
    layout,
    time,
    {
      reducedMotion = false,
      field = { x: 160, y: 112, width: 320, height: 224 },
    } = {},
  ) {
    const sourceSeat =
        event.actorSeat || event.targetSeat || layout.keys().next().value,
      source = layout.get(sourceSeat),
      effects = [],
      poses = [];
    if (!source || reducedMotion) return { effects, poses };
    const paletteColor = this.typeColors
        ? this.typeColors(event.move?.type)
        : null,
      anchors = (track) =>
      track.anchor === "targets"
        ? event.targetSeats || [event.targetSeat]
        : [sourceSeat];
    const success = (seat) =>
      event.move?.targetResults?.find((result) => result.seatId === seat)
        ?.successful ?? event.move?.successful !== false;
    for (const track of definition.tracks)
      for (const seat of anchors(track)) {
        const target = track.anchor === "field" ? field : layout.get(seat),
          sampled = sampleAnimationTrack(track, time, {
            successful: success(seat),
          });
        if (!target || !sampled) continue;
        effects.push({
          ...sampled.parameters,
          ...(sampled.parameters.color === undefined && paletteColor
            ? { color: paletteColor }
            : {}),
          kind: track.effect,
          source: { ...source },
          target: { ...target },
          anchor: track.anchor,
          scope: track.anchor === "field" ? "battle-field" : "battle-seat",
          sourceSeat,
          targetSeat: seat,
          side: source.back ? 0 : 1,
          type: event.move?.type ?? null,
          successful: success(seat),
          t: sampled.t,
          progress: sampled.progress,
        });
      }
    for (const track of definition.poses || [])
      for (const seat of anchors(track)) {
        const sampled = sampleAnimationTrack(track, time, {
          successful: success(seat),
        });
        if (layout.has(seat) && sampled)
          poses.push({ seatId: seat, ...sampled.parameters });
      }
    return { effects, poses };
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
