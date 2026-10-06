import { PartyTraits } from "./rules/party-traits.js";
import { createMonster, calculateStats } from "./model.js";
import { readOnly } from "./extensions/values.js";
/** Portable seeded encounter selection. A map supplies weights; party traits supply rule extensions. */
export class EncounterService {
  constructor({ db, rng, abilities, heldItems, hooks = [] }) {
    Object.assign(this, { db, rng, abilities, heldItems, hooks });
  }
  traits(party, onEvent = () => {}) {
    return new PartyTraits({
      party,
      abilities: this.abilities,
      heldItems: this.heldItems,
      hooks: this.hooks,
      onEvent,
    });
  }
  attempt({
    party,
    entries,
    rate,
    area = "land",
    weather = null,
    mode = "walk",
    repel = false,
    pyramid = false,
    checkRate = true,
    checkSelection = true,
    checkPermission = true,
  }) {
    if (!entries?.length || !party.length) return null;
    this.validateTable(entries, rate);
    const lead = party[0],
      traits = this.traits(party),
      context = {
        actorUid: lead.uid,
        entries,
        area,
        weather,
        pyramid,
        rng: this.rng,
        db: this.db,
      };
    let odds = rate * 16;
    if (["mach-bike", "acro-bike"].includes(mode))
      odds = Math.floor(odds * 0.8);
    odds =
      lead.egg || !checkRate
        ? odds
        : traits.calculate("encounter-rate", odds, lead, context);
    if (checkRate && this.rng.int(2880) >= Math.min(2880, Math.floor(odds)))
      return null;
    const { species: speciesId, level } = this.pick(
      traits,
      lead,
      context,
      checkSelection,
    );
    if (repel && level < (party.find((m) => m.hp > 0 && !m.egg)?.level || 0))
      return null;
    const permission = { ...context, level, allowed: true };
    if (!lead.egg && checkPermission)
      traits.run("encounter-permission", permission);
    if (!permission.allowed) return null;
    const mon = createMonster(speciesId, level, this.db, this.rng),
      species = this.db.species[speciesId];
    if (!lead.egg)
      mon.nature = traits.calculate(
        "creation-nature",
        mon.nature,
        lead,
        context,
      );
    const gender = { ...context, species, gender: mon.gender };
    if (!lead.egg) traits.run("creation-gender", gender);
    mon.gender = gender.gender;
    mon.stats = calculateStats(mon, species);
    mon.hp = mon.stats.hp;
    const held = species.heldItems;
    if (held?.common || held?.rare) {
      const common = lead.egg
          ? 50
          : traits.calculate("wild-held-rarity", 50, lead, {
              ...context,
              rarity: "common",
            }),
        rare = lead.egg
          ? 5
          : traits.calculate("wild-held-rarity", 5, lead, {
              ...context,
              rarity: "rare",
            }),
        roll = this.rng.int(100);
      mon.heldItem =
        held.common && held.common === held.rare
          ? held.common
          : roll < common
            ? held.common || null
            : roll < common + rare
              ? held.rare || null
              : null;
    }
    return mon;
  }
  validateTable(entries, rate) {
    if (!Number.isFinite(rate) || rate < 0)
      throw new Error("Invalid encounter rate");
    if (
      entries.some(
        (e) =>
          !this.db.species[e.species] ||
          !Number.isFinite(e.weight) ||
          e.weight <= 0 ||
          !Number.isInteger(e.min) ||
          e.min < 1 ||
          !Number.isInteger(e.max) ||
          e.max < e.min ||
          e.max > 100,
      )
    )
      throw new Error("Invalid encounter table");
  }
  pick(traits, lead, context, checkSelection) {
    const entries = context.entries;
    const pick = { ...context, selected: null };
    if (!lead.egg && checkSelection) traits.run("encounter-select", pick);
    let entry = pick.selected;
    if (!entry) {
      let roll = this.rng.int(entries.reduce((n, e) => n + e.weight, 0));
      entry = entries[entries.length - 1];
      for (const row of entries) {
        roll -= row.weight;
        if (roll < 0) {
          entry = row;
          break;
        }
      }
    }
    this.validateTable([entry], 0);
    let level = entry.min + this.rng.int(entry.max - entry.min + 1);
    if (!lead.egg)
      level = traits.calculate("encounter-level", level, lead, {
        ...context,
        min: entry.min,
        max: entry.max,
      });
    if (!Number.isInteger(level) || level < 1 || level > 100)
      throw new Error("Invalid encounter level");
    return readOnly({ species: entry.species, level });
  }
  /** Samples a species and level only; no creature identity, capture permission or rate roll. */
  sample({
    party,
    entries,
    area = "land",
    weather = null,
    pyramid = false,
    checkSelection = true,
  }) {
    if (!entries?.length || !party.length) return null;
    this.validateTable(entries, 0);
    const lead = party[0],
      traits = this.traits(party),
      context = {
        actorUid: lead.uid,
        entries,
        area,
        weather,
        pyramid,
        rng: this.rng,
        db: this.db,
      };
    return this.pick(traits, lead, context, checkSelection);
  }
  afterBattle(party, onEvent = () => {}) {
    this.traits(party, onEvent).run("after-battle", {
      rng: this.rng,
      db: this.db,
    });
  }
}
