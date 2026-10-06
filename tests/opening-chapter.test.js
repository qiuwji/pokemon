import test from 'node:test';
import assert from 'node:assert/strict';
import { session } from './helpers/session.js';
import { validateSave } from '../src/packs/emerald/save-contract.js';
import { WallClockDial, clockHands } from '../src/presentation/wall-clock-dial.js';
import { SceneDirector } from '../src/presentation/scene-director.js';

const enter = async (s, map, x, y, dir = 'up') => {
  assert(s.game.enter({ map, x, y, dir }), `Entry rejected ${map}/${x},${y}`);
  await s.game.flushStoryQueue(); await s.settle();
};
const run = (s, id) => s.game.runStory([{ type: 'script', id }]);

for (const gender of ['male', 'female']) test(`Opening ${gender}: truck, exact door, clock cancellation/confirmation, room, TV, neighbor and shoes`, async () => {
  const s = session([], { fresh: true }), g = s.game;
  g.state.party = []; g.state.flags = {};
  g.ui.choose = async (_n, _p, options) => options.find((o) => o.id === gender).id;
  await g.flushStoryQueue(); await s.settle();
  assert.equal(g.state.playerGender, gender);
  assert.equal(g.state.flags.truckArrived, true);
  assert.equal(g.fieldCapabilities().run, false);
  assert.equal(g.state.position.x, 2);
  assert.equal(g.move('right'), true);
  await g.timeline.wait(g.motion.duration); g.field.tick(g.timeline.now()); await s.settle();
  assert.equal(g.state.position.map, 'InsideOfTruck', 'door-front tile does not silently warp');
  assert.equal(g.move('right'), true);
  await g.timeline.wait(g.motion.duration); g.field.tick(g.timeline.now()); await s.settle();
  assert.equal(g.state.position.map, 'LittlerootTown');
  // Record the actual director steps, not just the last teleport destination.
  const steps = [], step = g.fieldDirector.step.bind(g.fieldDirector);
  g.fieldDirector.step = async (...args) => { await step(...args); steps.push({ actor: args[0], ...g.state.position }); };
  await g.flushStoryQueue(); await s.settle();
  const home = `LittlerootTown_${gender === 'male' ? 'Brendans' : 'Mays'}House_`, door = gender === 'male' ? 5 : 14;
  const doorSteps = steps.filter((p) => p.actor === 'player').slice(-2);
  assert.deepEqual(doorSteps.map((p) => [p.x,p.y,p.dir]), [[door,9,'up'],[door,8,'up']]);
  await g.flushStoryQueue(); await s.settle();
  assert.equal(g.state.position.map, home+'1F');
  assert.equal(g.state.flags.introState, 4);
  const stairs = gender === 'male' ? 7 : 1, clock = gender === 'male' ? 5 : 3;
  await enter(s, home+'2F', stairs, 2);
  assert.equal(g.state.flags.introState, 5);
  // Returning early uses the normal map script, never a blocked stair tile.
  await enter(s, home+'1F', gender === 'male' ? 8 : 2, 3);
  assert.equal(g.state.position.map, home+'2F');
  g.ui.showTime = async () => ({ status: 'cancelled' });
  await enter(s, home+'2F', clock, 2);
  await run(s, 'emerald:players-house.clock.'+gender);
  assert.equal(g.state.clock.initialized, false);
  assert.equal(g.state.flags.introState, 5);
  g.ui.showTime = async ({ confirm }) => {
    assert(g.storyBusy);
    assert.equal(g.startClock(8,30).ok, false, 'public clock mutation is still blocked during story');
    assert.equal(confirm(8,30).ok, true);
    return { status: 'confirmed' };
  };
  await run(s, 'emerald:players-house.clock.'+gender);
  assert.equal(g.state.flags.introState, 6);
  assert.equal(g.state.flags.roomChecked, true);
  assert(!g.field.npcs.objects(home+'2F').some((o)=>o.id==='house.mom.upstairs'));
  g.ui.showTime = async () => ({ status: 'viewed' });
  const count = s.dialogs.length;
  await run(s, 'emerald:players-house.clock.'+gender);
  assert.equal(s.dialogs.length, count, 'viewing the clock does not repeat mom');
  await enter(s, home+'1F', gender === 'male' ? 8 : 2, 3);
  assert.equal(g.state.flags.introState, 7);
  assert.equal(g.state.flags.tvWatched, true);
  assert.equal(g.storyMusic, null);
  const other = `LittlerootTown_${gender === 'male' ? 'Mays' : 'Brendans'}House_`;
  await enter(s, other+'1F', gender === 'male' ? 2 : 8, 8);
  assert.equal(g.state.flags.neighborMomMet, true);
  await enter(s, other+'2F', gender === 'male' ? 5 : 3, 5);
  g.interact(); await s.settle();
  assert.equal(g.state.flags.neighborMet, true);
  assert(g.field.npcs.objects(other+'2F').some((o)=>o.id==='neighbor.ball'));
  // Existing rescue/rival battle rules are verified in cutscene/battle suites; arrange the dex receipt here.
  g.state.flags.pokedex = true;
  await enter(s, 'LittlerootTown', 11, 2);
  await g.runStory(g.story.resolve('step', g.state, { map:'LittlerootTown', position:{...g.state.position} }));
  assert.equal(g.fieldCapabilities().run, true);
  assert.equal(g.storyBusy, false);
  assert(validateSave(g.state, s.db, s.catalog, s.host));
  const saved = g.exportDocument(); g.loadDocument(saved);
  assert.equal(g.state.playerGender, gender);
  assert.equal(g.state.flags.runningShoes, true);
});

test('Wall clock dial wraps midnight, accepts touch geometry and computes coherent hands', () => {
  const dial = new WallClockDial(23,59);
  assert.deepEqual(dial.adjust(1), { hour:0, minute:0 });
  assert.deepEqual(dial.adjust(-1), { hour:23, minute:59 });
  assert.equal(dial.point(80,0).minute,15);
  const angles = clockHands({ hour:3, minute:30 });
  assert(Math.abs(angles.minute-Math.PI)<1e-12); assert(Math.abs(angles.hour-3.5*Math.PI/6)<1e-12);
});

test('Object presentation transforms are bounded, frozen and neutral under reduced motion', async () => {
  let reduced = false, release;
  const errors = [], definitions = new Map([['test', { duration:100, schema:{type:'object',properties:{},additionalProperties:false}, objects:()=>[{map:'map',id:'box',x:0,y:-4}] }]]);
  const d = new SceneDirector({ timeline:{now:()=>0,wait:()=>new Promise(r=>release=r)},definitions,reducedMotion:()=>reduced,onError:e=>errors.push(e) });
  const playing = d.play('test');
  assert.equal(d.objectTransforms()[0].y,-4); assert(Object.isFrozen(d.objectTransforms()));
  reduced=true; assert.deepEqual(d.objectTransforms(),[]); reduced=false;
  definitions.get('test').objects=()=>[{map:'map',id:'box',x:0,y:Infinity}];
  assert.deepEqual(d.objectTransforms(),[]); assert.equal(errors.length,1);
  d.objectTransforms(); assert.equal(errors.length,1);
  release(); await playing; assert.deepEqual(d.objectTransforms(),[]);
});

test('Story clock confirmation expires with its screen and fanfare waits for the voice rather than a guessed delay', async () => {
  const s = session(), g = s.game;
  let oldConfirm, release;
  g.ui.showTime = async ({ confirm }) => { oldConfirm = confirm; return { status: 'cancelled' }; };
  await g.runStory([{ type:'screen', id:'clock' }]);
  assert.equal(oldConfirm(7,0).ok, false);
  assert.equal(g.state.clock.initialized, false);
  g.playStorySound = () => ({ finished: new Promise(resolve => { release=resolve; }) });
  const story = g.runStory([{ type:'sound', cue:'emerald-audio:mus_obtain_item', channel:'fanfare' },
    { type:'dialog', name:'妈妈', lines:['换好鞋再出发。'] }, { type:'waitSound', channel:'fanfare' },
    { type:'flag', key:'fanfareDone', value:true }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(g.state.flags.fanfareDone, undefined);
  assert.equal(g.storyBusy, true);
  release(); await story;
  assert.equal(g.state.flags.fanfareDone, true);
  assert.equal(g.storyBusy, false);
});

for (const gender of ['male', 'female']) test(`Opening ${gender}: entrance pose persists; exit coordinate intercepts its warp; movers use source sprites`, async () => {
  const s = session(), g = s.game, female = gender === 'female';
  g.state.playerGender = gender;
  g.state.flags = { introDone:true, introState:3 };
  const home = `LittlerootTown_${female ? 'Mays' : 'Brendans'}House_1F`, x = female ? 2 : 8;
  await enter(s, home, x, 8);
  const mom = () => g.field.npcs.objects(home).find(n => n.id === 'house.mom');
  assert.deepEqual([mom().x, mom().y], [female ? 1 : 9, 8], 'welcome must not reset mom to her chair');
  const movers = g.field.npcs.objects(home).filter(n => n.id.startsWith('house.mover.'));
  assert.equal(movers.find(n => n.actor === 'VigorothCarryingBox').movement.mode, 'horizontal');
  const inPlace = movers.find(n => n.actor === 'VigorothFacingAway');
  assert.equal(inPlace.movement.mode, 'jog'); assert.equal(inPlace.dir, 'up');
  assert(g.field.npcs.view(home, 500).find(n => n.id === inPlace.id).moving);
  assert(g.move('down'));
  await g.timeline.wait(g.motion.duration); g.field.tick(g.timeline.now()); await s.settle();
  assert.equal(g.state.position.map, home, 'the exit warp yields to the coordinate script');
  assert.deepEqual([g.state.position.x, g.state.position.y], [x,7]);
  assert.equal(g.state.clock.initialized, false);
});

test('Scripted walking tolerates early fractional timer callbacks and NPC refresh ticks during the clock visit', async () => {
  const s = session(), g = s.game;
  g.state.flags = { introDone:true, introState:5 };
  await enter(s, 'LittlerootTown_BrendansHouse_2F', 5, 2);
  const wait = g.timeline.wait;
  g.timeline.wait = async ms => {
    // Mimic a timer waking just before the requested deadline while the render
    // loop refreshes NPC definitions; the next >=1ms wait can finish the frame.
    await wait(ms > 2 ? ms - 0.5 : ms);
    g.field.npcs.tick(g.timeline.now(), g.state.position, { paused:g.storyBusy });
  };
  g.ui.showTime = async ({ confirm }) => { assert(confirm(9,10).ok); return {status:'confirmed'}; };
  await run(s, 'emerald:players-house.clock.male');
  assert.equal(g.state.flags.roomChecked, true);
  assert.equal(g.storyBusy, false);
  assert.equal(g.field.busy, false);
  assert(g.move('down'), 'control returns after mom exits');
});
