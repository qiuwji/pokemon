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
/** Stateless layout can be replaced by a renderer plugin without changing game rules. */
export function battleLayout(view) {
  const home = view.combatants.filter(
    (c) =>
      view.sides.find((s) => s.id === c.sideId)?.allianceId ===
      view.homeAlliance,
  );
  const away = view.combatants.filter((c) => !home.includes(c));
  const positions = new Map();
  home.forEach((c, i) =>
    positions.set(
      c.seatId,
      home.length === 1
        ? { x: 73, y: 136, baseline: 182, size: 92, back: true }
        : {
            x: 52 + i * 67,
            y: 137 + i * 7,
            baseline: 181 + i * 10,
            size: 76,
            back: true,
          },
    ),
  );
  away.forEach((c, i) =>
    positions.set(
      c.seatId,
      away.length === 1
        ? { x: 250, y: 56, baseline: 97, size: 85, back: false }
        : {
            x: away.length <= 2 ? 224 + i * 49 : 211 + (i % 2) * 64,
            y: away.length <= 2 ? 40 + i * 32 : 38 + Math.floor(i / 2) * 46,
            baseline:
              away.length <= 2 ? 80 + i * 31 : 78 + Math.floor(i / 2) * 46,
            size: 64,
            back: false,
          },
    ),
  );
  return positions;
}
