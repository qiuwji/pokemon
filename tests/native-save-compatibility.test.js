import test from 'node:test';
import assert from 'node:assert/strict';
import { session } from './helpers/session.js';
import { EmeraldAdventure } from '../src/game/emerald/adventure.js';
import { Timeline, TransitionController } from '../src/engine/timeline.js';
import { BattleDirector } from '../src/presentation/battle-director.js';
import { GridMotion, SceneGraph } from '../src/engine/motion.js';
import { PACK } from "../src/packs/emerald/pack.js";
import { CropRegistry, CropService } from '../src/engine/crop-growth.js';
import { EMERALD_CROPS, EMERALD_CROP_POLICY, emeraldBerryYield } from '../src/packs/emerald/berries.js';

const plot = 'emerald.route116.berry.1';
function legacyDocument(s, stage = 'ripe') {
  const doc = s.game.exportDocument();
  const registry = new CropRegistry({ ...EMERALD_CROPS, pinap_berry: { ...EMERALD_CROPS.pinap_berry, durationMinutes: 180, minYield: 2, maxYield: 3 } }, { items: s.catalog.items });
  const crops = new CropService({ registry, state: doc.state.crops, policy: EMERALD_CROP_POLICY, calculateYield: emeraldBerryYield });
  crops.remove(plot);
  crops.plant(plot, 'pinap_berry', { stage, stopped: true });
  return doc;
}
function refresh(s, doc) {
  const raw = JSON.stringify(doc);
  s.saved.set(PACK.id, raw);
  const timeline = new Timeline({ now: () => 0, wait: async () => {} });
  const game = new EmeraldAdventure({ db: s.db, catalog: s.catalog, plugins: s.host,
    storage: { getItem: key => s.saved.get(key) ?? null, setItem: (key, value) => s.saved.set(key, value) }, wallNow: () => 1000,
    timeline, transitions: new TransitionController(timeline), director: new BattleDirector(timeline), motion: new GridMotion(new SceneGraph(s.db.maps)) });
  return { game, raw };
}

test('Refreshing a legacy Pinap save restores progress and keeps the exact original backup', () => {
  const s = session(), doc = legacyDocument(s);
  doc.state.money = 4321;
  doc.state.flags.badgeStone = true;
  const original = structuredClone(doc);
  const { game, raw } = refresh(s, doc);
  assert.equal(game.saveProtected, false);
  assert.equal(game.state.money, 4321);
  assert.equal(game.state.flags.badgeStone, true);
  assert.deepEqual(game.state.party, doc.state.party);
  assert.equal(game.state.crops.trees[plot].remainingMinutes, 240);
  assert.equal(game.state.crops.trees[plot].yield, 3);
  assert.equal(s.saved.get(PACK.id), raw);
  assert.equal(s.saved.get(PACK.id + ':before-content-suspension'), raw);
  assert.deepEqual(doc, original, 'migration does not mutate the supplied document');
  const current = game.exportDocument();
  const reopened = refresh(s, current).game;
  assert.equal(reopened.saveProtected, false);
  assert.deepEqual(reopened.state.crops, current.state.crops, 'restoration is idempotent');
  assert.equal(s.saved.get(PACK.id + ':before-content-suspension'), raw);
});

test('All five legacy Pinap stages migrate without changing other trees or harvested plots', () => {
  for (const stage of EMERALD_CROP_POLICY.stages.map(s => s.id)) {
    const s = session(), doc = legacyDocument(s, stage);
    doc.state.crops.trees[plot].remainingMinutes -= 1;
    doc.state.crops.trees[plot].cycles = 2;
    doc.state.crops.trees[plot].watered = ['planted'];
    delete doc.state.crops.trees['emerald.route104.berry.13'];
    const other = structuredClone(doc.state.crops.trees['emerald.route104.berry.10']);
    const game = refresh(s, doc).game;
    assert.equal(game.saveProtected, false, stage);
    const tree = game.state.crops.trees[plot];
    assert.equal(tree.stage, stage);
    assert.equal(tree.remainingMinutes, stage === 'ripe' ? 240 : 60);
    assert.equal(tree.cycles, 2);
    assert.deepEqual(tree.watered, ['planted']);
    assert.equal(tree.stopped, true);
    assert.deepEqual(game.state.crops.trees['emerald.route104.berry.10'], other);
    assert.equal(game.state.crops.trees['emerald.route104.berry.13'], undefined);
  }
});

test('Current Pinap data stays unchanged and unrelated or malformed data still protects the save', () => {
  const s = session(), doc = s.game.exportDocument();
  assert.deepEqual(refresh(s, doc).game.state.crops, doc.state.crops);
  const cases = [
    d => { d.state.money = -1; },
    d => { d.state.crops.trees[plot].remainingMinutes = 721; },
    d => { d.state.crops.trees[plot].yield = 7; },
    d => { d.state.crops.trees[plot].watered = ['typo']; },
    d => { d.state.crops.trees[plot].extra = true; },
    d => { d.state.crops.trees['unknown.plot'] = d.state.crops.trees[plot]; delete d.state.crops.trees[plot]; },
  ];
  for (const corrupt of cases) {
    const arrangement = session(), bad = legacyDocument(arrangement);
    corrupt(bad);
    const { game, raw } = refresh(arrangement, bad);
    assert.equal(game.saveProtected, true);
    assert.equal(game.save(), false);
    assert.equal(arrangement.saved.get(PACK.id), raw);
    assert.equal(arrangement.saved.has(PACK.id + ':before-content-suspension'), false);
  }
});
