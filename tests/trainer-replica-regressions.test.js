import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { session } from "./helpers/session.js";
import { createMonster } from "../src/engine/model.js";
import { TRAINERS } from "../src/packs/emerald/trainers.js";
import { battleTrainer, emeraldBattleOpening, emeraldBattleLayout, EMERALD_BATTLE_VIEWPORT } from "../src/packs/emerald/battle-presentation.js";
import { createEmeraldPresentation } from "../src/game/emerald/assembly/animations.js";
import { BattleDirector } from "../src/presentation/battle-director.js";
import { validateSave } from "../src/game/emerald/assembly/save-contract.js";

const textOf = lines => lines.map(line => typeof line === "string" ? line : line.runs.map(run => run.text).join("")).join("");
const routeTrainers = ["calvin","rick","tiana","allen","haley","ivan","billy","ginaAndMia","winston","cindy","darian","lyle","james"];
test("All opening, Route104 and Woods trainer wins commit once and separate defeat from field dialogue", async () => {
  for (const id of routeTrainers) {
    const s = session(), g = s.game;
    // A non-Pickup partner keeps random item announcements outside this dialogue-order check.
    if (id === "ginaAndMia") g.state.party.push(createMonster("treecko", 10, s.db, g.rng));
    await g.startTrainerBattle(id);
    const before = g.state.money, contexts = [], lines = [];
    g.ui.say = async (_name, text) => { contexts.push(!!g.battle); lines.push(textOf(text)); };
    g.battle.finish("win");
    await g.combat.finish(); await s.settle();
    assert.deepEqual(contexts, [true,true,true,false], id);
    assert(lines[0].includes("击败")); assert(lines[2].includes(String(TRAINERS[id].prize)));
    assert.notEqual(lines[1], lines[3], id + " defeat and post-battle text must differ");
    assert.equal(g.state.money, before + TRAINERS[id].prize, id);
    assert.equal(g.state.story.rewards.filter(r => r === `trainer.${id}.prize`).length, 1);
    assert(validateSave(g.state, s.db, s.catalog, s.host));
    g.loadDocument(g.exportDocument());
    await g.startTrainerBattle(id);
    g.battle.finish("win"); await g.combat.finish(); await s.settle();
    assert.equal(g.state.money, before + TRAINERS[id].prize, id + " reload/replay cannot duplicate prize");
  }
});

test("Cindy is defeated through real map interaction and move commands; talking after reload never rematches", async () => {
  const s = session(), g = s.game;
  g.state.party = [createMonster("mudkip",50,s.db,g.rng)];
  g.enter({map:"Route104",x:10,y:44,dir:"right"});
  g.interact(); await s.settle();
  assert.equal(g.battle?.trainerId,"cindy");
  const before = g.state.money;
  for (let i = 0; g.battle && i < 30; i++) {
    const moves = g.battle.player.moves;
    const index = moves.findIndex(slot => slot.pp > 0 && s.db.moves[slot.id].power > 0);
    assert(index >= 0); assert(await g.turn({kind:"move",index})); await s.settle();
  }
  assert.equal(g.battle,null);
  assert.equal(g.state.money,before+1400);
  g.loadDocument(g.exportDocument());
  g.interact(); await s.settle();
  assert.equal(g.battle,null);
  assert(s.dialogs.some(d=>textOf(d.lines).includes("希望我们还会相遇")));
});

test("Trainer images use the original trainerPic rather than the overworld woman/boy graphics", () => {
  const expected = {cindy:"LADY",winston:"RICH_BOY",ivan:"FISHERMAN",ginaAndMia:"TWINS",aquaPetalburgWoods:"AQUA_GRUNT_M"};
  for (const [id,picture] of Object.entries(expected)) {
    const art = battleTrainer(TRAINERS[id].actor,false,id);
    assert.equal(art.resource,`battle-trainer-${picture}-front`);
    assert.deepEqual([art.width,art.height,art.offsetY],[64,64,0]);
    const bytes = readFileSync(new URL(`../generated/assets/ui/${art.resource}.png`,import.meta.url));
    assert.equal(bytes.readUInt32BE(16),64); assert.equal(bytes.readUInt32BE(20),64);
  }
});

test("Source slide directions, defeat return position and staged ball release are sampled between endpoints", async () => {
  const s = session(); await s.game.startTrainerBattle("cindy");
  const view = s.game.battle.snapshot(), phases = emeraldBattleOpening(s.game.state,{trainer:true,trainerId:"cindy",trainerActor:"Woman2",trainerName:"大小姐 辛迪"},s.db,s.game.battle.enemy);
  const director = new BattleDirector(s.game.timeline,{registry:createEmeraldPresentation({host:s.host}),layout:emeraldBattleLayout,viewport:EMERALD_BATTLE_VIEWPORT});
  director.reset(view);
  director.stage({...view,kind:"entry",...phases.entryPhases[0],trainers:phases.trainers});
  director.event.start=0;
  const halfway=director.sample(93*1000/60);
  assert.equal(halfway.sprites[0].x,200); assert.equal(halfway.sprites[1].x,56);
  const event={...view,kind:"entry",...phases.entryPhases.find(phase=>phase.introPhase==="send"&&!phase.sendBack),trainers:phases.trainers,sendSeats:[view.combatants[1].seatId]};
  director.stage(event); director.event.start=0;
  const early=director.sample(5*1000/60), late=director.sample(25*1000/60);
  const ball=early.sprites.find(sprite=>sprite.resource==="battle-anim-poke_ball");
  assert.equal(ball.x,176); assert.equal(ball.y,emeraldBattleLayout(view).get(event.sendSeats[0]).y+24);
  assert.equal(early.actors.find(a=>a.seatId===event.sendSeats[0]).opacity,0);
  assert(late.actors.find(a=>a.seatId===event.sendSeats[0]).scale>0);
  assert.equal(director.event.animation.cues.find(cue=>cue.id==="emerald:ball.open").at,19*1000/60);
  director.stage({...view,kind:"trainer-slide",trainers:[{...battleTrainer("Woman2",false,"cindy"),slideOffset:96}]});
  director.event.start=0;
  assert.equal(director.sample(400).sprites[0].x,222);
  assert.equal(director.sample(800).sprites[0].x,176);
});

test("Every Route104 source slot is accounted for, with later story NPCs conditional and collected items never resurrected", async () => {
  const s = session(), g = s.game;
  g.enter({map:"Route104",x:29,y:54,dir:"up"});
  const objects=g.baseWorldObjects("Route104");
  assert.equal(objects.filter(o=>o.sourceLocalId!==undefined&&o.kind!=="sign").length,31);
  assert.equal(objects.filter(o=>o.kind==="berryPlot").length,10);
  assert(objects.some(o=>o.id==="route104.boat"));
  assert(!objects.some(o=>o.id==="route104.briney"||o.id==="route104.rival"||o.id==="route104.florist"));
  g.interact(); await s.settle();
  g.enter({map:"PetalburgWoods",x:44,y:7,dir:"right"});g.interact();await s.settle();
  g.enter({map:"Route104",x:29,y:54,dir:"up"});
  assert(!g.field.npcs.objects("Route104").some(o=>o.sourceLocalId==="27"));
  g.loadDocument(g.exportDocument());
  g.enter({map:"PetalburgWoods",x:44,y:7,dir:"right"});
  assert(!g.field.npcs.objects("PetalburgWoods").some(o=>o.sourceLocalId==="5"));
});

test("Route104 ripe berries are visible, harvested via domain commands and stay empty after reload", async () => {
  const s = session(),g=s.game,id="emerald.route104.berry.13";
  g.state.clock.initialized=true;
  g.enter({map:"Route104",x:22,y:42,dir:"up"});
  assert.equal(g.cropView(id).stage,"ripe");
  const frame=g.appearanceFrame({kind:"object",map:"Route104",id},{actor:"BerryTreeLateStages"});
  assert.equal(frame.variant,"oran-ripe");
  assert.equal(g.cropAction(id,"harvest").ok,true);
  assert.equal(g.appearanceFrame({kind:"object",map:"Route104",id},{}).variant,"empty");
  g.loadDocument(g.exportDocument());
  assert.equal(g.cropView(id).stage,"empty");
});

test("Cuttable trees always show intact frame zero until a qualified Cut removes the obstacle", async () => {
  const s=session(),g=s.game;
  const { Renderer }=await import("../src/adapters/canvas-renderer.js");
  const frames=[],renderer=Object.create(Renderer.prototype);
  Object.assign(renderer,{db:s.db,reducedMotion:()=>false,assets:{"actor-CuttableTree":{width:64,height:16}},ctx:{drawImage:(_im,sx)=>frames.push(sx),save(){},restore(){},translate(){},scale(){}}});
  for(const dir of ['down','up','left','right'])renderer.actor('CuttableTree',0,0,dir);
  assert.deepEqual(frames,[0,0,0,0]);
  assert(g.enter({map:'Route104',x:34,y:22,dir:'right'}));
  assert(g.world.interact()?.kind==='cutTree');
  const uid=g.world.interact().id;
  assert.equal((await s.bus.execute('core.field.action',{id:'cut'})).ok,false);
  assert(g.field.npcs.objects('Route104').some(n=>n.id===uid));
  g.state.flags.badgeStone=true;
  g.state.party[0].moves=[{id:'cut',pp:30,maxPP:30}];
  assert.equal((await s.bus.execute('core.field.action',{id:'cut'})).ok,true);
  assert(!g.field.npcs.objects('Route104').some(n=>n.id===uid));
  g.loadDocument(g.exportDocument());
  assert(!g.field.npcs.objects('Route104').some(n=>n.id===uid));
});
