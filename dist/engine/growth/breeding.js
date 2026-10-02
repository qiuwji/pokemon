import { createMonster, calculateStats } from "../model.js";
const inheritanceStats = ["hp", "atk", "def", "spe", "spa", "spd"];
/** Breeding policy is data driven; special offspring and inheritance belong to the supplied species rules. */
export class BreedingService {
  constructor({ db, rng, rules = {} }) {
    Object.assign(this, { db, rng });
    this.rules = { ivInheritance: "emerald", ...rules };
  }
  compatibility(a, b) {
    if (!a || !b || a.uid === b.uid || a.egg || b.egg) return 0;
    const ga = this.db.species[a.species]?.eggGroups,
      gb = this.db.species[b.species]?.eggGroups;
    if (
      !ga ||
      !gb ||
      ga.includes("no_eggs_discovered") ||
      gb.includes("no_eggs_discovered")
    )
      return 0;
    const da = ga.includes("ditto"),
      db = gb.includes("ditto");
    if (da && db) return 0;
    const sameTrainer =
      (a.originalTrainer ?? "player") === (b.originalTrainer ?? "player");
    if (da || db) return sameTrainer ? 20 : 50;
    if (
      !["♀", "♂"].includes(a.gender) ||
      !["♀", "♂"].includes(b.gender) ||
      a.gender === b.gender ||
      !ga.some((g) => gb.includes(g))
    )
      return 0;
    return a.species === b.species
      ? sameTrainer
        ? 50
        : 70
      : sameTrainer
        ? 20
        : 50;
  }
  parents(a, b) {
    if (this.db.species[a.species].eggGroups.includes("ditto"))
      return {
        base: b,
        father: b.gender === "♀" ? a : b,
        mother: b.gender === "♀" ? b : a,
        nature: a,
      };
    if (this.db.species[b.species].eggGroups.includes("ditto"))
      return {
        base: a,
        father: a.gender === "♀" ? b : a,
        mother: a.gender === "♀" ? a : b,
        nature: b,
      };
    const mother = a.gender === "♀" ? a : b;
    return {
      base: mother,
      mother,
      father: mother === a ? b : a,
      nature: mother,
    };
  }
  baseSpecies(id) {
    const visited = new Set();
    while (!visited.has(id)) {
      visited.add(id);
      const explicit = this.db.species[id].offspring?.base;
      if (explicit) {
        id = explicit;
        continue;
      }
      const parent = Object.entries(this.db.evolutions || {}).find(
        ([, rules]) =>
          (Array.isArray(rules) ? rules : [rules]).some((r) => r.to === id),
      );
      if (!parent) return id;
      id = parent[0];
    }
    throw new Error("Cyclic offspring lineage");
  }
  create(a, b) {
    if (!this.compatibility(a, b))
      throw new Error("Incompatible breeding parents");
    if (
      [a, b].some(
        (mon) =>
          !Number.isInteger(mon.nature) ||
          mon.nature < 0 ||
          mon.nature > 24 ||
          inheritanceStats.some(
            (k) =>
              !Number.isInteger(mon.iv[k]) || mon.iv[k] < 0 || mon.iv[k] > 31,
          ) ||
          mon.moves.some((m) => !this.db.moves[m.id]),
      )
    )
      throw new Error("Invalid breeding parent");
    const parents = this.parents(a, b),
      base = this.baseSpecies(parents.base.species),
      rule = this.db.species[base].offspring || {};
    const ids = [
      base,
      ...(rule.variants || []),
      ...(rule.incense ? [rule.incense.without] : []),
    ];
    for (const id of ids) {
      const species = this.db.species[id];
      if (
        !species ||
        !Number.isInteger(species.eggCycles) ||
        species.eggCycles < 0 ||
        [
          ...(species.eggMoves || []),
          ...(species.machineMoves || []),
          ...species.learnset.map((e) => e.move),
        ].some((m) => !this.db.moves[m])
      )
        throw new Error("Invalid offspring definition");
    }
    if (rule.specialMove && !this.db.moves[rule.specialMove.move])
      throw new Error("Unknown special inherited move");
    // Validate every possible offspring before the first RNG draw.
    let id = rule.variants?.length
      ? [base, ...rule.variants][this.rng.int(rule.variants.length + 1)]
      : base;
    if (rule.incense && ![a, b].some((m) => m.heldItem === rule.incense.item))
      id = rule.incense.without;
    const egg = createMonster(id, 5, this.db, this.rng),
      species = this.db.species[id];
    const available = [...inheritanceStats],
      selected = [];
    for (let i = 0; i < 3; i++) {
      const index = this.rng.int(available.length);
      selected.push(available[index]);
      // Emerald deliberately removes positions 0 then 1, so a selected IV may repeat. An alternate ruleset can fix it.
      available.splice(this.rules.ivInheritance === "emerald" ? i : index, 1);
    }
    const inheritedParents = selected.map(() => this.rng.int(2));
    selected.forEach((stat, i) => {
      egg.iv[stat] = [a, b][inheritedParents[i]].iv[stat];
    });
    if (parents.nature.heldItem === "everstone" && this.rng.int(2) === 0) {
      egg.nature = parents.nature.nature;
      egg.personality =
        (egg.personality - (egg.personality % 25) + egg.nature) >>> 0;
    }
    const moves = egg.moves.map((m) => m.id);
    const add = (id) => {
      if (!moves.includes(id)) {
        moves.push(id);
        if (moves.length > 4) moves.shift();
      }
    };
    const father = parents.father.moves.map((m) => m.id),
      mother = parents.mother.moves.map((m) => m.id);
    for (const move of father) if (species.eggMoves?.includes(move)) add(move);
    for (const move of father)
      if (species.machineMoves?.includes(move)) add(move);
    for (const move of father)
      if (
        mother.includes(move) &&
        species.learnset.some((e) => e.move === move)
      )
        add(move);
    if (
      rule.specialMove &&
      [a, b].some((m) => m.heldItem === rule.specialMove.item)
    )
      add(rule.specialMove.move);
    egg.moves = moves.map((id) => ({ id, pp: this.db.moves[id].pp }));
    egg.stats = calculateStats(egg, species);
    egg.hp = egg.stats.hp;
    egg.heldItem = null;
    egg.egg = {
      cycles: species.eggCycles,
      ready: false,
      parents: [a.uid, b.uid],
    };
    egg.friendship = 0;
    return egg;
  }
}
