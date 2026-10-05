import { sourceObjectId, sourceLocalId } from "../../engine/world-object-index.js";
import { nativeMovement } from "./native-movement.js";

/** Bind authored gameplay roles to source identity; placement and ambient motion have one owner. */
export function bindNativeObjects(map, definitions, sourceObjects) {
  return definitions.map((definition) => {
    const label = definition.sourceLocalId || definition.id || `${definition.kind}:${definition.x},${definition.y}`;
    if (definition.movement) {
      if (!definition.id) throw new Error(`Authored NPC needs an identity: ${label}`);
      return definition;
    }
    const matches = sourceObjects.map((source, index) => ({ source, index }))
      .filter(({ source, index }) => definition.sourceLocalId
        ? sourceLocalId(source, index) === definition.sourceLocalId
        : source.x === definition.x && source.y === definition.y);
    if (matches.length !== 1) throw new Error(`Native NPC binding failed: ${map}/${label}`);
    const { source, index } = matches[0];
    const movement = nativeMovement(definition.movementType || source.movement_type);
    const { mode, dir } = movement;
    return {
      ...definition,
      id: definition.id || sourceObjectId(map, "npc", source, index),
      sourceLocalId: sourceLocalId(source, index),
      script: source.script,
      x: source.x,
      y: source.y,
      ...(source.elevation !== undefined ? { elevation: source.elevation } : {}),
      dir,
      movement: { mode, dir, rangeX: source.movement_range_x ?? 0, rangeY: source.movement_range_y ?? 0 },
    };
  });
}
