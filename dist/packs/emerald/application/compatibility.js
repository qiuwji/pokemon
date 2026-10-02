/** Existing host/UI field aliases; state lives in the listed service, never in two copies. */
export const COMPATIBILITY_FIELDS = Object.freeze({
  items: "inventory",
  partyStorage: "inventory",
  equipment: "inventory",
  forms: "forms",
  growth: "growth",
  friendship: "growth",
  evolutions: "growth",
  growthDirector: "growth",
  growthBusy: "growth",
  trading: "growth",
  combat: "battle",
  commands: "story",
  storyBusy: "story",
  movement: "movement",
  travel: "movement",
  travelDirector: "movement",
  actionBusy: "fieldActions",
  actionDirector: "fieldActions",
  fishing: "fieldActions",
  field: "world",
  fieldDirector: "world",
  worldState: "world",
  lastEncounterSteps: "triggers",
  saveStore: "save",
  saveProtected: "save",
  saveWarning: "save",
  state: "save",
  lastSave: "save",
  saveConflict: "save",
  rng: "save",
});
export function exposeCompatibilityFields(target, applications) {
  Object.defineProperties(
    target,
    Object.fromEntries(
      Object.entries(COMPATIBILITY_FIELDS).map(([name, group]) => [
        name,
        {
          enumerable: true,
          configurable: false,
          get: () => applications[group][name],
          set: (value) => {
            applications[group][name] = value;
          },
        },
      ]),
    ),
  );
}
