import { readOnly } from "../extensions/values.js";
/** Mid-round replacement is a pending decision, never an extra turn or a presentation callback. */
export class BattleReplacementRequests {
  constructor(battle) {
    this.battle = battle;
    this.pending = new Map();
    this.policies = Object.fromEntries(
      Object.entries(battle.rules.replacementPolicies).map(([id, d]) => {
        if (
          typeof d.handoff !== "string" ||
          !d.handoff ||
          !Array.isArray(d.volatileFields) ||
          d.volatileFields.some(
            (k) => !["stages", "confused", "focus"].includes(k),
          ) ||
          typeof d.bypassSwitchCheck !== "boolean"
        )
          throw new Error(`Invalid replacement policy ${id}`);
        return [
          id,
          Object.freeze({
            ...d,
            volatileFields: Object.freeze([...d.volatileFields]),
          }),
        ];
      }),
    );
    for (const definition of Object.values(battle.moveEffects.definitions))
      for (const phase of [
        "primary",
        "beforeDamage",
        "afterDamage",
        "secondary",
        "onCharge",
        "onMiss",
      ])
        for (const step of definition[phase] || [])
          if (step.op === "requestReplacement" && !this.policies[step.reason])
            throw new Error(`Unknown replacement policy ${step.reason}`);
  }
  get(seat) {
    const r = this.pending.get(seat),
      mon = this.battle.roster.occupant(seat);
    return r && mon?.hp > 0 && mon.uid === r.uid ? r : null;
  }
  required() {
    return [...this.pending.keys()]
      .filter((seat) => this.get(seat))
      .map((seat) => this.battle.roster.seat(seat));
  }
  request(seat, reason) {
    const b = this.battle,
      policy = this.policies[reason];
    if (!policy) throw new Error(`Unknown replacement policy ${reason}`);
    if (this.get(seat) || !b.roster.bench(seat).length) return false;
    const owner = b.roster.owner(seat);
    if (owner.kind === "ai") {
      const chosen =
        b.aiRuntime && owner.ai
          ? b.aiRuntime.decideReplacement(seat, reason)
          : {
              index: b.rules.replacementIndex({
                battle: b,
                seat,
                reason,
                candidates: b.roster.bench(seat),
              }),
            };
      if (!b.roster.canReplace(seat, chosen.index))
        throw new Error("Invalid automatic replacement choice");
      b.actions.switch(seat, chosen.index, { policy });
    } else {
      this.pending.set(seat, {
        seat,
        uid: b.roster.occupant(seat).uid,
        reason,
      });
      b.emit("请选择接替上场的伙伴。", "choice", {
        actorSeat: seat,
        replacementReason: reason,
      });
    }
    return true;
  }
  fulfill(action) {
    const r = this.get(action.seat);
    if (
      !r ||
      action.kind !== "switch" ||
      !this.battle.roster.canReplace(action.seat, action.index)
    )
      throw new Error("Replacement request is no longer valid");
    this.pending.delete(action.seat);
    this.battle.actions.switch(action.seat, action.index, {
      policy: this.policies[r.reason],
    });
  }
  clear(seat) {
    if (seat) this.pending.delete(seat);
    else this.pending.clear();
  }
  view() {
    return readOnly(
      this.required().map((s) => ({
        ...this.get(s.id),
        candidates: this.battle.roster
          .bench(s.id)
          .map(({ mon, index }) => ({ index, uid: mon.uid })),
      })),
    );
  }
}
export const REPLACEMENT_OPERATIONS = {
  requestReplacement(c, s) {
    if (!c.battle.replacements.request(c.actorSeat, s.reason)) {
      c.successful = false;
      c.emit("没有可以接替的伙伴。", "failed");
    }
  },
};
REPLACEMENT_OPERATIONS.requestReplacement.validate = (s) => {
  if (typeof s.reason !== "string" || !s.reason)
    throw new Error("Invalid replacement reason");
};
