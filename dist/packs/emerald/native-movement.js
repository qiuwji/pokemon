/** Emerald initial facings: src/event_object_movement.c, gInitialMovementTypeFacingDirections.
 * These are pack rules, not engine assumptions. Compound names must not be substring-matched.
 */
const FACING_GROUPS = {
  "down": [
    "NONE",
    "LOOK_AROUND",
    "WANDER_AROUND",
    "WANDER_DOWN_AND_UP",
    "FACE_DOWN",
    "PLAYER",
    "BERRY_TREE_GROWTH",
    "FACE_DOWN_AND_UP",
    "FACE_DOWN_AND_LEFT",
    "FACE_DOWN_AND_RIGHT",
    "FACE_DOWN_UP_AND_LEFT",
    "FACE_DOWN_UP_AND_RIGHT",
    "FACE_DOWN_LEFT_AND_RIGHT",
    "ROTATE_COUNTERCLOCKWISE",
    "ROTATE_CLOCKWISE",
    "WALK_DOWN_AND_UP",
    "WALK_SEQUENCE_DOWN_UP_RIGHT_LEFT",
    "WALK_SEQUENCE_DOWN_UP_LEFT_RIGHT",
    "WALK_SEQUENCE_DOWN_RIGHT_LEFT_UP",
    "WALK_SEQUENCE_DOWN_LEFT_RIGHT_UP",
    "WALK_SEQUENCE_DOWN_RIGHT_UP_LEFT",
    "WALK_SEQUENCE_DOWN_LEFT_UP_RIGHT",
    "COPY_PLAYER_OPPOSITE",
    "TREE_DISGUISE",
    "MOUNTAIN_DISGUISE",
    "COPY_PLAYER_OPPOSITE_IN_GRASS",
    "BURIED",
    "WALK_IN_PLACE_DOWN",
    "JOG_IN_PLACE_DOWN",
    "RUN_IN_PLACE_DOWN",
    "INVISIBLE",
    "WALK_SLOWLY_IN_PLACE_DOWN"
  ],
  "up": [
    "WANDER_UP_AND_DOWN",
    "FACE_UP",
    "FACE_UP_AND_LEFT",
    "FACE_UP_AND_RIGHT",
    "FACE_UP_LEFT_AND_RIGHT",
    "WALK_UP_AND_DOWN",
    "WALK_SEQUENCE_UP_RIGHT_LEFT_DOWN",
    "WALK_SEQUENCE_UP_LEFT_RIGHT_DOWN",
    "WALK_SEQUENCE_UP_DOWN_RIGHT_LEFT",
    "WALK_SEQUENCE_UP_DOWN_LEFT_RIGHT",
    "WALK_SEQUENCE_UP_LEFT_DOWN_RIGHT",
    "WALK_SEQUENCE_UP_RIGHT_DOWN_LEFT",
    "COPY_PLAYER",
    "COPY_PLAYER_IN_GRASS",
    "WALK_IN_PLACE_UP",
    "JOG_IN_PLACE_UP",
    "RUN_IN_PLACE_UP",
    "WALK_SLOWLY_IN_PLACE_UP"
  ],
  "left": [
    "WANDER_LEFT_AND_RIGHT",
    "FACE_LEFT",
    "FACE_LEFT_AND_RIGHT",
    "WALK_LEFT_AND_RIGHT",
    "WALK_SEQUENCE_LEFT_DOWN_UP_RIGHT",
    "WALK_SEQUENCE_LEFT_RIGHT_DOWN_UP",
    "WALK_SEQUENCE_LEFT_UP_DOWN_RIGHT",
    "WALK_SEQUENCE_LEFT_RIGHT_UP_DOWN",
    "WALK_SEQUENCE_LEFT_DOWN_RIGHT_UP",
    "WALK_SEQUENCE_LEFT_UP_RIGHT_DOWN",
    "COPY_PLAYER_COUNTERCLOCKWISE",
    "COPY_PLAYER_COUNTERCLOCKWISE_IN_GRASS",
    "WALK_IN_PLACE_LEFT",
    "JOG_IN_PLACE_LEFT",
    "RUN_IN_PLACE_LEFT",
    "WALK_SLOWLY_IN_PLACE_LEFT"
  ],
  "right": [
    "WANDER_RIGHT_AND_LEFT",
    "FACE_RIGHT",
    "WALK_RIGHT_AND_LEFT",
    "WALK_SEQUENCE_RIGHT_LEFT_DOWN_UP",
    "WALK_SEQUENCE_RIGHT_DOWN_UP_LEFT",
    "WALK_SEQUENCE_RIGHT_LEFT_UP_DOWN",
    "WALK_SEQUENCE_RIGHT_UP_DOWN_LEFT",
    "WALK_SEQUENCE_RIGHT_UP_LEFT_DOWN",
    "WALK_SEQUENCE_RIGHT_DOWN_LEFT_UP",
    "COPY_PLAYER_CLOCKWISE",
    "COPY_PLAYER_CLOCKWISE_IN_GRASS",
    "WALK_IN_PLACE_RIGHT",
    "JOG_IN_PLACE_RIGHT",
    "RUN_IN_PLACE_RIGHT",
    "WALK_SLOWLY_IN_PLACE_RIGHT"
  ]
};
const initialFacings = new Map(Object.entries(FACING_GROUPS).flatMap(([dir, names]) =>
  names.map(name => [`MOVEMENT_TYPE_${name}`, dir])));

export function nativeMovement(type) {
  const dir = initialFacings.get(type);
  if (!dir) throw new Error(`Unknown Emerald movement type: ${type}`);
  let mode = "still";
  if (/^MOVEMENT_TYPE_(WANDER|WALK)_(LEFT_AND_RIGHT|RIGHT_AND_LEFT)$/.test(type)) mode = "horizontal";
  else if (/^MOVEMENT_TYPE_(WANDER|WALK)_(UP_AND_DOWN|DOWN_AND_UP)$/.test(type)) mode = "vertical";
  else if (type.startsWith("MOVEMENT_TYPE_WANDER")) mode = "wander";
  else if (type === "MOVEMENT_TYPE_LOOK_AROUND") mode = "look";
  else if (/^MOVEMENT_TYPE_(WALK|JOG|RUN|WALK_SLOWLY)_IN_PLACE_/.test(type)) mode = "jog";
  return { dir, mode };
}
