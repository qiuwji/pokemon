import { readOnly } from "../extensions/values.js";
import { PHYSICAL_TYPES } from "../model.js";
/** Owns scheduled actions and bounded history. Effect definitions describe policy, never the round loop. */
export class BattleActionLifecycle {
  constructor(battle) {
    this.battle = battle;
    this.locks = new Map();
    this.delayed = [];
    this.history = [];
    this.sequence = 0;
    this.received = new Map();
  }
  locked(seat) {
    const r = this.locks.get(seat),
      m = this.battle.roster.occupant(seat);
    return m?.hp > 0 && r?.actor === m.uid ? r : null;
  }
  continuation(seat) {
    const lock = this.locked(seat);
    if (!lock) return null;
    return {
      kind: lock.kind === "recharge" ? "wait" : "move",
      seat,
      actor: lock.actor,
      index: lock.index,
      target: lock.target,
      continuation: true,
      overrideMove: lock.moveId,
    };
  }
  clear(seat) {
    this.locks.delete(seat);
  }
  clearAll() {
    this.locks.clear();
    this.delayed = [];
    this.received.clear();
  }
  begin(action, c) {
    const b = this.battle,
      policy = c.definition.action,
      lock = this.locked(action.seat);
    if (lock && action.continuation) {
      if (lock.kind === "charge") {
        this.clear(action.seat);
        return { skipPP: true };
      }
      return { skipPP: true };
    }
    if (!policy) return {};
    if (
      policy.kind === "charge" &&
      !(policy.skipWeather && b.traits.weather() === policy.skipWeather)
    ) {
      this.locks.set(action.seat, {
        kind: "charge",
        actor: c.mon.uid,
        index: action.index,
        target: action.target || null,
        remaining: 1,
        hidden: policy.hiddenByMove?.[c.move.id] || policy.hidden || null,
        moveId: c.move.id,
      });
      return { charging: true };
    }
    return {};
  }
  after(action, c, successful) {
    const b = this.battle,
      policy = c.definition.action,
      lock = this.locked(action.seat);
    if (lock && action.continuation && lock.kind === "repeat") {
      if (--lock.remaining <= 0) {
        this.clear(action.seat);
        if (policy?.confuseAfter) b.applyConfusion(action.seat, action.seat);
      }
    } else if (policy?.kind === "repeat" && successful && !lock) {
      const total =
        policy.minTurns + b.rng.int(policy.maxTurns - policy.minTurns + 1);
      this.locks.set(action.seat, {
        kind: "repeat",
        actor: c.mon.uid,
        index: action.index,
        target: action.target || null,
        remaining: total - 1,
        moveId: c.move.id,
      });
    } else if (policy?.kind === "recharge" && successful) {
      this.locks.set(action.seat, {
        kind: "recharge",
        actor: c.mon.uid,
        index: action.index,
        remaining: 1,
        moveId: c.move.id,
      });
    }
    this.record(action, c.move.id, successful);
  }
  wait(action) {
    this.clear(action.seat);
    this.battle.emit("正在恢复力量，无法行动。", "wait", {
      actorSeat: action.seat,
    });
    this.record(action, null, true);
  }
  record(action, moveId, successful) {
    this.history.push({
      turn: this.battle.turn,
      actionId: action.actionId || null,
      seat: action.seat,
      uid:
        action.actor || this.battle.roster.occupant(action.seat)?.uid || null,
      moveId,
      target: action.target || null,
      successful,
    });
    if (this.history.length > 64) this.history.shift();
  }
  lastMove(seat, { successful = true } = {}) {
    return (
      [...this.history]
        .reverse()
        .find(
          (r) =>
            r.seat === seat &&
            r.uid === this.battle.roster.occupant(seat)?.uid &&
            r.moveId &&
            (!successful || r.successful),
        )?.moveId || null
    );
  }
  recordDamage(c, amount) {
    if (amount <= 0 || c.actorSeat === c.targetSeat) return;
    const category = PHYSICAL_TYPES.has(c.move.type) ? "physical" : "special";
    const record = {
      turn: this.battle.turn,
      sourceSeat: c.actorSeat,
      sourceUid: c.mon.uid,
      moveId: c.move.id,
      amount,
      lethal: c.opponent.hp === 0,
      category,
    };
    this.received.set(c.opponent.uid, {
      ...this.received.get(c.opponent.uid),
      [category]: record,
      last: record,
    });
  }
  damageFor(seat, category = "last") {
    const b = this.battle,
      uid = b.roster.occupant(seat)?.uid,
      r = this.received.get(uid)?.[category];
    return r?.turn === b.turn ? r : null;
  }
  retaliation(seat, category) {
    const b = this.battle,
      r = this.damageFor(seat, category),
      source = r && b.roster.occupant(r.sourceSeat);
    return source?.hp > 0 &&
      source.uid === r.sourceUid &&
      b.roster.isOpposing(seat, r.sourceSeat)
      ? r
      : null;
  }
  replace(action, moveId) {
    if (
      !this.battle.db.moves[moveId] ||
      !this.battle.moveEffects.supports(this.battle.db.moves[moveId].effect)
    )
      throw new Error("Invalid action replacement");
    return { ...action, overrideMove: moveId };
  }
  hidden(seat) {
    return this.locked(seat)?.hidden || null;
  }
  schedule({ targetSeat, sourceSeat, move, amount, delay = 3 }) {
    const b = this.battle;
    b.roster.seat(targetSeat);
    b.roster.seat(sourceSeat);
    if (
      !Number.isInteger(amount) ||
      amount < 0 ||
      !Number.isInteger(delay) ||
      delay < 1 ||
      delay > 10000
    )
      throw new Error("Invalid delayed attack");
    if (this.delayed.some((r) => r.targetSeat === targetSeat)) return false;
    this.delayed.push({
      id: `delayed:${++this.sequence}`,
      targetSeat,
      sourceSeat,
      sourceUid: b.roster.occupant(sourceSeat)?.uid || null,
      move: { ...move },
      amount,
      due: b.turn + delay - 1,
    });
    b.emit("预知的攻击将在之后到达！", "scheduled", {
      actorSeat: sourceSeat,
      targetSeat,
      moveId: move.id,
      due: b.turn + delay - 1,
    });
    return true;
  }
  settle() {
    const b = this.battle,
      due = this.delayed.filter((r) => r.due <= b.turn);
    this.delayed = this.delayed.filter((r) => r.due > b.turn);
    for (const r of due) {
      if (b.ended) break;
      const target = b.roster.occupant(r.targetSeat);
      if (!(target?.hp > 0)) continue;
      b.phase = "delayed";
      if (!b.rules.accuracy({ move: r.move, stages: 0, rng: b.rng })) {
        b.emit("延迟攻击没有命中！", "failed", {
          targetSeat: r.targetSeat,
          moveId: r.move.id,
        });
        continue;
      }
      const amount = Math.min(
        target.hp,
        Math.max(1, Math.floor((r.amount * (85 + b.rng.int(16))) / 100)),
      );
      const impact = {
        actorSeat: r.sourceSeat,
        targetSeat: r.targetSeat,
        move: r.move,
        amount,
        allowed: true,
      };
      b.traits.run("damage", impact);
      target.hp -= impact.amount;
      b.emit("预知的攻击命中了！", "hurt", {
        actorSeat: r.sourceSeat,
        targetSeat: r.targetSeat,
        sourceUid: r.sourceUid,
        actorUid: r.sourceUid,
        moveId: r.move.id,
        moveType: r.move.type,
        amount: impact.amount,
        delayedId: r.id,
      });
      b.traits.run("after-hit", { ...impact, amount: impact.amount, hit: 1 });
      b.outcomes.observe();
    }
  }
  view() {
    return readOnly({
      locks: [...this.locks.entries()].map(([seat, lock]) => ({
        seat,
        ...lock,
      })),
      delayed: this.delayed.map(({ move, ...r }) => ({
        ...r,
        moveId: move.id,
      })),
      received: [...this.received.entries()].map(([uid, records]) => ({
        uid,
        ...records,
      })),
      history: this.history,
    });
  }
}
export function validateActionPolicy(policy) {
  if (
    !policy ||
    !["charge", "repeat", "recharge"].includes(policy.kind) ||
    Object.keys(policy).some(
      (k) =>
        ![
          "kind",
          "minTurns",
          "maxTurns",
          "confuseAfter",
          "hidden",
          "skipWeather",
          "hiddenByMove",
        ].includes(k),
    )
  )
    throw new Error("Invalid move action policy");
  if (
    policy.kind === "repeat" &&
    (!Number.isInteger(policy.minTurns) ||
      !Number.isInteger(policy.maxTurns) ||
      policy.minTurns < 2 ||
      policy.maxTurns < policy.minTurns ||
      policy.maxTurns > 10)
  )
    throw new Error("Invalid repeated action turns");
  if (
    policy.hiddenByMove &&
    Object.values(policy.hiddenByMove).some(
      (v) => !["air", "underground", "underwater"].includes(v),
    )
  )
    throw new Error("Invalid concealed move map");
  if (
    policy.hidden !== undefined &&
    !["air", "underground", "underwater"].includes(policy.hidden)
  )
    throw new Error("Invalid concealed state");
  if (
    policy.skipWeather !== undefined &&
    !["sun", "rain", "sand", "hail"].includes(policy.skipWeather)
  )
    throw new Error("Invalid charging weather");
  if (
    policy.confuseAfter !== undefined &&
    typeof policy.confuseAfter !== "boolean"
  )
    throw new Error("Invalid repeat confusion");
}
