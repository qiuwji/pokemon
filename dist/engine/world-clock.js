import { readOnly } from "./extensions/values.js";
export const MINUTE_MS = 60000;
export const DAY_MS = 24 * 60 * MINUTE_MS;
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
export const emptyWorldClock = () => ({
  initialized: false,
  localMs: 0,
  wallMs: null,
  playMs: 0,
  processedMinute: 0,
  processedDay: 0,
});
export function validateWorldClock(state) {
  if (
    !state ||
    Array.isArray(state) ||
    Object.keys(state).some(
      (key) =>
        ![
          "initialized",
          "localMs",
          "wallMs",
          "playMs",
          "processedMinute",
          "processedDay",
        ].includes(key),
    ) ||
    typeof state.initialized !== "boolean" ||
    ![
      state.localMs,
      state.playMs,
      state.processedMinute,
      state.processedDay,
    ].every(integer) ||
    (state.wallMs !== null && !integer(state.wallMs)) ||
    state.processedMinute > Math.floor(state.localMs / MINUTE_MS) ||
    state.processedDay > Math.floor(state.localMs / DAY_MS) ||
    (!state.initialized &&
      (state.localMs !== 0 ||
        state.processedMinute !== 0 ||
        state.processedDay !== 0))
  )
    throw new Error("Invalid world clock state");
}
/** Saved local RTC and play duration are separate. Wall time is supplied by the host, never read here. */
export class WorldClock {
  constructor({
    state,
    wallNow,
    offline = "advance",
    maxOfflineMs = 30 * DAY_MS,
  }) {
    validateWorldClock(state);
    if (
      typeof wallNow !== "function" ||
      !["advance", "pause", "cap"].includes(offline) ||
      !integer(maxOfflineMs)
    )
      throw new Error("Invalid world clock policy");
    Object.assign(this, { state, wallNow, offline, maxOfflineMs });
    this.playAnchor = null;
  }
  wall() {
    const time = this.wallNow();
    if (!integer(time)) throw new Error("Invalid wall clock sample");
    return time;
  }
  start(hour, minute = 0) {
    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 59
    )
      throw new Error("Invalid initial clock time");
    if (this.state.initialized)
      return { ok: false, reason: "游戏时钟已经设定。" };
    const now = this.wall();
    Object.assign(this.state, {
      initialized: true,
      localMs: (hour * 60 + minute) * MINUTE_MS,
      wallMs: now,
      processedMinute: hour * 60 + minute,
      processedDay: 0,
    });
    return { ok: true };
  }
  sync({ resumed = false } = {}) {
    if (!this.state.initialized) return 0;
    const now = this.wall(),
      last = this.state.wallMs;
    if (last === null) {
      this.state.wallMs = now;
      return 0;
    }
    if (now <= last) return 0; // Keep the high-water mark; rewinding the host clock cannot advance the same interval twice.
    const elapsed =
      resumed && this.offline === "pause"
        ? 0
        : resumed && this.offline === "cap"
          ? Math.min(now - last, this.maxOfflineMs)
          : now - last;
    this.advance(elapsed);
    this.state.wallMs = now;
    return elapsed;
  }
  advance(ms) {
    if (
      !integer(ms) ||
      !this.state.initialized ||
      !integer(this.state.localMs + ms)
    )
      throw new Error("Invalid world time advance");
    this.state.localMs += ms;
  }
  samplePlay(now, active = true) {
    if (!Number.isFinite(now) || now < 0)
      throw new Error("Invalid play clock sample");
    const previous = this.playAnchor;
    this.playAnchor = active ? now : null;
    if (!active || previous === null || now < previous) return;
    const elapsed = Math.floor(now - previous);
    if (!integer(this.state.playMs + elapsed))
      throw new Error("Play duration overflow");
    this.state.playMs += elapsed;
    this.playAnchor = previous + elapsed; // Preserve fractional milliseconds rather than rounding every frame away.
  }
  resetPlayAnchor() {
    this.playAnchor = null;
  }
  boundaries() {
    const minute = Math.floor(this.state.localMs / MINUTE_MS),
      day = Math.floor(this.state.localMs / DAY_MS);
    const change = {
      minutes: minute - this.state.processedMinute,
      days: day - this.state.processedDay,
      fromMinute: this.state.processedMinute,
      toMinute: minute,
      fromDay: this.state.processedDay,
      toDay: day,
    };
    this.state.processedMinute = minute;
    this.state.processedDay = day;
    return readOnly(change);
  }
  view() {
    const seconds = Math.floor(this.state.localMs / 1000);
    return readOnly({
      initialized: this.state.initialized,
      elapsedMs: this.state.localMs,
      day: Math.floor(this.state.localMs / DAY_MS),
      hour: Math.floor(seconds / 3600) % 24,
      minute: Math.floor(seconds / 60) % 60,
      second: seconds % 60,
      playSeconds: Math.floor(this.state.playMs / 1000),
    });
  }
}
