import fs from "node:fs";
import { assertPackContent } from "../dist/packs/emerald/content.js";
import { MOVE_EFFECTS } from "../dist/engine/move-effects.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import { STORY_EVENTS } from "../dist/packs/emerald/story.js";
const db = assertPackContent(
  JSON.parse(fs.readFileSync(new URL("../dist/content.json", import.meta.url))),
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
