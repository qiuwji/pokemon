import test from 'node:test';
import assert from 'node:assert/strict';
import { session } from './helpers/session.js';
import { nativeMovement } from '../dist/packs/emerald/native-movement.js';
import { validateSave } from '../dist/packs/emerald/save-contract.js';

const enter = async (s, map, x, y, dir='up') => {
  assert(s.game.enter({map,x,y,dir}));
  await s.game.flushStoryQueue(); await s.settle();
};
const stepStory = async (s) => {
  const g=s.game, commands=g.story.resolve('step',g.state,{map:g.state.position.map,position:{...g.state.position}});
  assert(commands.length,'the real coordinate binding must resolve');
  await g.runStory(commands); await s.settle();
};
const valid = (s) => assert(validateSave(s.game.state,s.db,s.catalog,s.host));
const pose = (p) => [p.x,p.y,p.dir];
const setup = (gender) => {
  const s=session(); s.game.state.playerGender=gender;
  s.game.state.flags={introDone:true,introState:7,roomChecked:true,tvWatched:true,neighborMomMet:true};
  return s;
};

test('Native facing uses the exact movement table, including asymmetric direction names', () => {
  assert.equal(nativeMovement('MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT').dir,'left');
  assert.equal(nativeMovement('MOVEMENT_TYPE_WANDER_RIGHT_AND_LEFT').dir,'right');
  assert.equal(nativeMovement('MOVEMENT_TYPE_WANDER_DOWN_AND_UP').dir,'down');
  assert.equal(nativeMovement('MOVEMENT_TYPE_JOG_IN_PLACE_UP').mode,'jog');
  assert.throws(()=>nativeMovement('MOVEMENT_TYPE_TYPO'),/Unknown/);
});

for(const gender of ['male','female']) {
  const female=gender==='female', other=`LittlerootTown_${female?'Brendans':'Mays'}House_`;
  const bx=female?3:5;
  for(const [dir,dx,dy] of [['up',0,1],['down',0,-1],['left',1,0],['right',-1,0]])
    test(`${gender}: rival first meeting from ${dir} returns to the source PC position`,async()=>{
      const s=setup(gender),g=s.game;
      await enter(s,other+'2F',bx+dx,4+dy,dir);
      g.interact(); await s.settle();
      assert.equal(g.state.flags.neighborMet,true);
      const rival=g.field.npcs.objects(other+'2F').find(o=>o.id==='neighbor.rival');
      assert.deepEqual(pose(rival),[female?0:8,2,'up']);
      assert(!g.field.npcs.objects(other+'2F').some(o=>o.id==='neighbor.ball'));
      assert.equal(g.storyMusic,null); assert.equal(g.storyBusy,false); valid(s);
    });
  const downstairs=female?[[7,3],[8,4],[9,3]]:[[1,3],[2,4],[3,3]];
  downstairs.forEach(([x,y],index)=>test(`${gender}: rival downstairs entry ${index} exits through the stairs`,async()=>{
    const s=setup(gender),g=s.game;g.state.flags.neighborUpstairs=true;
    await enter(s,other+'1F',x,y); await stepStory(s);
    assert.equal(g.state.flags.neighborMet,true);
    assert(!g.field.npcs.objects(other+'1F').some(o=>o.id==='neighbor.rival.downstairs'));
    assert.equal(g.storyBusy,false);valid(s);
  }));
  [[10,2],[11,2],[10,9],[11,9],[8,9],[9,9]].forEach(([x,y],index)=>
    test(`${gender}: running shoes source coordinate ${index} completes and does not replay`,async()=>{
      const s=setup(gender),g=s.game;Object.assign(g.state.flags,{rescued:true,neighborMet:true,pokedex:true});
      await enter(s,'LittlerootTown',x,y);await stepStory(s);
      assert.equal(g.state.flags.runningShoes,true);assert.equal(g.fieldCapabilities().run,true);
      assert(!g.field.npcs.objects('LittlerootTown').some(o=>o.id==='littleroot.mom'));
      assert.equal(g.storyBusy,false); assert.equal(g.state.position.map,'LittlerootTown');
      assert.equal(g.story.resolve('step',g.state,{map:'LittlerootTown',position:{...g.state.position}}).length,0);
      valid(s);g.loadDocument(g.exportDocument());assert.equal(g.state.flags.runningShoes,true);
    }));
  test(`${gender}: TV checkpoints preserve facing and the broadcast tile is lit only during the report`,async()=>{
    const s=setup(gender),g=s.game;g.state.flags.introState=6;g.state.flags.tvWatched=false;
    const map=`LittlerootTown_${female?'Mays':'Brendans'}House_1F`, snapshots=[];
    g.ui.say=async()=>snapshots.push({player:pose(g.state.position),mom:pose(g.field.npcs.control('house.mom',map)),
      tile:g.world.map.appearances[(female?6:4)+4*g.world.map.width]});
    await enter(s,map,female?2:8,3);
    assert.deepEqual(snapshots[1].player,[5,5,female?'right':'left']);
    assert.equal(snapshots[1].mom[2],female?'left':'right');
    assert.equal(snapshots[2].player[2],'up');assert.equal(snapshots[2].tile,3);
    assert.equal(snapshots[3].tile,undefined);
    assert.equal(g.state.flags.tvWatched,true);valid(s);
  });
}

for(const x of [10,11]) test(`Twin intercepts north exit ${x} and pushes back without rotating the player`,async()=>{
  const s=setup('male'),g=s.game;
  await enter(s,'LittlerootTown',x,1,'up');await stepStory(s);
  assert.deepEqual(pose(g.state.position),[x,2,'up']);
  assert.deepEqual(pose(g.field.npcs.objects('LittlerootTown').find(o=>o.id==='littleroot.twin')),[7,2,'down']);
  assert.equal(g.state.flags.neighborMet,undefined);assert.equal(g.storyBusy,false);valid(s);
});

for(const [dir,x,y] of [['up',13,15],['down',13,13],['right',12,14]])
  test(`Oldale employee tours from ${dir}, finishes at the mart and awards once`,async()=>{
    const s=setup('male'),g=s.game;g.state.flags.rescued=true;
    await enter(s,'OldaleTown',x,y,dir);const before=g.itemQuantity('potion');
    g.interact();await s.settle();
    assert.equal(g.state.flags.potionGift,true);assert.equal(g.itemQuantity('potion'),before+1);
    assert.deepEqual(pose(g.field.npcs.objects('OldaleTown').find(o=>o.id==='oldale.employee')),[13,7,'down']);
    assert.deepEqual(pose(g.state.position),[13,8,'up']);assert.equal(g.storyMusic,null);valid(s);
  });

test('Lab before rescue has the aide, but no professor, rival or starter balls',async()=>{
  const s=setup('male'),g=s.game;await enter(s,'LittlerootTown_ProfessorBirchsLab',9,9);
  const cast=g.field.npcs.objects(g.state.position.map);assert.deepEqual(cast.map(o=>o.id),['lab.aide']);
  g.interact();await s.settle();assert.equal(g.state.flags.birchAideMet,true);
  assert(!g.canUseDaycare());valid(s);
});

test('Bedroom PC awards the original potion once and furniture uses its own script',async()=>{
  const s=setup('male'),g=s.game,map='LittlerootTown_BrendansHouse_2F';
  for(const keyword of ['PC','GameCube']) {
    const sign=s.db.maps[map].signs.find(o=>o.script?.endsWith('_'+keyword));assert(sign);
    await enter(s,map,sign.x,sign.y+1,'up');
    const before=g.itemQuantity('potion'), count=s.dialogs.length;
    g.interact();await s.settle();assert(s.dialogs.length>count);
    const text=s.dialogs.slice(count).flatMap(d=>d.lines.flatMap(l=>typeof l==='string'?l:l.runs.map(r=>r.text))).join('');
    assert.doesNotMatch(text,/每一段旅程|草丛里的野生/);
    if(keyword==='PC') {
      assert.equal(g.itemQuantity('potion'),before+1);
      g.interact();await s.settle();assert.equal(g.itemQuantity('potion'),before+1);
    } else assert.match(text,/GAMECUBE|游戏机/i);
  }
  valid(s);
});

test('NPC collision exceptions are explicit, bounded and keep terrain collision intact',async()=>{
  const s=setup('male'),g=s.game;
  await enter(s,'OldaleTown',13,15,'up');
  await assert.rejects(g.runStory([{type:'move',path:['up']}]),/blocked/);
  await assert.rejects(g.runStory([{type:'move',path:['up'],ignoreActors:['player']}]),/Invalid/);
  await g.runStory([{type:'move',path:['up'],ignoreActors:['oldale.employee'],keepFacing:true}]);
  assert.deepEqual(pose(g.state.position),[13,14,'up']);
  await enter(s,'LittlerootTown_BrendansHouse_2F',5,2,'up');
  await assert.rejects(g.runStory([{type:'move',path:['up'],ignoreActors:['oldale.employee']}]),/blocked/);
});

for(const gender of ['male','female']) test(`${gender}: returning to the lab automatically walks to Birch and the rival gives balls from the adjacent seat`,async()=>{
  const s=setup(gender),g=s.game;Object.assign(g.state.flags,{rescued:true,rivalWon:true,neighborMet:true});
  g.state.story.rewards.push('rival.prize'); const snapshots=[];
  const say=g.ui.say;g.ui.say=async(...args)=>{
    snapshots.push({player:pose(g.state.position),rival:pose(g.field.npcs.control('lab.rival',g.state.position.map))});
    return say(...args);
  };
  await enter(s,'LittlerootTown_ProfessorBirchsLab',6,12);
  assert.deepEqual(snapshots.at(-1),{player:[6,5,'right'],rival:[7,5,'left']});
  assert.equal(g.state.flags.pokedex,true);assert.equal(g.itemQuantity('pokeball'),5);
  assert.equal(g.storyBusy,false);valid(s);
});

const finishStep = async (s, dir) => {
  assert(s.game.move(dir));
  await s.game.timeline.wait(s.game.motion.duration);
  s.game.field.tick(s.game.timeline.now());
  await s.settle(); await s.game.flushStoryQueue(); await s.settle();
};
for (const gender of ['male','female']) {
  test(`${gender}: receiving shoes preserves both upstairs warps and own-home projections`,async()=>{
    const s=setup(gender),g=s.game,female=gender==='female',own=`LittlerootTown_${female?'Mays':'Brendans'}House_`,x=female?2:8;
    g.state.flags.neighborMet=true;g.state.flags.rescued=true;g.state.flags.runningShoes=true;
    await enter(s,own+'1F',x,3);
    await finishStep(s,'up');
    assert.equal(g.state.position.map,own+'2F');
    const stair=g.world.map.warps[0],pos=g.state.position;
    const dir=stair.x===pos.x?(stair.y<pos.y?'up':'down'):(stair.x<pos.x?'left':'right');
    await finishStep(s,dir);
    assert.equal(g.state.position.map,own+'1F');valid(s);
  });
  test(`${gender}: entering the neighbor home lands on the mat and mom approaches adjacent to the player`,async()=>{
    const s=setup(gender),g=s.game,female=gender==='female';
    g.state.flags.neighborMomMet=false;g.state.flags.neighborMet=false;g.state.flags.rescued=false;
    const x=female?5:14,other=`LittlerootTown_${female?'Brendans':'Mays'}House_1F`;
    await enter(s,'LittlerootTown',x,9,'up');await finishStep(s,'up');
    assert.equal(g.state.position.map,other);
    assert.deepEqual(pose(g.state.position),[female?8:2,8,female?'left':'right']);
    const mom=g.field.npcs.objects(other).find(o=>o.id==='neighbor.mom');
    assert.deepEqual(pose(mom),[female?7:3,8,female?'right':'left']);
    await finishStep(s,'up');await finishStep(s,'down');
    assert.equal(g.state.position.map,other,'standing on the mat does not leave');
    await finishStep(s,'down');assert.equal(g.state.position.map,'LittlerootTown');valid(s);
  });
  for (const [dir,x,y] of [['up',10,4],['down',10,2],['left',11,3],['right',9,3]])
    test(`${gender}: Route103 victory from ${dir} speaks before walking and hiding the rival`,async()=>{
      const s=setup(gender),g=s.game;g.state.flags.rescued=true;g.state.flags.starter='mudkip';
      await enter(s,'Route103',x,y,dir);
      let during;
      const say=g.ui.say;g.ui.say=async(...args)=>{if(args[0]===(gender==='female'?'小悠':'小遥'))during=pose(g.field.npcs.objects('Route103').find(o=>o.id==='rival.route103'));return say(...args);};
      const commands=g.story.resolve('battleResult',g.state,{battle:{script:'rival',result:'win'}});
      await g.runStory(commands);await s.settle();
      assert(during,'settled prize must not remove the actor before the speech');
      assert.deepEqual(during.slice(0,2),[10,3]);
      assert.equal(g.state.flags.rivalWon,true);
      assert(!g.field.npcs.objects('Route103').some(o=>o.id==='rival.route103'));
      assert(g.state.story.rewards.includes('rival.prize'));valid(s);
    });
}
