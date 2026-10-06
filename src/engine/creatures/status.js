/** Persistent major-status vocabulary and family matching shared by cures and rule attachments. */
export const statusCategory = (status) =>
  status === "toxic" ? "poison" : status;
export const matchesStatus = (actual, expected) =>
  Boolean(actual) &&
  (expected === "any" ||
    actual === expected ||
    (expected === "poison" && actual === "toxic"));
export function clearStatus(mon) {
  mon.status = null;
  delete mon.sleep;
}
