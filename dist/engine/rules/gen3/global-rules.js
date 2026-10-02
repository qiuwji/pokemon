/** Environment rule modifiers share the attachment pipeline; formula owns integer stage order. */
export const GEN3_GLOBAL_HOOKS = [
  {
    id: "gen3:explosion-defense",
    phase: "defense",
    modify: (v, c) =>
      c.move.effect === "explosion" && c.stat === "def"
        ? Math.max(1, Math.floor(v / 2))
        : v,
    priority: 100,
  },

  {
    id: "gen3:weather-damage",
    phase: "base-damage",
    priority: -10,
    modify: (value, c) => {
      const weather = c.battle.traits.weather();
      if (
        (weather === "rain" && c.move.type === "water") ||
        (weather === "sun" && c.move.type === "fire")
      )
        value = Math.floor(value * 1.5);
      if (
        (weather === "rain" && c.move.type === "fire") ||
        (weather === "sun" && c.move.type === "water")
      )
        value = Math.floor(value / 2);
      if (
        c.move.id === "solar_beam" &&
        ["rain", "sand", "hail"].includes(weather)
      )
        value = Math.floor(value / 2);
      return value;
    },
  },
];
