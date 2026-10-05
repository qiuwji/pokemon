import { createMonster } from "../dist/engine/model.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserInput } from '../dist/adapters/browser-input.js';
import { battleOptionIndex } from '../dist/packs/emerald/battle-interface.js';
import { stageMessage } from '../dist/engine/battle/messages.js';
import { openingBattleTransition, sampleOpeningTransition } from '../dist/packs/emerald/battle-transitions.js';
import { session } from './helpers/session.js';

test('Space and Enter confirm battle choices directly; modal confirmation retains precedence',()=>{
  const input=Object.create(BrowserInput.prototype),calls=[];
  input.externalBlocked=()=>false;input.game={battle:{}};input.ui={blocked:false,modalType:null,confirmBattle:()=>calls.push('battle'),confirm:()=>calls.push('modal')};
  const event=key=>({key,target:{closest:()=>false},preventDefault(){}});
  input.keydown(event(' '));input.keydown(event('Enter'));input.ui.blocked=true;input.ui.modalType='party';input.keydown(event(' '));
  assert.deepEqual(calls,['battle','battle','modal']);
});
test('Battle menu arrows preserve the two-column layout and handle an incomplete final row',()=>{
  assert.equal(battleOptionIndex(0,'right',4),1);
  assert.equal(battleOptionIndex(1,'down',4),3);
  assert.equal(battleOptionIndex(3,'left',4),2);
  assert.equal(battleOptionIndex(2,'up',4),0);
  assert.equal(battleOptionIndex(2,'right',3),2);
  assert.equal(battleOptionIndex(0,'down',0),0);
});
test('The battle stage resolver names defense and its settled decrease in the battle message',async()=>{
  const s=session();await s.game.startBattle(createMonster('treecko',5,s.db,s.game.rng));
  const b=s.game.battle;assert(b.changeStage(1,'def',-1,{sourceSeat:0}));
  assert.match(b.events.at(-1).text,/防御降低了/);
  assert.equal(b.events.at(-1).stat,'def');assert.equal(b.events.at(-1).amount,-1);
  assert.match(stageMessage('木守宫','acc',-2),/命中率大幅降低/);
});
test('Normal-landscape transition selection follows opponent vs usable party levels',()=>{
  const party=[{level:40,hp:0},{level:6,hp:12}],opponents=[{level:5}];
  assert.equal(openingBattleTransition({trainer:true,party,opponents}).kind,'emerald:pokeballs-trail');
  assert.equal(openingBattleTransition({trainer:false,party,opponents}).kind,'emerald:slice');
  opponents[0].level=6;
  assert.equal(openingBattleTransition({trainer:true,party,opponents}).kind,'emerald:angled-wipes');
  assert.equal(openingBattleTransition({trainer:false,party,opponents}).kind,'emerald:white-bars');
  for(const pattern of ['pokeballs-trail','angled-wipes','slice','white-bars']) {
    assert.deepEqual(sampleOpeningTransition(pattern,0),{gray:0});
    assert.deepEqual(sampleOpeningTransition(pattern,0.6),sampleOpeningTransition(pattern,0.6));
    const last=sampleOpeningTransition(pattern,1);
    if(last.mask) assert(last.mask.left.every((x,i)=>x===last.mask.right[i]));
    if(last.slice!==undefined)assert.equal(last.slice,240);
    if(last.black!==undefined)assert.equal(last.black,1);
    if(last.balls)assert(last.balls.every(b=>b.rightward?b.x>=240:b.x<=0));
  }
});
test('Default camera keeps the original 240x160 world viewport without changing grid rules',()=>{
  const s=session(),camera=s.game.viewConfiguration().camera;
  assert.deepEqual([camera.columns,camera.rows,camera.zoom],[15,10,1]);
});
