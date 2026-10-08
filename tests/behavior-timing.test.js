import test from 'node:test';
import assert from 'node:assert/strict';
import { NPCSystem } from '../src/engine/npcs.js';
import { NPCBehaviorRegistry } from '../src/engine/npc-behaviors.js';
import { manifest, session } from './helpers/session.js';
import { loadContentSync } from '../tools/content-io.mjs';

const map = { width: 8, height: 4, blocks: Array(32).fill(0), behavior: Array(32).fill(0), warps: [], connections: [], npcs: [], signs: [], title: 'Timing' };
function fixture(timing, decide = () => ({ move: true, dir: 'right', pose: 'walk', duration: 120 })) {
  const behaviors = new NPCBehaviorRegistry({ 'timing:patrol': { timing, decide } });
  const npcs = new NPCSystem({ lab: map }, () => [{ id: 'guard', x: 1, y: 1, dir: 'right', movement: { mode: 'timing:patrol', rangeX: 6 } }], { behaviors, random: () => 0.5 });
  npcs.objects('lab');
  return npcs;
}
const player = { map: 'lab', x: 0, y: 3, dir: 'up' };

test('registered fixed timing drives continuous patrol at landing, without catch-up loops or overlapping steps', () => {
  const npcs = fixture({ intervalMs: 1000, afterMove: 'settled' });
  npcs.tick(999, player);
  assert.equal(npcs.objects('lab')[0].x, 1);
  npcs.tick(1000, player);
  assert.equal(npcs.objects('lab')[0].x, 2);
  npcs.tick(1119, player);
  assert.equal(npcs.objects('lab')[0].x, 2);
  npcs.tick(1120, player);
  assert.equal(npcs.objects('lab')[0].x, 3);
  npcs.tick(50000, player);
  assert.equal(npcs.objects('lab')[0].x, 4, 'one decision per tick, even after a clock gap');
});

test('fixed timing preserves pause and scene priority and retries blocked movement at the declared interval', () => {
  const npcs = fixture({ intervalMs: 100, afterMove: 'settled' });
  npcs.tick(100, { ...player, x: 2, y: 1 });
  assert.equal(npcs.objects('lab')[0].x, 1);
  npcs.tick(150, player);
  assert.equal(npcs.objects('lab')[0].x, 1);
  npcs.tick(200, player);
  assert.equal(npcs.objects('lab')[0].x, 2);
  npcs.tick(250, player, { paused: true });
  npcs.tick(370, player);
  assert.equal(npcs.objects('lab')[0].x, 3);
  npcs.beginScene();
  const controlled = npcs.control('guard', 'lab');
  npcs.tick(1000, player);
  assert.equal(controlled.x, 3);
  npcs.endScene();
  npcs.tick(1099, player);
  assert.equal(npcs.objects('lab')[0].x, 3);
  npcs.tick(1100, player);
  assert.equal(npcs.objects('lab')[0].x, 4);
});

test('interval timing bounds idle polling and definitions are detached; invalid timing fails registration', () => {
  const timing = { intervalMs: 100, afterMove: 'interval' };
  let decisions = 0;
  const npcs = fixture(timing, () => { decisions++; return { move: false, pose: 'still' }; });
  timing.intervalMs = 1;
  for (const t of [0, 99, 100, 101, 199, 200]) npcs.tick(t, player);
  assert.equal(decisions, 2);
  for (const timing of [{ intervalMs: 0 }, { intervalMs: 15 }, { intervalMs: 60001 }, { intervalMs: 16.5 }, { intervalMs: 16, afterMove: 'follow' }, { intervalMs: 16, target: 'player' }])
    assert.throws(() => fixture(timing), /timing/i);
});

test('public behavior registration uses timing for persistent actors and survives save restore', async () => {
  const plugin = manifest('cadence', api => {
    api.content.register('maps', 'lab', { ...map, id: 'cadence:lab', tileset: loadContentSync().maps.LittlerootTown.tileset, border: [0, 0, 0, 0], elements: [] });
    api.content.register('npcBehaviors', 'patrol', { timing: { intervalMs: 16, afterMove: 'settled' }, decide: c => ({ move: true, dir: 'right', pose: 'walk', duration: 120, state: { count: c.state.count + 1 } }) });
    api.content.register('actorTemplates', 'guard', { name: 'Guard', actor: 'ProfBirch', behavior: 'cadence:patrol', schema: { type: 'object', properties: { count: { type: 'integer', minimum: 0 } }, required: ['count'], additionalProperties: false }, initialState: { count: 0 } });
  });
  const s = session([plugin]);
  assert(s.game.enter({ map: 'cadence:lab', x: 0, y: 3, dir: 'up' }));
  const { actor } = await s.bus.execute('core.actor.spawn', { template: 'cadence:guard', position: { map: 'cadence:lab', x: 1, y: 1, dir: 'right' } });
  s.game.field.npcs.objects('cadence:lab');
  s.game.tick(16, ['cadence:lab']);
  assert.equal(s.game.actors.view(actor.uid).x, 2);
  s.game.tick(136, ['cadence:lab']);
  assert.equal(s.game.actors.view(actor.uid).x, 3);
  assert.equal(s.game.actors.view(actor.uid).data.count, 2);
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.game.actors.view(actor.uid).x, 3);
  assert.equal(s.game.actors.view(actor.uid).data.count, 2);
});


test('ambient motion facts freeze across a long pause, then settle once before the next start', () => {
  const npcs = fixture({ intervalMs: 100, afterMove: 'settled' });
  const facts = [];
  npcs.motionResults.onResult = fact => facts.push(fact);
  npcs.tick(100, player);
  npcs.tick(1000, player, { paused: true });
  assert.deepEqual(facts.map(f => f.phase), ['started']);
  assert.equal(npcs.objects('lab')[0].start, 1000);
  npcs.tick(1119, player);
  assert.equal(facts.length, 1);
  npcs.tick(1120, player);
  assert.deepEqual(facts.map(f => f.phase), ['started', 'settled', 'started']);
  assert.equal(facts[1].sequence, facts[0].sequence);
  assert.equal(facts[1].entity, 'lab:guard');
  assert.equal(facts[1].at, 1120);
});

test('static NPC collision and removal report blocked and cancellation without a false landing', () => {
  const npcs = fixture({ intervalMs: 100 });
  const facts = [];
  npcs.motionResults.onResult = f => facts.push(f);
  npcs.tick(100, { ...player, x: 2, y: 1 });
  assert.equal(facts[0].phase, 'blocked');
  assert.equal(facts[0].reason, 'occupied');
  npcs.tick(200, player);
  npcs.definitions = () => [];
  npcs.objects('lab');
  assert.deepEqual(facts.map(f => f.phase), ['blocked', 'started', 'cancelled']);
  assert.equal(facts[2].reason, 'removed');
  assert.equal(facts[2].sequence, facts[1].sequence);
});
