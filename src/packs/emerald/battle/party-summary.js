import { FrameSequenceBuilder } from "../../../engine/extensions/frame-sequence-builder.js";
import { NATIVE_BATTLE_ASSETS } from "../../../../generated/packs/emerald/battle-animation-assets.js";
/** battle_interface.c: compact eggs/empty slots, mirror the opponent's six indicators. */
export function nativePartySlots(party, back) {
  const slots = party.filter(mon => mon && !mon.egg).slice(0, 6)
    .map(mon => mon.hp <= 0 ? 3 : mon.status ? 2 : 0);
  while (slots.length < 6) slots.push(1);
  return back ? slots : slots.reverse();
}
const accelerated = n => 3 * n * (n + 1) / 2;
/** Native sprite coordinates and callbacks, expressed as a pure frame sample. */
export function partySummarySprites(summary, phase, frame) {
  if (!summary || !["enter", "away-exit", "home-exit"].includes(phase)) return [];
  const result = [];
  frame = Math.max(0, Math.floor(frame));
  for (const back of [false, true]) {
    if (!back && phase === "home-exit") continue;
    const exiting = phase === (back ? "home-exit" : "away-exit"),
      entering = phase === "enter",
      alpha = exiting ? Math.max(0, 15 - Math.floor(frame / 2)) / 16 : 1;
    if (!alpha) continue;
    const asset = exiting ? "party_bar_exit" : "party_bar",
      offset = entering ? Math.max(0, 100 - (frame + 1) * 5) * (back ? 1 : -1) :
        exiting ? (frame + 1) * 2 * (back ? -1 : 1) : 0;
    result.push({ asset, x: (back ? 136 : exiting ? -88 : -24) + offset,
      y: back ? 96 : 40, alpha, flipX: !back, tile: 0 });
    summary[back ? "home" : "away"].forEach((tile, i) => {
      const delay = entering ? (back ? i : 6 - i) * 7 + 10 : (back ? i : 5 - i) * 7,
        n = Math.max(0, frame - delay + 1),
        shift = entering ? (120 - Math.min(120, accelerated(n))) * (back ? 1 : -1) :
          exiting ? accelerated(n) * (back ? -1 : 1) : 0,
        x = (back ? 160 : 30) + i * 10 + shift - 4;
      if (x < -8 || x > 240) return;
      result.push({ asset: "party_balls", tile, x, y: back ? 88 : 32, alpha });
    });
  }
  return result;
}

/** Convert authored native coordinates to the public sprite channel once, before playback. */
export function partySummaryFrame(summary, phase, frame) {
  return partySummarySprites(summary, phase, frame).map(sprite => {
    const asset = NATIVE_BATTLE_ASSETS.assets[sprite.asset];
    return { resource: asset.resource, width: asset.width, height: asset.height,
      x: sprite.x + asset.width / 2, y: sprite.y + asset.height / 2,
      tileFrame: sprite.tile, opacity: sprite.alpha, flipX: !!sprite.flipX };
  });
}
export function nativePartySummary({ event }, { hasSound = () => false } = {}) {
  const builder = new FrameSequenceBuilder().track({ frames: 65,
    sample: frame => ({ sprites: partySummaryFrame(event.partySummary, "enter", frame) }),
  });
  for (const id of ["emerald-audio:se_ball_tray_enter"]) if (hasSound(id)) builder.cue(id, { at: 0 });
  for (const back of [false, true])
    event.partySummary[back ? "home" : "away"].forEach((tile, i) => {
      const id = "emerald-audio:se_ball_tray_" + (tile === 1 ? "exit" : "ball");
      if (hasSound(id)) builder.cue(id, { at: (back ? i : 6 - i) * 7 + 18 });
    });
  return builder.build({ holdFinal: true });
}
