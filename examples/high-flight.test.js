import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { session } from '../tests/helpers/session.js';
import { createMonster } from '../dist/engine/model.js';
import { highFlight } from '../dist/plugins/high-flight/index.js';
import { startPlugins } from '../dist/adapters/plugin-settings.js';
async function ready(){
  const s=session([highFlight]);
  assert.deepEqual(await startPlugins([{...highFlight,startup:['high-flight:prepare','high-flight:teach']}],s.bus),[]);
  return s;
}

test('Optional flight plugin provisions a real Fly partner and badge once through domain commands',async()=>{
  const s=await ready(),g=s.game;
  assert(g.state.flags.badgeFeather);assert(g.fieldCapabilities().fly);
  assert.equal(g.state.party.filter(m=>m.species==='swellow').length,1);
  assert(g.state.party.find(m=>m.species==='swellow').moves.some(m=>m.id==='fly'));
  await s.bus.execute('high-flight:prepare',{},'system');
  await s.bus.execute('high-flight:teach',{},'system');
  assert.equal(g.state.party.length,2);
  const vanilla=session().game;
  assert.equal(vanilla.fieldCapabilities().fly,false);
  assert(!vanilla.catalog.movement['high-flight:air']);
});
test('Takeoff uses native gendered rider art, a 1.5-axis view and light haze; landing restores ground visuals',async()=>{
  const s=await ready(),g=s.game,before=g.cameraProjection({width:240,height:160});
  assert((await g.performFieldAction('high-flight:takeoff')).ok);
  assert.equal(g.state.movement.mode,'high-flight:air');
  const after=g.cameraProjection({width:240,height:160});
  assert.equal(after.width,before.width*1.5);assert.equal(after.height,before.height*1.5);
  assert.equal(g.environmentFrames()[0].opacity,0.18);
  for(const gender of ['male','female']){
    g.state.playerGender=gender;
    const frame=g.appearanceFrame({kind:'player'},{});
    assert.equal(frame.layers[0].resource,`high-flight:bird-${gender}`);
    assert.equal(frame.layers[1].actor,gender==='female'?'MayNormal':'BrendanNormal');
    assert.equal(frame.layers[0].size.width,32);
  }
  assert((await g.performFieldAction('high-flight:land')).ok);
  assert.equal(g.state.movement.mode,'walk');assert.equal(g.environmentFrames().length,0);
  assert.equal(g.cameraProjection({width:240,height:160}).width,before.width);
});
test('Air traversal crosses solid terrain while invalid landing remains airborne; successful landing rebases elevation',async()=>{
  const s=await ready(),g=s.game;
  const p={...g.state.position}, cell=g.world.cell(p.x+1,p.y);
  const solid=(cell.block&1023)|1024|(2<<12);
  g.patchWorld([{kind:'tile',map:p.map,x:p.x+1,y:p.y,block:solid,behavior:cell.behavior}]);
  assert((await g.performFieldAction('high-flight:takeoff')).ok);
  assert(g.move('right'));
  await g.timeline.wait(200);
  g.field.tick(g.timeline.now());
  assert.equal(g.state.position.x,p.x+1);
  assert.equal(g.inspectMovementMode('walk').ok,false);
  assert.equal((await g.performFieldAction('high-flight:land')).ok,false);
  assert.equal(g.state.movement.mode,'high-flight:air');
  assert(g.exportDocument()); // Air above a wall is a valid save position for this mode.
  g.patchWorld([{kind:'tile',map:p.map,x:p.x+1,y:p.y,block:cell.block&1023|(2<<12),behavior:0}]);
  assert((await g.performFieldAction('high-flight:land')).ok);
  assert.equal(g.state.position.elevation,2);assert.equal(g.state.position.previousElevation,2);
});
test('Fly replacement does not teleport and airborne saves restore mode-derived presentation',async()=>{
  const s=await ready(),g=s.game,before={...g.state.position};
  assert((await g.flyTo('LittlerootTown')).ok);
  assert.deepEqual(g.state.position,before);
  const doc=g.exportDocument();g.loadDocument(doc);
  assert.equal(g.state.movement.mode,'high-flight:air');
  assert.equal(g.cameraConfiguration().zoom,2/3);
  assert.equal(g.environmentFrames()[0].id,'high-flight:mist');
  assert.equal(g.appearanceFrame({kind:'player'},{}).appearance,'high-flight:rider');
});
test('Flight cannot start indoors or land on occupants, reserved cells, water or entrance warps',async()=>{
  const s=await ready(),g=s.game;
  assert(g.enter({map:'LittlerootTown_BrendansHouse_1F',x:5,y:5,dir:'down'}));
  assert.equal((await g.performFieldAction('high-flight:takeoff')).ok,false);
  assert(g.enter({map:'LittlerootTown',x:10,y:10,dir:'up'}));
  assert((await g.performFieldAction('high-flight:takeoff')).ok);
  const p=g.state.position, original=g.field.npcs.occupants;
  for(const occupant of [{id:'n',x:p.x,y:p.y},{id:'n',x:p.x+1,y:p.y,reserved:[{x:p.x,y:p.y}]}]){
    g.field.npcs.occupants=()=>[occupant];assert.equal(g.inspectMovementMode('walk').ok,false);
  }
  g.field.npcs.occupants=original;
  const cell=g.world.cell(p.x,p.y);
  g.patchWorld([{kind:'tile',map:p.map,x:p.x,y:p.y,block:cell.block&1023,behavior:0x10}]);
  assert.equal(g.inspectMovementMode('walk').ok,false);
  const warp=g.world.map.warps[0];
  assert(g.enter({map:p.map,x:warp.x,y:warp.y,dir:'up'}));
  assert.equal(g.inspectMovementMode('walk').ok,false);
});
test('Committed Fly art matches recorded hashes, is native 32x32 and belongs to the plugin directory',()=>{
  const root=new URL('../dist/plugins/high-flight/assets/',import.meta.url);
  const source=JSON.parse(fs.readFileSync(new URL('source.json',root),'utf8'));
  assert.equal(source.source,'pret/pokeemerald');
  for(const [file,hash] of Object.entries(source.outputs)){
    const data=fs.readFileSync(new URL(file,root));
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'),hash);
    assert.equal(data.readUInt32BE(16),32);assert.equal(data.readUInt32BE(20),32);
  }
});

test('A full party receives no partial kit and retries on an idle field boundary after a slot is freed',async()=>{
  const s=session([highFlight]),g=s.game;
  while(g.state.party.length<6)g.state.party.push(createMonster('mudkip',5,s.db,g.rng));
  const issue=await s.bus.execute('high-flight:prepare',{},'system');
  assert.equal(issue.ok,false);assert.equal(g.state.party.length,6);
  assert(!g.state.flags.badgeFeather);
  g.state.party.splice(1);
  s.host.events.emit('core:field-step',{position:{...g.state.position}});
  for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  assert(g.fieldCapabilities().fly);assert.equal(g.state.party.length,2);
});
test('Air mode crosses the real town/route connection without starting a grounded story or encounter',async()=>{
  const s=await ready(),g=s.game;
  g.enter({map:'LittlerootTown',x:10,y:0,dir:'up'});
  assert((await g.performFieldAction('high-flight:takeoff')).ok);
  const count=g.lastEncounterSteps;
  assert(g.move('up'));
  await g.timeline.wait(200);g.field.tick(g.timeline.now());
  assert.equal(g.state.position.map,'Route101');assert.equal(g.state.movement.mode,'high-flight:air');
  assert.equal(g.storyBusy,false);assert.equal(g.lastEncounterSteps,count);assert.equal(g.battle,null);
});

test('Selected Fly partner uses plugin takeoff and landing from the native party action without teleporting',async()=>{
  const s=await ready(),g=s.game,mon=g.state.party.find(m=>m.species==='swellow'),before={...g.state.position};
  assert.equal(g.partyFieldMoveOptions(mon.uid).find(a=>a.move==='fly').action,'high-flight:takeoff');
  assert((await s.bus.execute('core.movement.party-action',{uid:mon.uid,move:'fly'},'ui')).ok);
  assert.deepEqual(g.state.position,before);assert.equal(g.state.movement.mode,'high-flight:air');
  assert.equal(g.partyFieldMoveOptions(mon.uid).find(a=>a.move==='fly').action,'high-flight:land');
  assert((await s.bus.execute('core.movement.party-action',{uid:mon.uid,move:'fly'},'ui')).ok);
  assert.equal(g.state.movement.mode,'walk');
});
