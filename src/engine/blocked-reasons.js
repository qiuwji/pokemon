/** Closed movement vocabulary. Gameplay extensions reuse these causes; lifecycle cancellation is separate. */
export const BLOCKED_REASON = Object.freeze(/** @type {const} */ ({
  BOUNDARY: 'boundary', WALL: 'wall', OBJECT: 'object', ELEVATION: 'elevation', ONE_WAY: 'one-way',
  ENTRY_REJECTED: 'entry-rejected', UNAVAILABLE: 'unavailable', ANIMATION: 'animation',
  MOVEMENT_MODE: 'movement-mode', PASSAGE: 'passage', RANGE_OR_BOUNDARY: 'range-or-boundary',
  TERRAIN: 'terrain', OCCUPIED: 'occupied',
}));
export const BLOCKED_REASONS = Object.freeze(Object.values(BLOCKED_REASON));
export const MOTION_CANCEL_REASON = Object.freeze(/** @type {const} */ ({
  DISPOSED: 'disposed', INVALIDATED: 'invalidated', REPLACED: 'replaced', REMOVED: 'removed',
  STAGED: 'staged', FACED: 'faced', SCENE_RELEASED: 'scene-released', INTERRUPTED: 'interrupted',
}));
export const MOTION_CANCEL_REASONS = Object.freeze(Object.values(MOTION_CANCEL_REASON));
/** @param {unknown} reason */
export function assertBlockedReason(reason) {
  if (!BLOCKED_REASONS.some(value => value === reason)) throw new Error(`Unknown blocked reason: ${reason}`);
}
/** @param {unknown} reason */
export function assertMotionCancelReason(reason) {
  if (!MOTION_CANCEL_REASONS.some(value => value === reason)) throw new Error(`Unknown motion cancellation reason: ${reason}`);
}
