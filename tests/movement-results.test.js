import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionResults } from '../src/engine/motion-results.js';
import { BLOCKED_REASON, BLOCKED_REASONS, MOTION_CANCEL_REASON } from '../src/engine/blocked-reasons.js';
import { NPCBehaviorRegistry } from '../src/engine/npc-behaviors.js';
import { FieldDirector } from '../src/engine/field-director.js';
import { FieldSession } from '../src/engine/field-session.js';
import { GridMotion, SceneGraph } from '../src/engine/motion.js';
import { manifest, session } from './helpers/session.js';

function fixture() {
  const makeMap = () => ({ width: 3, height: 3, blocks: Array(9).fill(0), behavior: Array(9).fill(0), connections: [], warps: [] });
  const maps = { a: makeMap(), b: makeMap() };
  maps.a.connections.push({ direction: 'right', offset: 0, map: 'b' });
  maps.b.connections.push({ direction: 'left', offset: 0, map: 'a' });
  const results = [];
  let now = 0;
  const position = { map: 'a', x: 2, y: 1, dir: 'right' };
  const field = new FieldSession({ maps, position, objects: () => [], motion: new GridMotion(new SceneGraph(maps)), transitions: {}, now: () => now, onMotion: r => results.push(r) });
  return { field, position, results, at(t) { now = t; field.tick(t); } };
}

test('motion facts pair starts and landings across map connections and remain frozen detached snapshots', () => {
  const s = fixture();
  assert(s.field.move('right', { running: true }));
  const start = s.results[0];
  assert.equal(start.phase, 'started');
  assert.equal(start.entity, 'player');
  assert.deepEqual(start.from, { map: 'a', x: 2, y: 1, dir: 'right' });
  assert.deepEqual(start.to, { map: 'b', x: 0, y: 1, dir: 'right' });
  assert.equal(start.durationMs, 96);
  assert(Object.isFrozen(start.from));
  s.at(96);
  const settled = s.results[1];
  assert.equal(settled.phase, 'settled');
  assert.equal(settled.sequence, start.sequence);
  assert.equal(settled.at, 96);
  s.position.dir = 'up';
  assert.equal(start.to.dir, 'right');
  s.at(100);
  assert.equal(s.results.length, 2, 'landings are delivered once');
});

test('blocked attempts do not fabricate a completed step and dispose closes pending motion', () => {
  const s = fixture();
  s.position.x = 0;
  assert.equal(s.field.move('left'), false);
  assert.equal(s.results[0].phase, 'blocked');
  assert.equal(s.results[0].reason, 'boundary');
  assert.equal(s.results[0].durationMs, 0);
  assert(s.field.move('right'));
  const sequence = s.results[1].sequence;
  s.field.dispose();
  assert.equal(s.results[2].phase, 'cancelled');
  assert.equal(s.results[2].reason, 'disposed');
  assert.equal(s.results[2].sequence, sequence);
  s.at(500);
  assert.equal(s.results.length, 3);
});

test('movement observers cannot undo a committed movement with an exception or asynchronous result', () => {
  const s = fixture();
  const errors = [];
  s.field.onMotionError = e => errors.push(e);
  s.field.onMotion = () => { throw new Error('observer'); };
  assert.equal(s.field.move('right'), true);
  s.at(160);
  assert.equal(s.position.map, 'b');
  assert.equal(errors.length, 2);
  s.field.onMotion = () => Promise.resolve();
  assert(s.field.move('left'));
  s.at(320);
  assert.equal(errors.length, 4);
});

test('public motion event exposes movement facts without adding player travel clocks', async () => {
  const events = [];
  const s = session([manifest('observer', api => api.events.on('core:motion', event => events.push(event.payload)))]);
  const clocks = s.game.world.steps;
  await s.bus.execute('core.field.move', { direction: 'left' });
  const start = events.find(e => e.phase === 'started');
  assert(start);
  s.game.field.tick(start.startedAt + start.durationMs);
  assert.equal(events.filter(e => e.phase === 'settled').length, 1);
  assert.equal(s.game.world.steps, clocks + 1);
});


test('scripted NPC steps report the movement direction independently of a preserved facing', async () => {
  const s = fixture();
  s.field.npcs.definitions = () => [{ id: 'guide', map: 'a', x: 0, y: 0, dir: 'down', movement: { mode: 'still' } }];
  let now = 0;
  const director = new FieldDirector({ field: s.field, timeline: { now: () => now, wait: async ms => { now += ms; s.at(now); } }, camera: {} });
  director.begin();
  await director.step('guide', 'right', { keepFacing: true });
  const facts = s.results.filter(f => f.entity === 'a:guide');
  assert.deepEqual(facts.map(f => f.phase), ['started', 'settled']);
  assert.equal(facts[0].scripted, true);
  assert.equal(facts[0].direction, 'right');
  assert.equal(facts[0].to.dir, 'down');
  assert.equal(facts[0].to.x, 1);
  assert.equal(facts[1].sequence, facts[0].sequence);
});


test('a scene disposed by a start observer closes the already-retained step exactly once', () => {
  const s = fixture();
  s.field.onMotion = result => {
    s.results.push(result);
    if (result.phase === 'started') s.field.dispose();
  };
  assert(s.field.move('right'));
  assert.deepEqual(s.results.map(r => r.phase), ['started', 'cancelled']);
  assert.equal(s.results[1].sequence, s.results[0].sequence);
  assert.equal(s.field.pendingMotion, null);
  s.at(500);
  assert.equal(s.results.length, 2);
});


test('scene takeover closes an ambient step before starting a scripted step without requiring a render tick', async () => {
  const s = fixture();
  s.field.npcs.behaviors = new NPCBehaviorRegistry({ 'test:patrol': { timing: { intervalMs: 100 }, decide: () => ({ move: true, dir: 'right', pose: 'walk', duration: 120 }) } });
  s.field.npcs.definitions = () => [{ id: 'guide', map: 'a', x: 0, y: 0, dir: 'right', movement: { mode: 'test:patrol', rangeX: 2 } }];
  s.field.npcs.objects('a');
  s.at(100);
  s.field.npcs.tick(100, s.position);
  let now = 100;
  const director = new FieldDirector({ field: s.field, timeline: { now: () => now, wait: async ms => { now += ms; s.at(now); } }, camera: {} });
  director.begin();
  await director.step('guide', 'right');
  assert.deepEqual(s.results.map(f => f.phase), ['started', 'settled', 'started', 'settled']);
  assert.equal(s.results[0].sequence, s.results[1].sequence);
  assert.equal(s.results[2].sequence, s.results[3].sequence);
  assert.equal(s.results[2].startedAt, 220);
});

test('unknown movement causes fail before allocating a sequence or notifying observers; blocked and cancelled remain distinct', () => {
  const facts = [], motion = new MotionResults({ now: () => 0, onResult: r => facts.push(r) });
  const from = { map: 'a', x: 0, y: 0, dir: 'up' };
  for (const reason of ['watr', 'water', null, MOTION_CANCEL_REASON.DISPOSED])
    assert.throws(() => motion.blocked('player', from, from, 'up', reason), /Unknown blocked reason/);
  assert.equal(facts.length, 0);
  assert.equal(motion.sequence, 0);
  const valid = motion.blocked('player', from, from, 'up', BLOCKED_REASON.WALL);
  assert.equal(valid.reason, 'wall');
  assert.equal(valid.sequence, 1);
  assert.throws(() => motion.finish(valid, BLOCKED_REASON.WALL), /Unknown motion cancellation/);
  assert(Object.isFrozen(BLOCKED_REASONS));
  assert.throws(() => { BLOCKED_REASON.WALL = 'water'; }, TypeError);
});

test('World rejects an unknown blocked cause even when no motion observer is installed', () => {
  const s = fixture();
  assert.throws(() => s.field.world.block('watr'), /Unknown blocked reason/);
  assert.equal(s.field.world.lastBlocked, undefined);
  assert.equal(s.results.length, 0);
});
