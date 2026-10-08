import { FrameSequenceBuilder } from "../../engine/extensions/frame-sequence-builder.js";
import { NEW_GAME_RESOURCES } from "../../../generated/packs/emerald/new-game-art.js";
import { NATIVE_BATTLE_ASSETS } from "../../../generated/packs/emerald/battle-animation-assets.js";
import { ballReleaseParticles } from "./battle/ball-release.js";
import { sin } from "./battle/animation-math.js";
export { NEW_GAME_RESOURCES };

const bounded = (n, max) => Math.max(0, Math.min(max, n));
const sprite = (name, x, y, extra = {}) => ({ resource: "new-game-" + name, width: 64, height: 64, x, y, ...extra });
const platform = (stage = 0, offset = 0, tint) => [0, 256].map(wrap => ({ resource: "new-game-platform",
  width: 256, height: 160, tileFrame: stage, x: 128 + offset + wrap, y: 80, ...(tint ? { tint } : {}) }));
const alpha = (frame, delay) => bounded(Math.floor((frame + 1) / (delay + 1)), 16);
const gradient = (frame, delay) => bounded(Math.floor((frame - 8 + 1) / (delay + 1)), 8);
const people = (kind, gender, extra = {}) => kind === "birch" ? [sprite("birch", 136, 60, extra), sprite("lotad", 100, 75, extra)] :
  kind === "player" ? [sprite(gender, 180, 60, extra)] : [sprite(gender, 120, 60, extra)];
const compile = (frames, sample) => new FrameSequenceBuilder().track({ frames, sample: frame => ({ sprites: sample(frame) }) });

export const NEW_GAME_TEXT = Object.freeze({
  welcome: ["你好！让你久等了！", "欢迎来到宝可梦的世界！", "我叫小田卷。", "不过，大家都称我为\n宝可梦博士。"],
  pokemon: "这就是我们所说的\n“宝可梦”。",
  speech: ["这个世界，到处生活着\n被称为宝可梦的生物。", "我们人类与宝可梦一起生活，\n一起玩耍、互相协作。", "有时候，我们也会一起\n与其他伙伴对战。", "虽然我们关系密切，\n宝可梦仍有许多未知之处。", "关于宝可梦，\n还有很多很多的秘密。", "为了解开这些谜团，\n我一直在进行研究。"],
  who: "那么，你是？",
  gender: "你是男孩子？\n还是女孩子？",
  name: "好的。\n你叫什么名字？",
  confirm: name => `原来如此，你叫${name}？`,
  moving: name => ["啊，明白了！", `你就是${name}！\n要搬到我的家乡未白镇，对吧！`],
  ready: ["那么，你准备好了吗？", "属于你自己的冒险\n马上就要开始了。", "勇敢地走进宝可梦的世界吧！\n梦想、冒险和友谊正等着你！", "我会等着你的。\n之后来宝可梦研究所找我吧！"],
});

/** Source stages, compiled once; no C interpreter or callbacks survive into the player. */
export function newGameClip(id, { gender = "male", previousGender = "male" } = {}) {
  if (![gender, previousGender].every(value => ["male", "female"].includes(value))) throw new Error("Invalid intro gender");
  if (id === "arrival") return compile(472, frame => {
    const age = frame - 216, coefficient = alpha(age, 10);
    return [...platform(8 - gradient(age, 20), 0, { color: [0, 0, 0], amount: 16 - bounded(frame, 16) }),
      ...(age >= 0 ? [sprite("birch", 136, 60, { alpha: [coefficient, 16 - coefficient] })] : [])];
  }).build();
  if (id === "release") return compile(165, frame => {
    const age = frame - 32, fly = bounded(age, 32), angle = fly * 4;
    const arc = age >= 0 && age < 32 ? -Math.trunc(sin(angle, 256) / 8) : 0;
    const scale = age < 12 ? Math.max(0.01, (40 + 18 * Math.max(0, age)) / 256) : 1;
    const bounce = frame - 65, squish = bounce >= 0 && bounce <= 48 ? sin(bounce * 8, 32) : 0;
    const jump = bounce >= 0 && bounce <= 48 ? -sin(bounded(bounce - 16, 15) * 8, 10) - (squish > 0 ? Math.trunc(-squish / 8) : 0) : 0;
    const white = age < 0 ? 0 : age <= 16 ? age : Math.max(0, 32 - age);
    return [...platform(0, 0, { color: [248, 248, 248], amount: white }), sprite("birch", 136, 60),
      ...(age >= 0 ? [sprite("lotad", 112 + Math.trunc(-12 * fly / 32) + arc, 58 + Math.trunc(17 * fly / 32) + arc,
        { scaleX: scale * 256 / (256 - squish), scaleY: scale * 256 / (256 + squish), y: 58 + Math.trunc(17 * fly / 32) + arc + jump,
          tileFrame: bounce >= 22 && bounce < 77 ? 1 : 0,
          tint: { color: [248, 176, 240], amount: age < 17 ? 16 : Math.max(0, 16 - (age - 17)) } })] : []),
      ...(age < 10 ? [{ resource: NATIVE_BATTLE_ASSETS.assets.poke_ball.resource, width: 16, height: 16, x: 112, y: 58, tileFrame: age < 0 ? 0 : age < 5 ? 1 : 2 }] : []),
      ...(age >= 0 ? ballReleaseParticles({ x: 112, y: 53 }, age) : [])];
  }).cue("emerald:ball.open", { at: 32 }).cue("emerald:cry.lotad", { at: 65 }).build();
  if (id === "change-gender") return compile(32, frame => [...platform(0, 60),
    frame < 16 ? sprite(previousGender, 180 + (frame + 1) * 4, 60, { alpha: [15 - frame, frame + 1] }) :
      sprite(gender, Math.max(180, 240 - (frame - 15) * 4), 60, { alpha: [frame - 15, 31 - frame] })]).build();
  if (["hide-birch", "hide-player", "hide-birch-final"].includes(id)) {
    const kind = id === "hide-player" ? "player" : "birch", wait = id === "hide-birch" || id === "hide-birch-final" ? 64 : 0;
    return compile(48 + wait, frame => [...platform(gradient(frame, 1), id === "hide-birch" ? bounded(frame + 1, 30) * 2 : id === "hide-player" ? 60 - bounded(frame + 1, 30) * 2 : 0),
      ...(frame < 48 ? people(kind, gender, { alpha: [16 - alpha(frame, 2), alpha(frame, 2)] }) : [])]).build();
  }
  if (["show-player", "show-birch", "show-player-center"].includes(id)) return compile(48, frame => [
    ...platform(8 - gradient(frame, 1), id === "show-player" ? 60 : 0),
    ...people(id === "show-birch" ? "birch" : id === "show-player" ? "player" : "center", gender, { alpha: [alpha(frame, 2), 16 - alpha(frame, 2)] }),
  ]).build();
  if (["naming-out", "naming-return"].includes(id)) return compile(16, frame => {
    const tint = { color: [0, 0, 0], amount: id === "naming-out" ? frame + 1 : 15 - frame };
    return [...platform(0, 60, tint), ...people("player", gender, { tint })];
  }).build();
  if (id === "shrink") return compile(65, frame => {
    const age = bounded(frame + 1, 48), scale = (256 - 2 * age) / 256;
    return [...platform(0, 0, { color: [0, 0, 0], amount: bounded(frame + 1, 16) }),
      ...(frame < 64 ? [sprite(gender, 120, 60 + Math.floor(age * 0.75), { scaleX: scale, scaleY: scale,
        ...(frame >= 48 ? { tint: { color: [248, 248, 248], amount: frame - 47 } } : {}) })] : [])];
  }).build();
  throw new Error(`Unknown new-game clip: ${id}`);
}
