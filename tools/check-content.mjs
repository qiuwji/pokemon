import { assertContentAssets } from "./check-content-assets.mjs";
import { loadContentSync } from "./content-io.mjs";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { assertPackContent } from "../dist/packs/emerald/content.js";
import { MOVE_EFFECTS } from "../dist/engine/move-effects.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import { STORY_EVENTS } from "../dist/packs/emerald/story.js";
import { StoryCatalog } from "../dist/engine/story-catalog.js";
import { ConditionQueries } from "../dist/engine/condition-queries.js";
const db = assertPackContent(loadContentSync());
assertContentAssets(db);
console.log(
  `Explicit pending source references: ${Object.keys(db.references.maps).length} maps, ${Object.keys(db.references.scripts).length} scripts (see dist/content/references.json)`,
);
console.log(
  `Content valid: ${Object.keys(db.maps).length} maps, ${Object.keys(db.species).length} species, ${Object.keys(db.moves).length} moves, ${Object.keys(ITEMS).length} items, ${STORY_EVENTS.length} events.`,
);
const unavailable = Object.entries(db.moves)
  .filter(([, move]) => MOVE_EFFECTS[move.effect].supported === false)
  .map(([id]) => id);
console.log(
  `Explicitly unavailable move mechanics (${unavailable.length}): ${unavailable.join(", ")}`,
);

const { catalog } = createEmeraldPlugins(db, []);
const stories = new StoryCatalog(Object.values(db.stories || {}), {maps:db.maps,queries:new ConditionQueries(catalog.conditionQueries),eventIds:new Set(STORY_EVENTS.map(event=>event.id))});
console.log(`Story content valid: ${stories.scripts.size} scripts, ${stories.dialogues.size} dialogues, ${stories.events.length} bindings.`);
console.log(
  `Runtime content valid: ${Object.keys(catalog.moves).length} moves, ${Object.keys(catalog.learningMethods).length} learning methods, ${Object.keys(catalog.items).length} items.`,
);
