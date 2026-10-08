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
