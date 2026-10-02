export const CONTINUOUS_OPERATIONS = {
  rolloutPower(c) {
    const lock = c.battle.actionLifecycle.locked(c.actorSeat);
    const completed = c.action.continuation && lock ? 5 - lock.remaining : 0;
    c.power *= 2 ** completed;
    if (c.battle.states.lookup("defense_curl", c.actorSeat)) c.power *= 2;
  },
  uproar(c) {
    if (c.dealt && !c.battle.states.lookup("uproar", c.actorSeat))
      c.battle.states.attach("uproar", c.actorSeat, { moveId: c.move.id });
  },
};
CONTINUOUS_OPERATIONS.rolloutPower.scope = "action";
CONTINUOUS_OPERATIONS.uproar.scope = "action";
