import { bindApplicationPorts } from "./ports.js";
export const PRESENTATION_PORTS = Object.freeze([
  "battle",
  "busy",
  "clearInput",
  "sceneDirector",
  "ui",
]);
/** presentation use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class PresentationApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, PRESENTATION_PORTS);
  }
  async playPresentation(id, payload = {}) {
    if (this.busy || this.battle || this.ui?.dialog)
      throw new Error("请先结束当前行动。");
    if (!this.sceneDirector) throw new Error("Scene presentation unavailable");
    this.clearInput();
    try {
      return await this.sceneDirector.play(id, payload);
    } finally {
      this.clearInput();
    }
  }
}
