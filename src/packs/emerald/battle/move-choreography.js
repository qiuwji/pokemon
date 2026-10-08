import { FrameSequenceBuilder } from "../../../engine/extensions/frame-sequence-builder.js";
import { shakePose, ellipsePose, keyframePose } from "../../../engine/extensions/frame-tracks.js";
import { hitSplat, scratchMarks, cryLine, emberShot, emberFlare, waterShot, waterDroplet } from "./move-tracks.js";
import { sin } from "./animation-math.js";

const sound = id => "emerald-audio:se_m_" + id;
/** Authored choreography verified against source lines, not a bytecode/script interpreter. */
const recipes = Object.freeze({
  pound(b, c) {
    b.seek(6).track(hitSplat(c.target)).track(shakePose(c.targetSeat, { x: 3, toggles: 6, delay: 1 })).cue(sound("double_slap"));
    return 21;
  },
  tackle(b, c) {
    b.seek(6).track(keyframePose(c.actorSeat, 12, [
      { frame: 0, values: { x: 0 } }, { frame: 4, values: { x: 16 * c.sign } },
      { frame: 6, values: { x: 16 * c.sign } }, { frame: 10, values: { x: 0 } },
    ]));
    b.seek(14).track(hitSplat(c.target)).track(shakePose(c.targetSeat, { x: 3, toggles: 6, delay: 1 })).cue(sound("comet_punch"));
    return 29;
  },
  scratch(b, c) {
    b.seek(6).track(scratchMarks(c.target)).track(shakePose(c.targetSeat, { x: 3, toggles: 6, delay: 1 })).cue(sound("scratch"));
    return 34;
  },
  growl(b, c) {
    b.cue("emerald:cry." + c.species, { at: 3 });
    for (const at of [3, 20])
      for (const [y, direction] of [[-8, 0], [0, 2], [8, 1]]) b.track(cryLine(c.source, { y, direction }), { at });
    for (const seat of [c.targetSeat, c.targetPartner].filter(Boolean))
      b.track(shakePose(seat, { x: 1, toggles: 9, delay: 1 }), { at: 32 });
    return 51;
  },
  tail_whip(b, c) {
    b.track(ellipsePose(c.actorSeat, { width: 12 * c.sign, height: 4, cycles: 2, framesPerCycle: 32, period: 256, sine: sin }));
    for (const at of [0, 25, 50]) b.cue(sound("tail_whip"), { at });
    return 64;
  },
  ember(b, c) {
    for (const at of [3, 9]) b.cue(sound("ember"), { at });
    [-16, 0, 16].forEach((x, i) => b.track(emberShot(c.source, c.target, x), { at: 3 + i * 6 }));
    b.cue(sound("flame_wheel"), { at: 33 });
    for (const at of [33, 39, 45]) b.track(emberFlare(c.source, c.target), { at });
    return 68;
  },
  water_gun(b, c) {
    b.track(waterShot(c.source, c.target), { at: 9 }).cue(sound("bubble"), { at: 9 });
    b.track(hitSplat(c.target, { water: true }), { at: 51 }).track(shakePose(c.targetSeat, { x: 1, toggles: 8, delay: 1 }), { at: 51 });
    [{ x: 0, y: -15, duration: 55 }, { x: 15, y: -20, duration: 50 }, { x: -15, y: -10, duration: 45 }]
      .forEach((droplet, i) => {
        const at = 51 + i * 12;
        b.track(waterDroplet(c.target, droplet), { at }).cue(sound("crabhammer"), { at });
      });
    return 126;
  },
});
export const NATIVE_MOVE_IDS = Object.freeze(Object.keys(recipes));

export function nativeMoveSequence({ event, layout }, { soundFrames = () => 0, hasSound = () => true } = {}) {
  const recipe = recipes[event.move?.id];
  if (!recipe) return null;
  if (event.move?.successful === false) return new FrameSequenceBuilder().build();
  const source = layout[event.actorSeat], target = layout[event.targetSeat];
  if (!source || !target) return null;
  const actor = event.combatants.find(c => c.seatId === event.actorSeat),
    targetMon = event.combatants.find(c => c.seatId === event.targetSeat);
  const context = { source, target, actorSeat: event.actorSeat, targetSeat: event.targetSeat,
    sign: source.back ? 1 : -1, species: actor?.monster?.species,
    targetPartner: event.combatants.find(c => c.sideId === targetMon?.sideId && c.seatId !== event.targetSeat && c.monster)?.seatId };
  const builder = new FrameSequenceBuilder();
  const visualEnd = recipe(builder, context);
  builder.cues = builder.cues.filter(cue => hasSound(cue.id));
  const audioEnd = Math.max(0, ...builder.cues.map(cue => cue.frame + soundFrames(cue.id)));
  return builder.build({ frames: Math.max(visualEnd, Math.min(visualEnd + 90, audioEnd + 1)) });
}
