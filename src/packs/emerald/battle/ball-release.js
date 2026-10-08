import { NATIVE_BATTLE_ASSETS } from "../../../../generated/packs/emerald/battle-animation-assets.js";
import { sin } from "./animation-math.js";

export function ballReleaseParticles(position, age) {
  const asset = NATIVE_BATTLE_ASSETS.assets.ball_particles;
  return Array.from({ length: 16 }, (_, i) => {
    const local = age - i;
    if (local < 0 || local >= 26) return null;
    const radius = Math.max(0, local - 2) * 2, angle = i % 8 * 32, cycle = [0, 1, 2, 0, 2, 1][Math.floor(local / 2) % 6];
    return { resource: asset.resource, width: 8, height: 8,
      x: position.x + sin(angle, radius), y: position.y + sin(angle + 64, radius),
      tileFrame: cycle, flipX: Math.floor(local / 2) % 6 === 3 };
  }).filter(Boolean);
}
