/** A presentation projection for the singles screen; domain events contain seat collections. */
export function duelView(event) {
  if (!event?.combatants) return event;
  if (event.combatants.length !== 2)
    throw new Error("Singles view requires two seats");
  const [home, away] = event.combatants;
  const subject = ["hurt", "heal", "faint", "switch"].includes(event.kind)
    ? event.targetSeat
    : event.actorSeat;
  return {
    ...event,
    player: home.monster,
    enemy: away.monster,
    side: subject === away.seatId ? 1 : 0,
  };
}
