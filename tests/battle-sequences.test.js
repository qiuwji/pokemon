import test from "node:test";
import assert from "node:assert/strict";
import { FrameSequenceBuilder } from "../src/engine/extensions/frame-sequence-builder.js";
import { validateFrameSequence } from "../src/engine/extensions/frame-sequence-contracts.js";
import { PresentationRegistry } from "../src/presentation/effect-registry.js";
import { frameSequencePlayer } from "../src/presentation/frame-sequence.js";
import { blendSpritePixels, createFrameSpritePainter } from "../src/presentation/frame-sprite-canvas.js";
import { drawBattle } from "../src/presentation/battle-canvas.js";
import { createEmeraldPresentation } from "../src/packs/emerald/animations.js";
import { emeraldBattleLayout } from "../src/packs/emerald/battle-presentation.js";
import { nativeHealthBar } from "../src/packs/emerald/battle/controller-animation.js";
import { NATIVE_BATTLE_ASSETS } from "../generated/packs/emerald/battle-animation-assets.js";
import { BattleDirector } from "../src/presentation/battle-director.js";
import { Timeline } from "../src/engine/timeline.js";
import { session } from "./helpers/session.js";
import { createMonster } from "../src/engine/model.js";

const view = {
  homeAlliance: "home", sides: [{ id: "home", allianceId: "home" }, { id: "away", allianceId: "away" }],
  combatants: [
    { seatId: "home:0", sideId: "home", monster: { uid: "a", species: "mudkip", hp: 20, stats: { hp: 20 } } },
    { seatId: "away:0", sideId: "away", monster: { uid: "b", species: "zigzagoon", hp: 20, stats: { hp: 20 } } },
  ],
};
const move = (id, successful = true) => ({ ...view, kind: "move", actorSeat: "home:0", targetSeat: "away:0", move: { id, successful } });
const frameAt = (player, frame) => player.sample(frame * 1000 / 60);

test("frame compilation runs once, freezes data, and samples identical frames regardless of display refresh rate", () => {
  let calls = 0;
  const builder = new FrameSequenceBuilder().track({ frames: 12, sample: age => {
    calls++; return { poses: [{ seatId: "home:0", x: age }] };
  } }).cue("test:hit", { at: 6 });
  const data = builder.build(), player = frameSequencePlayer(data);
  assert.equal(calls, 12);
  assert.throws(() => { data.frames[0].poses[0].x = 999; });
  for (const hz of [30, 60, 120, 144]) {
    for (let ms = 0; ms < 200; ms += 1000 / hz) player.sample(ms);
    assert.equal(frameAt(player, 6).poses[0].x, 6);
  }
  assert.equal(calls, 12, "rendering never executes content callbacks");
  assert.throws(() => builder.wait(-1));
  assert.throws(() => builder.track({ frames: 3601, sample: () => ({}) }));
  assert.throws(() => new FrameSequenceBuilder().track({ frames: 1, sample: async () => ({}) }).build(), /synchronous/);
});

test("frame boundary rejects actions, unknown resources, out-of-snapshot HP and invalid audio", () => {
  const event = structuredClone(view); event.combatants[1].monster.hp = 10;
  const base = { fps: 60, frames: [{}], cues: [] }, context = { event, previous: view, resources: {}, sounds: new Map() };
  for (const plan of [
    { ...base, frames: [{ action: { kind: "damage" } }] },
    { ...base, frames: [{ sprites: [{ resource: "missing", width: 32, height: 32, x: 0, y: 0 }] }] },
    { ...base, frames: [{ healthBars: [{ seatId: "away:0", hp: 30, fraction: 1.5 }] }] },
    { ...base, cues: [{ id: "missing", frame: 0 }] },
    { ...base, cues: [{ id: "missing", frame: 1 }] },
  ]) assert.throws(() => validateFrameSequence(plan, context));
  assert(validateFrameSequence({ ...base, frames: [{ healthBars: [{ seatId: "away:0", hp: 15, fraction: 0.75 }] }] }, context));
});

test("native choreography uses source sprites and distinct frame timings; uncovered moves have no substitute", () => {
  const audioCues = new Map(Object.keys(NATIVE_BATTLE_ASSETS.audioFrames).filter(id => id.startsWith("emerald-audio:")).map(id => [id,
    { kind: "sound", source: "generated/assets/audio/emerald-audio/sounds/" + id.split(":")[1] + ".wav", volume: 0.6, loop: false, maxVoices: 2 }]));
  const registry = createEmeraldPresentation({ host: { audioCues } }), layout = emeraldBattleLayout(view);
  const prepare = id => registry.prepareSequence(move(id), view, layout);
  const pound = prepare("pound"), tackle = prepare("tackle"), scratch = prepare("scratch"), water = prepare("water_gun");
  assert.equal(frameAt(pound, 5).sprites.length, 0);
  assert.equal(frameAt(pound, 6).sprites[0].resource, "battle-anim-impact");
  assert(!frameAt(pound, 6).poses.some(p => p.seatId === "home:0"), "Pound does not use a generic lunge");
  assert.equal(frameAt(tackle, 10).poses.find(p => p.seatId === "home:0").x, 16);
  assert.equal(frameAt(tackle, 14).sprites[0].resource, "battle-anim-impact");
  assert.equal(frameAt(scratch, 14).sprites[0].tileFrame, 2);
  assert.equal(frameAt(water, 9).sprites[0].resource, "battle-anim-small_bubbles");
  assert(pound.cues.some(c => c.id === "emerald-audio:se_m_double_slap" && c.at === 100));
  assert.equal(registry.moves.size, 0);
  assert.equal(registry.prepareSequence(move("flamethrower"), view, layout), null);
  assert.deepEqual(registry.sampleMove(move("flamethrower"), layout, 0.5), []);
  const missed = registry.prepareSequence(move("tackle", false), view, layout);
  assert.equal(missed.cues.length, 0);
  assert.equal(frameAt(missed, 0).sprites.length, 0);
});

test("native choreography mirrors opposing actors and Growl addresses both opposing seats", () => {
  const registry = createEmeraldPresentation(), event = move("tackle");
  event.actorSeat = "away:0"; event.targetSeat = "home:0";
  const plan = registry.prepareSequence(event, view, emeraldBattleLayout(view));
  assert.equal(frameAt(plan, 10).poses.find(p => p.seatId === "away:0").x, -16);
  const doubles = structuredClone(move("growl"));
  doubles.combatants.push({ ...structuredClone(view.combatants[1]), seatId: "away:1", monster: { ...view.combatants[1].monster, uid: "c" } });
  const growl = registry.prepareSequence(doubles, doubles, emeraldBattleLayout(doubles));
  assert.deepEqual(new Set(frameAt(growl, 32).poses.map(p => p.seatId)), new Set(["away:0", "away:1"]));
});

test("HP waits for blink, preserves fine bar steps, and fainting clips native rows without added particles", () => {
  const registry = createEmeraldPresentation(), event = structuredClone(view);
  Object.assign(event, { kind: "hurt", targetSeat: "away:0", hit: 1, message: { id: "move-result", params: { type: 1 } } });
  event.combatants[1].monster.hp = 10;
  const layout = emeraldBattleLayout(event), hurt = registry.prepareSequence(event, view, layout);
  assert.equal(frameAt(hurt, 31).healthBars[0].hp, 20);
  assert(frameAt(hurt, 34).healthBars[0].fraction < 1);
  assert.equal(frameAt(hurt, 34).healthBars[0].hp, 20, "bar advances below integer HP resolution");
  assert.deepEqual(nativeHealthBar(20, 10, 20).at(-1), { hp: 10, fraction: 0.5 });
  assert.deepEqual(nativeHealthBar(80, 78, 100).map(v => v.hp), [80, 79, 78]);
  assert.equal(frameAt(hurt, 31).sprites.length, 0);
  const faint = registry.prepareSequence({ ...event, kind: "faint" }, event, layout);
  assert.equal(frameAt(faint, 63).poses.length, 0);
  assert(frameAt(faint, 68).poses[0].cropBottom > frameAt(faint, 64).poses[0].cropBottom);
  assert.equal(faint.messageAt, "end");
  assert.equal(frameAt(faint, 68).sprites.length, 0);
  assert.equal(event.combatants[1].monster.hp, 10);
});

test("invalid and asynchronous content is isolated; selectors are deterministic and sealed", () => {
  const errors = [], registry = new PresentationRegistry({ onError: error => errors.push(error) });
  registry.sequence("bad", { kind: "move", prepare: async () => ({}) });
  assert.equal(registry.prepareSequence(move("pound"), view, emeraldBattleLayout(view)), null);
  assert.equal(errors.length, 1);
  assert.throws(() => registry.sequence("duplicate", { kind: "move", prepare: () => null }));
  registry.seal();
  assert.throws(() => registry.sequence("late", { kind: "hurt", prepare: () => null }));
});

test("faint narration follows visual hiding and a failed start releases the director", async () => {
  let now = 0;
  const timeline = new Timeline({ now: () => now, wait: async ms => { now += ms; } }),
    registry = createEmeraldPresentation(), director = new BattleDirector(timeline, { registry, layout: emeraldBattleLayout });
  director.reset(view);
  const announced = [];
  await director.play({ ...view, kind: "faint", targetSeat: "away:0", text: "倒下了" }, {
    message: text => { announced.push({ text, hidden: director.sample().actors[1].opacity === 0, now }); },
  });
  assert.equal(announced.length, 1);
  assert.equal(announced[0].hidden, true);
  assert(announced[0].now >= 64 * 1000 / 60);
  assert.equal(director.busy, false);
  director.reset(view);
  await assert.rejects(director.play(move("pound"), { message: () => { throw new Error("display failed"); } }), /display failed/);
  assert.equal(director.busy, false);
});

test("real damage emits health, critical and effectiveness in source order without a normal-hit announcement", async () => {
  const s = session();
  s.mon.moves = [{ id: "water_gun", pp: 25 }];
  await s.game.startBattle(createMonster("torchic", 20, s.db, s.game.rng));
  const battle = s.game.battle;
  battle.rng = { next: () => 0, int: () => 0 };
  battle.executeMove(0, 0);
  const ids = battle.events.filter(e => e.message).map(e => e.message.id), hurt = ids.indexOf("move-result");
  assert(hurt >= 0);
  assert.deepEqual(ids.slice(hurt, hurt + 3), ["move-result", "critical-hit", "super-effective"]);
  assert.equal(battle.events.find(e => e.kind === "hurt").text, "");
  assert(!battle.events.some(e => e.text.includes("攻击命中了")));
  const registry = createEmeraldPresentation(), event = battle.events.find(e => e.message?.id === "critical-hit");
  assert.equal(registry.prepareSequence(event, event, emeraldBattleLayout(event)).duration, 64 * 1000 / 60);
});

test("pixel blending uses independent coefficients, saturation, transparency and pack quantization", () => {
  const back = new Uint8ClampedArray([80, 160, 248, 255, 40, 80, 120, 255]),
    front = new Uint8ClampedArray([160, 80, 248, 255, 248, 248, 248, 0]);
  assert.deepEqual([...blendSpritePixels(back, front, [12, 8], { channelBits: 5 })], [160, 136, 248, 255, 40, 80, 120, 255]);
  const calls = [], ctx = { save() {}, restore() {}, translate(...args) { calls.push(args); }, scale() {}, drawImage(...args) { calls.push(args); } };
  const painter = createFrameSpritePainter(() => { throw new Error("opaque sprites need no scratch canvas"); });
  const image = { width: 32, height: 96 };
  painter(ctx, image, { width: 32, height: 32, x: 10, y: 20, tileFrame: 2 });
  assert.equal(calls[1][2], 64, "sheet frame selects its source row");
  painter(ctx, image, { width: 32, height: 32, x: 10, y: 20, tileFrame: 3 });
  assert.equal(calls.length, 2, "out-of-sheet frames do not read another asset");
});

test("the canvas consumes registered frame sprites and clipped actor poses", () => {
  const director = new BattleDirector(new Timeline(), { layout: emeraldBattleLayout }); director.reset(view);
  const frame = director.sample(), calls = [], spriteCalls = [];
  frame.actors[1].cropBottom = 16;
  frame.sprites = [{ resource: "sprite", width: 32, height: 32, x: 176, y: 40 }];
  const ctx = new Proxy({}, { get: (_target, key) => (...args) => calls.push([key, ...args]) });
  const image = { width: 64, height: 64 };
  drawBattle(ctx, { "zigzagoon-front": image, sprite: image }, frame, {}, (_ctx, art, sprite) => spriteCalls.push({ art, sprite }));
  assert.equal(calls.find(c => c[0] === "drawImage")[5], 48);
  assert.equal(spriteCalls[0].sprite.x, 176);
});
