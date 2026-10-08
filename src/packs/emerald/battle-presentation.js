import { nativePartySlots } from "./battle/party-summary.js";
import { battleLayout } from "../../presentation/battle-view.js";
import { TRAINER_PICTURES, TRAINER_BATTLE_PICTURES, MON_PICTURE_OFFSETS } from "../../../generated/presentation/battle-assets.js";
import { EMERALD_BATTLE_EXIT } from "./battle/exit-choreography.js";

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
      result.set(c.seatId, { x, y: centerY, baseY: y, baseline: centerY + 32, size: 64, back });
    });
  }
  return result;
}
export function battleTrainer(actor, back = false, trainerId = null) {
  const identity = !back && TRAINER_BATTLE_PICTURES[trainerId] || actor;
  const picture = TRAINER_PICTURES[`${identity}:${back ? "back" : "front"}`];
  return { actor, back, ...picture, frame: picture?.rest || 0,
    position: { x: back ? 80 : 176, y: back ? 80 : 40 } };
}
/** Only owned defeat lines move into combat; extension story continuations retain their order. */
export function emeraldDefeatDialogue(state, battle) {
  if (battle.script === "rival")
    return `emerald:route103.defeat.${state.playerGender === "female" ? "female" : "male"}`;
  if (["calvin", "rick", "tiana", "allen"].includes(battle.trainerId))
    return `emerald:dialogues.regions.petalburg.${battle.trainerId}.defeat`;
  if (["haley", "ivan", "billy", "winston", "cindy", "darian"].includes(battle.trainerId))
    return `emerald:dialogues.route104.trainers.${battle.trainerId}.defeat`;
  if (battle.trainerId === "ginaAndMia") return "emerald:dialogues.route104.trainers.gina.defeat";
  if (["lyle", "james"].includes(battle.trainerId))
    return `emerald:dialogues.woods.trainers.${battle.trainerId}.defeat`;
  if (battle.trainerId === "aquaPetalburgWoods") return "emerald:dialogues.woods.rescue.defeat";
  return null;
}
/** Local whiteout pages precede the blackout for every result owner, including field encounters. */
export function emeraldBattleResultPrelude(state, battle) {
  return battle.result === "loss" ? [{ ...battle.snapshot(), kind: "text", text: "",
    dialogue: { name: "", lines: [`${state.playerName}已经没有可以战斗的宝可梦了！`, `${state.playerName}眼前一片漆黑……`] } }] : [];
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
  const enemies = Array.isArray(enemy) ? enemy : [enemy];
  const sentNames = options.format === "doubles" ? enemies.slice(0, 2) : enemies.slice(0, 1);
  const playerActor = options.script === "wally" ? "Wally" : state.playerGender === "female" ? "MayNormal" : "BrendanNormal";
  const rivalActor = state.playerGender === "female" ? "BrendanNormal" : "MayNormal";
  const foeActor = options.trainerActor || (options.script === "rival" ? rivalActor : "Youngster");
  const trainers = [{ ...battleTrainer(playerActor, true), slideOffset: 240 }, ...(options.trainer ? [{ ...battleTrainer(foeActor, false, options.trainerId), slideOffset: -240 }] : [])];
  const name = options.trainerName || (options.script === "rival" ? (state.playerGender === "female" ? "小悠" : "小遥") : "训练家");
  return {
    trainers,
    exitTransition: EMERALD_BATTLE_EXIT,
    entryPhases: [
      { introPhase: "slide", message: null,
        text: options.trainer ? "" : `野生的${db.species[enemies[0].species].name}跳出来了！` },
      ...(options.trainer ? [{ introPhase: "summary", message: null, text: "", dialogueDuring: true,
        dialogue: { name: "", lines: [`${name} 想要对战！`] } }, { introPhase: "send", message: null, sendBack: false,
        text: `${name}派出了${sentNames.map(mon => db.species[mon.species].name).join("和")}！` }] : []),
      { introPhase: "send", message: null, sendBack: true,
        text: options.script === "wally" ? "小光派出了蛇纹熊！" : `去吧，${state.party.filter(m => !m.egg && m.hp > 0).slice(0, options.format === "doubles" ? 2 : 1).map(mon => db.species[mon.species].name).join("和") || "伙伴"}！` },
    ].map(phase => ({ ...phase, partySummary: options.trainer ? {
      home: nativePartySlots(state.party, true), away: nativePartySlots(enemies, false),
    } : null })),
  };
}
