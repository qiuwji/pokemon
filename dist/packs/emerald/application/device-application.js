import {
  FieldDeviceCatalog,
  FieldDevices,
  emptyFieldDevices,
} from "../../../engine/field-devices.js";
import { FieldActionRegistry } from "../../../engine/field-actions.js";
import { EMERALD_FIELD_ACTIONS } from "../field-actions.js";
import { EMERALD_FIELD_MECHANISMS } from "../field-mechanisms.js";
import { bindApplicationPorts } from "./ports.js";
export const DEVICE_PORTS = Object.freeze([
  "catalog",
  "db",
  "state",
  "worldState",
  "world",
  "field",
  "motion",
  "timeline",
  "prepareWorldPatch",
  "canManageParty",
  "performFieldAction",
  "plugins",
  "ui",
  "save",
]);
/** Coordinates device state and world effects; UI, field clock and movement do not own puzzle state. */
export class DeviceApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, DEVICE_PORTS);
    this.processing = false;
  }
  bind({ resume = false } = {}) {
    this.state.devices ||= emptyFieldDevices();
    this.service = new FieldDevices({
      state: this.state.devices,
      catalog: new FieldDeviceCatalog({
        mechanisms: this.catalog.fieldMechanisms || EMERALD_FIELD_MECHANISMS,
        devices: this.catalog.fieldDevices,
        maps: this.db.maps,
        actions: new FieldActionRegistry(
          this.catalog.fieldActions || EMERALD_FIELD_ACTIONS,
        ),
      }),
      context: (device) => {
        const map = this.worldState.maps[device.map],
          index = device.y * map.width + device.x;
        return {
          position: { ...this.state.position },
          tile: { block: map.blocks[index], behavior: map.behavior[index] },
          mode: this.state.movement.mode,
          durationMs: this.motion.duration,
        };
      },
      prepareOperations: (operations) => this.prepareWorldPatch(operations),
      commitOperations: (draft, operations) => {
        this.worldState.commit(draft);
        for (const o of operations)
          if (o.kind === "object") this.field.npcs.invalidate(o.map, o.id);
      },
    });
    this.service.commitVisit(
      this.service.prepareVisit(this.state.position.map, { resume }),
    );
    this.lastFrame = this.timeline.now();
  }
  view() {
    return this.service.view();
  }
  publish(effects) {
    if (effects.operations.length)
      this.plugins?.events.emit("core:world-changed", {
        revision: this.worldState.state.revision,
        operations: effects.operations,
      });
    for (const fact of effects.facts)
      this.plugins?.events.emit("core:device-fact", fact);
    if (effects.operations.length || effects.facts.length)
      this.ui?.updateSide();
  }
  event(phase, position, payload) {
    try {
      this.publish(this.service.event(phase, position, payload));
    } catch (error) {
      this.fault(error);
    }
  }
  fault(error) {
    this.plugins?.events.emit("core:device-fault", { reason: error.message });
    this.ui?.toast("机关发生错误：" + error.message);
  }
  interactFront() {
    const p = this.state.position,
      [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
        p.dir
      ],
      device = this.service.catalog.ordered.find(
        (d) =>
          this.service.matches(d, { ...p, x: p.x + dx, y: p.y + dy }) &&
          this.service.catalog.mechanisms.get(d.mechanism).interact,
      );
    return device ? this.interact(device.id).ok : false;
  }
  interact(id) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    const d = this.service.catalog.get(id),
      p = this.state.position,
      delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
        p.dir
      ];
    if (
      !this.service.matches(d, { ...p, x: p.x + delta[0], y: p.y + delta[1] })
    )
      return { ok: false, reason: "请面向这个机关。" };
    this.publish(this.service.interact(id));
    this.save();
    return { ok: true };
  }
  tick(now, { paused = false } = {}) {
    const delta = Math.max(0, now - this.lastFrame);
    this.lastFrame = now;
    if (paused) return;
    try {
      this.publish(this.service.advance(delta));
    } catch (error) {
      this.fault(error);
    }
    if (this.processing || !this.canManageParty()) return;
    const request = this.service.nextRequest();
    if (!request) return;
    this.service.finishRequest(request);
    this.processing = true;
    void this.performFieldAction(request.action, request.input)
      .then((result) => {
        this.plugins?.events.emit("core:device-action", {
          ...request,
          outcome: result,
        });
        if (!result.ok) this.ui?.toast(result.reason || "机关行动未完成。");
      })
      .catch((error) => this.fault(error))
      .finally(() => {
        this.processing = false;
        this.save();
      });
  }
}
