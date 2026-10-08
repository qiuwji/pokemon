import { StoryEngine } from "../../../engine/story.js";
import { STORY_EVENTS } from "../../../packs/emerald/story.js";
import { QUESTS } from "../../../packs/emerald/quests.js";
/** Host-only convenience queries for headless composition. Content contains no engine instance. */
export const EMERALD_STORY = new StoryEngine(STORY_EVENTS, QUESTS);
export const interaction = (state, object, mapTitle) => EMERALD_STORY.resolve("interact", state, { object, mapTitle });
export const battleOutcome = (state, battle, db) => EMERALD_STORY.resolve("battleResult", state, { battle, db });
