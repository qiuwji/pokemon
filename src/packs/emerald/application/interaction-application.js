import { bindApplicationPorts } from "./ports.js";
export const INTERACTION_PORTS = Object.freeze(["state"]);
/** Thin adapter over the host-owned interaction sessions; the bridge attaches after startup. */
export class InteractionApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, INTERACTION_PORTS);
    this.bridge = null;
  }
  attachBridge(bridge) {
    this.bridge = bridge;
  }
  active() {
    return !!this.bridge?.active();
  }
  current() {
    return this.bridge?.current() ?? null;
  }
  start(id, parameters = {}, source = null) {
    if (!this.bridge) throw new Error("互动会话尚未装配");
    return this.bridge.start(id, parameters, source);
  }
  input(action, active) {
    return this.bridge?.input(action, active) ?? null;
  }
  cancel() {
    return this.bridge?.cancel() ?? null;
  }
  advance(now) {
    return this.bridge ? this.bridge.advance(now) : [];
  }
  view() {
    return this.bridge ? this.bridge.view() : { instance: null, frame: null };
  }
}
