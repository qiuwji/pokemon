import { selectedMove } from "./moves.js";
/** One scheduler for singles, doubles and local multiple alliances. No content or presentation dependencies. */
export class RoundResolver {
  constructor(battle) {
    this.battle = battle;
    this.queue = [];
    this.running = false;
  }
  resolve(humanActions) {
    const b = this.battle;
    if (this.running) throw new Error("An unresolved round cannot be replaced");
    const actions = [
      ...humanActions,
      ...b.roster
        .occupied()
        .filter((s) => b.roster.owner(s.id).kind === "human")
        .flatMap((s) => {
          const a = b.actionLifecycle.continuation(s.id);
          return a ? [{ ...a, actionId: `action:${++b.actionSequence}` }] : [];
        }),
      ...b.roster
        .occupied()
        .filter((s) => b.roster.owner(s.id).kind === "ai")
        .map((s) => {
          const continuation = b.actionLifecycle.continuation(s.id);
          if (continuation)
            return {
              ...continuation,
              actionId: `action:${++b.actionSequence}`,
            };
          const action = b.actions.prepare(b.ai(b, s.id), s.id);
          if (action.error)
            throw new Error(`Invalid AI decision for ${s.id}: ${action.error}`);
          return { ...action, actionId: `action:${++b.actionSequence}` };
        }),
    ];
    b.turn++;
    b.actionLifecycle.received.clear();
    b.conditions.startRound();
    const order = this.order(actions);
    b.turnOrder = order.map((a) => a.seat);
    for (const action of order) {
      if (action.kind !== "move") continue;
      const move = action.overrideMove
        ? b.db.moves[action.overrideMove]
        : selectedMove(b, action.seat, action.index);
      const preparation = b.moveEffects.get(move.effect).preparation;
      if (preparation)
        b.emit(preparation, "prepare", {
          actorSeat: action.seat,
          moveId: move.id || b.movesFor(action.seat)[action.index]?.id,
        });
    }
    this.queue = order;
    this.running = true;
    this.resume();
  }
  clear() {
    this.queue = [];
    this.running = false;
  }
  resume() {
    const b = this.battle;
    if (b.replacements.required().length) return;
    if (!this.running) {
      b.outcomes.vacancies();
      return;
    }
    while (this.queue.length && !b.ended) {
      const action = this.queue.shift();
      const mon = b.roster.occupant(action.seat);
      if (!mon || mon.hp <= 0 || mon.uid !== action.actor) continue;
      b.actionId = action.actionId;
      b.traits?.run("action", { actorSeat: action.seat, action });
      b.phase = "action";
      if (action.kind === "move") b.moves.execute(action);
      if (action.kind === "switch") b.actions.switch(action.seat, action.index);
      if (action.kind === "item") b.actions.item(action);
      if (action.kind === "run") b.actions.run(action);
      if (action.kind === "wait") b.actionLifecycle.wait(action);
      if (action.kind !== "move" && action.kind !== "wait")
        b.actionLifecycle.record(action, null, true);
      b.outcomes.observe();
      if (b.replacements.required().length) return;
    }
    if (!b.ended) this.residuals();
    b.actionId = null;
    b.outcomes.vacancies();
    this.clear();
  }
  order(actions) {
    const b = this.battle;
    const priority = (a) =>
      a.kind === "switch"
        ? 7
        : a.kind === "move"
          ? (a.overrideMove
              ? b.db.moves[a.overrideMove]
              : selectedMove(b, a.seat, a.index)
            ).priority
          : a.kind === "wait"
            ? 0
            : 6;
    // Stable sorting never calls RNG from a comparator. Consume it only for genuine speed/priority ties.
    const orderRoll = b.traits?.hasActive("action-order")
      ? b.rng.int(100)
      : 100;
    const scored = actions.map((action, index) => ({
      action,
      index,
      priority: priority(action),
      quick:
        b.traits?.calculate("action-order", 0, {
          actorSeat: action.seat,
          orderRoll,
        }) || 0,
      speed: b.speed(b.roster.occupant(action.seat), action.seat),
      tie: 0,
    }));
    const groups = new Map();
    for (const entry of scored) {
      const key = `${entry.priority}:${entry.quick}:${entry.speed}`;
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
          c.quick - a.quick ||
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
      b.statuses.residual(seat.id);
      b.outcomes.observe();
      if (b.ended) break;
      if (mon.hp > 0) {
        const weather = b.traits?.weather();
        const residual = weather
          ? b.weatherRegistry.get(weather).residual
          : null;
        const immune = residual?.immuneTypes.some((t) =>
          b.traits.types(seat.id).includes(t),
        );
        const weatherPermission = {
          actorSeat: seat.id,
          weather,
          allowed: true,
        };
        b.traits?.run("weather-immunity", weatherPermission);
        if (residual && !immune && weatherPermission.allowed) {
          mon.hp = Math.max(
            0,
            mon.hp - Math.max(1, Math.floor(mon.stats.hp / residual.divisor)),
          );
          b.emit("受到了天气伤害！", "hurt", { targetSeat: seat.id });
          b.outcomes.observe();
          if (b.ended) break;
        }
        if (mon.hp > 0)
          b.traits?.run("round-end", {
            ownerSeat: seat.id,
            actorSeat: seat.id,
          });
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
    if (!b.ended) b.actionLifecycle.settle();
    if (!b.ended) b.states.tick();
    if (b.weather?.turns && --b.weather.turns === 0) {
      b.weather = null;
      b.emit("天气恢复了平静。", "weather");
    }
  }
}
