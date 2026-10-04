import { createTextEffects } from "../../../presentation/text-effects.js";
import { dialogueDescription } from "../../../engine/dialogue.js";
import { bindApplicationPorts } from "./ports.js";
export const PRESENTATION_PORTS = Object.freeze([
  "plugins",
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
    this.textEffects = createTextEffects(this.plugins);
  }
  validateDialogue(command) {
    return dialogueDescription(command, (id, data) =>
      this.textEffects.parameters(id, data),
    );
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
