export const TARGET_MODES = new Set([
  "selected",
  "user-or-selected",
  "self",
  "opponents",
  "opponents-field",
  "random",
  "all-others",
  "field",
]);
/** Resolves target descriptors against live seats. Selection and execution share these rules. */
export class BattleTargeting {
  constructor(battle) {
    this.battle = battle;
  }
  mode(move) {
    return this.battle.moveEffects.get(move.effect).target === "self"
      ? "self"
      : move.target || "selected";
  }
  candidates(actorId, move) {
    const b = this.battle,
      mode = this.mode(move);
    const live = [...b.roster.seats.values()].filter(
      (s) => b.roster.occupant(s.id)?.hp > 0,
    );
    if (mode === "self") return [b.roster.seat(actorId)];
    if (["opponents", "opponents-field", "random"].includes(mode))
      return b.roster.opposing(actorId);
    if (mode === "all-others") return live.filter((s) => s.id !== actorId);
    if (["field", "user-or-selected"].includes(mode)) return live;
    return live.filter((s) => s.id !== actorId);
  }
  validate(actorId, move, ref) {
    const mode = this.mode(move),
      candidates = this.candidates(actorId, move);
    if (!candidates.length) return false;
    if (!ref) return true;
    try {
      this.battle.roster.target(actorId, ref);
    } catch {
      return false;
    }
    if (mode === "self")
      return ref.kind === "self" || (ref.kind === "seat" && ref.id === actorId);
    if (["selected", "user-or-selected"].includes(mode))
      return ref.kind === "seat" && candidates.some((s) => s.id === ref.id);
    if (mode === "opponents" || mode === "opponents-field")
      return (
        (ref.kind === "side" && candidates.some((s) => s.sideId === ref.id)) ||
        ref.kind === "field"
      );
    return ref.kind === "field";
  }
  resolve(actorId, move, ref) {
    const b = this.battle,
      candidates = this.candidates(actorId, move),
      mode = this.mode(move);
    if (mode === "random")
      return candidates.length
        ? [candidates[b.rng.int(candidates.length)]]
        : [];
    if (!["selected", "user-or-selected", "self"].includes(mode))
      return candidates;
    if (mode === "self") return candidates;
    if (ref) {
      const chosen = candidates.find((s) => s.id === ref.id);
      if (chosen) return [chosen];
      // Single-target enemy attacks redirect to a living opponent; ally targets fail explicitly.
      if (!b.roster.isOpposing(actorId, ref.id)) return [];
    }
    return b.roster.opposing(actorId).slice(0, 1);
  }
}
