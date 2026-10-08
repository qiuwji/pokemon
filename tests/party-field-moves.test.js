import test from 'node:test';
import assert from 'node:assert/strict';
import { session, manifest } from './helpers/session.js';
import { createMonster } from '../src/engine/model.js';
import { FieldActionRegistry } from '../src/engine/field-actions.js';
import { partyMenuCards, partyMenuNavigation } from '../src/ui/emerald/party-menu-view.js';

const teach=(s,id)=>{if(s.mon.moves.length>=4)s.mon.moves.shift();s.mon.moves.push({id,pp:s.db.moves[id].pp});};
test('Party field menu follows the selected monster move order, exposes badge failures and rejects other identities',async()=>{
  const s=session(),g=s.game;
  teach(s,'fly');teach(s,'dive');
  assert.deepEqual(g.partyFieldMoveOptions(s.mon.uid).map(a=>a.move),['fly','dive']);
  assert(g.partyFieldMoveOptions(s.mon.uid).every(a=>!a.ok));
  assert.match((await s.bus.execute('core.movement.party-action',{uid:s.mon.uid,move:'fly',destination:'LittlerootTown'},'ui')).reason,/徽章/);
  g.state.flags.badgeFeather=true;
  const other=createMonster('mudkip',5,s.db,g.rng);g.state.party.push(other);
  assert.deepEqual(g.partyFieldMoveOptions(other.uid),[]);
  assert.equal((await g.usePartyFieldMove(other.uid,'fly','LittlerootTown')).ok,false);
  assert.equal((await g.usePartyFieldMove('missing','fly','LittlerootTown')).ok,false);
  assert.equal((await g.usePartyFieldMove(s.mon.uid,'fly')).ok,false);
  s.mon.egg={cycles:1};assert.deepEqual(g.partyFieldMoveOptions(s.mon.uid),[]);
});
test('Plugin field-action association selects the currently applicable route without hardcoded action names',async()=>{
  const plugin=manifest('field-menu',api=>{
    api.content.register('fieldActions','first',{name:'示例',partyMove:'dive',duration:0,cue:'field-dive',
      allowed:()=>false,target:c=>c.position,plan:()=>({kind:'movement',mode:'walk'})});
    api.content.register('fieldActions','second',{name:'示例',partyMove:'dive',duration:0,cue:'field-dive',
      allowed:()=>true,target:c=>c.position,plan:()=>({kind:'movement',mode:'walk'})});
  });
  const s=session([plugin]);teach(s,'dive');s.game.state.flags.badgeMind=true;
  assert.equal(s.game.partyFieldMoveOptions(s.mon.uid)[0].action,'field-menu:second');
  assert((await s.bus.execute('core.movement.party-action',{uid:s.mon.uid,move:'dive'},'ui')).ok);
});
test('Party ordering swaps two stable identities and rejects stale references without changing the party',async()=>{
  const s=session(),other=createMonster('mudkip',5,s.db,s.game.rng);s.game.state.party.push(other);
  assert(await s.bus.execute('core.party.swap',{firstUid:s.mon.uid,secondUid:other.uid},'ui'));
  assert.deepEqual(s.game.state.party.map(m=>m.uid),[other.uid,s.mon.uid]);
  assert.equal(s.game.swapParty('missing',s.mon.uid),false);
  assert.deepEqual(s.game.state.party.map(m=>m.uid),[other.uid,s.mon.uid]);
});
test('Party field move metadata rejects malformed and dangling learned-move references during registration',()=>{
  const d={name:'x',duration:0,cue:'field-dive',allowed:()=>true,target:()=>null,plan:()=>null};
  assert.throws(()=>new FieldActionRegistry({x:{...d,partyMove:1}}),/party move/);
  assert.throws(()=>session([manifest('bad-move',api=>api.content.register('fieldActions','x',{...d,partyMove:'missing'}))]),/Unknown party field move/);
});
test('Native party view preserves six fixed slots, uses icon sheets, escapes names and navigates columns',()=>{
  const s=session();s.mon.nickname='<script>';
  const html=partyMenuCards([s.mon],{db:s.db,escapeHTML:t=>String(t).replaceAll('<','&lt;').replaceAll('>','&gt;'),hpTrack:()=>'',selectedUid:s.mon.uid});
  assert.equal((html.match(/native-party-card/g)||[]).length,6);
  assert.match(html,/mudkip-icon.png/);assert(!html.includes('mudkip-front.png'));assert.match(html,/&lt;script&gt;/);
  const doc={activeElement:null},buttons=Array.from({length:3},()=>({focus(){doc.activeElement=this;}}));
  const cancel={focus(){doc.activeElement=this;}};
  const root={querySelectorAll:q=>q.includes('party-action')?[]:buttons,querySelector:q=>q.includes('cancel')?cancel:null};
  doc.activeElement=buttons[0];partyMenuNavigation(root,doc,'right');assert.equal(doc.activeElement,buttons[1]);
  partyMenuNavigation(root,doc,'down');assert.equal(doc.activeElement,buttons[2]);
  partyMenuNavigation(root,doc,'left');assert.equal(doc.activeElement,buttons[0]);
});
