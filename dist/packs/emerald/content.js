import { MovementRegistry } from "../../engine/movement.js";
import { MOVEMENT_MODES } from "./movement.js";
import { TRAINERS, validateTrainers } from "./trainers.js";
import { assertContent } from "../../engine/content.js";
import { MoveEffectRegistry } from "../../engine/move-effects.js";
import { createItemService } from "../../engine/items.js";
import { validateCondition } from "../../engine/conditions.js";
import { PACK } from "./pack.js";
import { ITEMS } from "./items.js";
import { EMERALD_STORY } from "./story.js";
/** Pack composition validates names, references and capabilities before assets are loaded. */
export function assertPackContent(db) {
  assertContent(db);
  new MovementRegistry(MOVEMENT_MODES);
  for (const mode of Object.values(MOVEMENT_MODES))
    if (!db.actors[mode.actor])
      throw new Error(`pack: missing movement actor ${mode.actor}`);
  if (!db.actors[PACK.travelActor])
    throw new Error("pack: missing flight actor");
  validateTrainers(TRAINERS, db);
  new MoveEffectRegistry().validateMoves(db.moves);
  createItemService(ITEMS);
  const ids = new Set(EMERALD_STORY.events.map((e) => e.id));
  for (const item of Object.values(ITEMS))
    validateCondition(item.purchaseRequires, ids);
  for (const id of [...PACK.starters, ...Object.values(PACK.rival)])
    if (!db.species[id]) throw new Error(`pack: unknown species ${id}`);
  return db;
}
