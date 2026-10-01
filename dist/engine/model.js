// Portable RPG domain layer: no browser, DOM, or game-specific story dependencies.
export const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
export class Random {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n) {
    return Math.floor(this.next() * n);
  }
}
export function experienceAt(level, growth) {
  if (level <= 1) return 0;
  if (growth === "medium_slow")
    return Math.max(
      0,
      Math.floor((6 * level ** 3) / 5 - 15 * level ** 2 + 100 * level - 140),
    );
  if (growth === "fast") return Math.floor((4 * level ** 3) / 5);
  if (growth === "slow") return Math.floor((5 * level ** 3) / 4);
  return level ** 3;
}
export function natureMultiplier(nature, stat) {
  const order = ["atk", "def", "spe", "spa", "spd"];
  const up = Math.floor(nature / 5),
    down = nature % 5;
  if (up === down) return 1;
  return stat === order[up] ? 1.1 : stat === order[down] ? 0.9 : 1;
}
export function calculateStats(mon, species) {
  const result = {};
  for (const k of STAT_KEYS) {
    const v = Math.floor(
      ((2 * species.stats[k] + mon.iv[k] + Math.floor(mon.ev[k] / 4)) *
        mon.level) /
        100,
    );
    result[k] =
      k === "hp"
        ? v + mon.level + 10
        : Math.floor((v + 5) * natureMultiplier(mon.nature, k));
  }
  return result;
}
export function createMonster(id, level, db, rng, { trainer = false } = {}) {
  const spec = db.species[id];
  if (!spec) throw new Error(`Unknown species ${id}`);
  const mon = {
    uid: `${rng.seed.toString(36)}-${rng.int(1e9)}`,
    species: id,
    level,
    exp: experienceAt(level, spec.growth),
    nature: rng.int(25),
    gender: rng.next() < (spec.femaleRatio ?? 0.5) ? "♀" : "♂",
    iv: {},
    ev: {},
    status: null,
    sleep: 0,
    moves: [],
    ability: spec.abilities[0],
  };
  for (const k of STAT_KEYS) {
    mon.iv[k] = trainer ? 0 : rng.int(32);
    mon.ev[k] = 0;
  }
  const known = [
    ...new Set(
      spec.learnset.filter((x) => x.level <= level).map((x) => x.move),
    ),
  ].slice(-4);
  mon.moves = known.map((id) => ({ id, pp: db.moves[id].pp }));
  mon.stats = calculateStats(mon, spec);
  mon.hp = mon.stats.hp;
  return mon;
}
export function healMonster(mon, db) {
  mon.hp = mon.stats.hp;
  mon.status = null;
  mon.sleep = 0;
  for (const move of mon.moves) move.pp = db.moves[move.id].pp;
}
export function grantExperience(mon, amount, defeated, db) {
  const events = [];
  mon.exp += amount;
  for (const k of STAT_KEYS) {
    const total = Object.values(mon.ev).reduce((a, b) => a + b, 0);
    mon.ev[k] = Math.min(
      255,
      mon.ev[k] + Math.min(defeated.evYield[k] || 0, Math.max(0, 510 - total)),
    );
  }
  while (
    mon.level < 100 &&
    mon.exp >= experienceAt(mon.level + 1, db.species[mon.species].growth)
  ) {
    const before = mon.stats.hp;
    mon.level++;
    mon.stats = calculateStats(mon, db.species[mon.species]);
    mon.hp += mon.stats.hp - before;
    events.push({
      kind: "level",
      text: `${db.species[mon.species].name} 升到了 ${mon.level} 级！`,
    });
    for (const entry of db.species[mon.species].learnset.filter(
      (x) => x.level === mon.level,
    )) {
      if (mon.moves.some((x) => x.id === entry.move)) continue;
      if (mon.moves.length < 4) {
        mon.moves.push({ id: entry.move, pp: db.moves[entry.move].pp });
        events.push({
          kind: "learn",
          text: `学会了 ${db.moves[entry.move].name}！`,
        });
      } else {
        mon.pendingMoves ??= [];
        if (!mon.pendingMoves.includes(entry.move))
          mon.pendingMoves.push(entry.move);
      }
    }
  }
  return events;
}
export const stageMultiplier = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
export const accuracyMultiplier = (s) => (s >= 0 ? (3 + s) / 3 : 3 / (3 - s));
export const PHYSICAL_TYPES = new Set([
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
]);
export function effectiveness(type, types, chart) {
  return types.reduce((v, t) => v * (chart[type]?.[t] ?? 1), 1);
}
export function damage(
  attacker,
  defender,
  move,
  db,
  rng,
  { aStages = {}, dStages = {}, critical = false, power = move.power } = {},
) {
  const physical = PHYSICAL_TYPES.has(move.type),
    a = physical ? "atk" : "spa",
    d = physical ? "def" : "spd";
  let atk = Math.floor(
    attacker.stats[a] *
      stageMultiplier(
        critical ? Math.max(0, aStages[a] || 0) : aStages[a] || 0,
      ),
  );
  let def = Math.floor(
    defender.stats[d] *
      stageMultiplier(
        critical ? Math.min(0, dStages[d] || 0) : dStages[d] || 0,
      ),
  );
  if (physical && attacker.status && attacker.ability === "guts")
    atk = Math.floor(atk * 1.5);
  else if (physical && attacker.status === "burn")
    atk = Math.max(1, Math.floor(atk / 2));
  if (
    attacker.hp <= Math.floor(attacker.stats.hp / 3) &&
    { overgrow: "grass", blaze: "fire", torrent: "water" }[attacker.ability] ===
      move.type
  )
    power = Math.floor(power * 1.5);
  const type = effectiveness(
    move.type,
    db.species[defender.species].types,
    db.typeChart,
  );
  if (type === 0) return { amount: 0, type, critical };
  let v = Math.floor(
    Math.floor(
      Math.floor(
        ((Math.floor((2 * attacker.level) / 5) + 2) * power * atk) /
          Math.max(1, def),
      ) / 50,
    ) + 2,
  );
  if (critical) v *= 2;
  if (db.species[attacker.species].types.includes(move.type))
    v = Math.floor(v * 1.5);
  for (const t of db.species[defender.species].types)
    v = Math.floor(v * (db.typeChart[move.type]?.[t] ?? 1));
  v = Math.floor((v * (85 + rng.int(16))) / 100);
  return { amount: Math.max(1, v), type, critical };
}
export function captureCheck(mon, species, rng, ballBonus = 1) {
  let a = Math.floor(
    (Math.floor(species.catchRate * ballBonus) *
      (3 * mon.stats.hp - 2 * mon.hp)) /
      (3 * mon.stats.hp),
  );
  if (mon.status === "sleep" || mon.status === "freeze") a *= 2;
  else if (mon.status) a = Math.floor(a * 1.5);
  if (a >= 255) return { caught: true, shakes: 4 };
  if (a <= 0) return { caught: false, shakes: 0 };
  const b = Math.floor(
    1048560 /
      Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / a))))),
  );
  let shakes = 0;
  while (shakes < 4 && rng.int(65536) < b) shakes++;
  return { caught: shakes === 4, shakes };
}
