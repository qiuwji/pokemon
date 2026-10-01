import { selectedMove } from "./moves.js";
/** One scheduler for singles, doubles and local multiple alliances. No content or presentation dependencies. */
export class RoundResolver {
  constructor(battle) {
    this.battle = battle;
  }
  resolve(humanActions) {
    const b = this.battle;
    const actions = [
      ...humanActions,
      ...b.roster
        .occupied()
        .filter((s) => b.roster.owner(s.id).kind === "ai")
        .map((s) => {
          const action = b.actions.prepare(b.ai(b, s.id), s.id);
          if (action.error)
            throw new Error(`Invalid AI decision for ${s.id}: ${action.error}`);
          return { ...action, actionId: `action:${++b.actionSequence}` };
        }),
    ];
    b.turn++;
    b.conditions.startRound();
    const order = this.order(actions);
    for (const action of order) {
      if (b.ended) break;
      const mon = b.roster.occupant(action.seat);
      if (!mon || mon.hp <= 0 || mon.uid !== action.actor) continue;
      b.actionId = action.actionId;
      b.phase = "action";
      if (action.kind === "move") b.moves.execute(action);
      if (action.kind === "switch") b.actions.switch(action.seat, action.index);
      if (action.kind === "item") b.actions.item(action);
      if (action.kind === "run") b.actions.run(action);
      b.outcomes.observe();
    }
    if (!b.ended) this.residuals();
    b.actionId = null;
    b.outcomes.vacancies();
  }
  order(actions) {
    const b = this.battle;
    const priority = (a) =>
      a.kind === "switch"
        ? 7
        : a.kind === "move"
          ? selectedMove(b, a.seat, a.index).priority
          : 6;
    // Stable sorting never calls RNG from a comparator. Consume it only for genuine speed/priority ties.
    const scored = actions.map((action, index) => ({
      action,
      index,
      priority: priority(action),
      speed: b.speed(b.roster.occupant(action.seat), action.seat),
      tie: 0,
    }));
    const groups = new Map();
    for (const entry of scored) {
      const key = `${entry.priority}:${entry.speed}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
    for (const group of groups.values())
      if (group.length > 1)
        for (let i = group.length - 1; i > 0; i--) {
          const j = b.rng.int(i + 1);
          [group[i], group[j]] = [group[j], group[i]];
        }
    for (const group of groups.values())
      group.forEach((entry, i) => (entry.tie = i));
    return scored
      .sort(
        (a, c) =>
          c.priority - a.priority ||
          c.speed - a.speed ||
          a.tie - c.tie ||
          a.index - c.index,
      )
      .map((e) => e.action);
  }
  residuals() {
    const b = this.battle;
    for (const seat of b.roster.occupied()) {
      const mon = b.roster.occupant(seat.id),
        state = b.conditions.get(seat.id);
      if (!(mon?.hp > 0)) continue;
      b.phase = "round-end";
      b.actionId = null;
      if (["poison", "burn"].includes(mon.status)) {
        mon.hp = Math.max(
          0,
          mon.hp -
            Math.max(1, Math.floor(mon.stats.hp / b.rules.residualDivisor)),
        );
        b.emit(
          `${b.name(mon)} 受到了${mon.status === "poison" ? "中毒" : "灼伤"}伤害！`,
          "hurt",
          { targetSeat: seat.id },
        );
        b.outcomes.observe();
        if (b.ended) break;
      }
      if (mon.hp > 0 && state.traps > 0) {
        state.traps--;
        mon.hp = Math.max(
          0,
          mon.hp - Math.max(1, Math.floor(mon.stats.hp / b.rules.trapDivisor)),
        );
        b.emit(`${b.name(mon)} 受到了持续伤害！`, "hurt", {
          targetSeat: seat.id,
        });
        b.outcomes.observe();
        if (b.ended) break;
      }
    }
  }
}
