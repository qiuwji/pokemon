// event_object_movement.c:sElevationToPriority. Drawing priority does not decide passage.
const priorities = Object.freeze([
  2, 2, 2, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, 0, 2,
]);
export const emeraldFieldPriority = (elevation = 0) =>
  priorities[elevation] ?? 2;
