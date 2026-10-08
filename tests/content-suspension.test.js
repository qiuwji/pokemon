import { Timeline, TransitionController } from "../src/engine/timeline.js";
import { BattleDirector } from "../src/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../src/engine/motion.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import { session, manifest } from './helpers/session.js';
import { loadContentSync } from '../tools/content-io.mjs';
import { createEmeraldPlugins } from '../src/game/emerald/assembly/extensions.js';
import { EmeraldAdventure } from '../src/game/emerald/adventure.js';
import { attachEmeraldExtensions } from '../src/game/emerald/commands/extension-ports.js';
import { createMonster } from '../src/engine/model.js';
import { inventoryQuantity } from '../src/engine/inventory.js';
import { PACK } from "../src/packs/emerald/pack.js";
import { validateSave } from "../src/game/emerald/assembly/save-contract.js";
const base=loadContentSync();
const mod=manifest('suspend-demo',api=>{
  api.content.register('items','snack',{name:'点心',price:10,contexts:['field'],target:'party',effects:[{op:'restoreHP',amount:10}],icon:'◇',description:'测试'});
  api.content.register('moves','growl',{...base.moves.growl});
  api.content.register('abilities','quiet',{hooks:[]});
  api.content.register('species','guest',{...base.species.mudkip});
  api.content.register('maps','room',{...base.maps.LittlerootTown_ProfessorBirchsLab,id:'suspend-demo:room',connections:[],warps:[],npcs:[],signs:[]});
  api.content.register('movement','air',{name:'空中',actor:'BrendanNormal',durations:[100],surface:'both',allowed:()=>true,traverse:()=>true});
  api.story.registerBundle('speech',{version:1,dialogues:{sign:{name:'告示牌',lines:['测试']}},scripts:{},entries:{}});
});
function storage() {const records=new Map();return {records,getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)};}
function reopen(plugins,store) {
  const {db,catalog,host}=createEmeraldPlugins(base,plugins);
  const timeline=new Timeline({now:()=>0,wait:async()=>{}});
  const game=new EmeraldAdventure({db,catalog,plugins:host,storage:store,wallNow:()=>1000,timeline,transitions:new TransitionController(timeline),director:new BattleDirector(timeline),motion:new GridMotion(new SceneGraph(db.maps))});
  attachEmeraldExtensions(game,host);return {game,db,catalog,host};
}
function setup() {
  const s=session([mod]);
  s.game.state.flags.pokedex=true;
  s.game.state.money=1234;
  s.game.state.extensions['suspend-demo'].data={visits:7};
  assert(s.game.inventory.apply(s.game.state.bag,[{kind:'add',item:'suspend-demo:snack',count:2}]).ok);
  s.mon.moves[1]={id:'suspend-demo:growl',pp:base.moves.growl.pp};
  s.mon.ability='suspend-demo:quiet';
  const guest=createMonster('suspend-demo:guest',5,s.db,s.game.rng);s.game.state.box.push(guest);
  s.game.state.seen.push('suspend-demo:guest');s.game.state.caught.push('suspend-demo:guest');
  return {...s,guest};
}
test('Same stored adventure survives enable-disable-save-reload-enable with native progress and plugin memory',async()=>{
  const s=setup(),store=storage(),doc=s.game.exportDocument();
  store.setItem(PACK.id,JSON.stringify(doc));const raw=store.getItem(PACK.id);
  const off=reopen([],store);assert.equal(off.game.saveProtected,false);
  assert.equal(off.game.state.money,1234);assert.equal(off.game.state.flags.pokedex,true);
  assert.equal(off.game.state.party[0].uid,s.mon.uid);assert.equal(off.game.state.party[0].ability,'torrent');
  assert.equal(off.game.state.party[0].moves.some(m=>m.id==='suspend-demo:growl'),false);
  assert.equal(off.game.state.box.length,0);assert.equal(inventoryQuantity(off.game.state.bag,'suspend-demo:snack'),0);
  assert.equal(off.game.state.extensions['suspend-demo'].data.visits,7);
  assert.equal(store.getItem(PACK.id+':before-content-suspension'),raw);
  assert(off.game.state.suspendedContent.records.length>=5);
  off.game.state.money+=100;assert.equal(off.game.save(),true);
  const again=reopen([],store);assert.equal(again.game.state.money,1334);assert.equal(again.game.saveProtected,false);
  const on=reopen([mod],store);assert.equal(on.game.state.money,1334);
  assert.equal(on.game.state.party[0].ability,'suspend-demo:quiet');
  assert(on.game.state.party[0].moves.some(m=>m.id==='suspend-demo:growl'));
  assert.equal(on.game.state.box[0].uid,s.guest.uid);assert.equal(inventoryQuantity(on.game.state.bag,'suspend-demo:snack'),2);
  assert.equal(on.game.state.suspendedContent.records.length,0);
  assert.equal(on.game.save(),true);
});
test('Missing map and airborne mode use a valid ground landing; reenabling never teleports the player backwards',()=>{
  const s=setup(),doc=s.game.exportDocument(),store=storage();
  doc.state.position={map:'suspend-demo:room',x:3,y:5,dir:'down'};doc.state.movement.mode='suspend-demo:air';
  doc.state.contentDependencies=['suspend-demo'];doc.state.worldState.activeMap='suspend-demo:room';doc.state.fieldEffects.activeMap='suspend-demo:room';
  store.setItem(PACK.id,JSON.stringify(doc));const off=reopen([],store);
  assert.equal(off.game.saveProtected,false);assert.equal(off.game.state.position.map,PACK.safeReturn.map);
  assert.equal(off.game.state.movement.mode,'walk');assert(off.game.save());
  const position=structuredClone(off.game.state.position),on=reopen([mod],store);
  assert.deepEqual(on.game.state.position,position);assert(on.game.state.suspendedContent.records.some(r=>r.payload.kind==='location'));
});
test('A changed move list or occupied inventory slot defers restoration without overwriting new progress',()=>{
  const s=setup(),off=session();off.game.loadDocument(s.game.exportDocument());
  const mon=off.game.state.party[0];mon.moves=[{id:'tackle',pp:10}];
  const archived=off.game.state.suspendedContent.records.find(r=>r.payload.path?.[0]==='bag');
  const [, ,pocket,index]=archived.payload.path;off.game.state.bag.pockets[pocket][index]={item:'potion',count:1};
  const on=session([mod]);on.game.loadDocument(off.game.exportDocument());
  assert.deepEqual(on.game.state.party.find(m=>m.uid===s.mon.uid).moves,[{id:'tackle',pp:10}]);
  assert.equal(inventoryQuantity(on.game.state.bag,'potion'),1);
  assert(on.game.state.suspendedContent.records.some(r=>r.payload.field==='moves'));
  assert(on.game.state.suspendedContent.records.some(r=>r.payload.path?.[0]==='bag'));
});
test('World dialogue overrides pause and restore while unrelated native patches and flags remain',()=>{
  const s=setup(),map='LittlerootTown',id='native:LittlerootTown:sign:0';
  // A stable native object ID obtained from the runtime index.
  const sign=s.game.worldState.projectObjects(map,s.game.world.objects()).find(o=>o.kind==='sign');
  const actual=sign?.id||id;
  s.game.state.worldState.maps[map]={tiles:{},objects:{[actual]:{changes:{dialogue:'suspend-demo:speech.sign',text:'原生改动'}}}};
  const off=session();off.game.loadDocument(s.game.exportDocument());
  assert.equal(off.game.state.worldState.maps[map].objects[actual].changes.dialogue,undefined);
  assert.equal(off.game.state.worldState.maps[map].objects[actual].changes.text,'原生改动');
  const on=session([mod]);on.game.loadDocument(off.game.exportDocument());
  assert.equal(on.game.state.worldState.maps[map].objects[actual].changes.dialogue,'suspend-demo:speech.sign');
});
test('Native corruption, malformed archive and backup storage failures preserve the original document',()=>{
  const s=setup(),doc=s.game.exportDocument(),store=storage();doc.state.money=-1;
  const raw=JSON.stringify(doc);store.setItem(PACK.id,raw);const off=reopen([],store);
  assert.equal(off.game.saveProtected,true);assert.equal(off.game.save(),false);assert.equal(store.getItem(PACK.id),raw);
  assert(!validateSave({...s.game.state,suspendedContent:{version:1,nextId:2,records:[{id:1,domain:'runtime',owners:['suspend-demo'],payload:{kind:'field',path:['money'],before:{present:true,value:999},after:{present:true,value:1234}}}]}},s.db,s.catalog,s.host));
  const valid=s.game.exportDocument();store.setItem(PACK.id,JSON.stringify(valid));
  const failing={getItem:store.getItem,setItem(){throw new Error('quota');}};
  const failed=reopen([],failing);assert.equal(failed.game.saveProtected,true);assert.equal(store.getItem(PACK.id),JSON.stringify(valid));
});

test('A full PC defers the returning guest and unknown references inside an enabled plugin stay invalid',()=>{
  const s=setup(),off=session();off.game.loadDocument(s.game.exportDocument());
  while(off.game.state.box.length<200)off.game.state.box.push(createMonster('mudkip',5,off.db,off.game.rng));
  const on=session([mod]);on.game.loadDocument(off.game.exportDocument());
  assert.equal(on.game.state.box.length,200);assert(!on.game.state.box.some(m=>m.uid===s.guest.uid));
  assert(on.game.state.suspendedContent.records.some(r=>r.payload.uid===s.guest.uid));
  const broken=s.game.exportDocument();broken.state.party[0].moves[0].id='suspend-demo:typo';
  assert.throws(()=>s.game.loadDocument(broken),/Invalid save/);
});
