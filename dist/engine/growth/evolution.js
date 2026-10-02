import { CREATION_POLICY } from "../rule-policy.js";
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
    hooks = [],
  }) {
    Object.assign(this, { db, abilities, heldItems, conditions, hooks });
    this.plans = new WeakMap();
    this.definitions = {};
    const ids = new Set();
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
          ids.has(rule.id) ||
          rule.to === species ||
          !db.species[rule.to] ||
          !["level", "item", "trade"].includes(rule.trigger)
        )
          throw new Error(`Invalid evolution rule ${species}`);
        ids.add(rule.id);
        conditions.validate(rule.conditions);
        if (
          rule.extra &&
          !db.species[
            typeof rule.extra === "string" ? rule.extra : rule.extra.species
          ]
        )
          throw new Error("Unknown evolution extra species");
        if (
          rule.extra &&
          typeof rule.extra !== "string" &&
          ((rule.extra.requiredItem && !heldItems[rule.extra.requiredItem]) ||
            (rule.extra.consumeItem !== undefined &&
              typeof rule.extra.consumeItem !== "boolean"))
        )
          throw new Error("Invalid extra evolution cost");
        for (const condition of rule.conditions)
          if (
            ["item", "heldItem"].includes(condition.type) &&
            !heldItems[condition.id]
          )
            throw new Error("Unknown evolution item");
      }
      this.definitions[species] = structuredClone(rules);
    }
    const visit = (id, path) => {
      if (path.has(id)) throw new Error("Cyclic evolution lineage");
      const next = new Set(path).add(id);
      for (const rule of this.definitions[id] || []) visit(rule.to, next);
    };
    for (const id of Object.keys(this.definitions)) visit(id, new Set());
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
      hooks: this.hooks,
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
    const extraRule = rule.extra
      ? typeof rule.extra === "string"
        ? { species: rule.extra }
        : rule.extra
      : null;
    const extra =
      extraRule &&
      party.length < 6 &&
      (!extraRule.requiredItem || bag[extraRule.requiredItem] > 0)
        ? extraRule.species
        : null;
    if (extra && party.some((m) => m.uid === `${mon.uid}:evolution:${extra}`))
      return null;
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
      extraRule,
      extraCost: extraRule?.requiredItem ? bag[extraRule.requiredItem] : null,
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
      bag.pokeball !== saved.ballCount ||
      (saved.extraRule?.requiredItem &&
        bag[saved.extraRule.requiredItem] !== saved.extraCost)
    )
      return { ok: false, reason: "Evolution conditions changed" };
    if (cancel) {
      this.plans.delete(plan);
      if (plan.trigger === "level") mon.evolutionSkipped = mon.level;
      return { ok: true, cancelled: true };
    }
    const draft = structuredClone(mon);
    const oldHP = draft.stats.hp;
    const abilityIndex = Math.max(
      0,
      this.db.species[draft.species].abilities.indexOf(draft.ability),
    );
    draft.species = plan.to;
    draft.gender = CREATION_POLICY.gender({
      species: this.db.species[plan.to],
      personality: draft.personality || 0,
    });
    draft.ability =
      this.db.species[plan.to].abilities[abilityIndex] ||
      this.db.species[plan.to].abilities[0];
    draft.stats = calculateStats(draft, this.db.species[plan.to]);
    draft.hp =
      draft.hp === 0
        ? 0
        : Math.max(
            1,
            Math.min(draft.stats.hp, draft.hp + draft.stats.hp - oldHP),
          );
    delete draft.evolutionSkipped;
    if (plan.consumeHeld) draft.heldItem = null;
    for (const entry of this.db.species[plan.to].learnset.filter(
      (e) => e.level === draft.level,
    )) {
      if (
        draft.moves.some((m) => m.id === entry.move) ||
        draft.pendingMoves?.includes(entry.move)
      )
        continue;
      if (draft.moves.length < 4)
        draft.moves.push({ id: entry.move, pp: this.db.moves[entry.move].pp });
      else (draft.pendingMoves ??= []).push(entry.move);
    }
    let spawned = null;
    if (plan.extra) {
      spawned = structuredClone(draft);
      spawned.uid = `${draft.uid}:evolution:${plan.extra}`;
      spawned.species = plan.extra;
      spawned.ability = this.db.species[plan.extra].abilities[0];
      spawned.heldItem = null;
      spawned.gender = CREATION_POLICY.gender({
        species: this.db.species[plan.extra],
        personality: spawned.personality || 0,
      });
      spawned.status = null;
      spawned.sleep = 0;
      delete spawned.pendingMoves;
      spawned.stats = calculateStats(spawned, this.db.species[plan.extra]);
      spawned.hp = spawned.stats.hp;
      if (draft.pendingMoves?.length) draft.growthCompanions = [spawned.uid];
    }
    // Stage every calculation and reference before changing the live creature or costs.
    for (const key of Object.keys(mon))
      if (!Object.hasOwn(draft, key)) delete mon[key];
    Object.assign(mon, draft);
    if (plan.trigger === "item") bag[plan.item]--;
    if (spawned) {
      party.push(spawned);
      if (saved.extraRule.consumeItem && saved.extraRule.requiredItem)
        bag[saved.extraRule.requiredItem]--;
    }
    this.plans.delete(plan);
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
