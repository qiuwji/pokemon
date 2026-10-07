import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/engine/extensions/event-bus.js';

test('batched facts stay detached and invisible until commit; rollback consumes no sequence', () => {
  const bus = new EventBus();
  const facts = [];
  bus.on('change', e => facts.push(e));
  const batch = bus.beginBatch();
  const data = { value: 1 };
  bus.emit('change', data);
  data.value = 2;
  assert.deepEqual(facts, []);
  batch.rollback();
  assert.equal(bus.sequence, 0);
  const committed = bus.beginBatch();
  bus.emit('change', data);
  data.value = 3;
  committed.commit();
  assert.equal(facts[0].payload.value, 2);
  assert(Object.isFrozen(facts[0].payload));
  assert.equal(facts[0].sequence, 1);
  assert.throws(() => committed.commit(), /Expired/);
});

test('event batches retain nesting, capacity and listener failure boundaries', () => {
  const errors = [];
  const facts = [];
  const bus = new EventBus({ limit: 2, onError: e => errors.push(e) });
  bus.on('change', () => { throw new Error('observer failed'); });
  bus.on('change', e => facts.push(e));
  const batch = bus.beginBatch();
  assert.throws(() => bus.beginBatch(), /Nested/);
  bus.emit('change');
  bus.emit('change');
  assert.throws(() => bus.emit('change'), /queue limit/);
  batch.commit();
  assert.equal(facts.length, 2);
  assert.equal(errors.length, 2);
  const next = bus.beginBatch();
  next.rollback();
});
