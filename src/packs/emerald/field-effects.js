import { objectSchema } from "../../engine/extensions/values.js";
// event_data.c ClearTempFieldEventData; overworld.c LoadMapFromWarp/SetDefaultFlashLevel.
export const EMERALD_FIELD_EFFECTS = {
  strength: { scope: "visit", schema: objectSchema() },
  flash: {
    scope: "world",
    schema: objectSchema(),
    retain: (transition) =>
      transition.reason !== "travel" && transition.map.indoor,
    presentation: (_data, transition) =>
      transition.map.darkness
        ? {
            kind: "light-radius",
            radius: transition.map.darkness.illuminatedRadius,
          }
        : null,
  },
};
