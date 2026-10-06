import { actionMove } from "./moves.js";
import { effectiveness } from "../model.js";
/**
 * Conservative decision observations. Pure formulas use a local mean roll, never gameplay RNG.
 * `publicOnly` skips trait modifiers entirely so an `observed` AI cannot infer hidden abilities or
 * held items from a precise damage estimate (the value must not be computed and then hidden).
 */
export function analyzeCandidate(b, action, { publicOnly = false } = {}) {
  const mon = b.roster.occupant(action.seat);
  if (action.kind === "switch") {
    const target = b.roster.owner(action.seat).party[action.index];
    return {
      kind: "switch",
      hp: target.hp,
      maxHP: target.stats.hp,
      types: b.db.species[target.species].types,
    };
  }
  if (action.kind === "item")
    return {
      kind: "item",
      item: action.item,
      index: action.index,
      hp: b.roster.owner(action.seat).party[action.index]?.hp ?? null,
    };
  const prepared = action.augment ? b.augments.prepare(action) : action;
  const move = actionMove(b, prepared),
    definition = b.moveEffects.get(move.effect),
    mode = b.targeting.mode(move);
  const targets =
    action.target?.kind === "seat"
      ? [b.roster.seat(action.target.id)]
      : b.targeting.candidates(action.seat, move);
  const known = definition?.supported !== false;
  return {
    kind: "move",
    move,
    definition,
    coverage: !known ? "unknown" : move.power > 0 ? "estimated" : "exact",
    confidence: !known ? "none" : publicOnly ? "public" : "full",
    actor: {
      uid: mon.uid,
      hp: mon.hp,
      maxHP: mon.stats.hp,
      status: mon.status,
      stages: { ...b.conditions.get(action.seat).stages },
    },
    targets: targets.map((s) => {
      const target = b.roster.occupant(s.id),
        context = {
          actorSeat: action.seat,
          targetSeat: s.id,
          mon,
          opponent: target,
          move,
        };
      const types = b.traits.types(s.id),
        type = effectiveness(move.type, types, b.db.typeChart);
      // Formula approximation excludes dynamic preparation, fixed damage, criticals and secondary effects.
      // `publicOnly` uses no trait modifier at all, so hidden abilities/items cannot be inferred.
      const amount =
        move.power > 0 && known
          ? b.rules.damage(
              b.forms.effective(mon),
              b.forms.effective(target),
              move,
              b.db,
              { int: () => 7 },
              {
                critical: false,
                aStages: b.conditions.get(action.seat).stages,
                dStages: b.conditions.get(s.id).stages,
                spread: mode === "opponents" && targets.length > 1 ? 0.5 : 1,
                attackerTypes: b.traits.types(action.seat),
                defenderTypes: types,
                modifier: publicOnly
                  ? (_phase, value) => value
                  : (phase, v, c) =>
                      b.traits.calculate(phase, v, { ...context, ...c }),
              },
            ).amount
          : 0;
      return {
        seat: s.id,
        uid: target.uid,
        opposing: b.roster.isOpposing(action.seat, s.id),
        hp: target.hp,
        maxHP: target.stats.hp,
        status: target.status,
        types: [...types],
        type,
        estimatedDamage: type === 0 ? 0 : amount,
      };
    }),
  };
}
