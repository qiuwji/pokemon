import { createItemService, DEFAULT_ITEMS } from "./items.js";
import { EvolutionService } from "./growth/evolution.js";
import { GEN3_ABILITIES } from "./rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "./rules/gen3/held-items.js";

/** Party commands are domain operations, usable without a browser. */
export function usePotion(state, index, amount = 20) {
  const items = createItemService({
    potion: { ...DEFAULT_ITEMS.potion, effects: [{ op: "restoreHP", amount }] },
  });
  return items.use({
    id: "potion",
    bag: state.bag,
    party: state.party,
    index,
    context: "field",
  }).ok;
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
/** Compatibility facade delegates to the single evolution implementation. */
export function evolveMonster(mon, db, { cancel = false } = {}) {
  const service = new EvolutionService({
    db,
    abilities: GEN3_ABILITIES,
    heldItems: GEN3_HELD_ITEMS,
  });
  const plan = service.prepare(mon);
  return !!plan && service.commit(plan, { cancel }).ok;
}
