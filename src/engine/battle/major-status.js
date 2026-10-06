import { STATUSES } from "../creature-contract.js";
import { clearStatus, statusCategory } from "../creatures/status.js";
/** Owns major-status transitions and their battle-local counters; persistence stores only the condition. */
export class BattleMajorStatus {
  constructor(battle) {
    this.battle = battle;
  }
  apply(seat, status, { sourceSeat = seat, sourceKind = "move" } = {}) {
    if (!STATUSES.includes(status)) throw new Error("Invalid major status");
    const b = this.battle,
      targetSeat = b.seatId(seat),
      target = b.roster.occupant(targetSeat);
    if (!(target?.hp > 0)) return false;
    const permission = {
      targetSeat,
      sourceSeat: b.seatId(sourceSeat),
      sourceKind,
      status: statusCategory(status),
      majorStatus: status,
      allowed: b.rules.statusAllowed({
        status: statusCategory(status),
        target,
        types: b.traits.types(targetSeat),
      }),
    };
    b.traits.run("status-check", permission);
    if (!permission.allowed) return false;
    target.status = status;
    target.sleep = status === "sleep" ? 2 + b.rng.int(4) : 0;
    if (status === "toxic")
      b.states.attach("toxic_counter", targetSeat, {
        sourceSeat: permission.sourceSeat,
        data: { turns: 0 },
      });
    b.emit("陷入了异常状态！", "status", {
      targetSeat,
      status,
      message: { id: "status-inflicted", params: { status } },
    });
    b.traits.run("status-applied", permission);
    return true;
  }
  clear(mon) {
    clearStatus(mon);
    this.reconcile(mon);
  }
  reconcile(mon) {
    if (mon.status === "toxic") return;
    const b = this.battle,
      seat = b.roster.occupied().find((s) => b.roster.occupant(s.id) === mon);
    const r = seat && b.states.lookup("toxic_counter", seat.id);
    if (r) b.states.remove(r.key, "cured");
  }
  residual(seat) {
    const b = this.battle,
      mon = b.roster.occupant(seat);
    if (!["poison", "toxic", "burn"].includes(mon.status) || !(mon.hp > 0))
      return;
    let amount;
    if (mon.status === "toxic") {
      if (!b.states.lookup("toxic_counter", seat))
        b.states.attach("toxic_counter", seat, { data: { turns: 0 } });
      const r = b.states.lookup("toxic_counter", seat),
        turns = Math.min(15, r.data.turns + 1);
      b.states.update(r.key, { turns });
      amount = Math.max(1, Math.floor(mon.stats.hp / 16)) * turns;
    } else
      amount = Math.max(1, Math.floor(mon.stats.hp / b.rules.residualDivisor));
    mon.hp = Math.max(0, mon.hp - amount);
    b.emit(
      `${b.name(mon)} 受到了${mon.status === "burn" ? "灼伤" : "中毒"}伤害！`,
      "hurt",
      { targetSeat: seat, status: mon.status, amount },
    );
  }
}
