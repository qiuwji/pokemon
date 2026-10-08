import { ballReleaseParticles } from "./ball-release.js";
import { partySummaryFrame } from "./party-summary.js";
import { FrameSequenceBuilder } from "../../../engine/extensions/frame-sequence-builder.js";
import { NATIVE_BATTLE_ASSETS } from "../../../../generated/packs/emerald/battle-animation-assets.js";
import { linearDelta, sin } from "./animation-math.js";

const clamp = (n, max) => Math.max(0, Math.min(max, n));
const trainerPoint = trainer => ({ x: trainer.position?.x ?? (trainer.back ? 80 : 176),
  y: (trainer.position?.y ?? (trainer.back ? 80 : 40)) + (trainer.offsetY || 0) });
const trainerSprite = (trainer, x, tileFrame = trainer.rest || 0) => ({
  resource: trainer.resource, width: trainer.width, height: trainer.height,
  x, y: trainerPoint(trainer).y, tileFrame,
});
const statusBox = (seatId, back, frame, start, delay = 0) => ({ seatId, y: 0,
  x: (back ? 1 : -1) * (115 - clamp(frame - start - delay, 23) * 5), opacity: frame >= start ? 1 : 0 });

function entryForeground(terrain, frame) {
  const asset = NATIVE_BATTLE_ASSETS.assets["entry_" + terrain];
  if (!asset || frame >= 154) return [];
  const fade = ["sand", "underwater", "water"].includes(terrain), building = ["indoor", "plain"].includes(terrain);
  const dx = ((frame + 1) * (fade && terrain !== "underwater" || building ? 8 : 6)) % 256;
  const waterAngle = frame % 75 < 45 ? frame % 75 * 4 : 180 + (frame % 75 - 45) * 6;
  const degrees = (waterAngle + 90) % 360, waterY = Math.trunc((NATIVE_BATTLE_ASSETS.degreeSine[degrees % 180] * (degrees >= 180 ? -1 : 1)) / 512) - 8;
  const dy = terrain === "water" ? -waterY : !fade && !building ? Math.min(terrain === "long_grass" ? 80 : 56, Math.max(0, frame - 65) * (terrain === "long_grass" ? 2 : 1)) : 0;
  const coefficient = fade ? 16 - clamp(Math.floor((frame - 66) / 4) + 1, 16) : 8 - clamp(Math.floor((frame - 66) / 6) + 1, 8);
  return [0, 256].map(wrap => ({ resource: asset.resource, width: 256, height: 256,
    x: 128 - dx + wrap, y: 128 + dy,
    ...(fade ? { alpha: [coefficient, 0] } : building ? { alpha: [coefficient, 16 - coefficient] } : {}) }));
}

/** Normal local intro: WIN0 opens 80→48, then actors and split BG move two pixels per frame. */
export function nativeOpeningSlide({ event, layout }, { hasSound }) {
  const wild = !event.trainers.some(t => !t.back), frames = wild ? 182 : 155;
  const builder = new FrameSequenceBuilder().track({ frames, sample: frame => {
    const remaining = 240 - clamp(frame - 33, 120) * 2;
    const top = frame < 34 ? 80 - clamp(frame - 1, 32) : Math.max(0, 48 - (frame - 33) * 3);
    const bottom = frame < 34 ? 81 + clamp(frame - 1, 32) : Math.min(160, 113 + (frame - 33) * 4);
    return {
      scenes: [{ hideTrainers: true, hideBall: true, backgroundX: remaining ? -remaining : 0, split: true,
        clip: { x: 0, y: top, width: 240, height: bottom - top } }],
      sprites: [...event.trainers.filter(t => t.resource).map(t => trainerSprite(t, trainerPoint(t).x + (t.back ? remaining : -remaining))),
        ...entryForeground(event.environment?.terrain, frame)],
      poses: event.combatants.map(c => {
        const p = layout[c.seatId], hidden = event.trainers.some(t => !!t.back === !!p.back);
        return { seatId: c.seatId, x: (p.back ? 1 : -1) * remaining, opacity: hidden ? 0 : 1,
          ...(!hidden ? { tint: { color: [64, 64, 64], amount: frame < 155 ? 10 : Math.max(0, 10 - (frame - 155)) } } : {}) };
      }),
      statusBoxes: event.combatants.map(c => statusBox(c.seatId, !!layout[c.seatId].back, frame,
        wild && !layout[c.seatId].back ? 155 : frames + 1)),
    };
  } });
  if (wild) {
    const mon = event.combatants.find(c => !layout[c.seatId].back)?.monster;
    const cry = mon && "emerald:cry." + mon.species;
    if (cry && hasSound(cry)) builder.cue(cry, { at: 166 });
  }
  return builder.build({ messageAt: "end" });
}

/** Authored three-leg flight: fast approach, rotating slow arc, fast descent (pokeball.c). */
export function nativeSendFlight(position, frame) {
  const age = clamp(frame, 43), fastBefore = Math.min(age, 7), slow = clamp(age - 7, 27), fastAfter = Math.max(0, age - 34);
  const delta = (from, to) => {
    const full = Math.trunc(Math.abs(to - from) * 256 / 25) & ~1, third = Math.trunc(full / 3) & ~1;
    const distance = (full * fastBefore + third * slow + third * 3 * fastAfter) >> 8;
    return to < from ? -distance : distance;
  };
  const angle = (1310 * fastBefore + 436 * slow + 1310 * fastAfter) >> 8;
  return { x: 24 + delta(24, position.x), y: 68 + delta(68, position.y + 24) + sin(angle, -30),
    rotation: slow > 0 && fastAfter === 0 ? slow * 25 * Math.PI / 128 : 0 };
}

function throwFrame(trainer, age) {
  for (const [frame, duration] of trainer.throw || []) {
    if (age < duration) return frame;
    age -= duration;
  }
  return trainer.rest || 0;
}


/** Trainer throw, ball sheet, palette release, cry, then healthbox. All data is compiled before play. */
export function nativeOpeningSend({ event, layout }, { hasSound, soundFrames }) {
  const back = event.sendBack, born = back ? 33 : 2, opened = born + (back ? 45 : 17);
  const count = event.sendSeats.length, lastOpen = opened + (count - 1) * 26, boxStart = lastOpen + 15;
  const cryTimes = event.sendSeats.map((seat, i) => {
    const id = "emerald:cry." + event.combatants.find(c => c.seatId === seat).monster.species;
    return { id, at: opened + i * 26 + 14 + (count > 1 ? 5 : 0) };
  });
  if (count > 1) cryTimes[1].at = Math.max(cryTimes[1].at + 6, cryTimes[0].at + soundFrames(cryTimes[0].id) + 4);
  const frames = Math.max(boxStart + 23 + (back && count > 1 ? 20 : 0) + 4, lastOpen + 44,
    ...cryTimes.map(c => c.at + (hasSound(c.id) ? soundFrames(c.id) : 0) + 4));
  const builder = new FrameSequenceBuilder().track({ frames, sample: frame => {
    const sprites = event.trainers.filter(t => t.resource && (!back || t.back)).flatMap(t => {
      const p = trainerPoint(t);
      if (!!t.back !== back) return [trainerSprite(t, p.x)];
      const duration = back ? 50 : 35;
      return frame < duration ? [trainerSprite(t, p.x + linearDelta(p.x, back ? -40 : 280, duration, frame + 1),
        back ? throwFrame(t, frame) : t.rest || 0)] : [];
    });
    sprites.push(...partySummaryFrame(event.partySummary, back ? "home-exit" : "away-exit", frame));
    const poses = [], statusBoxes = [];
    for (const c of event.combatants) {
      const p = layout[c.seatId], i = event.sendSeats.indexOf(c.seatId);
      if (i < 0) {
        const visible = !p.back && (back || !event.trainers.some(t => !t.back));
        poses.push({ seatId: c.seatId, opacity: visible ? 1 : 0 });
        statusBoxes.push({ seatId: c.seatId, x: 0, y: 0, opacity: visible ? 1 : 0 });
        continue;
      }
      const open = opened + i * 26, age = frame - open, scale = age < 0 ? 0 : age < 12 ? (40 + 18 * age) / 256 : 1;
      const y = age < 1 || age >= 13 ? 0 : (4096 - 288 * age) >> 8;
      poses.push({ seatId: c.seatId, opacity: age >= 1 ? 1 : 0, scale, y: y - 32 * (1 - scale),
        tint: { color: [248, 176, 240], amount: age < 17 ? 16 : Math.max(0, 16 - (age - 17)) } });
      statusBoxes.push(statusBox(c.seatId, back, frame, boxStart, back && i === 1 ? 20 : 0));
      if (frame >= born && age < 10) {
        const point = back && frame < born + 44 ? nativeSendFlight(p, frame - born) : { x: p.x, y: p.y + 24, rotation: 0 };
        sprites.push({ resource: NATIVE_BATTLE_ASSETS.assets.poke_ball.resource, width: 16, height: 16,
          ...point, tileFrame: age < 0 ? 0 : age < 5 ? 1 : 2 });
      }
      if (age >= 0 && age < 43) sprites.push(...ballReleaseParticles({ x: p.x, y: p.y + 19 }, age));
    }
    return { scenes: [{ hideTrainers: true, hideBall: true }], sprites, poses, statusBoxes };
  } });
  event.sendSeats.forEach((_, i) => { if (hasSound("emerald:ball.open")) builder.cue("emerald:ball.open", { at: opened + i * 26 }); });
  for (const c of cryTimes) if (hasSound(c.id)) builder.cue(c.id, { at: c.at });
  return builder.build({ holdFinal: !back });
}

/** The defeated trainer returns at two pixels/frame before its defeat dialogue is shown. */
export function nativeTrainerReturn({ event }) {
  return new FrameSequenceBuilder().track({ frames: 49, sample: frame => ({
    scenes: [{ hideTrainers: true }],
    sprites: (event.trainers || []).filter(t => t.resource).map(t => trainerSprite(t,
      trainerPoint(t).x + (t.slideOffset ?? (t.back ? -96 : 96)) * (1 - clamp(frame + 1, 48) / 48))),
  }) }).build({ messageAt: "end" });
}
