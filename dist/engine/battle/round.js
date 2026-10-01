import { selectedMove } from "./moves.js";
/** Round scheduling only. Invalid requests never select AI moves or advance the PRNG. */
export class RoundResolver {
  constructor(battle) {
    this.battle = battle;
  }
  resolve(action) {
    const b = this.battle;
    if (
      action.kind === "switch" &&
      action.forced &&
      b.rules.forcedReplacementFree
    ) {
      b.actions.switch(0, action.index);
      return;
    }
    b.turn++;
    b.conditions.startRound();
    if (action.kind === "move") this.moves(action);
    else {
      if (action.kind === "switch") b.actions.switch(0, action.index);
      if (action.kind === "item") b.actions.item(action);
      if (action.kind === "run") b.actions.run();
      if (!b.ended) {
        b.executeMove(1, b.enemyMove());
        b.outcomes.observe();
      }
    }
    if (!b.ended) this.residuals();
    b.outcomes.replaceOpponent();
  }
  moves(action) {
    const b = this.battle,
      enemyIndex = b.enemyMove();
    const home = selectedMove(b, 0, action.index),
      away = selectedMove(b, 1, enemyIndex);
    const homeSpeed = b.speed(b.player, 0),
      awaySpeed = b.speed(b.enemy, 1);
    const homeFirst =
      home.priority !== away.priority
        ? home.priority > away.priority
        : homeSpeed !== awaySpeed
          ? homeSpeed > awaySpeed
          : b.rng.next() < 0.5;
    for (const side of homeFirst ? [0, 1] : [1, 0]) {
      if (b.ended || b.player.hp <= 0 || b.enemy.hp <= 0) break;
      b.executeMove(side, side === 0 ? action.index : enemyIndex);
      b.outcomes.observe();
    }
  }
  residuals() {
    const b = this.battle;
    for (const side of [0, 1]) {
      const mon = b.monster(side),
        state = b.conditions.get(b.seatId(side));
      if (mon.hp <= 0) continue;
      if (["poison", "burn"].includes(mon.status)) {
        mon.hp = Math.max(
          0,
          mon.hp -
            Math.max(1, Math.floor(mon.stats.hp / b.rules.residualDivisor)),
        );
        b.emit(
          `${b.name(mon)} 受到了${mon.status === "poison" ? "中毒" : "灼伤"}伤害！`,
          "hurt",
          { side },
        );
        b.outcomes.observe();
        if (b.ended) break;
      }
      if (mon.hp > 0 && state.traps > 0) {
        state.traps--;
        mon.hp = Math.max(
          0,
          mon.hp - Math.max(1, Math.floor(mon.stats.hp / b.rules.trapDivisor)),
        );
        b.emit(`${b.name(mon)} 受到了持续伤害！`, "hurt", { side });
        b.outcomes.observe();
        if (b.ended) break;
      }
    }
  }
}
