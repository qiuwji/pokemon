import { readOnly } from "./values.js";

const exact = (value, fields) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every(key => fields.includes(key));
const bounded = (number, min, max) => Number.isFinite(number) && number >= min && number <= max;
const integer = (number, min, max) => Number.isInteger(number) && bounded(number, min, max);
const tint = value => exact(value, ["color", "amount"]) && Array.isArray(value.color) && value.color.length === 3 &&
  value.color.every(n => integer(n, 0, 255)) && integer(value.amount, 0, 16);

export function validateBattleSequenceDefinition(definition) {
  if (!exact(definition, ["kind", "match", "priority", "prepare"]) || typeof definition.kind !== "string" ||
      !/^[a-z][a-z0-9_.:-]{0,127}$/.test(definition.kind) || typeof definition.prepare !== "function" ||
      (definition.priority !== undefined && !integer(definition.priority, -1000, 1000)))
    throw new Error("Invalid battle frame sequence definition");
  const match = readOnly(definition.match || {});
  if (!exact(match, Object.keys(match)) || Object.keys(match).length > 16 || Object.values(match).some(value =>
    value !== null && !["number", "string", "boolean"].includes(typeof value)))
    throw new Error("Invalid battle frame sequence selector");
  return definition;
}

/** Strict cosmetic frame boundary. HP is bounded interpolation of the two committed snapshots. */
export function validateFrameSequence(value, { event, previous, resources = null, sounds = null } = {}) {
  const sequence = readOnly(value);
  if (!exact(sequence, ["fps", "frames", "cues", "messageAt", "holdFinal"]) || (sequence.messageAt !== undefined && !["start", "end"].includes(sequence.messageAt)) || (sequence.holdFinal !== undefined && typeof sequence.holdFinal !== "boolean") || !integer(sequence.fps, 1, 240) || !Array.isArray(sequence.frames) ||
      !integer(sequence.frames.length, 1, 3600) || sequence.frames.length * 1000 / sequence.fps > 60000 ||
      !Array.isArray(sequence.cues) || sequence.cues.length > 256)
    throw new Error("Invalid frame sequence");
  const seats = new Map(event.combatants.map(c => [c.seatId, c.monster]));
  for (const frame of sequence.frames) {
    if (!exact(frame, ["poses", "sprites", "healthBars", "scenes", "statusBoxes"])) throw new Error("Invalid frame sequence sample");
    for (const channel of ["poses", "sprites", "healthBars", "scenes", "statusBoxes"])
      if (frame[channel] !== undefined && (!Array.isArray(frame[channel]) || frame[channel].length > 64))
        throw new Error("Invalid frame sequence channel");
    for (const pose of frame.poses || []) {
      if (!exact(pose, ["seatId", "x", "y", "scale", "opacity", "flash", "cropBottom", "tint"]) || !seats.has(pose.seatId) ||
          ["x", "y"].some(key => pose[key] !== undefined && !bounded(pose[key], -1024, 1024)) ||
          (pose.scale !== undefined && !bounded(pose.scale, 0, 10)) || (pose.opacity !== undefined && !bounded(pose.opacity, 0, 1)) ||
          (pose.flash !== undefined && typeof pose.flash !== "boolean") || (pose.cropBottom !== undefined && !integer(pose.cropBottom, 0, 64)) ||
          (pose.tint !== undefined && !tint(pose.tint)))
        throw new Error("Invalid frame sequence pose");
    }
    for (const sprite of frame.sprites || []) {
      if (!exact(sprite, ["resource", "width", "height", "x", "y", "tileFrame", "scaleX", "scaleY", "flipX", "flipY", "alpha", "rotation", "opacity", "tint"]) ||
          typeof sprite.resource !== "string" || !sprite.resource || (resources && !Object.hasOwn(resources, sprite.resource)) ||
          !integer(sprite.width, 1, 256) || !integer(sprite.height, 1, 256) || !integer(sprite.tileFrame ?? 0, 0, 4095) ||
          !bounded(sprite.x, -1024, 1024) || !bounded(sprite.y, -1024, 1024) ||
          ["scaleX", "scaleY"].some(key => sprite[key] !== undefined && !bounded(sprite[key], 0.01, 10)) ||
          ["flipX", "flipY"].some(key => sprite[key] !== undefined && typeof sprite[key] !== "boolean") ||
          (sprite.alpha != null && (!Array.isArray(sprite.alpha) || sprite.alpha.length !== 2 || sprite.alpha.some(n => !integer(n, 0, 16)))) ||
          (sprite.rotation !== undefined && !bounded(sprite.rotation, -Math.PI * 32, Math.PI * 32)) ||
          (sprite.opacity !== undefined && !bounded(sprite.opacity, 0, 1)) || (sprite.tint !== undefined && !tint(sprite.tint)))
        throw new Error("Invalid frame sequence sprite");
    }
    if ((frame.scenes || []).length > 1) throw new Error("Conflicting frame sequence scene");
    for (const scene of frame.scenes || []) {
      const clip = scene.clip;
      if (!exact(scene, ["backgroundX", "split", "clip", "hideTrainers", "hideBall"]) ||
          (scene.backgroundX !== undefined && !bounded(scene.backgroundX, -1024, 1024)) ||
          ["split", "hideTrainers", "hideBall"].some(key => scene[key] !== undefined && typeof scene[key] !== "boolean") ||
          (clip !== undefined && (!exact(clip, ["x", "y", "width", "height"]) ||
            !bounded(clip.x, -1024, 1024) || !bounded(clip.y, -1024, 1024) ||
            !bounded(clip.width, 0, 1024) || !bounded(clip.height, 0, 1024))))
        throw new Error("Invalid frame sequence scene");
    }
    for (const box of frame.statusBoxes || [])
      if (!exact(box, ["seatId", "x", "y", "opacity"]) || !seats.has(box.seatId) ||
          !bounded(box.x, -1024, 1024) || !bounded(box.y, -1024, 1024) || !bounded(box.opacity, 0, 1))
        throw new Error("Invalid frame sequence status box");
    for (const bar of frame.healthBars || []) {
      const mon = seats.get(bar.seatId), old = previous?.combatants.find(c => c.seatId === bar.seatId)?.monster;
      if (!exact(bar, ["seatId", "hp", "fraction"]) || !mon || !old || typeof mon.uid !== "string" || !mon.uid || mon.uid !== old.uid || !bounded(bar.fraction, 0, 1) ||
          !integer(bar.hp, Math.min(mon.hp, old.hp), Math.max(mon.hp, old.hp)) ||
          !bounded(bar.fraction, Math.min(mon.hp, old.hp) / mon.stats.hp, Math.max(mon.hp, old.hp) / mon.stats.hp))
        throw new Error("Invalid frame sequence health interpolation");
    }
  }
  for (const cue of sequence.cues)
    if (!exact(cue, ["id", "frame"]) || typeof cue.id !== "string" || !cue.id || !integer(cue.frame, 0, sequence.frames.length - 1) ||
        (sounds && sounds.get(cue.id)?.kind !== "sound")) throw new Error("Invalid frame sequence audio cue");
  return sequence;
}
