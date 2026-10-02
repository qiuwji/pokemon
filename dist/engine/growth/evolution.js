import { calculateStats } from "../model.js";
import { PartyTraits } from "../rules/party-traits.js";
import { GrowthConditions } from "./conditions.js";
const fingerprint = (mon) => JSON.stringify(mon);
/** Evolution is a checked plan followed by one commit. Animation and cancellation belong to its caller. */
export class EvolutionService {
  constructor({
    db,
    definitions = db.evolutions,
    abilities,
    heldItems,
    conditions = new GrowthConditions(),
  }) {
    Object.assign(this, { db, abilities, heldItems, conditions });
    this.plans = new WeakMap();
    this.definitions = {};
    for (const [species, value] of Object.entries(definitions || {})) {
      if (!db.species[species])
        throw new Error(`Unknown evolution origin ${species}`);
      const rules = Array.isArray(value)
        ? value
        : [
            {
              id: `${species}.level`,
              to: value.to,
              trigger: "level",
              conditions: [{ type: "level", value: value.level }],
            },
          ];
      for (const rule of rules) {
        if (
          typeof rule.id !== "string" ||
          !rule.id ||
          !db.species[rule.to] ||
          !["level", "item", "trade"].includes(rule.trigger)
        )
          throw new Error(`Invalid evolution rule ${species}`);
        conditions.validate(rule.conditions);
        if (rule.extra && !db.species[rule.extra])
          throw new Error("Unknown evolution extra species");
        for (const condition of rule.conditions)
          if (
            ["item", "heldItem"].includes(condition.type) &&
            !heldItems[condition.id]
          )
            throw new Error("Unknown evolution item");
      }
      this.definitions[species] = structuredClone(rules);
    }
  }
  prepare(
    mon,
    { trigger = "level", item = null, hour = 12, party = [mon], bag = {} } = {},
  ) {
    if (
      mon.egg ||
      !["level", "item", "trade"].includes(trigger) ||
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23
    )
      return null;
    if (trigger === "level" && mon.evolutionSkipped === mon.level) return null;
    const c = {
      mon,
      trigger,
      item,
      hour,
      party,
      bag,
      actorUid: mon.uid,
      allowed: true,
    };
    new PartyTraits({
      party,
      abilities: this.abilities,
      heldItems: this.heldItems,
    }).run("evolution-check", c);
    if (!c.allowed) return null;
    const matches = (this.definitions[mon.species] || []).filter(
      (rule) =>
        rule.trigger === trigger && this.conditions.test(rule.conditions, c),
    );
    const rule = matches.at(-1);
    if (
      !rule ||
      (trigger === "item" && !(Number.isInteger(bag[item]) && bag[item] > 0))
    )
      return null;
    const extra =
      rule.extra && party.length < 6 && bag.pokeball > 0 ? rule.extra : null;
    const plan = Object.freeze({
      uid: mon.uid,
      from: mon.species,
      to: rule.to,
      trigger,
      item,
      consumeHeld: !!rule.consumeHeld,
      extra,
    });
    this.plans.set(plan, {
      mon,
      party,
      bag,
      rule,
      fingerprint: fingerprint(mon),
      itemCount: bag[item],
      ballCount: bag.pokeball,
      partyUids: party.map((m) => m.uid).join("|"),
    });
    return plan;
  }
  commit(plan, { cancel = false } = {}) {
    const saved = this.plans.get(plan);
    if (!saved)
      return { ok: false, reason: "Unknown or completed evolution plan" };
    const { mon, party, bag } = saved;
    if (
      fingerprint(mon) !== saved.fingerprint ||
      saved.partyUids !== party.map((m) => m.uid).join("|") ||
      bag[plan.item] !== saved.itemCount ||
      bag.pokeball !== saved.ballCount
    )
      return { ok: false, reason: "Evolution conditions changed" };
    this.plans.delete(plan);
    if (cancel) {
      if (plan.trigger === "level") mon.evolutionSkipped = mon.level;
      return { ok: true, cancelled: true };
    }
    const oldHP = mon.stats.hp;
    const abilityIndex = Math.max(
      0,
      this.db.species[mon.species].abilities.indexOf(mon.ability),
    );
    mon.species = plan.to;
    mon.ability =
      this.db.species[plan.to].abilities[abilityIndex] ||
      this.db.species[plan.to].abilities[0];
    mon.stats = calculateStats(mon, this.db.species[plan.to]);
    mon.hp =
      mon.hp === 0
        ? 0
        : Math.max(1, Math.min(mon.stats.hp, mon.hp + mon.stats.hp - oldHP));
    delete mon.evolutionSkipped;
    if (plan.trigger === "item") bag[plan.item]--;
    if (plan.consumeHeld) mon.heldItem = null;
    for (const entry of this.db.species[plan.to].learnset.filter(
      (e) => e.level === mon.level,
    )) {
      if (
        mon.moves.some((m) => m.id === entry.move) ||
        mon.pendingMoves?.includes(entry.move)
      )
        continue;
      if (mon.moves.length < 4)
        mon.moves.push({ id: entry.move, pp: this.db.moves[entry.move].pp });
      else (mon.pendingMoves ??= []).push(entry.move);
    }
    let spawned = null;
    if (plan.extra) {
      spawned = structuredClone(mon);
      spawned.uid = `${mon.uid}:evolution:${plan.extra}`;
      spawned.species = plan.extra;
      spawned.ability = this.db.species[plan.extra].abilities[0];
      spawned.heldItem = null;
      spawned.stats = calculateStats(spawned, this.db.species[plan.extra]);
      spawned.hp = spawned.stats.hp;
      party.push(spawned);
      bag.pokeball--;
    }
    return {
      ok: true,
      kind: "evolution",
      uid: mon.uid,
      from: plan.from,
      to: plan.to,
      extraUid: spawned?.uid || null,
    };
  }
}
