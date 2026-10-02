export const RANDOM_POWER_OPERATIONS = {
  magnitude(c) {
    const roll = c.battle.rng.int(100),
      entry = [
        [5, 10, 4],
        [15, 30, 5],
        [35, 50, 6],
        [65, 70, 7],
        [85, 90, 8],
        [95, 110, 9],
        [100, 150, 10],
      ].find(([limit]) => roll < limit);
    c.power = entry[1];
    c.emit(`震级 ${entry[2]}！`, "state");
  },
  weatherBall(c) {
    const weather = c.battle.traits.weather(),
      type = { rain: "water", sand: "rock", sun: "fire", hail: "ice" }[weather];
    if (type) {
      c.move.type = type;
      c.baseMultiplier = 2;
    }
  },
  present(c) {
    const roll = c.battle.rng.int(256);
    if (roll < 204) {
      c.power = roll < 102 ? 40 : roll < 178 ? 80 : 120;
      return;
    }
    c.move.presentHealing = true;
    c.move.power = 0;
  },
  presentHeal(c) {
    if (!c.move.presentHealing) return;
    c.skipDamage = true;
    c.successful = c.registry.run([{ op: "restoreHP", fraction: 1 / 4 }], {
      ...c,
      target: c.opponent,
      targetSide: c.targetSeat,
    })[0];
  },
};
RANDOM_POWER_OPERATIONS.magnitude.scope = "action";
RANDOM_POWER_OPERATIONS.weatherBall.scope = "action";
RANDOM_POWER_OPERATIONS.present.scope = "action";
