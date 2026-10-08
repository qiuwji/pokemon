import { FrameSequenceBuilder } from "../../engine/extensions/frame-sequence-builder.js";
import { objectSchema } from "../../engine/extensions/values.js";

export const CENTER_RESOURCES = Object.freeze({
  "field-heal-ball": "generated/assets/field-heal-ball.png",
  "field-heal-monitor": "generated/assets/field-heal-monitor.png",
});

/** field_effect.c: includes Eggs (CalculatePlayerPartyCount), 25-frame placement,
 * palette groups, 128-frame monitor and the 160-frame MUS_HEAL fanfare wait. */
export function emeraldCenterSequence(party) {
  const count = Math.min(6, party.length);
  if (!count) throw new Error("Healing presentation requires a party");
  const flash = (count - 1) * 25 + 32, end = flash + 160 + 3;
  const builder = new FrameSequenceBuilder().track({ frames: end, sample: frame => {
    const age = frame - flash, sprites = [];
    if (age < 150) for (let i = 0; i < count && frame >= i * 25; i++) {
      const tileFrame = age < 0 ? 0 : age < 96 ? 1 + Math.floor(age / 8) % 4 :
        5 + Math.min(3, Math.floor((age - 96) / 8));
      sprites.push({ resource: "field-heal-ball", width: 8, height: 8, tileFrame,
        x: 93 + i % 2 * 6, y: 36 + Math.floor(i / 2) * 4 });
    }
    if (age >= 0 && age < 128) sprites.push({ resource: "field-heal-monitor", width: 24, height: 16,
      tileFrame: Math.floor(age / 16) % 2, x: 124, y: 24 });
    return { sprites };
  } });
  for (let i = 0; i < count; i++) builder.cue("emerald:ball.shake", { at: i * 25 });
  builder.cue("emerald:heal", { at: flash });
  return builder.build();
}

const schema = objectSchema({ map: { type: "string" }, id: { type: "string" } });
const action = (frames, indices, step) => ({ schema, duration: frames * 1000 / 60,
  objects: f => [{ ...f.payload, x: 0, y: 0,
    frame: indices[Math.min(indices.length - 1, Math.floor(f.progress * frames / step))] }] });
export const CENTER_ACTOR_SCENES = Object.freeze({
  // sPicTable_Nurse maps its walking indices to the standing frame.
  "emerald:nurse-left": action(8, [2, 2, 2, 2], 2),
  "emerald:nurse-down": action(8, [0, 0, 0, 0], 2),
  "emerald:nurse-bow": { schema, duration: 52 * 1000 / 60,
    objects: f => [{ ...f.payload, x: 0, y: 0,
      frame: f.progress * 52 >= 8 && f.progress * 52 < 40 ? 3 : 0 }] },
});
