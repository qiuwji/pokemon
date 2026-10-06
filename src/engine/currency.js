/** Currency plans are pure; validate before committing inventory or other resources. */
export function validateMoney(value, message = "Invalid currency settlement") {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(message);
  return value;
}
export function changeMoney(current, delta, { clamp = false, message } = {}) {
  validateMoney(current, message);
  if (!Number.isSafeInteger(delta))
    throw new Error(message || "Invalid currency change");
  const next = current + delta;
  // Check overflow before clamping: clamping must not conceal invalid arithmetic.
  if (!Number.isSafeInteger(next))
    throw new Error(message || "Money overflow");
  return validateMoney(clamp ? Math.max(0, next) : next, message);
}
export function settleMoney(state, value, message) {
  state.money = validateMoney(value, message);
}
