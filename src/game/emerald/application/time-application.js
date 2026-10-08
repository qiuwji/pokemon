import { WorldClock, emptyWorldClock } from "../../../engine/world-clock.js";
import {
  WorldSchedule,
  TimeTaskRegistry,
  emptyWorldSchedule,
} from "../../../engine/world-schedule.js";
import {
  emeraldTide,
  emeraldTimeOfDay,
  EMERALD_TIME_POLICY,
  emeraldTimeEventsEligible,
} from "../../../packs/emerald/time.js";
import { bindApplicationPorts } from "./ports.js";
export const TIME_PORTS = Object.freeze([
  "state",
  "catalog",
  "wallNow",
  "plugins",
  "busy",
  "field",
  "battle",
  "storyBusy",
  "ui",
  "world",
  "canManageParty",
  "advanceCrops",
  "advanceWeatherDays",
]);
/** Coordinates clocks and domain time notifications. It owns no inventory, actor, berry or battle rules. */
export class TimeApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, TIME_PORTS);
  }
  bind() {
    if (!this.state.clock)
      this.state.clock = {
        ...emptyWorldClock(),
        playMs: (this.state.playSeconds || 0) * 1000,
      };
    this.state.schedule ||= emptyWorldSchedule();
    this.clock = new WorldClock({
      state: this.state.clock,
      wallNow: this.wallNow,
      ...EMERALD_TIME_POLICY,
    });
    this.schedule = new WorldSchedule({
      state: this.state.schedule,
      registry: new TimeTaskRegistry(this.catalog.timeTasks),
    });
    this.clock.sync({ resumed: true });
    this.displayKey = null;
    this.state.playSeconds = this.clock.view().playSeconds;
  }
  timeView() {
    const view = this.clock.view();
    return {
      ...view,
      tide: emeraldTide(view.hour),
      period: emeraldTimeOfDay(view.hour),
    };
  }
  startClock(hour, minute) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    return this.commitClock(hour, minute);
  }
  /** Trusted story screen supplies this callback; public commands retain their readiness guard. */
  commitClock(hour, minute) {
    const field = this.field;
    // The clock screen owns its fade transition. Reject logical movement/combat,
    // rather than rejecting that screen's own visual cover as a busy field.
    if (this.battle || field.pending || field.force || field.motion.moving(field.now()))
      return { ok: false, reason: "请先结束当前行动。" };
    const result = this.clock.start(hour, minute);
    if (result.ok) {
      this.plugins?.events.emit("core:clock-started", this.timeView());
      this.ui?.updateSide();
    }
    return result;
  }
  tick(now, active = true) {
    this.clock.sync();
    this.clock.samplePlay(now, active);
    this.state.playSeconds = this.clock.view().playSeconds;
    const key = `${Math.floor(this.state.clock.localMs / 60000)}/${this.state.playSeconds}`;
    if (key !== this.displayKey) {
      this.displayKey = key;
      this.ui?.updateTime?.(this.timeView());
    }
    if (this.canProcess()) this.process();
  }
  canProcess() {
    return (
      this.clock.state.initialized &&
      !this.busy &&
      !this.battle &&
      !this.storyBusy &&
      !this.ui?.blocked &&
      emeraldTimeEventsEligible(this.state.position.map, this.world.map)
    );
  }
  process() {
    const change = this.clock.boundaries();
    if (change.minutes) this.advanceCrops(change.minutes);
    if (change.days) this.advanceWeatherDays(change.days);
    if (change.days)
      this.plugins?.events.emit("core:world-day", {
        ...change,
        time: this.timeView(),
      });
    if (change.minutes) {
      this.plugins?.events.emit("core:world-minute", {
        ...change,
        time: this.timeView(),
      });
      this.ui?.updateTime?.(this.timeView());
    }
    for (const task of this.schedule.collect(this.state.clock.localMs))
      this.plugins?.events.emit("core:time-task", task);
  }
  scheduleTimeTask(definition, delayMs, data = {}) {
    if (!this.state.clock.initialized)
      return { ok: false, reason: "请先设定游戏时钟。" };
    const task = this.schedule.schedule(definition, this.state.clock.localMs, {
      delayMs,
      data,
    });
    return { ok: true, task };
  }
  cancelTimeTask(id) {
    return this.schedule.cancel(id);
  }
  advanceWorldTime(ms) {
    this.clock.sync();
    this.clock.advance(ms);
    if (this.canProcess()) this.process();
    return { ok: true, time: this.timeView() };
  }
  pausePlayTime() {
    this.clock.resetPlayAnchor();
  }
  syncTime() {
    this.clock.sync();
  }
}
