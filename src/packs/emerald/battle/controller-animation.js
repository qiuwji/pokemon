import { MON_PICTURE_OFFSETS } from "../../../../generated/presentation/battle-assets.js";
import { FrameSequenceBuilder } from "../../../engine/extensions/frame-sequence-builder.js";

/** CalcNewBarValue(max, old, received, ..., B_HEALTHBAR_PIXELS / 8, 1). */
export function nativeHealthBar(oldValue, newValue, maxValue) {
  if (!(maxValue > 0)) return [{ hp: 0, fraction: 0 }];
  const fixed = maxValue < 48, unit = fixed ? 256 : 1;
  const step = fixed ? Math.trunc(maxValue * 256 / 48) : 1;
  const goal = Math.max(0, Math.min(maxValue, newValue)) * unit;
  let current = oldValue * unit;
  const filling = goal > current, values = [{ hp: oldValue, fraction: oldValue / maxValue }];
  while (current !== goal) {
    current = filling ? Math.min(goal, current + step) : Math.max(goal, current - step);
    values.push({ hp: filling ? Math.floor(current / unit) : Math.ceil(current / unit), fraction: current / unit / maxValue });
  }
  return values;
}

function controllerTrack(event, previous, layout) {
  const position = layout.get(event.targetSeat);
  if (!position) return null;
  if (["hurt", "heal"].includes(event.kind)) {
    const mon = event.combatants.find(c => c.seatId === event.targetSeat)?.monster;
    const old = previous?.combatants.find(c => c.seatId === event.targetSeat)?.monster;
    if (!mon || !old || mon.uid !== old.uid) return null;
    const values = nativeHealthBar(old.hp, mon.hp, mon.stats.hp);
    const noEffect = event.kind === "hurt" && event.message?.params?.type === 0;
    const blink = event.hit && !noEffect ? 33 : 0;
    const frames = blink + values.length;
    const type = event.message?.params?.type;
    return {
      frames, cues: blink ? [{ frame: 0,
        id: `emerald-audio:se_${type > 1 ? "super_effective" : type < 1 ? "not_effective" : "effective"}` }] : [],
      sample(age) {
        const bar = values[Math.max(0, Math.min(values.length - 1, age - blink))];
        return { poses: [{ seatId: event.targetSeat, flash: age < 32 && Math.floor(age / 4) % 2 === 0 }],
          healthBars: [{ seatId: event.targetSeat, ...bar }] };
      },
    };
  }
  if (event.kind === "faint") {
    const monster = event.combatants.find(c => c.seatId === event.targetSeat)?.monster;
    const offset = MON_PICTURE_OFFSETS[monster?.species]?.front || 0;
    // Player drops 5 px until its center leaves DISPLAY_HEIGHT; opponent erases a tile row every two frames.
    const rows = 8 - Math.floor(offset / 8);
    const frames = position.back ? Math.floor((160 - position.y) / 5) + 1 : rows * 2 + 1;
    return { frames,
      cues: [{ id: "emerald-audio:se_faint", frame: 0 }],
      sample(age) {
        const dropped = Math.floor(age / 2) + 1;
        return { poses: [{ seatId: event.targetSeat, y: position.back ? age * 5 : dropped * 8,
          ...(position.back ? {} : { cropBottom: Math.min(64, (8 - rows + dropped) * 8) }) }] };
      },
    };
  }
  return null;
}

export function nativeControllerSequence({ event, previous, layout }, { hasSound = () => true } = {}) {
  const animation = controllerTrack(event, previous, new Map(Object.entries(layout)));
  if (!animation) return null;
  const delay = event.kind === "faint" ? 64 : 0;
  const builder = new FrameSequenceBuilder().track({ frames: animation.frames, sample: animation.sample }, { at: delay });
  if (delay) {
    const species = event.combatants.find(c => c.seatId === event.targetSeat)?.monster?.species;
    const cry = "emerald:cry." + species;
    if (hasSound(cry)) builder.cue(cry);
  }
  for (const cue of animation.cues)
    if (hasSound(cue.id)) builder.cue(cue.id, { at: delay + cue.frame });
  return builder.build({ messageAt: delay ? "end" : "start" });
}
