import { effectiveness } from "../model.js";
/** Formula preparation is separate from HP settlement; plans describe independent per-hit bases. */
export class BattleDamageCalculation {
  constructor(battle) {
    this.battle = battle;
  }
  formula(c, { critical = false, power = c.power, spread = 1 } = {}) {
    const b = this.battle;
    return b.rules.damage(
      b.forms.effective(c.mon),
      b.forms.effective(c.opponent),
      c.move,
      b.db,
      b.rng,
      {
        aStages: c.selfState.stages,
        dStages: c.targetState.stages,
        critical,
        power,
        spread,
        baseMultiplier: c.baseMultiplier || 1,
        modifier: (phase, value, formula) =>
          b.traits.calculate(phase, value, { ...c, ...formula }),
        attackerTypes: b.traits.types(c.actorSeat),
        defenderTypes: b.traits.types(c.targetSeat),
      },
    );
  }
  roll(c, plan = null) {
    const b = this.battle,
      permission = { ...c, allowed: true };
    b.traits.run("critical-check", permission);
    const critical =
      !c.definition.noCritical &&
      c.fixedDamage === undefined &&
      permission.allowed &&
      b.rules.critical({
        stage: b.traits.calculate(
          "critical-stage",
          (c.selfState.focus ? 2 : 0) + (c.definition.criticalStage || 0),
          c,
        ),
        rng: b.rng,
        chances: b.rules.criticalChances,
      });
    if (plan)
      return this.scale(c, {
        amount: Math.max(
          1,
          Math.floor(
            (plan.baseDamage * (critical ? 2 : 1) * (85 + b.rng.int(16))) / 100,
          ),
        ),
        type: 1,
        critical,
      });
    if (c.fixedDamage !== undefined)
      return this.scale(c, {
        amount: c.fixedDamage,
        type: effectiveness(
          c.move.type,
          b.traits.types(c.targetSeat),
          b.db.typeChart,
        ),
        critical: false,
      });
    const result = this.formula(c, {
      critical,
      power: b.rules.environmentPower({
        power: c.power,
        type: c.move.type,
        waterSport: b.waterSport,
        mudSport: b.mudSport,
      }),
      spread: c.targetMode === "opponents" && c.targetCount > 1 ? 0.5 : 1,
    });
    return this.scale(c, result);
  }
  /** ScaledDamage from a defense interaction enters the normal damage pipeline once. */
  scale(c, result) {
    const scale = c.damageScale;
    if (
      scale &&
      Number.isFinite(scale.numerator) &&
      Number.isFinite(scale.denominator) &&
      scale.numerator > 0 &&
      scale.denominator > 0
    )
      result.amount = Math.max(
        1,
        Math.floor((result.amount * scale.numerator) / scale.denominator),
      );
    return result;
  }
  preview(c) {
    const result = this.formula(c, {
      power: this.battle.rules.environmentPower({
        power: c.power,
        type: c.move.type,
        waterSport: this.battle.waterSport,
        mudSport: this.battle.mudSport,
      }),
    });
    if (result.type !== 0)
      result.amount = this.battle.traits.calculate(
        "damage-preview",
        result.amount,
        {
          ...c,
          substitute: !!this.battle.states.lookup("substitute", c.targetSeat),
        },
      );
    return this.scale(c, result);
  }
}
