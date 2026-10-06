/** Owns local, transactional battle earnings; application code commits the final reward once. */
export class BattleSpoils {
  constructor(battle) {
    this.battle = battle;
    this.coins = 0;
    this.reward = 0;
  }
  scatter(seat) {
    const b = this.battle;
    if (b.roster.alliance(seat) !== b.homeAlliance) return;
    this.coins = Math.min(
      65535,
      this.coins + b.roster.occupant(seat).level * 5,
    );
    b.emit("金币散落在地上！", "money", { actorSeat: seat, coins: this.coins });
  }
  settle(result) {
    const amount = this.battle.rules.payDayReward({
      result,
      coins: this.coins,
      multiplier: this.battle.prizeMultiplier || 1,
      battle: this.battle,
    });
    if (!Number.isSafeInteger(amount) || amount < 0)
      throw new Error("Invalid battle currency reward");
    this.reward = amount;
    if (amount) this.battle.emit(`拾取了 ¥${amount}！`, "money", { amount });
  }
}
