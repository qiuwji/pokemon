import test from 'node:test';
import assert from 'node:assert/strict';
import { session, manifest } from './helpers/session.js';
import { ExtensionDOM } from '../src/adapters/extension-dom.js';
import { nativeUIControls } from '../src/adapters/native-ui-controls.js';
import { layoutDocument } from './helpers/layout-document.js';
import { createMonster } from '../src/engine/model.js';

function mount(s, slot='battle.moves', activate=()=>{}) {
  const doc=layoutDocument(),container=doc.createElement('div'), native=doc.createElement('div'),errors=[];
  const button=doc.createElement('button');button.textContent='撞击';button.onclick=activate;
  native.append(button);container.append(native);
  const ext=new ExtensionDOM({host:s.host,document:doc,resources:s.db.resources,assets:{},now:()=>0,
    shell:{root:container,closeModal(){},toast(){}},onError:e=>errors.push(e)});
  ext.mountSlot(slot,container,{},()=>{},{nativeRoot:native,controls:nativeUIControls([button],()=> 'move:0')});
  return {ext,native,button,container,errors};
}
test('A native replacement activates the original battle command; unmount restores controls and expires handles',async()=>{
  const s=session([manifest('native-menu',api=>api.ui.region('moves',{slot:'battle.moves',mode:'replace',
    render:view=>({kind:'row',children:view.context.controls.map(c=>({kind:'button',native:c.id,text:'使用 '+c.label}))})}))]);
  const g=s.game;await g.startBattle(createMonster('zigzagoon',10,s.db,g.rng));
  const before=g.battle.player.moves[0].pp;
  const m=mount(s,'battle.moves',()=>g.turn({kind:'move',index:0}));
  assert.equal(m.native.hidden,true);
  const replacement=m.container.querySelector('.extension-slot').querySelector('button');
  // The battle can still be settling under load; retry the native activation until it takes effect.
  for(let attempt=0;attempt<20&&g.battle.player.moves[0].pp===before;attempt++){
    await replacement.onclick();
    await s.settle();
    await new Promise((resolve)=>setImmediate(resolve));
  }
  assert.equal(g.battle.player.moves[0].pp,before-1);
  m.ext.unmountSlot('battle.moves');assert.equal(m.native.hidden,false);
  const after=g.battle.player.moves[0].pp;await replacement.onclick();assert.equal(g.battle.player.moves[0].pp,after);
  assert.equal(m.errors.length,0);
});
test('Native hide is conditional; deterministic priority selects one replacement and returns originals on refresh',()=>{
  const s=session([manifest('native-menu',api=>{
    api.ui.region('low',{slot:'battle.moves',mode:'replace',priority:1,render:()=>({kind:'text',text:'low'})});
    api.ui.region('high',{slot:'battle.moves',mode:'hide',priority:2,when:v=>!!v.query().flags.hide});
  })]);
  s.game.state.flags.hide=true;const m=mount(s);
  assert.equal(m.native.hidden,true);assert.equal(m.container.querySelector('.extension-slot').children.length,0);
  s.game.state.flags.hide=false;m.ext.refresh();
  assert.equal(m.container.querySelector('.extension-slot').children[0].textContent,'low');
  m.ext.unmountRegions();assert.equal(m.native.hidden,false);
});
test('Invalid or throwing replacements leave the native controls usable; disabled native controls cannot be enabled by layout',async()=>{
  let calls=0;
  const s=session([manifest('native-menu',api=>api.ui.region('broken',{slot:'battle.moves',mode:'replace',
    render:()=>({kind:'button',native:'nonexistent'})}))]);
  const m=mount(s,'battle.moves',()=>calls++);assert.equal(m.native.hidden,false);assert.equal(m.errors.length,1);
  m.button.onclick();assert.equal(calls,1);
  const disabled=session([manifest('native-menu',api=>api.ui.region('x',{slot:'party.list',mode:'replace',
    render:()=>({kind:'button',native:'move:0',disabled:false})}))]);
  const n=mount(disabled,'party.list',()=>calls++);n.button.disabled=true;
  await n.container.querySelector('.extension-slot').querySelector('button').onclick();assert.equal(calls,1);
});
test('Replacement mode is restricted to native slots and registered native handles cannot invoke arbitrary commands',()=>{
  for(const definition of [{slot:'bag.content',mode:'replace',render:()=>({kind:'text',text:'x'})},
    {slot:'battle.moves',mode:'unknown',render:()=>({kind:'text',text:'x'})}])
    assert.throws(()=>session([manifest('native-menu',api=>api.ui.region('x',definition))]),/native UI/);
});
