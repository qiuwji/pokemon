/** Serial controller traversal. Steps remain owned by the field; never teleports or resolves UI. */
export class ControlWalk {
  constructor({ move, availability, settle, position, events, now }) {
    Object.assign(this, { move, availability, settle, position, events, now });
    this.active = null;
  }
  cancel() {
    if (!this.active) return { cancelled: false };
    this.active.cancelled = true;
    return { cancelled: true };
  }
  async run({ directions, running = false, timeoutMs = 10000, continueOnMapChange = false }) {
    if (this.active) return { status: "busy", reason: "route-active", steps: [], completed: 0, stoppedAt: 0 };
    const token = { cancelled: false }; this.active = token;
    const start = this.now(), steps = [];
    let cursor = this.events().cursor;
    let reason = null;
    try {
      for (let index = 0; index < directions.length; index++) {
        if (token.cancelled) { reason = "cancelled"; break; }
        if (this.now() - start >= timeoutMs) { reason = "timeout"; break; }
        const before = this.availability();
        if (!before.canMove) { reason = before.reason; break; }
        const step = this.move(directions[index], { running });
        steps.push({ index, direction: directions[index], ...step });
        if (!step.moved) { reason = step.reason; break; }
        const interruption = await this.settle({ deadline: start + timeoutMs, cancelled: () => token.cancelled });
        steps.at(-1).settled = !interruption;
        steps.at(-1).finalPosition = { ...this.position() };
        if (interruption || token.cancelled) { reason = interruption || "cancelled"; break; }
        const changes = this.events({ since: cursor, limit: 256 });
        if (changes.gap) { reason = "event-gap"; break; }
        cursor = changes.cursor;
        const boundary = changes.entries.find(e =>
          ["teleport", "dialogue.started", "choice.opened", "battle.started"].includes(e.type) ||
          (!continueOnMapChange && e.type === "map.changed"));
        if (boundary) { reason = boundary.type; break; }
        const after = this.availability();
        if (!after.canMove) { reason = after.reason; break; }
      }
      const completed = steps.filter(s => s.moved).length;
      return { status: reason ? "stopped" : "completed", reason, completed,
        stoppedAt: reason ? Math.max(0, steps.length - 1) : null,
        nextIndex: steps.filter(s => s.moved).length,
        attempted: steps.length, requested: directions.length, steps, position: { ...this.position() } };
    } finally { this.active = null; }
  }
}
