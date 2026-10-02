import { bindApplicationPorts } from "./ports.js";
export const FRAME_PORTS = Object.freeze([
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
  tick(now, visibleMaps) {
    this.field.tick(now);
    if (
      this.ui &&
      !this.ui.blocked &&
      !this.busy &&
      !this.battle &&
      this.growth.readyEgg()
    )
      void this.hatchReady();
    else if (
      this.ui &&
      !this.ui.blocked &&
      !this.busy &&
      !this.battle &&
      this.state.party.some(
        (m) =>
          !m.egg && (m.pendingMoves?.length || m.pendingEvolution === m.level),
      )
    )
      this.ui.checkGrowth();
    this.field.npcs.tick(now, this.state.position, {
      paused: !!(
        this.battle ||
        this.storyBusy ||
        this.ui.blocked ||
        this.combat.busy ||
        this.transitions.busy ||
        this.travelDirector.busy ||
        this.growthDirector.busy ||
        this.growthBusy ||
        this.actionBusy ||
        !!this.sceneDirector?.busy
      ),
      maps: visibleMaps,
      playerFrom: this.motion.moving(now) ? this.motion.sourcePosition : null,
    });
  }
}
