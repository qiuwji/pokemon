import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { session } from "./helpers/session.js";
import { Renderer } from "../src/adapters/canvas-renderer.js";
import { EMERALD_NATIVE_BERRIES } from "../src/packs/emerald/berries.js";
import { inventoryCounts, inventoryQuantity } from "../src/engine/inventory.js";
import { bindNativeObjects } from "../src/packs/emerald/native-object-bindings.js";

const shop="Route104_PrettyPetalFlowerShop";
const text = d => d.lines.map(l=>typeof l==='string'?l:l.runs.map(r=>r.text).join('')).join('');
function recordedRenderer(s) {
  const draws=[],stack=[],ctx={globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},translate(){},scale(){},beginPath(){},rect(){},clip(){},fillRect(){},drawImage(image,...args){draws.push({id:image?.id,args,alpha:this.globalAlpha});}};
  const assets=Object.fromEntries(Object.entries(s.db.resources).filter(([id])=>id.startsWith('berry-')).map(([id,path])=>{
    const png=readFileSync(new URL('../'+path,import.meta.url));
    return [id,{id,width:png.readUInt32BE(16),height:png.readUInt32BE(20)}];
  }));
  const renderer=new Renderer({width:240,height:160,getContext:()=>ctx},s.db,assets,{appearanceView:(target,context)=>s.game.appearanceFrame(target,context),projection:(size,now)=>s.game.cameraProjection(size,now)});
  return {draws,draw(){draws.length=0;renderer.world(s.game.world,s.game.field.npcs,s.game.timeline.now());return draws;}};
}

test('All 19 source road plots are registered; ripe varieties reach the real Canvas painter and empty soil stays invisible',()=>{
  const s=session(),g=s.game,r=recordedRenderer(s);
  assert.equal(EMERALD_NATIVE_BERRIES.length,19);
  for(const p of EMERALD_NATIVE_BERRIES) {
    const entrances=[[0,1,'up'],[0,-1,'down'],[1,0,'left'],[-1,0,'right']];
    assert(entrances.some(([dx,dy,dir])=>g.enter({map:p.map,x:p.x+dx,y:p.y+dy,dir})),p.id);
    const object=g.world.interact();assert.equal(object?.id,p.id);
    assert.equal(object.elevation,3);
    assert.equal(g.cropView(p.id).stage,p.initial?'ripe':'empty');
    const frame=g.appearanceFrame({kind:'object',map:p.map,id:p.id},{});
    const calls=r.draw().filter(d=>d.id===frame.layers[0].resource);
    assert(calls.length>0,'the registered PNG is drawn by Renderer.world');
    if(p.initial) assert(calls.some(d=>d.alpha===1&&d.args[2]===16&&d.args[3]===32));
    else assert.equal(frame.layers[0].opacity,0);
  }
});

test('Old saves gain Route102/103 berries without resurrecting picked Route104 fruit or replacing planted trees',()=>{
  const s=session(),g=s.game,picked='emerald.route104.berry.13',planted='emerald.route102.berry.7';
  g.state.clock.initialized=true;
  g.enter({map:'Route104',x:22,y:42,dir:'up'});assert(g.cropAction(picked,'harvest').ok);
  for(const id of Object.keys(g.state.flags)) if(id.startsWith('nativeBerryInitialized.'))delete g.state.flags[id];
  g.state.flags.nativeRoute104Berries=true;
  for(const p of EMERALD_NATIVE_BERRIES)if(p.map!=='Route104')delete g.state.crops.trees[p.id];
  g.applications.crops.crops.plant(planted,'cheri_berry');
  g.loadDocument(g.exportDocument());
  assert.equal(g.state.flags.nativeRoute104Berries,undefined,"legacy receipt is consumed once during restore");
  for(const p of EMERALD_NATIVE_BERRIES.filter(p=>p.map==='Route104')) assert(g.state.flags[`nativeBerryInitialized.${p.id}`]);
  assert.equal(g.cropView(picked).stage,'empty');assert.equal(g.cropView(planted).kind,'cheri_berry');
  assert.equal(g.cropView('emerald.route103.berry.8').stage,'ripe');
  g.enter({map:'Route102',x:25,y:3,dir:'up'});assert(g.cropAction('emerald.route102.berry.8','harvest').ok);
  const count=inventoryQuantity(g.state.bag,'pecha_berry');g.loadDocument(g.exportDocument());
  assert.equal(g.cropView('emerald.route102.berry.8').stage,'empty');assert.equal(inventoryQuantity(g.state.bag,'pecha_berry'),count);
});

test('Flower shop uses the source entry placement and ground height; both walking directions respect the player cell',async()=>{
  const s=session(),g=s.game;g.enter({map:shop,x:10,y:6,dir:'right'});
  const people=g.field.npcs.objects(shop);assert.deepEqual(people.find(n=>n.id==='flower-shop.owner')&&[people[0].x,people[0].y],[4,6]);
  const n=people.find(n=>n.id==='flower-shop.berry');assert.equal(n.elevation,3);
  assert.equal(g.move('right'),false);assert.equal(g.state.position.x,10);
  g.field.npcs.random=()=>0.6;n.next=0;
  g.field.npcs.tick(5000,g.state.position);
  assert.deepEqual([n.x,n.y,n.dir],[11,6,'left'],'NPC tries the player cell and remains blocked');
  g.loadDocument(g.exportDocument());assert.equal(g.field.npcs.objects(shop).find(object=>object.id===n.id)?.elevation,3);
  assert.equal(g.move('right'),false);
});

test('Flower owner yes/no dialogue, spray gift, daily eight-variety berry gift and saved receipt work through actual interaction',async()=>{
  const s=session(),g=s.game;g.state.clock.initialized=true;
  g.enter({map:shop,x:4,y:7,dir:'up'});g.interact();await s.settle();
  assert(g.state.flags.prettyPetalOwnerMet);assert(s.dialogs.some(d=>text(d).includes('再种下一颗')));
  g.ui.choose=async()=> 'no';g.interact();await s.settle();assert(text(s.dialogs.at(-1)).includes('快乐'));
  g.enter({map:shop,x:7,y:4,dir:'up'});g.interact();await s.settle();
  assert.equal(inventoryQuantity(g.state.bag,'wailmer_pail'),1);assert(g.state.flags.wailmerPail);
  g.loadDocument(g.exportDocument());g.interact();await s.settle();assert.equal(inventoryQuantity(g.state.bag,'wailmer_pail'),1);
  g.enter({map:shop,x:10,y:6,dir:'right'});const before=inventoryCounts(g.state.bag);g.interact();await s.settle();
  const after=inventoryCounts(g.state.bag),changed=Object.keys(after).filter(id=>after[id]>(before[id]||0));
  assert.equal(changed.length,1);assert(['cheri','chesto','pecha','rawst','aspear','leppa','oran','persim'].some(k=>changed[0]===k+'_berry'));
  g.loadDocument(g.exportDocument());g.interact();await s.settle();assert.deepEqual(inventoryCounts(g.state.bag),after);
  g.advanceWorldTime(86400000);g.interact();await s.settle();assert.equal(Object.values(inventoryCounts(g.state.bag)).reduce((a,b)=>a+b,0),Object.values(after).reduce((a,b)=>a+b,0)+1);
});

test('Devon 3F has one visible president; the original invisible desk proxy remains available for interaction',()=>{
  const s=session(),g=s.game,map='RustboroCity_DevonCorp_3F';g.enter({map,x:14,y:5,dir:'right'});
  const proxy=g.world.interact();assert.equal(proxy?.sourceLocalId,'3');
  const frame=g.appearanceFrame({kind:'object',map,id:proxy.id},{actor:proxy.actor});assert.equal(frame.layers[0].opacity,0);assert.equal(frame.shadow,false);
  const real=g.field.npcs.objects(map).find(n=>n.sourceLocalId==='1');assert(real);
  assert.equal(g.appearanceFrame({kind:'object',map,id:real.id},{actor:real.actor}).layers[0].opacity??1,1);
  assert.equal(g.move('right'),false,'invisibility does not remove desk interaction/collision');
});

test('Native spawn height follows ordinary floors and retains its previous plane on transition/multi-level tiles',()=>{
  const definition={sourceLocalId:'1',actor:'Boy1',kind:'talk'};
  const source={x:0,y:0,elevation:8,movement_type:'MOVEMENT_TYPE_FACE_DOWN'};
  for(const [tile,current,previous] of [[3,3,3],[0,0,8],[15,8,8]]) {
    const [object]=bindNativeObjects('fixture',[definition],[source],{width:1,blocks:[tile<<12]});
    assert.equal(object.elevation,current); assert.equal(object.previousElevation,previous);
  }
});

test('Flower gifts leave no receipt on full pockets; retry and reload deliver each gift once',async()=>{
  const s=session(),g=s.game;g.state.clock.initialized=true;
  const keyPocket=s.catalog.inventoryPockets.key;
  const fill=g.inventory.prepare(g.state.bag,[{kind:'add',item:'old_rod',count:keyPocket.capacity*keyPocket.stackLimit}]);
  assert(g.inventory.commit(fill,g.state.bag));
  g.enter({map:shop,x:7,y:4,dir:'up'});g.interact();await s.settle();
  assert.equal(inventoryQuantity(g.state.bag,'wailmer_pail'),0);assert(!g.state.flags.wailmerPail);
  assert(!g.state.story.rewards.includes('flower-shop.wailmer-pail'));assert(text(s.dialogs.at(-1)).includes('背包'));
  const remove=g.inventory.prepare(g.state.bag,[{kind:'remove',item:'old_rod',count:keyPocket.stackLimit}]);assert(g.inventory.commit(remove,g.state.bag));
  g.loadDocument(g.exportDocument());g.interact();await s.settle();assert.equal(inventoryQuantity(g.state.bag,'wailmer_pail'),1);
  const berries=['cheri','chesto','pecha','rawst','aspear','leppa','oran','persim'].map(id=>id+'_berry');
  const full=g.inventory.prepare(g.state.bag,berries.map(item=>({kind:'add',item,count:s.catalog.inventoryPockets.berries.stackLimit-inventoryQuantity(g.state.bag,item)})));
  assert(g.inventory.commit(full,g.state.bag));
  g.enter({map:shop,x:10,y:6,dir:'right'});const before=inventoryCounts(g.state.bag);g.interact();await s.settle();
  assert.deepEqual(inventoryCounts(g.state.bag),before);assert(text(s.dialogs.at(-1)).includes('背包'));
  assert(!g.state.story.rewards.some(id=>id.startsWith('flower-shop.berry.day.')));
  const space=g.inventory.prepare(g.state.bag,berries.map(item=>({kind:'remove',item,count:1})));assert(g.inventory.commit(space,g.state.bag));
  g.loadDocument(g.exportDocument());g.interact();await s.settle();
  assert.equal(g.state.story.rewards.filter(id=>id.startsWith('flower-shop.berry.day.')).length,1);
  const after=inventoryCounts(g.state.bag);g.loadDocument(g.exportDocument());g.interact();await s.settle();assert.deepEqual(inventoryCounts(g.state.bag),after);
});
