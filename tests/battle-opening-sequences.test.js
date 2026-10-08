import test from "node:test";
import assert from "node:assert/strict";
import { createEmeraldPresentation } from "../src/packs/emerald/animations.js";
import { emeraldBattleLayout, emeraldBattleOpening } from "../src/packs/emerald/battle-presentation.js";
import { nativeSendFlight } from "../src/packs/emerald/battle/opening-choreography.js";
import { EMERALD_BATTLE_EXIT } from "../src/packs/emerald/battle/exit-choreography.js";
import { NATIVE_BATTLE_ASSETS } from "../generated/packs/emerald/battle-animation-assets.js";
import { BattleDirector } from "../src/presentation/battle-director.js";
import { Timeline, TransitionController } from "../src/engine/timeline.js";
import { FrameSequenceBuilder } from "../src/engine/extensions/frame-sequence-builder.js";
import { validateFrameSequence } from "../src/engine/extensions/frame-sequence-contracts.js";
import { tintSpritePixels } from "../src/presentation/frame-sprite-canvas.js";
import { ColorOffsetDOM } from "../src/presentation/color-offset-dom.js";
import { emeraldBattleSong } from "../src/packs/emerald/audio-library.js";
import { nativePartySlots } from "../src/packs/emerald/battle/party-summary.js";

const view = { homeAlliance: "home", environment: { terrain: "grass" },
  sides: [{ id: "home", allianceId: "home" }, { id: "away", allianceId: "away" }],
  combatants: [
    { seatId: "home:0", sideId: "home", monster: { uid: "a", species: "mudkip", hp: 20, stats: { hp: 20 } } },
    { seatId: "away:0", sideId: "away", monster: { uid: "b", species: "treecko", hp: 20, stats: { hp: 20 } } },
  ] };
const opening = trainer => emeraldBattleOpening({ party: [view.combatants[0].monster] }, { trainer },
  { species: { mudkip: { name: "水跃鱼" }, treecko: { name: "木守宫" } } }, view.combatants[1].monster);
const registry = () => createEmeraldPresentation({ host: { audioCues: new Map(Object.keys(NATIVE_BATTLE_ASSETS.audioFrames).filter(id => id.startsWith("emerald-audio:")).map(id =>
  [id, { kind: "sound", source: "generated/assets/test.wav", volume: 1, loop: false }])) } });
const at = (player, frame) => player.sample(frame * 1000 / 60);
const prepare = (event, r = registry()) => r.prepareSequence(event, view, emeraldBattleLayout(event));

test("wild entry narration holds the settled battlefield without replaying the intro", async () => {
  let now = 0;
  const frames = [], timeline = new Timeline({ now: () => now, wait: async ms => {
    frames.push(director.sample(now + ms / 2)); now += ms;
  } });
  const director = new BattleDirector(timeline, { registry: registry(), layout: emeraldBattleLayout });
  const options = opening(false);
  director.reset(view);
  await director.play({ ...view, kind: "entry", trainers: options.trainers, ...options.entryPhases[0] });
  const hold = frames.at(-1);
  assert.equal(hold.background, undefined, "the narration cannot reopen the split background");
  assert(hold.actors.every(a => a.x === 0), "actors cannot slide in again during narration");
  assert.equal(hold.actors.find(a => a.seatId === "away:0").opacity, 1);
  assert.equal(hold.actors.find(a => a.seatId === "home:0").opacity, 0);
  assert.equal(hold.balls, undefined);
});

test("native party tray compacts six status icons, animates during challenge text and survives only until each side sends", async () => {
  const party = [{ hp: 8 }, { hp: 0, status: "poison" }, { egg: true, hp: 9 }, { hp: 6, status: "burn" }];
  const saved = JSON.stringify(party);
  assert.deepEqual(nativePartySlots(party, true), [0, 3, 2, 1, 1, 1]);
  assert.deepEqual(nativePartySlots(party, false), [1, 1, 1, 2, 3, 0]);
  assert.equal(JSON.stringify(party), saved);
  const options = opening(true), r = registry(), event = { ...view, kind: "entry", trainers: options.trainers,
    ...options.entryPhases.find(p => p.introPhase === "summary") }, p = prepare(event, r);
  assert.equal(event.dialogueDuring, true);
  assert.equal(at(p, 64).sprites.length, 14);
  assert.deepEqual(at(p, 64).sprites.filter(s => s.resource === "battle-anim-party_bar").map(s => [s.x, s.y, s.flipX]),
    [[40, 44, true], [200, 100, false]]);
  assert.equal(at(p, 64).sprites.find(s => s.resource === "battle-anim-party_balls").tileFrame, 1);
  assert(p.cues.some(c => c.id === "emerald-audio:se_ball_tray_enter"));
  let now = 0;
  const director = new BattleDirector(new Timeline({ now: () => now, wait: async ms => { now += ms; } }),
    { registry: r, layout: emeraldBattleLayout });
  director.reset(view); await director.play(event);
  now += 8000;
  assert.equal(director.sample().sprites.length, 14, "the final tray remains during an arbitrarily long dialogue");
  const send = back => ({ ...view, kind: "entry", trainers: options.trainers,
    ...options.entryPhases.find(p => p.introPhase === "send" && p.sendBack === back),
    sendSeats: [back ? "home:0" : "away:0"] });
  const away = prepare(send(false), r);
  assert.equal(at(away, 30).sprites.filter(s => s.resource.startsWith("battle-anim-party_")).length, 7);
  await director.play(send(false));
  assert.equal(director.sample().sprites.filter(s => s.resource.startsWith("battle-anim-party_")).length, 7);
  await director.play(send(true));
  assert.equal(director.sample().sprites?.length || 0, 0);
  assert(!opening(false).entryPhases.some(p => p.introPhase === "summary"), "wild battles have no trainer-party tray");
  director.reset(); assert.equal(director.sample(), null);
});

test("local intro opens the native curtain before the 120-frame slide and composes real foreground tiles", () => {
  const options = opening(true), event = { ...view, ...options.entryPhases[0], kind: "entry", trainers: options.trainers }, p = prepare(event);
  assert.deepEqual(at(p, 0).scenes[0].clip, { x: 0, y: 80, width: 240, height: 1 });
  assert.equal(at(p, 33).scenes[0].backgroundX, -240);
  assert.equal(at(p, 33).sprites[0].x, 320);
  assert.equal(at(p, 34).scenes[0].backgroundX, -238);
  assert.equal(at(p, 153).scenes[0].backgroundX, 0);
  assert.equal(at(p, 154).sprites.length, 2, "entry foreground is disposed, trainers remain");
  assert(at(p, 0).sprites.some(s => s.resource === "battle-anim-entry_grass"));
  assert(at(p, 154).statusBoxes.every(box => box.opacity === 0));
  assert.equal(p.messageAt, "end");
  for (const terrain of ["grass", "long_grass", "sand", "underwater", "water", "pond", "mountain", "cave", "indoor", "plain"])
    assert(prepare({ ...event, environment: { terrain } }).sample(1000).sprites.some(s => s.resource === "battle-anim-entry_" + terrain));
});

test("send-out separates trainer frames, slow rotating flight, ball sheet, emergence, cry and healthbox", () => {
  const options = opening(true), event = { ...view, ...options.entryPhases.find(phase => phase.introPhase === "send" && phase.sendBack), kind: "entry", trainers: options.trainers, sendSeats: ["home:0"] }, p = prepare(event);
  assert.equal(at(p, 23).sprites[0].tileFrame, 0);
  assert.equal(at(p, 24).sprites[0].tileFrame, 1);
  assert.equal(at(p, 33).sprites.find(s => s.resource === "battle-anim-poke_ball").x, 24);
  assert(nativeSendFlight(emeraldBattleLayout(view).get("home:0"), 20).rotation > 0);
  assert.equal(nativeSendFlight(emeraldBattleLayout(view).get("home:0"), 35).rotation, 0);
  assert.equal(at(p, 77).poses[0].opacity, 0);
  assert.equal(at(p, 78).sprites.find(s => s.resource === "battle-anim-poke_ball").tileFrame, 1);
  assert.equal(at(p, 78).sprites.filter(s => s.resource === "battle-anim-ball_particles").length, 1);
  assert.equal(at(p, 78).poses[0].opacity, 0);
  assert.equal(at(p, 79).poses[0].opacity, 1);
  assert.equal(at(p, 83).sprites.find(s => s.resource === "battle-anim-poke_ball").tileFrame, 2);
  assert.equal(at(p, 90).poses[0].scale, 1);
  assert.equal(at(p, 93).statusBoxes[0].x, 115);
  assert.equal(at(p, 94).statusBoxes[0].x, 110);
  assert.equal(at(p, 116).statusBoxes[0].x, 0);
  const cry = p.cues.find(c => c.id === "emerald:cry.mudkip");
  assert.equal(cry.at, 92 * 1000 / 60, "cry waits for emergence, instead of playing at ball open");
  assert.equal(p.cues.filter(c => c.id === "emerald:ball.open").length, 1);
  assert.equal(at(p, 100).sprites.filter(s => s.resource === "battle-anim-ball_particles").length, 16);
});

test("doubles delay the second release and player healthbox without moving either monster's identity", () => {
  const doubles = { ...view, combatants: [...view.combatants, { ...view.combatants[0], seatId: "home:1", monster: { ...view.combatants[0].monster, uid: "c" } }] };
  const options = opening(true), event = { ...doubles, ...options.entryPhases.find(phase => phase.introPhase === "send" && phase.sendBack), kind: "entry", trainers: options.trainers, sendSeats: ["home:0", "home:1"] }, p = prepare(event);
  assert.equal(p.cues.filter(c => c.id === "emerald:ball.open")[1].at, 104 * 1000 / 60);
  assert.equal(at(p, 120).statusBoxes.find(b => b.seatId === "home:1").x, 115);
  assert.equal(at(p, 140).statusBoxes.find(b => b.seatId === "home:1").x, 110);
  assert.equal(event.combatants[2].monster.uid, "c");
});

test("staged entry is compiled once and already hides sprites during the covered scene swap", async () => {
  let calls = 0, now = 0;
  // The sealed production registry stays immutable; an external host supplies the sequence before sealing.
  const definition = { kind: "entry", match: { introPhase: "slide" }, prepare: () => {
    calls++; return new FrameSequenceBuilder().track({ frames: 2, sample: () => ({
      scenes: [{ clip: { x: 0, y: 80, width: 240, height: 1 } }], poses: [{ seatId: "home:0", opacity: 0 }],
    }) }).build();
  } };
  const director = new BattleDirector(new Timeline({ now: () => now, wait: async ms => { now += ms; } }), {
    registry: createEmeraldPresentation({ host: { battleSequences: new Map([["test:entry", definition]]) } }), layout: emeraldBattleLayout,
  });
  director.reset(view);
  const event = { ...view, kind: "entry", introPhase: "slide" };
  director.stage(event);
  assert.equal(director.sample().actors[0].opacity, 0);
  assert.equal(director.sample().clip.height, 1);
  await director.play(event);
  assert.equal(calls, 1);
  assert.equal(director.busy, false);
});

test("scene channels reject invalid bounds, conflicting clips, foreign seats and palette programs", () => {
  for (const frame of [
    { scenes: [{ clip: { x: 0, y: 0, width: -1, height: 10 } }] }, { scenes: [{}, {}] },
    { statusBoxes: [{ seatId: "foreign", x: 0, y: 0, opacity: 1 }] },
    { poses: [{ seatId: "home:0", tint: { color: [0, 0, 300], amount: 16 } }] },
    { scenes: [{ callback: "source-function" }] },
  ]) assert.throws(() => validateFrameSequence({ fps: 60, frames: [frame], cues: [] }, { event: view, previous: view }));
  assert.deepEqual([...tintSpritePixels(new Uint8ClampedArray([8, 160, 248, 255]), { color: [248, 176, 240], amount: 16 }, { channelBits: 5 })], [248, 176, 240, 255]);
});

test("native exit steps subtract colours, commits covered once and restores filters after failures", async () => {
  let now = 0, commits = 0; const samples = [];
  const timeline = new Timeline({ now: () => now, wait: async ms => { samples.push(transition.sample(now + ms / 2)); now += ms; } });
  const transition = new TransitionController(timeline);
  await transition.run("battle-exit", () => { commits++; assert.equal(transition.sample().opacity, 1); }, EMERALD_BATTLE_EXIT);
  assert.equal(commits, 1);
  assert(samples.some(s => s.colorOffset?.[0] < 0));
  assert.equal(transition.busy, false);
  assert.equal(now, 54 * 1000 / 60);
  await assert.rejects(transition.run("bad", () => {}, { coverFrames: [{ opacity: 0 }] }), /coverage/);
  await assert.rejects(transition.run("battle-exit", () => { throw new Error("commit failed"); }, EMERALD_BATTLE_EXIT), /commit failed/);
  assert.equal(transition.busy, false);
  const nodes = [], node = () => ({ style: {}, setAttribute(key, value) { this[key] = value; }, append() {} });
  const doc = { createElementNS() { const n = node(); nodes.push(n); return n; }, body: { append() {} } }, target = { style: { filter: "contrast(1)" } };
  const color = new ColorOffsetDOM(doc, () => [target]);
  color.render([-16, -16, -16]); assert.match(target.style.filter, /url/);
  assert(nodes.some(n => n.intercept === String(-16 / 255)));
  color.render(); assert.equal(target.style.filter, "contrast(1)");
});

test("victory song selection waits for a presentation phase and respects original trainer categories", () => {
  assert.equal(emeraldBattleSong({ trainer: true, result: "win", ended: true }), "MUS_VS_TRAINER");
  assert.equal(emeraldBattleSong({ presentationPhase: "victory" }), "MUS_VICTORY_WILD");
  for (const [trainerActor, song] of [["Youngster", "TRAINER"], ["AquaMemberM", "AQUA_MAGMA"], ["Roxanne", "GYM_LEADER"], ["Wallace", "LEAGUE"]])
    assert.equal(emeraldBattleSong({ trainer: true, trainerActor, presentationPhase: "victory" }), "MUS_VICTORY_" + song);
});
