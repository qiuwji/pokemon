import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { session } from "./helpers/session.js";
import { inventoryQuantity } from "../src/engine/inventory.js";

const dialogueText = dialogue => dialogue.lines.map(line => typeof line === "string" ? line : line.runs.map(run => run.text).join("")).join("\n");
function face(s, map, object) {
  return [[0,1,"up"],[0,-1,"down"],[1,0,"left"],[-1,0,"right"]].some(([dx,dy,dir]) =>
    s.game.enter({map,x:object.x+dx,y:object.y+dy,dir}) && s.game.world.interact()?.id === object.id);
}

test("Rustboro native conditional dialogues use real source entrances and saved branch facts", async () => {
  const s=session(),g=s.game;
  const cases=[
    ["RustboroCity","FatMan","devonGoodsStolen","rustboro.devon","rustboro.suspicious"],
    ["RustboroCity","Boy2","pokenavReceived","rustboro.briney-tunnel","rustboro.briney-peeko"],
    ["RustboroCity","Man1","badgeStone","rustboro.gym","rustboro.badge"],
    ["RustboroCity_DevonCorp_1F","Employee","devonGoodsReturned","devon1.shoes","devon1.recovered"],
    ["RustboroCity_DevonCorp_1F","StairGuard","devonGoodsReturned","devon1.authorized","devon1.welcome"],
    ["RustboroCity_DevonCorp_1F","Greeter","devonGoodsStolen","devon1.company","devon1.staff"],
    ["RustboroCity_DevonCorp_2F","BallScientist","metDevonEmployee","devon2.balls","devon2.balls-ready"],
    ["RustboroCity_DevonCorp_2F","PokenavScientist","pokenavReceived","devon2.pokenav","devon2.pokenav-owned"],
  ];
  for(const [map,label,flag,initial,later] of cases) {
    // Each source fact is independently arranged; no claim of playing the later mainline.
    for(const key of ["devonGoodsStolen","devonGoodsReturned","devonGoodsRecovered","pokenavReceived","badgeStone","metDevonEmployee"]) delete g.state.flags[key];
    const object=g.field.npcs.objects(map).find(n=>n.script===map+"_EventScript_"+label);assert(object);
    assert(face(s,map,object));s.dialogs.length=0;g.interact();await s.settle();
    assert.equal(s.dialogs.map(dialogueText).join("\n"),s.db.stories["native-interactions"].dialogues[initial].lines.join("\n"));
    g.state.flags[flag]=true;g.loadDocument(g.exportDocument());s.dialogs.length=0;g.interact();await s.settle();
    assert.equal(s.dialogs.map(dialogueText).join("\n"),s.db.stories["native-interactions"].dialogues[later].lines.join("\n"));
  }
});

test("Source children restore their original facing and named Pokémon speak their own lines", async () => {
  const s=session(),g=s.game;
  for(const [map,suffix] of [["RustboroCity","LittleBoy"],["RustboroCity","LittleGirl"],
    ["RustboroCity_House3","OldWoman"],["RustboroCity_House3","Pekachu"],
    ["RustboroCity_Flat2_1F","Skitty"],["DewfordTown_House1","Zigzagoon"]]) {
    const object=g.field.npcs.objects(map).find(n=>n.script===map+"_EventScript_"+suffix);assert(object);
    const before=object.dir;assert(face(s,map,object));s.dialogs.length=0;g.interact();await s.settle();
    assert.equal(s.dialogs.length,1);assert(!dialogueText(s.dialogs[0]).includes("在丰缘旅行"));
    if(suffix.startsWith("Little"))assert.equal(g.field.npcs.objects(map).find(n=>n.id===object.id).dir,before);
  }
});

test("Cut HM, Premier Ball and Quick Claw gifts use real objects and stay deduplicated after save/reload", async () => {
  for(const [map,id,item] of [["RustboroCity_CuttersHouse","rustboro.cutter","hm_cut"],
    ["RustboroCity_Flat2_2F","rustboro.premier-ball","premier_ball"],
    ["RustboroCity_PokemonSchool","rustboro.teacher","quick_claw"]]) {
    const s=session(),g=s.game,object=g.field.npcs.objects(map).find(n=>n.id===id);assert(object);
    assert(face(s,map,object));g.interact();await s.settle();assert.equal(inventoryQuantity(g.state.bag,item),1);
    g.loadDocument(g.exportDocument());g.interact();await s.settle();assert.equal(inventoryQuantity(g.state.bag,item),1);
    assert(g.state.story.rewards.includes('field-gift.'+id));assert.equal(g.storyBusy,false);
  }
});

test("School teacher checks students on both source side approaches, follows each walk/delay and returns before giving the item", async () => {
  const source=readFileSync(new URL('../work/pokeemerald/data/maps/RustboroCity_PokemonSchool/scripts.inc',import.meta.url),'utf8');
  for(const [x,dir,suffix] of [[4,'right','East'],[6,'left','West']]) {
    const s=session(),g=s.game;g.enter({map:'RustboroCity_PokemonSchool',x,y:3,dir});
    const object=g.world.interact();assert.equal(object?.id,'rustboro.teacher');
    const raw=source.split('RustboroCity_PokemonSchool_Movement_TeacherCheckOnStudents'+suffix+':')[1].split('step_end')[0];
    const expected=[];
    for(const match of raw.matchAll(/^\s*walk_(up|down|left|right)\s*$/gm)) {
      expected.push(match[1]);
    }
    assert.deepEqual(object.giftPreludeByFacing[dir].filter(c=>c.type==='move').flatMap(c=>c.path),expected);
    g.interact();await s.settle();
    const teacher=g.field.npcs.objects('RustboroCity_PokemonSchool').find(n=>n.id===object.id);
    assert.deepEqual([teacher.x,teacher.y,teacher.dir],[5,3,'down']);assert.equal(inventoryQuantity(g.state.bag,'quick_claw'),1);
  }
});

test("Rustboro gift full-pocket retries commit neither receipt nor flag until capacity exists", async () => {
  const s=session(),g=s.game;const capacity=s.catalog.inventoryPockets.items;
  const fill=g.inventory.prepare(g.state.bag,[{kind:'add',item:'potion',count:capacity.capacity*capacity.stackLimit}]);
  assert(g.inventory.commit(fill,g.state.bag));
  assert(g.enter({map:'RustboroCity_PokemonSchool',x:6,y:3,dir:'left'}));g.interact();await s.settle();
  assert.equal(inventoryQuantity(g.state.bag,'quick_claw'),0);assert(!g.state.flags.receivedQuickClaw);
  assert(!g.state.story.rewards.includes('field-gift.rustboro.teacher'));
  const free=g.inventory.prepare(g.state.bag,[{kind:'remove',item:'potion',count:capacity.stackLimit}]);assert(g.inventory.commit(free,g.state.bag));
  g.loadDocument(g.exportDocument());g.interact();await s.settle();assert.equal(inventoryQuantity(g.state.bag,'quick_claw'),1);
});
