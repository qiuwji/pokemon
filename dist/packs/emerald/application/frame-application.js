import { bindApplicationPorts } from "./ports.js";
export const FRAME_PORTS = Object.freeze([
  "tickTime",
  "tickWeather",
  "tickDevices",
  "tickActors",
  "playActive",
  "facilityActive",
  "battle",
  "actionBusy",
  "busy",
  "combat",
  "field",
  "growth",
  "growthBusy",
  "growthDirector",
  "hatchReady",
  "motion",
  "sceneDirector",
  "state",
  "storyBusy",
  "transitions",
  "travelDirector",
  "ui",
]);
/** frame use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class FrameApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, FRAME_PORTS);
  }
  get paused() {
    return !!(
      this.facilityActive ||
      this.battle ||
      this.storyBusy ||
      this.ui?.blocked ||
      this.combat.busy ||
      this.transitions.busy ||
      this.travelDirector.busy ||
      this.growthDirector.busy ||
      this.growthBusy ||
      this.actionBusy ||
      this.sceneDirector?.busy
    );
  }
  tick(now, visibleMaps) {
    this.tickTime(now, this.playActive());
    this.tickWeather(now, this.playActive() && !this.battle);
    const paused = this.paused;
    this.tickDevices(now, { paused: paused || !this.playActive() });
    this.field.tick(now);
    this.tickActors(now, {
      visibleMaps: visibleMaps || [this.state.position.map],
      paused: paused || !this.playActive(),
    });
    if (
      this.ui &&
      !this.ui.blocked &&
      !this.busy &&
      !this.battle &&
      !this.facilityActive &&
      this.growth.readyEgg()
    )
      void this.hatchReady();
    else if (
      this.ui &&
      !this.ui.blocked &&
      !this.busy &&
      !this.battle &&
      !this.facilityActive &&
      this.state.party.some(
        (m) =>
          !m.egg && (m.pendingMoves?.length || m.pendingEvolution === m.level),
      )
    )
      this.ui.checkGrowth();
    this.field.npcs.tick(now, this.state.position, {
      paused,
      maps: visibleMaps,
      playerFrom: this.motion.moving(now) ? this.motion.sourcePosition : null,
    });
  }
}
