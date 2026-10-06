import { GEN3_REFERENCE_MOVES } from "../../../generated/engine/rules/gen3/reference-metadata.js";
import { executeCalledMove } from "./called-moves.js";
import { normalizeMoveFlags } from "../move-flags.js";
/** Reassigns a declared move to a live interceptor; the selecting actor has already paid PP. */
export class BattleMoveInterception {
  constructor(battle) {
    this.battle = battle;
  }
  execute(c, targets) {
    const b = this.battle,
      flags = normalizeMoveFlags(
        c.move.flags ?? GEN3_REFERENCE_MOVES[c.move.id]?.flags ?? [],
      );
    let seat, record, target, kind;
    if (flags.includes("magic_coat_affected")) {
      const victim = targets.find((s) => b.states.lookup("magic_coat", s.id));
      if (victim) {
        seat = victim.id;
        record = b.states.lookup("magic_coat", seat);
        target = { kind: "seat", id: c.actorSeat };
        kind = "reflect";
      }
    }
    if (!record && flags.includes("snatch_affected")) {
      seat = [...b.turnOrder, ...b.roster.occupied().map((s) => s.id)].find(
        (id) => b.roster.occupant(id)?.hp > 0 && b.states.lookup("snatch", id),
      );
      if (seat) {
        record = b.states.lookup("snatch", seat);
        target = { kind: "self" };
        kind = "snatch";
      }
    }
    if (!record) return null;
    b.states.remove(record.key, "consumed");
    c.emit(kind === "reflect" ? "招式被反弹了！" : "招式被抢夺了！", "state", {
      interceptorSeat: seat,
      interception: kind,
      moveId: c.move.id,
    });
    // Original PressurePPLose(original attacker, guard owner, MAGIC_COAT/SNATCH)
    // charges the interceptor's guard slot when the current source has Pressure.
    if (b.traits.ability(c.actorSeat) === "pressure") {
      const slot = b
        .movesFor(seat)
        .find((slot) => slot.id === (record.source.moveId || record.id));
      if (slot) slot.pp = Math.max(0, slot.pp - 1);
    }
    const replacement = b.moves.context(
      seat,
      target.kind === "self" ? seat : target.id,
      c.move,
      c.definition,
    );
    replacement.action = {
      ...c.action,
      seat,
      actor: b.roster.occupant(seat).uid,
    };
    return executeCalledMove(replacement, c.move.id, { target });
  }
}
