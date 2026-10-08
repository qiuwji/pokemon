import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openingBattleTransition, sampleOpeningTransition } from "../src/packs/emerald/battle-transitions.js";
import { emeraldTransitionPatterns } from "../src/game/emerald/presentation/battle-transition-canvas.js";
import { session } from "./helpers/session.js";
import { createMonster } from "../src/engine/model.js";

const at = (pattern, frame) => sampleOpeningTransition(pattern, (frame + 0.01) / 217);

test("Native Aqua and Magma identities override level-based trainer transitions; wild battles keep the normal rule", () => {
  for (const [pattern, actors] of Object.entries({ aqua:["AquaMemberM","AquaMemberF","Archie","Matt","Shelly"], magma:["MagmaMemberM","MagmaMemberF","Maxie","Tabitha","Courtney"] }))
    for (const trainerActor of actors) for (const level of [1, 90]) {
      const options = { trainer:true, trainerActor, party:[{hp:10,level:20}], opponents:[{level}] };
      const result = openingBattleTransition(options);
      assert.equal(result.kind, `emerald:${pattern}`);
      assert.equal(result.coverMs, 217 * 1000 / 60);
      assert.equal(openingBattleTransition({ ...options, trainer:false }).kind, level < 20 ? "emerald:slice" : "emerald:white-bars");
    }
});

test("Team transitions retain source weave counters, one-second hold and accelerating circular closure", () => {
  for (const pattern of ["aqua", "magma"]) {
    assert.deepEqual(at(pattern, 0), {gray:2/16});
    assert.equal(at(pattern, 48).logo, 0);
    assert.equal(at(pattern, 49).logo, 0);
    assert.equal(at(pattern, 50).logo, 1/16);
    assert.equal(at(pattern, 50).base, 1);
    assert(new Set(at(pattern, 50).offsets).size > 20, "the emblem is displaced separately on each scanline");
    assert.equal(at(pattern, 80).logo, 1); // 31 Blend1 ticks.
    assert.equal(at(pattern, 80).base, 1);
    assert.equal(at(pattern, 112).base, 0); // 32 Blend2 ticks.
    assert.equal(at(pattern, 113).offsets.every(x => x === 0), true);
    for (let frame=114; frame<174; frame++) {
      assert.equal(at(pattern,frame).mask, undefined);
      assert.equal(at(pattern,frame).logo, 1);
    }
    let previous=160, step=0;
    for (let frame=174; frame<217; frame++) {
      const visual=at(pattern,frame);
      assert(visual.radius < previous);
      assert(previous-visual.radius >= step || visual.radius === 0);
      step=previous-visual.radius; previous=visual.radius;
      assert(visual.mask.left.every((left,y)=>left >= 0 && left <= visual.mask.right[y] && visual.mask.right[y] <= 240));
    }
    const end=sampleOpeningTransition(pattern,1);
    assert.equal(end.radius,0);
    assert(end.mask.left.every((x,y)=>x === end.mask.right[y]), "the field is fully covered before the battle replaces it");
  }
});

test("Source tilemap artwork is registered at 256x256; the real drawing adapter wraps rows without stretching the emblem", () => {
  const s=session(), assets={};
  for (const faction of ["aqua","magma"]) {
    const id=`battle-transition-${faction}`, bytes=readFileSync(new URL("../"+s.db.resources[id],import.meta.url));
    assets[id]={id,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
    assert.deepEqual([assets[id].width,assets[id].height],[256,256]);
  }
  const patterns=emeraldTransitionPatterns(assets);
  for (const faction of ["aqua","magma"]) {
    const draws=[], fills=[], ctx={globalAlpha:1,scale(){},drawImage(image,...args){draws.push({image,args});},fillRect(...args){fills.push({alpha:this.globalAlpha,args});}};
    patterns[`emerald:${faction}`](ctx,{phase:"cover",opacity:50.01/217,width:240,height:160});
    assert(draws.length>160, "negative horizontal offsets wrap at the source BG edge");
    const widths=Array(160).fill(0);
    for (const {image,args:[sx,sy,sw,sh,dx,dy,dw,dh]} of draws) {
      assert.equal(image.id,`battle-transition-${faction}`);
      assert(sx >= 0 && sx+sw <= 256 && sy >= 0 && sy < 160);
      assert.equal(sh,1); assert.equal(dh,1); assert.equal(sw,dw); assert.equal(sy,dy);
      assert(dx >= 0 && dx+dw <= 240); widths[dy]+=dw;
    }
    assert(widths.every(width=>width === 240));
    assert(!fills.some(fill=>fill.alpha===1&&fill.args[2]===240&&fill.args[3]===160));
    patterns[`emerald:${faction}`](ctx,{phase:"reveal",opacity:0.25,width:240,height:160});
    assert.deepEqual(fills.at(-1),{alpha:0.25,args:[0,0,240,160]});
  }
});

test("The actual woods trigger selects Aqua art before battle publication and finishes through real combat", async () => {
  const s=session(),g=s.game,calls=[],run=g.transitions.run.bind(g.transitions);
  g.state.party=[createMonster("mudkip",50,s.db,g.rng)];
  g.transitions.run=async(kind,swap,options)=>{
    calls.push({kind,options,beforeBattle:!!g.battle,entering:!!g.combat.enteringBattle});
    return run(kind,swap,options);
  };
  assert(g.enter({map:"PetalburgWoods",x:26,y:24,dir:"up"}));
  assert.equal((await s.bus.execute("core.field.move",{direction:"up"})).status,"moved");
  await g.timeline.wait(g.motion.remaining(g.timeline.now())); g.field.tick(g.timeline.now()); await s.settle();
  const entry=calls.find(call=>call.kind === "emerald:aqua"); assert(entry);
  assert.equal(entry.beforeBattle,false); assert.equal(entry.entering,true);
  assert.equal(entry.options.coverMs,217*1000/60);
  assert.equal(g.battle.trainerId,"aquaPetalburgWoods");
  for (let i=0;g.battle&&i<20;i++) {
    const index=g.battle.player.moves.findIndex(slot=>slot.pp>0&&s.db.moves[slot.id].power>0);
    assert(index>=0); assert(await g.turn({kind:"move",index})); await s.settle();
  }
  assert.equal(g.battle,null); assert.equal(g.state.flags.petalburgWoodsSaved,true);
  assert.equal(calls.filter(call=>call.kind === "emerald:aqua").length,1);
});
