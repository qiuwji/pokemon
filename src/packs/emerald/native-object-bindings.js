import { sourceObjectId, sourceLocalId } from "../../engine/world-object-index.js";
import { nativeMovement } from "./native-movement.js";
import { GEN3_ELEVATION } from "../../engine/rules/gen3/elevation.js";

/** Gen3 source metadata stays in the pack; the generic engine index knows no movement codes. */
export function isSourceInvisible(db, map, id) {
  return !!db.maps[map]?.npcs?.some((source,index) =>
    source.movement_type === "MOVEMENT_TYPE_INVISIBLE" && sourceObjectId(map,"npc",source,index) === id);
}

/** Bind authored gameplay roles to source identity; placement and ambient motion have one owner. */
export function bindNativeObjects(map, definitions, sourceObjects, grid) {
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
    // Source coordinates identify the object; entry placement is applied only
    // after binding, before NPC simulation or the destination's first frame.
    const { placement, ...role } = definition;
    const movement = nativeMovement(definition.movementType || source.movement_type);
    const { mode, dir } = movement;
    const object = {
      ...role,
      id: definition.id || sourceObjectId(map, "npc", source, index),
      sourceLocalId: sourceLocalId(source, index),
      script: source.script,
      x: placement?.x ?? source.x,
      y: placement?.y ?? source.y,
      ...(source.elevation !== undefined ? { elevation: source.elevation } : {}),
      dir,
      movement: { mode, dir, rangeX: source.movement_range_x ?? 0, rangeY: source.movement_range_y ?? 0 },
    };
    // DoGroundEffects_OnSpawn calls ObjectEventUpdateElevation: template height is
    // only retained on multi-level tiles. Ordinary floors determine the live plane.
    if (grid) {
      const tile = GEN3_ELEVATION.tile(grid, object);
      GEN3_ELEVATION.initialize(object, grid);
      GEN3_ELEVATION.advance(object, tile, tile);
    }
    return object;
  });
}
