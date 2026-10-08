/** View normalization belongs to presentation; domain events always use seat collections. */
export function battleView(event) {
  if (!event) return null;
  const homeAlliance =
    event.homeAlliance || event.sides?.[0]?.allianceId || "home";
  const sides = event.sides || [
    { id: "home", allianceId: homeAlliance },
    { id: "away", allianceId: "away" },
  ];
  const combatants = event.combatants || [
    {
      seatId: "home:0",
      sideId: "home",
      controllerId: "trainer",
      monster: event.player,
    },
    {
      seatId: "away:0",
      sideId: "away",
      controllerId: "opponent",
      monster: event.enemy,
    },
  ];
  const alliance = (id) => sides.find((s) => s.id === id)?.allianceId;
  const player = combatants.find(
    (c) => alliance(c.sideId) === homeAlliance,
  )?.monster;
  const enemy = combatants.find(
    (c) => alliance(c.sideId) !== homeAlliance,
  )?.monster;
  const legacySeat =
    event.side === 1
      ? combatants.find((c) => alliance(c.sideId) !== homeAlliance)?.seatId
      : combatants.find((c) => alliance(c.sideId) === homeAlliance)?.seatId;
  return {
    ...event,
    homeAlliance,
    sides,
    combatants,
    player,
    enemy,
    actorSeat:
      event.actorSeat || (event.kind === "move" ? legacySeat : undefined),
    targetSeat:
      event.targetSeat ||
      (["hurt", "heal", "faint", "switch"].includes(event.kind)
        ? legacySeat
        : undefined),
  };
}
