import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";

async function step(s,direction) {
  const receipt=await s.bus.execute('core.field.move',{direction});
  assert.equal(receipt.status,'moved');
  await s.game.timeline.wait(s.game.motion.remaining(s.game.timeline.now()));
  s.game.field.tick(s.game.timeline.now());
  await s.settle();
}
const base="RustboroCity_DevonCorp_";
test("Devon 1F/2F stairs land below the stair on both directions, remain movable and survive reload",async()=>{
  const s=session(),g=s.game;
  assert(g.enter({map:base+'1F',x:14,y:2,dir:'up'}));
  for(const floor of ['2F','1F','2F','1F']){
    await step(s,'up');
    assert.deepEqual([g.state.position.map,g.state.position.x,g.state.position.y,g.state.position.dir],[base+floor,14,2,'down']);
    assert.equal(g.state.position.elevation,3);
    const map=g.world.map;
    assert(!map.warps.some(w=>w.x===g.state.position.x&&w.y===g.state.position.y));
    g.loadDocument(g.exportDocument());
    assert.equal(g.state.position.y,2);
    assert(!g.busy&&!g.storyBusy);
  }
  await step(s,'down');
  assert.equal(g.state.position.y,3);
});
test("Devon 2F/3F staircase follows the same forward landing rule",async()=>{
  const s=session(),g=s.game;
  assert(g.enter({map:base+'2F',x:2,y:2,dir:'up'}));
  for(const floor of ['3F','2F']){
    await step(s,'up');
    assert.deepEqual([g.state.position.map,g.state.position.x,g.state.position.y,g.state.position.dir],[base+floor,2,2,'down']);
  }
});
