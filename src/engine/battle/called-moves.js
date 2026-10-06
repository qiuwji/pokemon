/** Called moves share the normal executor, with one readiness/PP payment and bounded recursion. */
export function executeCalledMove(c, id, { target = null } = {}) {
  const b = c.battle;
  if ((c.action.callDepth || 0) >= 8)
    throw new Error("Called move nesting exceeded");
  const action = b.actionLifecycle.replace(c.action, id);
  return b.moves.execute({
    ...action,
    index: -1,
    target,
    continuation: false,
    replacement: true,
    skipPP: true,
    skipReadiness: true,
    callDepth: (c.action.callDepth || 0) + 1,
  });
}
