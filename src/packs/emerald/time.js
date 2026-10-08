/** Original Gen3 tide windows (time_events.c). Day/night tint is an existing project presentation choice. */
export const emeraldTide = (hour) =>
  hour < 3 || (hour >= 9 && hour < 15) || hour >= 21 ? "high" : "low";
export const emeraldTimeOfDay = (hour) =>
  hour < 6 || hour >= 20 ? "night" : hour >= 17 ? "dusk" : "day";
export const EMERALD_TIME_POLICY = Object.freeze({ offline: "advance", rate: 60 });

export const emeraldTimeEventsEligible = (id, map) =>
  map.timeEvents !== false && !id.includes("PokemonCenter");
