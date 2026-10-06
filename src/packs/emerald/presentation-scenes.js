import { OPENING_SCENES } from "./opening-scenes.js";
import { objectSchema } from "../../engine/extensions/values.js";
const schema = objectSchema(
  {
    title: { type: "string", maxLength: 80 },
    species: { type: "string", maxLength: 128 },
  },
  [],
);
function backdrop(ctx, frame, title, color = "#285858") {
  ctx.fillStyle = "#102838";
  ctx.fillRect(0, 0, 320, 224);
  ctx.fillStyle = color;
  for (let i = 0; i < 14; i++) ctx.fillRect(0, 8 + i * 16, 320, 6);
  ctx.fillStyle = "#fff8d8";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText(frame.payload.title || title, 160, 34);
  const t = frame.reducedMotion ? 0.5 : frame.progress;
  for (let i = 0; i < 18; i++) {
    const x = (i * 73 + Math.floor(t * 80)) % 320,
      y = 55 + ((i * 31) % 140);
    ctx.fillStyle = i % 2 ? "#f8d880" : "#b8e8e0";
    ctx.fillRect(x, y, 2, 2);
  }
}
function monster(ctx, frame, assets) {
  const image = assets[(frame.payload.species || "mudkip") + "-front"];
  if (image) ctx.drawImage(image, 0, 0, 64, 64, 128, 91, 64, 64);
}
const definitions = {
  badge: {
    duration: 2200,
    sound: "emerald:reward",
    draw(ctx, f) {
      backdrop(ctx, f, "获得道馆徽章！");
      const s = 1 + Math.sin(f.progress * Math.PI) * 0.3,
        x = 160,
        y = 120;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.fillStyle = "#f8d050";
      ctx.fillRect(-18, -18, 36, 36);
      ctx.fillRect(-24, -12, 48, 24);
      ctx.fillRect(-12, -24, 24, 48);
      ctx.fillStyle = "#588878";
      ctx.fillRect(-12, -12, 24, 24);
      ctx.fillStyle = "#f8f0b8";
      ctx.fillRect(-4, -8, 8, 16);
      ctx.restore();
    },
  },
  league: {
    duration: 2200,
    draw(ctx, f) {
      backdrop(ctx, f, "向联盟发起挑战", "#604870");
      const t = f.reducedMotion ? 1 : f.progress;
      ctx.fillStyle = "#e8d8a8";
      for (let i = 0; i < 6; i++)
        ctx.fillRect(110 - i * 8, 165 + i * 7, 100 + i * 16, 4);
      ctx.fillStyle = "#b89850";
      ctx.fillRect(120, 65, 80, 90);
      ctx.fillStyle = "#102838";
      ctx.fillRect(128, 70, 64, 85);
      ctx.fillStyle = "#f8e8b8";
      ctx.fillRect(128 + 32 * t, 70, 64 * (1 - t), 85);
    },
  },
  contest: {
    duration: 2300,
    draw(ctx, f, a) {
      backdrop(ctx, f, "选美舞台", "#884858");
      ctx.fillStyle = "#c86870";
      ctx.fillRect(0, 55, 50, 140);
      ctx.fillRect(270, 55, 50, 140);
      ctx.fillStyle = "#e8d0a8";
      ctx.fillRect(50, 160, 220, 14);
      monster(ctx, f, a);
      ctx.fillStyle = "#f8d8a0";
      ctx.fillRect(110 + Math.floor(f.progress * 80), 180, 7, 3);
    },
  },
  tower: {
    duration: 2000,
    draw(ctx, f) {
      backdrop(ctx, f, "战斗塔挑战", "#486880");
      ctx.fillStyle = "#c8d8e8";
      ctx.fillRect(133, 62, 54, 108);
      ctx.fillStyle = "#588898";
      for (let y = 70; y < 154; y += 18)
        for (let x = 141; x < 184; x += 17) ctx.fillRect(x, y, 8, 10);
    },
  },
  title: {
    duration: 2400,
    draw(ctx, f, a) {
      backdrop(ctx, f, "绿宝石 · 丰缘冒险");
      monster(ctx, f, a);
      ctx.fillStyle = "#fff8d8";
      ctx.font = "10px monospace";
      ctx.fillText("HOENN ADVENTURE", 160, 188);
    },
  },
  dex: {
    duration: 1100,
    draw(ctx, f, a) {
      backdrop(ctx, f, "图鉴记录", "#885850");
      monster(ctx, f, a);
      ctx.strokeStyle = "#e8c880";
      ctx.strokeRect(111, 76, 98, 98);
      ctx.fillStyle = "#98f8c8";
      ctx.fillRect(112, 76 + Math.floor(f.progress * 98), 96, 2);
    },
  },
};
export function createEmeraldSceneDefinitions(host) {
  const result = new Map(
    Object.entries(definitions).map(([id, value]) => [
      "emerald:" + id,
      Object.freeze({ ...value, schema }),
    ]),
  );
  for (const [id, definition] of OPENING_SCENES) result.set(id, definition);
  for (const [id, definition] of host?.presentationScenes || [])
    result.set(id, definition);
  return result;
}
export const SCENE_DEMOS = Object.freeze([
  { id: "badge", label: "徽章获得" },
  { id: "league", label: "联盟入场" },
  { id: "contest", label: "选美舞台" },
  { id: "tower", label: "战斗塔" },
  { id: "title", label: "标题演出" },
  { id: "dex", label: "图鉴展示" },
]);
