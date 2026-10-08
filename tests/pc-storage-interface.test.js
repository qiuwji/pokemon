import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { buttonPage } from "./helpers/button-page.js";
import { createMonster } from "../src/engine/model.js";
import { createBoxInterface } from "../src/ui/emerald/box-interface.js";
import { createEmeraldCommandFacade } from "../src/game/emerald/commands/command-facade.js";
import { validateSave } from "../src/game/emerald/assembly/save-contract.js";
function screen(s) {
  const p=buttonPage(), messages=[], errors=[];
  const ui=createBoxInterface(createEmeraldCommandFacade(s.game,s.bus,{onError:e=>errors.push(e)}),
    {...p.deps,spriteURL:id=>`${id}.png`,toast:m=>messages.push(m)});
  return {...p,ui,messages,errors,click(selector){const b=p.root.querySelector(selector); assert(b,selector); return b.onclick();}};
}
test("The native PC metatile opens storage from all three Pokemon Centers and respects facing",()=>{
  const s=session();let opens=0;s.game.ui.showPC=()=>opens++;
  for(const map of ["OldaleTown_PokemonCenter_1F","PetalburgCity_PokemonCenter_1F","RustboroCity_PokemonCenter_1F"]){
    s.game.enter({map,x:10,y:2,dir:"up"});s.game.interact();
  }
  assert.equal(opens,3);
  s.game.enter({map:"OldaleTown_PokemonCenter_1F",x:10,y:2,dir:"left"});s.game.interact();
  assert.equal(opens,3);
});
test("PC deposit, inspect and withdraw buttons preserve UID/data and reload through the real save contract",()=>{
  const s=session(),p=screen(s),mon=createMonster("zigzagoon",8,s.db,s.game.rng);
  s.game.state.party.push(mon);const before=structuredClone(mon);
  p.ui.showPC();p.click('[data-pc="deposit"]');p.click('[data-mon="1"]');
  assert.deepEqual(s.game.state.box[0],before);
  p.options().back();p.click('[data-pc="withdraw"]');p.click(`[data-box="${mon.uid}"]`);
  assert.equal(s.game.state.box.length,1,"selection must not transfer before an action is chosen");
  p.click('[data-box-action="summary"]');assert(p.body().includes("宝可梦信息"));assert(!p.body().includes('id="lead"'));
  p.click('[data-summary-back]');p.click(`[data-box="${mon.uid}"]`);p.click('[data-box-action="withdraw"]');
  assert.equal(s.game.state.box.length,0);assert.deepEqual(s.game.state.party[1],before);
  assert(validateSave(s.game.state,s.db,s.catalog,s.host));
  s.game.loadDocument(s.game.exportDocument());assert.deepEqual(s.game.state.party[1],before);assert.equal(p.errors.length,0);
});
test("Full party switches to an exchange choice and protects the last usable creature",()=>{
  const s=session(),p=screen(s);
  for(let i=0;i<5;i++)s.game.state.party.push(createMonster("zigzagoon",4,s.db,s.game.rng));
  const stored=createMonster("ralts",5,s.db,s.game.rng);s.game.state.box.push(stored);
  const old=s.game.state.party[1].uid;p.ui.showBox();p.click(`[data-box="${stored.uid}"]`);p.click('[data-box-action="withdraw"]');
  assert.equal(p.options().type,"box-swap");p.click('[data-mon="1"]');
  assert.equal(s.game.state.party[1].uid,stored.uid);assert.equal(s.game.state.box[0].uid,old);
  s.game.state.party.slice(1).forEach(m=>m.hp=0);s.game.state.box[0].hp=0;
  p.ui.showPC();p.click('[data-pc="deposit"]');p.click('[data-mon="0"]');
  assert.equal(s.game.state.party.length,6);assert(p.messages.at(-1).includes("可以战斗"));
  assert.equal(p.errors.length,0);
});
test("Cross-page storage ordering uses UID commands and cancel never changes ownership",()=>{
  const s=session(),p=screen(s);
  for(let i=0;i<31;i++)s.game.state.box.push(createMonster("zigzagoon",4,s.db,s.game.rng));
  const first=s.game.state.box[0].uid,last=s.game.state.box[30].uid;
  p.ui.showBox();p.click(`[data-box="${first}"]`);p.click('[data-box-action="move"]');p.click('[data-box-page="1"]');p.click(`[data-box="${last}"]`);
  assert.equal(s.game.state.box[0].uid,last);assert.equal(s.game.state.box[30].uid,first);
  const before=s.game.state.box.map(m=>m.uid);p.click(`[data-box="${first}"]`);p.click('[data-box-action="move"]');p.options().back();
  assert.deepEqual(s.game.state.box.map(m=>m.uid),before);
  s.game.loadDocument(s.game.exportDocument());assert.deepEqual(s.game.state.box.map(m=>m.uid),before);
  assert.equal(p.errors.length,0);
});
test("Full PC and stale selection fail without losing a party member or swapping another creature",()=>{
  const s=session(),p=screen(s),extra=createMonster("zigzagoon",5,s.db,s.game.rng);
  s.game.state.party.push(extra);
  for(let i=0;i<200;i++)s.game.state.box.push(createMonster("zigzagoon",3,s.db,s.game.rng));
  p.ui.showPC();p.click('[data-pc="deposit"]');p.click('[data-mon="1"]');
  assert.equal(s.game.state.party[1].uid,extra.uid);assert.equal(s.game.state.box.length,200);assert(p.messages.at(-1).includes("已满"));
  p.options().back();p.click('[data-pc="organize"]');
  const removed=s.game.state.box[0];p.click(`[data-box="${removed.uid}"]`);
  s.game.state.box.shift();const before=s.game.state.box.map(m=>m.uid);
  p.click('[data-box-action="withdraw"]');assert.deepEqual(s.game.state.box.map(m=>m.uid),before);
  assert.equal(s.game.state.party.length,2);
});
