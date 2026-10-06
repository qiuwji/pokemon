import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/engine/world.js';
import { ElevationPolicy } from '../src/engine/elevation.js';
import { MovementRegistry } from '../src/engine/movement.js';

const mode = { allowed:()=>true, traverse:()=>true, durations:[100] };
const map = () => ({width:3,height:2,blocks:Array(6).fill(3<<12),behavior:Array(6).fill(0),
  warps:[],connections:[],signs:[]});
const airborne = {ignoreActors:true,ignoreElevation:true,ignoreEdges:true,ignoreWarps:true};

test('Navigation policy bypasses declared gates without changing ordinary movement or map bounds',()=>{
  const field=map();field.blocks[1]=(2<<12)|1024;
  const objects=()=>[{id:'blocker',x:1,y:0,elevation:2}];
  const p={map:'field',x:0,y:0,dir:'right'};
  const world=new World({field},p,{objects,elevation:new ElevationPolicy(),passage:()=>true});
  assert.equal(world.move('right'),false);
  world.navigation=()=>airborne;
  assert(world.move('right'));assert.equal(p.x,1);assert.equal(p.elevation,3);
  assert(world.move('right'));assert.equal(world.move('right'),false);
  assert.equal(world.lastBlocked.reason,'boundary');
});
test('A navigation policy can ignore a warp and a ledge without changing ground semantics',()=>{
  const field=map(), destination=map();
  field.warps=[{x:1,y:0,dest_map:'destination',dest_warp_id:0}];
  destination.warps=[{x:1,y:1,dest_map:'field',dest_warp_id:0}];
  const p={map:'field',x:0,y:0,dir:'right'};
  const world=new World({field,destination},p,{navigation:()=>airborne,passage:()=>true});
  assert(world.move('right'));assert.equal(p.map,'field');assert.equal(p.x,1);
  field.behavior[4]=0x38; // Original east ledge behavior.
  p.x=0;p.y=1;assert(world.move('right'));assert.equal(p.x,1);
});
test('Navigation policy follows actual connections and still checks destination mode passage',()=>{
  const a=map(), b=map();a.connections=[{direction:'right',offset:0,map:'b'}];
  b.blocks[0]=1024;b.behavior[0]=0;
  const p={map:'a',x:2,y:0,dir:'right'};
  const world=new World({a,b},p,{navigation:()=>airborne,objects:()=>[{id:'npc',x:0,y:0}],passage:()=>true});
  assert(world.move('right'));assert.equal(p.map,'b');assert.equal(p.x,0);
  p.map='a';p.x=2;world.passage=()=>false;
  assert.equal(world.move('right'),false);assert.equal(p.map,'a');
});
test('Registered movement navigation/presentation is immutable and malformed or competing policies fail early',()=>{
  const registry=new MovementRegistry({air:{...mode,navigation:airborne,presentation:{aboveTerrain:true},replacesTravel:'custom-trip'}});
  assert(Object.isFrozen(registry.get('air').navigation));
  for(const navigation of [[],{ignoreActors:'yes'},{madeUp:true}])
    assert.throws(()=>new MovementRegistry({air:{...mode,navigation}}),/navigation/);
  assert.throws(()=>new MovementRegistry({air:{...mode,presentation:{aboveTerrain:1}}}),/presentation/);
  assert.throws(()=>registry.register('other',{...mode,replacesTravel:'custom-trip'}),/competing/);
});
