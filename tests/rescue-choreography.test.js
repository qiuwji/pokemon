import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { session } from './helpers/session.js';
import { validateSave } from '../dist/packs/emerald/save-contract.js';

// Checked-in source evidence: core tests do not depend on the ignored C checkout.
const source = JSON.parse(readFileSync(new URL('./fixtures/rescue-movements.json', import.meta.url)));
const path = label => source.paths[label];
for (const x of [10, 11]) test(`Birch rescue at source entrance ${x} walks four tiles and plays both complete chase arrays`, async () => {
  const s = session(), g = s.game;
  Object.assign(g.state.flags, { rescued: false, heardBirch: false });
  assert(g.enter({ map: 'Route101', x, y: 19, dir: 'up' })); await s.settle();
  const steps = new Map(), step = g.fieldDirector.step.bind(g.fieldDirector);
  g.fieldDirector.step = async (actor, dir, options) => {
    await step(actor, dir, options);
    const record = steps.get(actor) || []; record.push(dir); steps.set(actor, record);
  };
  const commands = g.story.resolve('step', g.state, { map: 'Route101', position: { ...g.state.position } });
  await g.runStory(commands); await s.settle();
  assert.deepEqual(steps.get('player'), path('Route101_Movement_EnterScene'));
  assert.deepEqual(steps.get('birch'), [...path('Route101_Movement_BirchRunAway1'), ...path('Route101_Movement_BirchRunInCircles')]);
  assert.deepEqual(steps.get('pursuer'), [...path('Route101_Movement_ZigzagoonChase1'), ...path('Route101_Movement_ZigzagoonChaseInCircles')]);
  assert.deepEqual([g.state.position.x,g.state.position.y,g.state.position.dir], [x,15,'left']);
  const poses = () => g.field.npcs.objects('Route101').filter(n => ['birch','pursuer'].includes(n.id)).map(n => [n.id,n.x,n.y,n.dir]);
  assert.deepEqual(poses(), [['birch',4,13,'right'],['pursuer',5,13,'left']]);
  const pursuer=g.field.npcs.objects('Route101').find(n=>n.id==='pursuer');
  const appearance=g.appearanceFrame({kind:'object',map:'Route101',id:'pursuer'},{actor:pursuer.actor,species:pursuer.species});
  assert.equal(appearance.appearance,'emerald-actor');assert.equal(appearance.layers[0].actor,'EnemyZigzagoon');
  assert.equal(g.state.flags.heardBirch,true); assert.equal(g.storyBusy,false);
  assert(validateSave(g.state,s.db,s.catalog,s.host));
  g.loadDocument(g.exportDocument()); assert.deepEqual(poses(), [['birch',4,13,'right'],['pursuer',5,13,'left']]);
  assert.equal(g.story.resolve('step',g.state,{map:'Route101',position:{map:'Route101',x,y:19}}).length,0);
});
test('Rescue intro does not start at arbitrary Route101 coordinates', () => {
  const s=session(),g=s.game; Object.assign(g.state.flags,{rescued:false,heardBirch:false});
  assert.equal(g.story.resolve('step',g.state,{map:'Route101',position:{map:'Route101',x:10,y:17}}).length,0);
});
