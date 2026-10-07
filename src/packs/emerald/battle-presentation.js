import { battleLayout } from "../../presentation/battle-view.js";
import { TRAINER_PICTURES, MON_PICTURE_OFFSETS } from "../../../generated/presentation/battle-assets.js";

export const EMERALD_BATTLE_VIEWPORT = Object.freeze({ width: 240, height: 160, backgroundHeight: 112 });
/** Native coordinates include the per-species transparent picture offset and elevation. */
export function emeraldBattleLayout(view) {
  const defaults = battleLayout(view), result = new Map();
  for (const back of [true, false]) {
    const seats = view.combatants.filter(c => defaults.get(c.seatId).back === back);
    seats.forEach((c, index) => {
      const multi = seats.length > 1;
      const x = back ? (multi ? [32, 90][index] : 72) : (multi ? [200, 152][index] : 176);
      const y = back ? (multi ? [80, 88][index] : 80) : (multi ? [40, 32][index] : 40);
      // Preserve the generic layout for extension formats with more than two seats per side.
      if (seats.length > 2) {
        const p = defaults.get(c.seatId);
        result.set(c.seatId, { ...p, x: p.x * .75, y: p.y * 160 / 224, baseline: p.baseline * 160 / 224, size: 64 });
        return;
      }
      const offset = MON_PICTURE_OFFSETS[c.monster?.species] || {};
      const centerY = y + (offset[back ? "back" : "front"] || 0) - (back ? 0 : offset.elevation || 0);
      result.set(c.seatId, { x, y: centerY, baseline: centerY + 32, size: 64, back });
    });
  }
  return result;
}
export function battleTrainer(actor, back = false) {
  const picture = TRAINER_PICTURES[`${actor}:${back ? "back" : "front"}`];
  return { actor, back, ...picture, frame: picture?.rest || 0 };
}
/** Only owned defeat lines move into combat; extension story continuations retain their order. */
export function emeraldDefeatDialogue(state, battle) {
  if (battle.script === "rival")
    return `emerald:route103.defeat.${state.playerGender === "female" ? "female" : "male"}`;
  if (["calvin", "rick", "tiana", "allen"].includes(battle.trainerId))
    return `emerald:dialogues.regions.petalburg.${battle.trainerId}.after`;
  return null;
}
/** BattleScript_ActionWallyThrow recalls the loaned monster before returning to the bag. */
export function emeraldDemonstrationPrelude(battle, action) {
  if (battle.script !== "wally" || action.kind !== "item") return [];
  const view = battle.snapshot(), targetSeat = battle.commandSeat;
  return [
    { ...view, kind: "recall", targetSeat, text: "蛇纹熊，回来吧！" },
    { ...view, kind: "trainer-slide", trainers: [battleTrainer("Wally", true)], text: "", duration: 800 },
    { ...view, kind: "text", text: "现在该扔精灵球了，对吧？", duration: 1400 },
  ];
}
export function emeraldBattleOpening(state, options, db, enemy) {
  const playerActor = options.script === "wally" ? "Wally" : state.playerGender === "female" ? "MayNormal" : "BrendanNormal";
  const rivalActor = state.playerGender === "female" ? "BrendanNormal" : "MayNormal";
  const foeActor = options.trainerActor || (options.script === "rival" ? rivalActor : "Youngster");
  const trainers = [battleTrainer(playerActor, true), ...(options.trainer ? [battleTrainer(foeActor)] : [])];
  const name = options.trainerName || (options.script === "rival" ? (state.playerGender === "female" ? "小悠" : "小遥") : "训练家");
  return {
    trainers,
    exitTransition: { coverMs: 16 * 1000 / 60, revealMs: 16 * 1000 / 60 },
    entryPhases: [
      { introPhase: "slide", message: null, duration: 2000,
        ...(options.trainer ? { dialogue: { name: "", lines: [`${name} 想要对战！`] } } : {}),
        text: options.trainer ? "" : `野生的${db.species[enemy.species].name}跳出来了！` },
      ...(options.trainer ? [{ introPhase: "send", message: null, sendBack: false, duration: 1500, text: `${name}派出了宝可梦！` }] : []),
      { introPhase: "send", message: null, sendBack: true, duration: 1950, text: options.script === "wally" ? "小光派出了蛇纹熊！" : "去吧，伙伴！" },
    ],
  };
}
