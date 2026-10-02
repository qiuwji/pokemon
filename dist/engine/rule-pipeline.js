/** Ordered rule hooks are session-owned. Effects use one operation registry; numeric rules return values. */
export const RULE_PHASES = Object.freeze([
  "entry",
  "switch-in",
  "state-applied",
  "state-tick",
  "state-removed",
  "weather",
  "types",
  "form",
  "weather-immunity",
  "burn-modifier",
  "leave",
  "action-permission",
  "action",
  "replacement",
  "move-availability",
  "selected-move",
  "move-start",
  "move-check",
  "item-transfer-check",
  "target-selection",
  "hit-check",
  "immunity",
  "primary",
  "before-damage",
  "damage",
  "after-hit",
  "contact",
  "secondary",
  "after-action",
  "recoil-check",
  "drain-check",
  "status-check",
  "status-applied",
  "stage-check",
  "stage-applied",
  "confusion-applied",
  "attraction-applied",
  "confusion-check",
  "flinch-check",
  "attraction-check",
  "switch-check",
  "escape-check",
  "round-end",
  "faint",
  "outcome",
  "experience",
  "field-step",
  "speed-base",
  "speed",
  "attack",
  "defense",
  "power",
  "damage-modifier",
  "base-damage",
  "pre-type-damage",
  "screen",
  "accuracy",
  "critical-stage",
  "critical-check",
  "secondary-chance",
  "pp-cost",
  "action-order",
  "experience-modifier",
  "ev-modifier",
  "prize-modifier",
  "encounter-rate",
  "encounter-select",
  "encounter-permission",
  "creation-nature",
  "creation-gender",
  "wild-held-rarity",
  "after-battle",
  "encounter-level",
  "capture-modifier",
  "hatch-rate",
  "friendship-modifier",
  "evolution-check",
]);
export class RulePipeline {
  constructor(operations) {
    this.operations = operations;
    this.hooks = new Map();
    this.sequence = 0;
    this.cache = new Map();
  }
  register({ id, phase, priority = 0, when = () => true, apply, modify }) {
    if (
      typeof id !== "string" ||
      !id ||
      this.hooks.has(id) ||
      !RULE_PHASES.includes(phase) ||
      !Number.isFinite(priority) ||
      typeof when !== "function" ||
      Boolean(apply) === Boolean(modify) ||
      (apply && typeof apply !== "function") ||
      (modify && typeof modify !== "function")
    )
      throw new Error(`Invalid rule hook ${id}`);
    const hook = {
      id,
      phase,
      priority,
      when,
      apply,
      modify,
      sequence: this.sequence++,
    };
    this.hooks.set(id, hook);
    this.cache.delete(phase);
    return () => {
      this.cache.delete(phase);
      return this.hooks.delete(id);
    };
  }
  ordered(phase) {
    if (!RULE_PHASES.includes(phase))
      throw new Error(`Unknown rule phase ${phase}`);
    if (!this.cache.has(phase))
      this.cache.set(
        phase,
        [...this.hooks.values()]
          .filter((h) => h.phase === phase)
          .sort((a, b) => a.priority - b.priority || a.sequence - b.sequence),
      );
    return this.cache.get(phase);
  }
  run(phase, c) {
    for (const h of this.ordered(phase)) if (h.apply && h.when(c)) h.apply(c);
  }
  calculate(phase, value, c) {
    for (const h of this.ordered(phase))
      if (h.modify && h.when(c)) {
        value = h.modify(value, c);
        if (!Number.isFinite(value))
          throw new Error(`Non-finite modifier ${h.id}`);
      }
    return value;
  }
  transform(phase, value, c) {
    for (const hook of this.ordered(phase))
      if (hook.modify && hook.when(c)) value = hook.modify(value, c);
    return value;
  }
  effects(steps, c) {
    return this.operations.run(steps, c);
  }
}
