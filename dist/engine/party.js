/** Party ordering and pending move decisions; items and evolution have their own domain services. */
export function swapParty(state, firstUid, secondUid) {
  const first = state.party.findIndex(m => m.uid === firstUid);
  const second = state.party.findIndex(m => m.uid === secondUid);
  if (first < 0 || second < 0 || first === second) return false;
  [state.party[first], state.party[second]] = [state.party[second], state.party[first]];
  return true;
}
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
