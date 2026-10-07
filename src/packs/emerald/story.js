import { StoryEngine } from "../../engine/story.js";
import { QUESTS } from "./quests.js";
import { TRAINING_EVENTS } from "./story/training.js";
import { REGIONS_LITTLEROOT_EVENTS } from "./story/regions/littleroot.js";
import { REGIONS_ROUTE103_EVENTS } from "./story/regions/route103.js";
import { REGIONS_PETALBURG_EVENTS } from "./story/regions/petalburg.js";
import { REGIONS_PETALBURG_RESCUE_EVENTS } from "./story/regions/petalburg-rescue.js";
import { SOURCE_TRAINER_EVENTS } from "./story/regions/source-trainers.js";
import { COMMON_INTERACTIONS_EVENTS } from "./story/common/interactions.js";
import { COMMON_BATTLE_RESULTS_EVENTS } from "./story/common/battle-results.js";
// Native fallback policies are explicit; registration order is not precedence.
export const STORY_EVENTS = [
  ...TRAINING_EVENTS,
  ...REGIONS_LITTLEROOT_EVENTS,
  ...REGIONS_ROUTE103_EVENTS,
  ...REGIONS_PETALBURG_EVENTS,
  ...REGIONS_PETALBURG_RESCUE_EVENTS,
  ...SOURCE_TRAINER_EVENTS,
  ...COMMON_INTERACTIONS_EVENTS,
  ...COMMON_BATTLE_RESULTS_EVENTS,
];
export const EMERALD_STORY = new StoryEngine(STORY_EVENTS, QUESTS);
export const interaction = (state, object, mapTitle) =>
  EMERALD_STORY.resolve("interact", state, { object, mapTitle });
export const battleOutcome = (state, battle, db) =>
  EMERALD_STORY.resolve("battleResult", state, { battle, db });
