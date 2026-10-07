import test from "node:test";
import { Renderer } from "../src/adapters/canvas-renderer.js";
import { validateFieldCommand } from "../src/engine/field-director.js";
import { emeraldTransitionPatterns } from "../src/packs/emerald/battle-transition-canvas.js";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { buttonPage } from "./helpers/button-page.js";
import { interaction } from "../src/packs/emerald/story.js";
import { createBattleInterface } from "../src/packs/emerald/battle-interface.js";
import { createBagInterface } from "../src/packs/emerald/bag-interface.js";
import { BattleSession } from "../src/engine/battle-session.js";
import { BattleDirector } from "../src/presentation/battle-director.js";
import { Timeline } from "../src/engine/timeline.js";
import { emeraldBattleLayout, EMERALD_BATTLE_VIEWPORT, emeraldBattleOpening } from "../src/packs/emerald/battle-presentation.js";
import { EMERALD_BATTLE_INTRO } from "../src/packs/emerald/battle-intro.js";
import { emeraldReflectionSurface, emeraldReflectionResource, emeraldReflectionScale, emeraldReflectionColumns } from "../src/packs/emerald/field-reflections.js";
import { drawReflection } from "../src/presentation/reflection-canvas.js";

test("Battle defeat dialogue precedes blackout, and reveal already sees the field", async () => {
  const trace = [], director = { busy: false, view: {}, reset() { this.view = null; }, async play() { trace.push("slide"); } };
  const combat = new BattleSession({
    director,
    transitions: { busy: false, async run(_kind, commit) {
      trace.push("cover"); commit();
      assert.equal(combat.battle, null);
      assert.equal(director.view, null);
      assert.equal(combat.busy, true);
      trace.push("reveal");
    } },
    onResult: () => ({ presentation: [{ dialogue: { lines: ["输了"] } }],
      dialogue: async () => { assert(combat.battle); assert(director.view); trace.push("dialogue"); },
      commit: () => trace.push("commit"), after: () => trace.push("story") }),
  });
  combat.battle = {}; combat.locked = true;
  await combat.finish();
  assert.deepEqual(trace, ["slide", "dialogue", "cover", "commit", "reveal", "story"]);
  assert.equal(combat.busy, false);
});

test("Route 102 defeat and prize lines stay in combat, settlement pays exactly once", async () => {
  const s = session(), g = s.game;
  await g.startTrainerBattle("calvin");
  const before = g.state.money, lines = [];
  g.ui.say = async (_name, text) => { lines.push(text); assert(g.battle, "battle must remain visible while acknowledging the defeat"); };
  g.battle.finish("win");
  await g.combat.finish(); await s.settle();
  assert.equal(lines.length, 2);
  assert.equal(g.state.money, before + 80);
  assert(g.state.story.rewards.includes("trainer.calvin.prize"));
  await g.startTrainerBattle("calvin");
  g.battle.finish("win"); await g.combat.finish(); await s.settle();
  assert.equal(g.state.money, before + 80);
});

test("A failed defeat dialogue returns control without awarding a prize or marking victory", async () => {
  const s = session(), g = s.game;
  await g.startTrainerBattle("calvin");
  const before = g.state.money;
  g.ui.say = async () => { throw new Error("dialogue failed"); };
  g.battle.finish("win");
  await assert.rejects(g.combat.finish(), /dialogue failed/);
  assert.equal(g.battle, null); assert.equal(g.director.sample(), null); assert.equal(g.busy, false);
  assert.equal(g.state.money, before);
  assert(!g.state.story.rewards.includes("trainer.calvin.prize"));
});

test("A failed challenge dialogue clears the staged battle and permits another encounter", async () => {
  const s = session(), g = s.game, say = g.ui.say;
  g.ui.say = async () => { throw new Error("challenge failed"); };
  await assert.rejects(g.startTrainerBattle("calvin"), /challenge failed/);
  assert.equal(g.battle, null); assert.equal(g.director.sample(), null); assert.equal(g.busy, false);
  g.ui.say = say;
  assert(await g.startTrainerBattle("calvin"));
});

for (const [dir, x, y, expected] of [
  ["up", 4, 108, [5, 107]], ["down", 4, 106, [4, 108]],
  ["left", 5, 107, [4, 108]], ["right", 3, 107, [4, 108]],
]) test(`Wally arrives on the original tile when Norman is approached facing ${dir}`, async () => {
  const s = session(), g = s.game;
  g.state.flags.pokedex = true;
  g.enter({ map: "PetalburgCity_Gym", x, y, dir });
  let arrival;
  const say = g.ui.say;
  g.ui.say = async (...args) => {
    const actor = g.fieldDirector.snapshotActors().find(n => n.id === "wally.gym.arrive");
    if (actor && !arrival) arrival = [actor.x, actor.y];
    return say(...args);
  };
  await g.runStory(interaction(g.state, { kind: "petalburgNorman" }, "橙华道馆"));
  assert.deepEqual(arrival, expected);
  assert.deepEqual([g.state.position.x, g.state.position.y], [15, 9]);
});

test("Wally's real menus show both moves and the ball pocket, and only the borrowed ball is spent", async () => {
  const s = session(), g = s.game, menu = buttonPage(), bag = buttonPage(), stages = [], sent = [];
  menu.root.addEventListener = () => {};
  Object.defineProperty(menu.root, "innerHTML", {
    set(body) {
      menu.modal("", body, {});
      for (const node of menu.root.querySelectorAll("button")) node.classList = { add() {} };
    }, get: menu.body,
  });
  menu.document.getElementById = () => menu.root;
  const originalBag = structuredClone(g.state.bag), originalParty = structuredClone(g.state.party);
  const bagUI = createBagInterface(g, { ...bag.deps, modal(title, body, options) {
    stages.push(body.includes('bag-context') ? "ball-use" : body.includes("精灵球") ? "balls" : "items");
    bag.modal(title, body, options);
  } });
  const battleUI = createBattleInterface(g, { document: menu.document, hpTrack: () => "", hpColor: () => "", escapeHTML: String,
    showParty() {}, showBag: bagUI.showBag, demonstrateBagItem: bagUI.demonstrateBagItem });
  g.ui.extensions = undefined;
  g.ui.drawBattleHUD = battleUI.draw; g.ui.resetBattleMenu = battleUI.reset;
  g.ui.demonstrateBattleAction = (action, ports) => battleUI.demonstrate(action, {
    wait: async ms => { if (menu.body().includes('data-battle-page="moves"')) stages.push("moves"); await ports.wait(ms); },
    submit: selection => { sent.push(selection); return ports.submit(selection); },
  });
  g.state.flags.pokedex = true;
  g.enter({ map: "PetalburgCity_Gym", x: 4, y: 108, dir: "up" });
  let grass;
  const start = g.applications.battle.startBattle.bind(g.applications.battle);
  g.applications.battle.startBattle = (...args) => {
    const wally = g.field.npcs.objects("Route102").find(n => n.id === "wally.route102");
    grass = [g.state.position.x, g.state.position.y, wally.x, wally.y, wally.dir];
    return start(...args);
  };
  await g.runStory(interaction(g.state, { kind: "petalburgNorman" }, "橙华道馆"));
  await g.flushStoryQueue(); await s.settle(); await g.flushStoryQueue(); await s.settle();
  assert.deepEqual(grass, [5, 5, 6, 5, "right"]);
  assert.equal(stages.filter(stage => stage === "moves").length, 2);
  assert.deepEqual(stages.filter(stage => stage !== "moves"), ["items", "balls", "ball-use"]);
  assert.deepEqual(sent.map(a => a.kind), ["move", "move", "item"]);
  assert.deepEqual(sent[2].slot, { pocket: "balls", index: 0, item: "pokeball" });
  assert.deepEqual(g.state.bag, originalBag);
  assert.deepEqual(g.state.party, originalParty);
  assert.equal(g.state.flags.wallyDone, true);
  assert.equal(g.battle, null);
});

test("Native intro holds trainer battle art during dialogue and sends each side separately", async () => {
  const s = session(), g = s.game;
  await g.startTrainerBattle("calvin");
  const view = g.battle.snapshot(), options = emeraldBattleOpening(g.state, { trainer: true, trainerActor: "Youngster" }, s.db, g.battle.enemy);
  let now = 0;
  const director = new BattleDirector(new Timeline({ now: () => now, wait: async ms => { now += ms; } }), {
    intro: EMERALD_BATTLE_INTRO, layout: emeraldBattleLayout, viewport: EMERALD_BATTLE_VIEWPORT,
  });
  director.reset(view);
  await director.play({ ...view, kind: "entry", trainers: options.trainers, ...options.entryPhases[0] });
  let frame = director.sample();
  assert.equal(frame.trainers.length, 2);
  assert(frame.trainers.every(t => t.resource.startsWith("battle-trainer-")));
  assert(frame.actors.every(a => a.opacity === 0));
  const home = view.combatants[0].seatId, away = view.combatants[1].seatId;
  await director.play({ ...view, kind: "entry", introPhase: "send", sendBack: false, sendSeats: [away] });
  frame = director.sample();
  assert.equal(frame.trainers.length, 1);
  assert.equal(frame.actors.find(a => a.seatId === home).opacity, 0);
  assert.equal(frame.actors.find(a => a.seatId === away).opacity, 1);
  await director.play({ ...view, kind: "entry", introPhase: "send", sendBack: true, sendSeats: [home] });
  assert.equal(director.sample().trainers.length, 0);
  assert.equal(director.sample().layout.get(home).size, 64);
});

test("Reflection uses the native palette and full affine sprite bounds, mirrors lift, and leaves the actor asset intact", () => {
  assert(emeraldReflectionSurface(0x10)); assert(emeraldReflectionSurface(0x20));
  assert.equal(emeraldReflectionSurface(0x15), null);
  const calls = [], primary = {}, reflection = {}, frame = { bounds: { left: 0, right: 16, top: -16, bottom: 16 }, layers: [{ kind: "actor", actor: "MayNormal" }] };
  const ctx = { globalAlpha: 1, save() {}, restore() {}, beginPath() {}, rect(...a) { calls.push(["clip", ...a]); }, clip() {},
    translate(...a) { calls.push(["translate", ...a]); }, scale(...a) { calls.push(["scale", ...a]); } };
  const resource = emeraldReflectionResource("MayNormal");
  assert.equal(resource, "reflection-MayNormal");
  const renderer = { ctx, assets: { "actor-MayNormal": primary, [resource]: reflection }, actor(name, _x, y) { calls.push(["actor", this.assets[`actor-${name}`], y]); } };
  drawReflection(renderer, frame, { dir: "down", timeMs: 0 }, 10, 10, 4, [{ x: 10, y: 26, wave: true }, { x: 200, y: 200 }], {
    resourceFor: emeraldReflectionResource, reducedMotion: true,
  });
  assert.deepEqual(calls, [["clip", 10, 28, 16, 32], ["translate", 18, 50], ["scale", 1, -1], ["translate", -18, 0], ["actor", reflection, 6]]);
  assert.equal(renderer.assets["actor-MayNormal"], primary);
});


test("Water distortion follows the native affine holds, and ice keeps unit horizontal scale", () => {
  const scales = [0, 4, 12, 16, 24, 28, 36, 40, 48].map(frame => emeraldReflectionScale(frame * 1000 / 60));
  assert.deepEqual(scales, [256,252,252,256,256,260,260,256,256].map(v => v / 256));
  const draws = [], frame = { bounds: { left: 0, right: 16, top: -16, bottom: 16 }, layers: [{ kind: "actor", actor: "MayNormal" }] };
  const renderer = { assets: { "reflection-MayNormal": {} }, actor() {}, ctx: {
    globalAlpha: 1, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, translate() {}, scale(x) { draws.push(x); },
  } };
  for (const wave of [true, false]) drawReflection(renderer, frame, { timeMs: 0 }, 0, 0, 0,
    [{ x: 0, y: 16, wave }], { horizontalScale: 252 / 256, resourceFor: emeraldReflectionResource });
  assert.deepEqual(draws, [252 / 256, 1]);
});

test("Wally crosses the city boundary with continuous world coordinates, stride, and reservations", async () => {
  const s = session(), g = s.game;
  g.state.flags.wallyTutorial = true; g.state.flags.wallyInTown = true;
  g.enter({ map: "PetalburgCity", x: 28, y: 17, dir: "right" });
  const director = g.fieldDirector, npcs = g.field.npcs;
  director.begin();
  npcs.stage("PetalburgCity", { id: "wally.city", actor: "Wally", x: 29, y: 17, dir: "right" });
  const before = director.actor("wally.city"), start = g.timeline.now();
  const moving = director.step("wally.city", "right", { ignoreActors: ["player"] });
  // step waits at its ready barrier before publishing the cross-map pose.
  await Promise.resolve();
  const actor = npcs.objects("Route102").find(n => n.id === "wally.city");
  assert(actor); assert.equal(actor.foot, (before.foot + 1) % 2);
  assert.deepEqual([actor.fromX, actor.fromY, actor.x, actor.y], [-1, 7, 0, 7]);
  const oldOrigin = g.motion.graph.placements.PetalburgCity, newOrigin = g.motion.graph.placements.Route102;
  assert.deepEqual([newOrigin.x + actor.fromX, newOrigin.y + actor.fromY], [oldOrigin.x + 29, oldOrigin.y + 17]);
  const halfway = npcs.view("Route102", start + 80).find(n => n.id === "wally.city");
  assert.equal(halfway.px, -8); assert.equal(halfway.dir, "right");
  assert(!npcs.objects("PetalburgCity").some(n => n.id === "wally.city"));
  assert(npcs.occupants("PetalburgCity").some(n => n.id === "wally.city" && n.x === 29 && n.y === 17));
  await moving;
  await director.step("wally.city", "right", { ignoreActors: ["player"] });
  assert.deepEqual([director.actor("wally.city").map, director.actor("wally.city").x], ["Route102", 1]);
  director.hide({ actor: "wally.city" });
  assert(!npcs.objects("Route102").some(n => n.id === "wally.city"));
  await director.end();
});


test("A blocked actor connection preserves the source pose and never publishes a destination actor", async () => {
  const { game: g } = session();
  g.state.flags.wallyTutorial = true; g.state.flags.wallyInTown = true;
  g.enter({ map: "PetalburgCity", x: 28, y: 17, dir: "right" });
  const director = g.fieldDirector, npcs = g.field.npcs;
  director.begin();
  npcs.stage("PetalburgCity", { id: "wally.city", actor: "Wally", x: 29, y: 17, dir: "right" });
  npcs.stage("Route102", { id: "blocker", actor: "Boy1", x: 0, y: 7, dir: "down" });
  const before = director.actor("wally.city");
  await assert.rejects(director.step("wally.city", "right"), /movement blocked/);
  assert.deepEqual(director.actor("wally.city"), before);
  assert(!npcs.objects("Route102").some(n => n.id === "wally.city"));
  assert(!npcs.scene.hidden.has("PetalburgCity:wally.city"));
  await director.end({ failed: true });
  assert.equal(npcs.scene, null);
});


test("All five Poké Ball trail bands stay completely black after the balls leave the screen", () => {
  const draw = emeraldTransitionPatterns({})["emerald:pokeballs-trail"];
  for (let nativeFrame = 96; nativeFrame <= 100; nativeFrame++) {
    const pixels = new Uint8Array(240 * 160);
    const ctx = { scale() {}, fillStyle: "", globalAlpha: 1, fillRect(x,y,w,h) {
      assert.equal(this.fillStyle, "#000");
      for (let row = Math.max(0, y); row < Math.min(160, y+h); row++)
        for (let col = Math.max(0, x); col < Math.min(240, x+w); col++) pixels[row*240+col] = 1;
    } };
    draw(ctx, { width: 240, height: 160, phase: "cover", opacity: (48 + nativeFrame) / 148 });
    assert(pixels.every(v => v === 1), `native frame ${nativeFrame} leaves uncovered pixels`);
  }
});


test("A reflection appears at the adjacent water edge and never across a dry tile", () => {
  const frame = { bounds: { left: 0, right: 16, top: -16, bottom: 16 }, layers: [{ kind: "actor", actor: "MayNormal" }] };
  let draws = 0;
  const renderer = { assets: { "reflection-MayNormal": {} }, actor() { draws++; }, ctx: {
    globalAlpha: 1, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, translate() {}, scale() {},
  } };
  for (const distance of [2, 1]) {
    draws = 0;
    drawReflection(renderer, frame, { timeMs: 0 }, 0, 0, 0, [{ x: 0, y: distance * 16, wave: true }], { resourceFor: emeraldReflectionResource });
    assert.equal(draws, distance === 1 ? 1 : 0);
  }
});


test("Reflections ignore the previous origin from the first departure frame through landing", () => {
  const frame = { bounds: { left: 0, right: 16, top: -16, bottom: 16 }, layers: [{ kind: "actor", actor: "MayNormal" }] };
  let draws = 0;
  const renderer = { assets: { "reflection-MayNormal": {} }, actor() { draws++; }, ctx: {
    globalAlpha: 1, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, translate() {}, scale() {},
  } };
  const options = { resourceFor: emeraldReflectionResource, origins: [{ x: 0, y: 0 }, { x: 0, y: 16 }] };
  for (const progress of [0, 0.5, 0.99, 1]) {
    drawReflection(renderer, frame, { moving: progress < 1, progress }, 0, 0, 0, [{ x: 0, y: 32, wave: true }], options);
    assert.equal(draws, 0, `departure progress ${progress} retains the reflection`);
  }
});

test("The native fractional water stretch changes actual actor pixel columns while standing still", () => {
  const { db } = session(), renderer = Object.create(Renderer.prototype), calls = [];
  Object.assign(renderer, { db, reducedMotion: () => false, assets: { "reflection-MayNormal": { width: 144, height: 32 } }, ctx: {
    globalAlpha: 1, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, translate() {}, scale() {},
    drawImage(_image, sx) { calls.push(sx); },
  } });
  const frame = { bounds: { left: 0, right: 16, top: -16, bottom: 16 }, layers: [{ kind: "actor", actor: "MayNormal", y: -16 }] };
  const poses = [];
  for (const nativeFrame of [0,4,28]) {
    calls.length = 0;
    drawReflection(renderer, frame, { dir: "down", moving: false, timeMs: nativeFrame * 1000 / 60 }, 0, 0, 0,
      [{ x: 0, y: 16, wave: true }], { resourceFor: emeraldReflectionResource,
        horizontalScale: emeraldReflectionScale(nativeFrame * 1000 / 60), columnsFor: emeraldReflectionColumns });
    poses.push([...calls]);
  }
  assert.deepEqual(poses[0], Array.from({ length: 16 }, (_, i) => i));
  assert.notDeepEqual(poses[1], poses[0]); assert.notDeepEqual(poses[2], poses[0]);
});

test("Ignoring terrain is limited to explicit scene NPC paths, with normal player movement still guarded", async () => {
  const { game: g, db } = session();
  assert.throws(() => validateFieldCommand({ type: "move", actor: "player", path: ["down"], ignoreTerrain: true }, db.maps), /Invalid move/);
  assert.throws(() => validateFieldCommand({ type: "move", actor: "npc", to: { x: 1, y: 1 }, ignoreTerrain: true }, db.maps), /Invalid move/);
  await assert.rejects(g.fieldDirector.move({ actor: "player", path: ["down"], ignoreTerrain: true }), /explicit NPC path/);
});
