import { assertBlockedReason, assertMotionCancelReason } from "./blocked-reasons.js";
import { callSync, readOnly } from './extensions/values.js';

const location = p => Object.fromEntries(['map', 'x', 'y', 'dir', 'elevation', 'previousElevation']
  .filter(key => p[key] !== undefined).map(key => [key, p[key]]));

/** Detached movement facts, with no route history or gameplay policy. Sequence is session-local. */
export class MotionResults {
  constructor({ now, onResult = () => {}, onError = () => {} }) {
    Object.assign(this, { now, onResult, onError });
    this.sequence = 0;
  }
  publish(record, retain) {
    const result = readOnly({ ...record, at: this.now() });
    retain?.(result);
    try { callSync(this.onResult, [result], this.onError); }
    catch (error) { this.onError(error); }
    return result;
  }
  begin(entity, from, to, details, retain) {
    return this.publish({ entity, sequence: ++this.sequence, from: location(from), to: location(to),
      direction: to.dir, mode: 'walk', startedAt: this.now(), durationMs: 0,
      jump: false, scripted: false, forced: false, ...details, phase: 'started', reason: null }, retain);
  }
  finish(record, reason = null) {
    if (reason !== null) assertMotionCancelReason(reason);
    return this.publish({ ...record, phase: reason ? 'cancelled' : 'settled', reason });
  }
  blocked(entity, from, to, direction, reason, details = {}) {
    assertBlockedReason(reason);
    return this.publish({ entity, sequence: ++this.sequence, from: location(from), to: location(to),
      direction, mode: 'walk', startedAt: this.now(), durationMs: 0,
      jump: false, scripted: false, forced: false, ...details, phase: 'blocked', reason });
  }
}
