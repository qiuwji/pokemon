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
  "defense-interaction",
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
  "damage-preview",
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
/** Permission-like phases where a plugin may return a bounded allow/deny/outcome decision. */
export const DECISION_PHASES = Object.freeze([
  "switch-check",
  "escape-check",
  "hit-check",
  "immunity",
  "action-permission",
  "defense-interaction",
]);
export class RulePipeline {
  constructor(operations) {
    this.operations = operations;
    this.hooks = new Map();
    this.sequence = 0;
    this.cache = new Map();
  }
  register({ id, phase, priority = 0, when = () => true, apply, modify, decide }) {
    const forms = [apply, modify, decide].filter((fn) => fn !== undefined).length;
    if (
      typeof id !== "string" ||
      !id ||
      this.hooks.has(id) ||
      !RULE_PHASES.includes(phase) ||
      !Number.isFinite(priority) ||
      typeof when !== "function" ||
      forms !== 1 ||
      (apply && typeof apply !== "function") ||
      (modify && typeof modify !== "function") ||
      (decide && (typeof decide !== "function" || !DECISION_PHASES.includes(phase)))
    )
      throw new Error(`Invalid rule hook ${id}`);
    const hook = {
      id,
      phase,
      priority,
      when,
      apply,
      modify,
      decide,
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
    for (const h of this.ordered(phase)) {
      if (!h.when(c)) continue;
      if (h.apply) h.apply(c);
      else if (h.decide) {
        const decision = h.decide(c);
        if (!decision || decision.kind === "abstain" || decision.kind === "allow")
          continue;
        if (decision.kind === "deny") {
          c.allowed = false;
          if (decision.reason !== undefined) c.reason = decision.reason;
        } else if (decision.kind === "outcome") {
          c.outcome = decision.outcome;
        } else throw new Error(`Invalid rule decision ${h.id}`);
      }
    }
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
