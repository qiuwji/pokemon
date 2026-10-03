/** Party ordering and pending move decisions; items and evolution have their own domain services. */
export function setLead(state, index) {
  if (!state.party[index]) return false;
  [state.party[0], state.party[index]] = [state.party[index], state.party[0]];
  return true;
}
export function learnPendingMove(
  mon,
  index,
  db,
  { companions = [], protectedMoves = new Set() } = {},
) {
  const id = mon.pendingMoves?.[0];
  if (!id) return false;
  if (index !== null) {
    if (
      !Number.isInteger(index) ||
      !mon.moves[index] ||
      protectedMoves.has(mon.moves[index].id)
    )
      return false;
    mon.moves[index] = { id, pp: db.moves[id].pp };
  }
  mon.pendingMoves.shift();
  for (const sibling of companions.filter((m) =>
    mon.growthCompanions?.includes(m.uid),
  ))
    sibling.moves = structuredClone(mon.moves);
  if (!mon.pendingMoves.length) delete mon.growthCompanions;
  return true;
}
