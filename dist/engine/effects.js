/** @typedef {{op:string, [key:string]:unknown}} EffectStep */
/** A single operation registry is used by moves and items. Validate before any cost. */
export class EffectRegistry {
  constructor(operations = {}) {
    this.operations = { ...COMMON_OPERATIONS, ...operations };
  }
  validate(steps, path = "effects") {
    if (!Array.isArray(steps)) throw new Error(`${path}: expected an array`);
    steps.forEach((step, i) => {
      const handler = this.operations[step?.op];
      if (
        !Object.hasOwn(this.operations, step?.op) ||
        typeof handler !== "function"
      )
        throw new Error(`${path}[${i}]: unknown operation ${step?.op}`);
      handler.validate?.(step, `${path}[${i}]`);
    });
  }
  run(steps, context) {
    this.validate(steps);
    return steps.map((step) => this.operations[step.op](context, step));
  }
}
const positive = (value, path) => {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${path}: must be positive`);
};
const restoreHP = (c, step) => {
  const target = c.target;
  if (!target || target.hp <= 0 || target.hp >= target.stats.hp) return false;
  const amount =
    step.amount ?? Math.max(1, Math.floor(target.stats.hp * step.fraction));
  target.hp = Math.min(target.stats.hp, target.hp + amount);
  c.emit?.("恢复了体力！", "heal", { side: c.targetSide });
  return true;
};
restoreHP.validate = (s, p) =>
  positive(s.amount ?? s.fraction, p + ".amount/fraction");
const cureStatus = (c, step) => {
  if (
    !c.target?.status ||
    (step.status !== "any" && c.target.status !== step.status)
  )
    return false;
  c.target.status = null;
  delete c.target.sleep;
  c.emit?.("异常状态解除了！", "heal", { side: c.targetSide });
  return true;
};
cureStatus.validate = (s, p) => {
  if (
    !["poison", "burn", "paralysis", "sleep", "freeze", "any"].includes(
      s.status,
    )
  )
    throw new Error(`${p}.status: unknown status`);
};
export const COMMON_OPERATIONS = { restoreHP, cureStatus };
