import { inventoryCounts } from "../inventory.js";

/**
 * The single owner of legal AI candidates. Enumeration never spends PP, items, quota or RNG; the
 * host prepares and commits the chosen action through the original battle services. Legacy
 * strategies see the same actions in the same order, so extracting this service changes no policy.
 */
export class BattleCandidateService {
  constructor(battle) {
    this.battle = battle;
  }
  targets(seat, move) {
    const b = this.battle;
    return ["selected", "user-or-selected"].includes(b.targeting.mode(move))
      ? b.targeting
          .candidates(seat, move)
          .map((s) => ({ kind: "seat", id: s.id }))
      : [undefined];
  }
  candidate(action, suffix) {
    return {
      id: `${action.seat}|${suffix}`,
      seat: action.seat,
      actorUid: action.actor ?? null,
      kind: action.kind,
      action,
    };
  }
  /** Rich candidates for the new decision path; `variants` are the trainer's declared attachments. */
  list(seat, { variants = [], replacement = false } = {}) {
    const b = this.battle,
      mon = b.roster.occupant(seat),
      owner = b.roster.owner(seat);
    if (replacement || !(mon?.hp > 0))
      return b.roster.bench(seat).map(({ index }) =>
        this.candidate(
          { kind: "switch", seat, actor: mon?.uid ?? null, index },
          `s:${index}`,
        ),
      );
    const out = [],
      slots = b
        .movesFor(seat)
        .map((_, index) => index)
        .filter((index) => b.moveAvailable(seat, index));
    for (const index of slots.length ? slots : [-1]) {
      const moveId = index < 0 ? null : b.movesFor(seat)[index].id,
        move = moveId
          ? b.db.moves[moveId]
          : { effect: "recoil", target: "selected" },
        targets = this.targets(seat, move);
      const push = (extra, suffix, validate) => {
        for (const target of targets) {
          const action = {
            kind: "move",
            seat,
            actor: mon.uid,
            index,
            ...extra,
            ...(target ? { target } : {}),
          };
          if (validate && b.actions.prepare(action, seat).error) continue;
          out.push(
            this.candidate(action, `${suffix}${target ? `:${target.id}` : ""}`),
          );
        }
      };
      push({}, `m:${index}`, false);
      for (const option of b.augments.options(seat, index))
        push({ augment: option.id }, `m:${index}:a:${option.id}`, false);
      variants.forEach((variant, vi) =>
        push({ attachments: variant.attachments }, `m:${index}:v${vi}`, true),
      );
    }
    for (const { index } of b.roster.bench(seat)) {
      const action = { kind: "switch", seat, actor: mon.uid, index };
      if (!b.actions.prepare(action, seat).error)
        out.push(this.candidate(action, `s:${index}`));
    }
    for (const [item, count] of Object.entries(inventoryCounts(owner.bag))) {
      if (count <= 0) continue;
      for (let index = 0; index < owner.party.length; index++) {
        const action = { kind: "item", seat, actor: mon.uid, item, index };
        if (!b.actions.prepare(action, seat).error)
          out.push(this.candidate(action, `i:${item}:${index}`));
      }
    }
    return out;
  }
}
