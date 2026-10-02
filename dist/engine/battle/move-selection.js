/** A pure eligibility query shared by UI, command validation and AI. No PP/RNG use while choosing. */
export function moveAvailable(battle, seat, index) {
  const slot = battle.roster.occupant(seat)?.moves[index],
    move = slot && battle.db.moves[slot.id];
  if (!move || slot.pp <= 0 || !battle.moveEffects.supports(move.effect))
    return false;
  return (
    (battle.traits?.calculate("move-availability", 1, {
      actorSeat: seat,
      move: { ...move, id: slot.id },
    }) ?? 1) > 0
  );
}
