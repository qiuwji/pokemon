import { calculateStats } from "./model.js";

/** Party commands are domain operations, usable without a browser. */
export function usePotion(state, index, amount = 20) {
  const mon = state.party[index];
  if (!state.bag.potion || !mon || mon.hp <= 0 || mon.hp >= mon.stats.hp)
    return false;
  state.bag.potion--;
  mon.hp = Math.min(mon.stats.hp, mon.hp + amount);
  return true;
}
export function setLead(state, index) {
  if (!state.party[index]) return false;
  [state.party[0], state.party[index]] = [state.party[index], state.party[0]];
  return true;
}
export function learnPendingMove(mon, index, db) {
  const id = mon.pendingMoves?.[0];
  if (!id) return false;
  if (index !== null) {
    if (!Number.isInteger(index) || !mon.moves[index]) return false;
    mon.moves[index] = { id, pp: db.moves[id].pp };
  }
  mon.pendingMoves.shift();
  return true;
}
export function evolveMonster(mon, db, { cancel = false } = {}) {
  const evolution = db.evolutions[mon.species];
  if (!evolution || mon.level < evolution.level) return false;
  if (cancel) {
    mon.evolutionSkipped = mon.level;
    return true;
  }
  const oldHP = mon.stats.hp;
  mon.species = evolution.to;
  mon.ability = db.species[mon.species].abilities[0];
  mon.stats = calculateStats(mon, db.species[mon.species]);
  mon.hp = mon.hp === 0 ? 0 : mon.hp + mon.stats.hp - oldHP;
  for (const entry of db.species[mon.species].learnset.filter(
    (e) => e.level === mon.level,
  )) {
    if (mon.moves.some((m) => m.id === entry.move)) continue;
    if (mon.moves.length < 4)
      mon.moves.push({ id: entry.move, pp: db.moves[entry.move].pp });
    else (mon.pendingMoves ??= []).push(entry.move);
  }
  return true;
}
