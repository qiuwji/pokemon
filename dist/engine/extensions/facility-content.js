import { jsonValue, localId } from "./values.js";
import { scoreContest } from "./facility-templates/score-contest.js";
import { reelMachine } from "./facility-templates/reel-machine.js";
import { battleSequence } from "./facility-templates/battle-sequence.js";

/** Pure JSON authoring over the existing public content API. No I/O or gameplay mutations. */
export function registerFacilityContent(api, input) {
  const pack = jsonValue(input);
  if (pack.version !== 1 || Object.keys(pack).some(key => !["version", "trainers", "facilities"].includes(key)) ||
      !Array.isArray(pack.facilities) || !pack.facilities.length || pack.facilities.length > 256 ||
      !Array.isArray(pack.trainers || []) || (pack.trainers || []).length > 512)
    throw new Error("Invalid facility content pack");
  const factories = { "score-contest": scoreContest, "reel-machine": reelMachine, "battle-sequence": battleSequence };
  const ids = new Set(), trainerIds = new Set();
  const definitions = pack.facilities.map(value => {
    if (!value || !localId(value.id) || ids.has(value.id) ||
        Object.keys(value).some(key => !["id", "template", "name", "parameters", "requires", "team"].includes(key)))
      throw new Error(`Invalid or duplicate JSON facility: ${value?.id}`);
    ids.add(value.id);
    const { id, template, ...definition } = value;
    if (!Object.hasOwn(factories, template)) throw new Error(`Unknown facility template: ${template}`);
    return { id, definition, activity: factories[template](definition.parameters) };
  });
  for (const value of pack.trainers || []) {
    if (!value || !localId(value.id) || trainerIds.has(value.id) ||
        Object.keys(value).some(key => !["id", "definition"].includes(key)))
      throw new Error(`Invalid or duplicate JSON trainer: ${value?.id}`);
    trainerIds.add(value.id);
    api.content.register("trainers", value.id, value.definition);
  }
  for (const { id, definition, activity } of definitions) {
    const activityId = api.content.register("facilityActivities", id, activity);
    api.content.register("facilities", id, { ...definition, activity: activityId });
  }
}
