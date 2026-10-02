import { AttachedRules } from "../rules/attachments.js";
/** Ability and held-item attachments enter the same phase registry as global/plugin rules. */
export class BattleTraits {
  constructor(battle, { abilities = {}, heldItems = {}, hooks = [] } = {}) {
    this.battle = battle;
    this.abilities = abilities;
    this.heldItems = heldItems;
    this.runtime = new AttachedRules({
      definitions: {
        ability: abilities,
        heldItem: heldItems,
        battleState: battle.states.registry.definitions,
      },
      operations: battle.moveEffects.operations,
      hooks,
      owners: (...args) => this.owners(...args),
      context: (...args) => this.context(...args),
    });
    this.pipeline = this.runtime.pipeline;
    for (const owner of battle.roster.controllers.values())
      for (const mon of owner.party) {
        if (mon.ability && !abilities[mon.ability])
          throw new Error(`Unknown ability ${mon.ability}`);
        if (mon.heldItem && !heldItems[mon.heldItem])
          throw new Error(`Unknown held item ${mon.heldItem}`);
      }
  }
  owners(kind, id, hook, c) {
    const b = this.battle;
    if (kind === "battleState") return b.states.owners(id, hook, c);
    const candidates =
      hook.role === "actor"
        ? [c.actorSeat]
        : hook.role === "target"
          ? [c.targetSeat]
          : hook.role === "owner"
            ? [c.ownerSeat]
            : b.roster.occupied().map((s) => s.id);
    return [...new Set(candidates)].filter(
      (seat) =>
        seat &&
        (kind === "ability"
          ? this.ability(seat)
          : b.roster.occupant(seat)?.[kind]) === id &&
        !(kind === "ability"
          ? b.conditions.get(seat).suppressed
          : b.conditions.get(seat).itemSuppressed),
    );
  }
  context(c, ownerSeat, kind, id, phase) {
    const b = this.battle;
    const stateContext =
      kind === "battleState" ? b.states.context(ownerSeat, c) : null;
    if (stateContext) ownerSeat = stateContext.seat;
    const owner = b.roster.occupant(ownerSeat);
    const context = {
      ...c,
      ...(stateContext ? { battleState: stateContext.state } : {}),
      battle: b,
      weather: phase === "weather" ? b.weather?.kind || null : this.weather(),
      fieldCombatants: b.roster.occupied().map((s) => b.roster.occupant(s.id)),
      allies: b.roster
        .occupied()
        .filter(
          (s) => s.id !== ownerSeat && !b.roster.isOpposing(ownerSeat, s.id),
        )
        .map((s) => b.roster.occupant(s.id)),
      ownerSeat,
      owner,
      attachmentKind: kind,
      attachmentId: id,
      attachment:
        kind === "battleState"
          ? b.states.registry.get(id)
          : this[kind === "ability" ? "abilities" : "heldItems"][id],
      target: owner,
      targetSide: ownerSeat,
      emit: (text, event = "trait", extra = {}) =>
        b.emit(text, event, {
          actorSeat: ownerSeat,
          source: kind,
          sourceId: id,
          ...extra,
        }),
      consume: () => {
        if (kind !== "heldItem" || owner.heldItem !== id) return false;
        owner.heldItem = null;
        owner.consumedItem = id;
        b.emit(`${b.name(owner)} 的持有道具生效了！`, "item", {
          actorSeat: ownerSeat,
          sourceId: id,
        });
        return true;
      },
    };
    for (const key of [
      "allowed",
      "guaranteed",
      "redirected",
      "targetSeats",
      "reverseDrain",
      "amount",
      "substituteDamage",
      "substituteHit",
    ])
      Object.defineProperty(context, key, {
        get: () => c[key],
        set: (value) => {
          c[key] = value;
        },
        enumerable: true,
      });
    return context;
  }
  run(phase, c = {}) {
    this.battle.phase = phase;
    this.pipeline.run(phase, Object.assign(c, { battle: this.battle }));
  }
  calculate(phase, value, c = {}) {
    return this.pipeline.calculate(phase, value, { ...c, battle: this.battle });
  }
  effects(steps, c) {
    return this.pipeline.effects(steps, c);
  }
  enter(seat) {
    const visited = new Set();
    let ability = this.ability(seat);
    while (ability && !visited.has(ability)) {
      visited.add(ability);
      this.run("entry", { actorSeat: seat, targetSeat: seat, ownerSeat: seat });
      const next = this.ability(seat);
      if (next === ability) break;
      ability = next;
    }
  }
  ability(seat) {
    const mon = this.battle.roster.occupant(seat);
    return mon ? this.battle.forms.effective(mon).ability : null;
  }
  types(seat) {
    const mon = this.battle.roster.occupant(seat),
      state = this.battle.conditions.get(seat);
    return this.pipeline.transform(
      "types",
      state.types ||
        this.battle.forms.effective(mon).types ||
        this.battle.db.species[mon.species].types,
      { actorSeat: seat },
    );
  }
  form(seat) {
    const mon = this.battle.roster.occupant(seat);
    return this.pipeline.transform(
      "form",
      this.battle.forms.effective(mon).form || null,
      { actorSeat: seat },
    );
  }
  weather() {
    return this.pipeline.transform(
      "weather",
      this.battle.weather?.kind || null,
      {},
    );
  }
  hasActive(phase) {
    return [...this.battle.roster.occupied()].some((seat) => {
      const mon = this.battle.roster.occupant(seat.id);
      return [
        ["ability", this.abilities],
        ["heldItem", this.heldItems],
      ].some(([kind, catalog]) =>
        catalog[
          kind === "ability" ? this.ability(seat.id) : mon[kind]
        ]?.hooks.some((h) => h.phase === phase),
      );
    });
  }
}
