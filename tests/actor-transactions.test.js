import test from 'node:test';
import assert from 'node:assert/strict';
import { manifest, session, objectSchema } from './helpers/session.js';

function fixture() {
  let api;
  const events = [];
  const plugin = manifest('atomic', value => {
    api = value;
    api.content.register('actorTemplates', 'guide', { name: 'Guide', actor: 'ProfBirch', behavior: 'still', schema: objectSchema({ visits: { type: 'integer', minimum: 0 } }, ['visits']), initialState: { visits: 0 } });
    for (const type of ['core:actor-spawned', 'core:actor-updated', 'core:actor-removed', 'core:encounter-released']) api.events.on(type, e => events.push(e));
    api.actions.register('create', { schema: objectSchema({ fail: { type: 'boolean' } }), run(ctx, { fail }) {
      ctx.store.set('requested', true);
      ctx.intent({ kind: 'actors', operation: 'spawn', template: 'atomic:guide', position: { map: 'LittlerootTown', x: 9, y: 10, dir: 'down' } }, result => {
        assert(Object.isFrozen(result.actor));
        ctx.store.set('uid', result.actor.uid);
        ctx.intent({ kind: 'actors', operation: 'update', uid: result.actor.uid, data: JSON.stringify({ visits: 1 }) });
        if (fail) ctx.intent({ kind: 'friendship', uid: 'missing', amount: 1 });
      });
    } });
    api.actions.register('edit', { schema: objectSchema({ uid: { type: 'string' }, remove: { type: 'boolean' }, fail: { type: 'boolean' } }, ['uid']), run(ctx, { uid, remove, fail }) {
      ctx.intent(remove ? { kind: 'actors', operation: 'remove', uid } : { kind: 'actors', operation: 'update', uid, hidden: true });
      ctx.store.set('edited', true);
      if (fail) ctx.intent({ kind: 'friendship', uid: 'missing', amount: 1 });
    } });
    api.actions.register('change-pose', { schema: objectSchema({ uid: { type: 'string' } }, ['uid']), run(ctx, { uid }) {
      ctx.intent({ kind: 'actors', operation: 'update', uid, pose: 'hop' }, () => { ctx.query(); throw new Error('pose rollback'); });
    } });
    api.actions.register('async-result', { schema: objectSchema(), run(ctx) {
      ctx.intent({ kind: 'actors', operation: 'spawn', template: 'atomic:guide', position: { map: 'LittlerootTown', x: 9, y: 10, dir: 'down' } }, async () => {});
    } });
    api.actions.register('overflow-result', { schema: objectSchema(), run(ctx) {
      ctx.intent({ kind: 'actors', operation: 'spawn', template: 'atomic:guide', position: { map: 'LittlerootTown', x: 9, y: 10, dir: 'down' } }, () => { for (let i = 0; i < 128; i++) ctx.store.set('value', i); });
    } });
    api.actions.register('invalid-result', { schema: objectSchema(), run(ctx) {
      ctx.intent({ kind: 'actors', operation: 'spawn', template: 'atomic:guide', position: { map: 'LittlerootTown', x: 9, y: 10, dir: 'down' } }, () => { throw new Error('result callback failed'); });
    } });
  }, ['actors', 'friendship']);
  const s = session([plugin]);
  return { ...s, api, events };
}

test('actor result callbacks compose initialization and memory; facts see only committed state and auto-save restores identity', async () => {
  const s = fixture();
  const observed = [];
  s.host.events.on('core:actor-spawned', () => observed.push({ uid: s.api.store.get('uid'), visits: s.game.actors.view(s.api.store.get('uid')).data.visits }));
  await s.api.commands.dispatch('atomic:create', {});
  const uid = s.api.store.get('uid');
  assert.equal(s.game.actors.view(uid).data.visits, 1);
  assert.deepEqual(observed, [{ uid, visits: 1 }]);
  assert.deepEqual(s.events.map(e => e.type), ['core:actor-spawned', 'core:actor-updated']);
  assert(s.saved.size > 0);
  s.game.loadDocument(JSON.parse([...s.saved.values()][0]));
  assert.equal(s.api.store.get('uid'), uid);
  assert.equal(s.game.actors.view(uid).data.visits, 1);
});

test('late failure rolls back generated identity, actor state and plugin memory with no published facts or saved write', async () => {
  const s = fixture();
  const before = structuredClone(s.game.state);
  const saved = new Map(s.saved);
  await assert.rejects(s.api.commands.dispatch('atomic:create', { fail: true }), /Invalid friendship intent/);
  assert.deepEqual(s.game.state, before);
  assert.deepEqual(s.events, []);
  assert.deepEqual(s.saved, saved);
  await s.api.commands.dispatch('atomic:create', {});
  assert.equal(s.api.store.get('uid'), 'core:actor.1');
});

test('failed actor edits and removal preserve cached animation identity and temporary appearance leases', async () => {
  const s = fixture();
  await s.api.commands.dispatch('atomic:create', {});
  const uid = s.api.store.get('uid');
  const n = s.game.field.npcs.objects('LittlerootTown').find(n => n.id === uid);
  const token = s.game.overrideAppearance({ target: { kind: 'actor', uid }, appearance: 'emerald-actor', data: { actor: 'ProfBirch' }, scope: 'session' }).token;
  const before = structuredClone(s.game.state);
  const count = s.events.length;
  for (const remove of [false, true]) {
    await assert.rejects(s.api.commands.dispatch('atomic:edit', { uid, remove, fail: true }), /Invalid friendship intent/);
    assert.deepEqual(s.game.state, before);
    assert.strictEqual(s.game.field.npcs.objects('LittlerootTown').find(n => n.id === uid), n);
    assert(s.game.appearanceView().overrides.some(l => l.token === token));
    assert.equal(s.events.length, count);
  }
  await s.api.commands.dispatch('atomic:edit', { uid, remove: true });
  assert.equal(s.game.actors.list()[uid], undefined);
  assert.equal(s.game.appearanceView().overrides.length, 0);
  assert.equal(s.game.field.npcs.objects('LittlerootTown').some(n => n.id === uid), false);
});

test('result callback failure is atomic, and actor permission and strict shapes remain enforced', async () => {
  const s = fixture();
  const before = structuredClone(s.game.state);
  await assert.rejects(s.api.commands.dispatch('atomic:invalid-result'), /result callback failed/);
  assert.deepEqual(s.game.state, before);
  assert.deepEqual(s.events, []);
  const denied = session([manifest('denied', api => {
    api.actions.register('create', { schema: objectSchema(), run(ctx) { ctx.intent({ kind: 'actors', operation: 'remove', uid: 'core:actor.1' }); } });
  })]);
  await assert.rejects(denied.bus.execute('denied:create'), /Undeclared core permission/);
  assert.throws(() => s.host.runtime.transaction('atomic', ctx => ctx.intent({ kind: 'actors', operation: 'remove', uid: 'core:actor.1', ignoreCollision: true })), /unknown property/i);
});


test('async result callbacks and excessive result work roll back generated actors', async () => {
  const s = fixture();
  const before = structuredClone(s.game.state);
  for (const [action, error] of [['async-result', /synchronous/], ['overflow-result', /operation limit/]]) {
    await assert.rejects(s.api.commands.dispatch(`atomic:${action}`), error);
    assert.deepEqual(s.game.state, before);
    assert.deepEqual(s.events, []);
  }
});


test('failed pose queries restore every cached frame field and an in-progress motion can still finish', async () => {
  const s = fixture();
  await s.api.commands.dispatch('atomic:create', {});
  const uid = s.api.store.get('uid');
  const npcs = s.game.field.npcs;
  const n = npcs.objects('LittlerootTown').find(n => n.id === uid);
  const frame = { ...n };
  await assert.rejects(s.api.commands.dispatch('atomic:change-pose', { uid }), /pose rollback/);
  assert.deepEqual(n, frame);
  const facts = [];
  s.host.events.on('core:motion', e => facts.push(e.payload));
  npcs.beginMotion(n, { map: n.map, x: n.x, y: n.y, dir: n.dir }, { map: n.map, x: n.x + 1, y: n.y, dir: 'right' });
  const motion = n.pendingMotion;
  await assert.rejects(s.api.commands.dispatch('atomic:edit', { uid, remove: true, fail: true }), /Invalid friendship intent/);
  assert.strictEqual(n.pendingMotion, motion);
  assert.equal(facts.length, 1, 'rolled back removal exposes no cancellation');
  npcs.finishMotion(n);
  assert.deepEqual(facts.map(f => f.phase), ['started', 'settled']);
  assert.equal(facts[1].sequence, motion.sequence);
});
