import { planObjectMotion } from "../../../engine/object-motion.js";
/** Coordinates one validated grid displacement. No object-kind, HM, badge, or texture branches. */
export class WorldObjectOperations {
  constructor({
    field,
    movement,
    worldState,
    prepareWorldPatch,
    deviceEvent,
    plugins,
  }) {
    Object.assign(this, {
      field,
      movement,
      worldState,
      prepareWorldPatch,
      deviceEvent,
      plugins,
    });
  }
  prepare(operation) {
    if (this.field.busy)
      throw new Error("Object motion requires an idle field");
    this.movement.registry.get(operation.mode);
    const position = this.field.position;
    const motion = planObjectMotion(operation, {
      maps: this.worldState.maps,
      position,
      objects: this.field.npcs.occupants(position.map),
      elevation: this.field.world.elevation,
      objectPassage: (mode, c) => this.movement.traversal(mode, c),
      playerPassage: (c) => this.field.traversal(this.movement.state.mode, c),
    });
    const { map, x, y, elevation, previousElevation } = motion.to;
    const operations = [
      {
        kind: "object",
        map,
        id: motion.object,
        scope: motion.scope,
        changes: { x, y, elevation, previousElevation },
      },
    ];
    return {
      operation,
      motion,
      operations,
      draft: this.prepareWorldPatch(operations),
    };
  }
  commit(prepared) {
    // Recheck the real occupants, reservations and movement policy at the commit boundary.
    const live = this.prepare(prepared.operation);
    const before = structuredClone(this.worldState.state),
      position = { ...this.field.position };
    this.worldState.commit(live.draft);
    this.field.npcs.invalidate(live.motion.from.map, live.motion.object);
    if (live.motion.follower) {
      let moved;
      try {
        moved = this.field.move(prepared.operation.direction, {
          scripted: true,
          duration: live.motion.duration,
        });
      } catch (error) {
        if (this.field.pending) throw error;
        Object.assign(this.worldState.state, before);
        Object.assign(this.field.position, position);
        throw error;
      }
      if (!moved) {
        Object.assign(this.worldState.state, before);
        Object.assign(this.field.position, position);
        throw new Error("Object follower plan changed");
      }
    }
    const subject = {
      id: live.motion.object,
      kind: "world-object",
      from: live.motion.from,
      to: live.motion.to,
    };
    this.deviceEvent("occupancy", subject.from, { subject, stage: "leave" });
    this.deviceEvent("occupancy", subject.to, { subject, stage: "enter" });
    this.plugins?.events.emit("core:world-changed", {
      revision: this.worldState.state.revision,
      operations: live.operations,
    });
    this.plugins?.events.emit("core:object-moved", subject);
    return {
      ok: true,
      motion: {
        duration: live.motion.duration,
        objects: [live.motion],
        subject,
      },
    };
  }
  settle(motion) {
    this.deviceEvent("occupancy", motion.subject.to, {
      subject: motion.subject,
      stage: "settle",
    });
  }
}
