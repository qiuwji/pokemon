import { TRAINING_EVENTS } from "./story/training.js";
import { REGIONS_LITTLEROOT_EVENTS } from "./story/regions/littleroot.js";
import { REGIONS_ROUTE103_EVENTS } from "./story/regions/route103.js";
import { REGIONS_PETALBURG_EVENTS } from "./story/regions/petalburg.js";
import { REGIONS_PETALBURG_RESCUE_EVENTS } from "./story/regions/petalburg-rescue.js";
import { SOURCE_TRAINER_EVENTS } from "./story/regions/source-trainers.js";
import { FLOWER_SHOP_EVENTS } from "./story/regions/flower-shop.js";
import { NATIVE_DIALOGUE_EVENTS } from "./story/regions/native-dialogues.js";
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
  ...FLOWER_SHOP_EVENTS,
  ...NATIVE_DIALOGUE_EVENTS,
  ...COMMON_INTERACTIONS_EVENTS,
  ...COMMON_BATTLE_RESULTS_EVENTS,
];
