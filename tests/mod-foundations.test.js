import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserInput } from '../src/adapters/browser-input.js';
import { createBattleRules, BATTLE_RULES } from '../src/engine/battle-rules.js';
import { nativeCast, projectNativeCast } from '../src/packs/emerald/native-cast.js';
import { NATIVE_CAST } from '../src/packs/emerald/native-cast-data.js';
import { bindNativeObjects } from '../src/packs/emerald/native-object-bindings.js';
import { ExtensionDOM } from '../src/adapters/extension-dom.js';
import { layoutDocument } from './helpers/layout-document.js';
import { session, manifest, objectSchema } from './helpers/session.js';

test('Script ownership blocks touch and held keyboard movement without cancelling the scripted animation; choices remain operable', () => {
  const doc = layoutDocument(), button = doc.createElement('button'), calls = [];
  button.dataset = { dir: 'up' };
  button.setPointerCapture = () => calls.push('capture');
  doc.querySelectorAll = () => [button];
  const game = { storyBusy: false, handleFieldInput: i => calls.push(i.direction), resetFieldInput: () => calls.push('reset') };
  const ui = { blocked: false, modalType: null, navigateMenu: d => calls.push('menu:' + d) };
  const input = new BrowserInput({ document: doc, window: { addEventListener() {} }, game, ui });
  const key = k => ({ key: k, target: { closest: () => null }, preventDefault() {} });
  input.keydown(key('ArrowUp'));
  game.storyBusy = true; input.tick();
  input.keydown(key('ArrowRight')); input.keydown(key('Shift'));
  button.dispatchEvent({ type: 'pointerdown', pointerId: 1, preventDefault() {} });
  assert.deepEqual(calls, ['up']);
  assert.equal(input.held, null); assert.equal(input.running, false);
  ui.modalType = 'choice'; button.dispatchEvent({ type: 'pointerdown', pointerId: 1, preventDefault() {} });
  assert.deepEqual(calls.slice(1), ['capture', 'menu:up']);
  game.storyBusy = false; ui.modalType = null; input.tick();
  assert.equal(calls.at(-1), null);
  input.keydown(key('ArrowRight')); assert.equal(calls.at(-1), 'right');
  input.destroy();
});

test('Resetting logical movement during a story cannot force director-owned sprites to idle', () => {
  const { game } = session(); let idles = 0;
  game.storyBusy = true; game.field.motion.idle = () => idles++;
  game.resetFieldInput(); assert.equal(idles, 0);
  game.storyBusy = false; game.resetFieldInput(); assert.equal(idles, 1);
});

test('Native cast entries bind real source identities, preserve gender/visibility, and support a new map through data alone', () => {
  const { db } = session();
  for (const map of Object.keys(NATIVE_CAST)) {
    for (const playerGender of ['male', 'female']) {
      for (const enabled of [false, true]) {
        const state = { position: { map }, playerGender, flags: Object.fromEntries(['rescued','introDone','neighborMet','momOutside','pokedex','runningShoes','potionGift','rivalWon'].map(k => [k, enabled])), story: { rewards: [] } };
        const cast = nativeCast(state, db);
        assert(cast.length <= db.maps[map].npcs.length);
        assert.equal(new Set(bindNativeObjects(map, cast, db.maps[map].npcs).map(o => o.id)).size, cast.length);
        assert.equal(bindNativeObjects(map, cast, db.maps[map].npcs).length, cast.length);
      }
    }
  }
  assert(Object.isFrozen(NATIVE_CAST.OldaleTown));
  const state = { flags: { starter: 'treecko' }, playerGender: 'female', story: { rewards: [] } };
  const output = projectNativeCast([{ id: 'new', actor: 'MayNormal', gender: { female: { actor: 'BrendanNormal' } }, when: { flag: 'starter' }, dialogueId: 'line' }], state, { line: { name: '测试', lines: ['你好'] } });
  assert.equal(output[0].actor, 'BrendanNormal'); assert.equal(output[0].text, '你好');
  assert.throws(() => projectNativeCast([{ dialogueId: 'missing' }], state, {}), /Unknown native NPC dialogue/);
});

test('Plugin-defined nested slots render within the native detail host with selected UID, refresh and clean up as a tree', async () => {
  let api;
  const s = session([manifest('care-slot', a => {
    api = a;
    const slot = a.ui.slot('care', { parent: 'monster.detail' });
    const nested = a.ui.slot('mood', { parent: slot });
    const action = a.actions.register('touch', { schema: objectSchema({ uid: { type: 'string' } }, ['uid']), run(ctx, input) { ctx.store.set('touched', input.uid); } });
    a.ui.region('panel', { slot: nested, render: v => ({ kind: 'button', text: '互动', action, input: { uid: v.context.uid } }) });
  })]);
  const doc = layoutDocument(), root = doc.createElement('div'), errors = [];
  const ext = new ExtensionDOM({ host: s.host, document: doc, resources: s.db.resources, assets: {}, now: () => 0,
    shell: { root, closeModal() {}, toast() {} }, onError: e => errors.push(e) });
  ext.mountSlot('monster.detail', root, { uid: s.mon.uid });
  assert.equal(ext.mounts.size, 3); assert.equal(root.querySelectorAll('button').length, 1);
  await root.querySelector('button').onclick(); assert.equal(api.store.get('touched'), s.mon.uid);
  ext.refresh(); assert.equal(ext.mounts.size, 3); assert.equal(root.querySelectorAll('button').length, 1);
  ext.unmountSlot('monster.detail'); assert.equal(ext.mounts.size, 0); assert.equal(ext.layout.canvases.size, 0);
  assert.equal(errors.length, 0); ext.dispose();
  assert.throws(() => session([manifest('bad-slot', a => a.ui.slot('missing', { parent: 'nowhere' }))]), /slot parent/);
  assert.throws(() => session([manifest('bad-slot', a => { const slot = a.ui.slot('x', { parent: 'menu' }); a.ui.region('x', { slot, mode: 'replace', render: () => ({ kind: 'text', text: 'x' }) }); })]), /native UI/);
});

test('Nested battle policy edits cannot leak to another battle, to defaults, or to caller-owned overrides', () => {
  const override = { replacementPolicies: { test: { volatileFields: ['focus'] } } };
  const a = createBattleRules(override), b = createBattleRules();
  a.criticalChances[0] = 1; a.replacementPolicies.test.volatileFields.push('confused');
  assert.equal(b.criticalChances[0], 1/16); assert.equal(BATTLE_RULES.criticalChances[0], 1/16);
  assert.deepEqual(override.replacementPolicies.test.volatileFields, ['focus']);
  assert.throws(() => BATTLE_RULES.protectSuccessRates.push(0), TypeError);
});

test('Oldale footprints man blocks the west exit until the laboratory gifts, repeats and resets on re-entry', async () => {
  const s = session(), g = s.game;
  g.state.flags.starter = 'mudkip'; g.state.flags.pokedex = false;
  const enter = async (x=2, y=10) => {
    assert(g.enter({ map: 'OldaleTown', x, y, dir: 'left' }));
    // Observe the destination before any deferred mapEnter story runs.
    assert.deepEqual([man().x, man().y, man().dir], g.state.flags.pokedex ? [8,9,'right'] : [1,11,'left']);
    await g.flushStoryQueue(); await s.settle();
  };
  const man = () => g.field.npcs.objects('OldaleTown').find(o => o.id === 'oldale.footprints');
  await enter(); assert.deepEqual([man().x, man().y, man().dir], [1,11,'left']);
  for (let i=0; i<2; i++) {
    await enter(0,10);
    const commands = g.story.resolve('step', g.state, { map: 'OldaleTown', position: { ...g.state.position } });
    assert(commands.length); await g.runStory(commands); await s.settle();
    assert.deepEqual([g.state.position.x, g.state.position.y, g.state.position.dir], [1,10,'right']);
    assert.deepEqual([man().x, man().y, man().dir], [1,11,'left']);
    assert.match(s.dialogs.at(-1).lines[0].runs[0].text, /不要进来/);
  }
  assert(g.enter({ map:'Route101', x:10, y:1, dir:'down' })); await enter();
  assert.deepEqual([man().x, man().y, man().dir], [1,11,'left']);
  for (const house of ['OldaleTown_House1','OldaleTown_House2']) {
    assert(g.enter({ map: house, x:3, y:7, dir:'up' }));
    await enter(5,8);
  }
  g.state.flags.pokedex = true; assert(g.enter({ map:'Route101', x:10, y:1, dir:'down' })); await enter();
  assert.deepEqual([man().x, man().y, man().dir], [8,9,'right']);
  assert.equal(g.story.resolve('step', g.state, { map:'OldaleTown', position:{map:'OldaleTown',x:0,y:10,dir:'left'} }).length,0);
});

test('An invalid automatic save is observable, preserves the last good record, and clears the warning after repair', () => {
  const s = session(), g = s.game, warnings = [];
  g.ui.toast = message => warnings.push(message);
  assert.equal(g.save(), true);
  const raw = g.saveStore.raw();
  const money = g.state.money; g.state.money = Infinity;
  assert.equal(g.save(), false); assert.equal(g.saveStore.raw(), raw);
  assert.match(g.saveWarning, /未覆盖上一次存档/); assert.equal(warnings.length, 1);
  assert.equal(g.save(), false); assert.equal(warnings.length, 1);
  g.state.money = money; assert.equal(g.save(), true); assert.equal(g.saveWarning, null);
});

test('An unreadable storage port records a read failure instead of presenting it as an empty save', async () => {
  const { SaveStore } = await import('../src/engine/save-store.js');
  const store = new SaveStore({ getItem() { throw new Error('denied'); } }, 'test', () => true);
  assert.equal(store.load(), null); assert.equal(store.lastIssue.code, 'storage_unavailable');
});
