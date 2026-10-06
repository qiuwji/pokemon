import { ElevationPolicy } from "../../elevation.js";
// global.fieldmap.h; event_object_movement.c IsElevationMismatchAt/ObjectEventUpdateElevation.
export const GEN3_ELEVATION = new ElevationPolicy({
  transition: 0,
  multiLevel: 15,
  max: 15,
});
