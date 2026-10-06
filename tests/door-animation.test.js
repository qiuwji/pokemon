import test from 'node:test';
import assert from 'node:assert/strict';
import { session } from './helpers/session.js';
import { validateSave } from '../src/packs/emerald/save-contract.js';
import {
  DOOR_CLOSE_FRAMES,
  DOOR_FRAME_MS,
  DOOR_OPEN_FRAMES,
  DoorDirector,
  createDoorWarp,
} from '../src/packs/emerald/door-animation.js';
import { DOOR_ANIMATIONS } from '../generated/packs/emerald/generated/door-anims.js';
import { emeraldDoorSound } from '../src/packs/emerald/audio-library.js';

const pose = (p) => [p.x, p.y, p.dir];
const valid = (s) => assert(validateSave(s.game.state, s.db, s.catalog, s.host));

/** Mid-adventure male session standing one tile below the Mays house door. */
function doorSession(x = 14, y = 9) {
  const s = session();
  s.game.state.playerGender = 'male';
  s.game.state.flags = { introDone: true, introState: 7, roomChecked: true, tvWatched: true, neighborMomMet: true };
  s.game.state.flags.rescued = false;
  s.game.state.flags.neighborMet = false;
  s.game.state.flags.neighborMomMet = false;
  s.game.enter({ map: 'LittlerootTown', x, y, dir: 'up' });
  return s;
}

/** Presses a direction and drains the arranged clock until the step has landed. */
async function step(s, dir) {
  const g = s.game;
  const moved = g.move(dir);
  for (let i = 0; i < 8 && g.motion.moving(g.timeline.now()); i++)
    await g.timeline.wait(g.motion.remaining(g.timeline.now()) || g.motion.duration);
  g.field.tick(g.timeline.now());
  await s.settle();
  await g.flushStoryQueue();
  await s.settle();
  return moved;
}

test('Imported door frames cover exactly the reference door metatiles this content uses', () => {
  // metatile_labels.h: Petalburg_Door_Littleroot/BirchsLab, General_Door_PokeCenter/PokeMart,
  // Petalburg_Door_Oldale. field_door.c assigns the sound per metatile.
  assert.deepEqual(Object.keys(DOOR_ANIMATIONS).map(Number).sort((a, b) => a - b), [65, 97, 584, 585, 647]);
  assert.equal(DOOR_ANIMATIONS[584].sound, 'normal');
  assert.equal(DOOR_ANIMATIONS[65].sound, 'sliding');
  assert.equal(DOOR_ANIMATIONS[97].sound, 'sliding');
  for (const door of Object.values(DOOR_ANIMATIONS)) {
    assert.equal(door.open.length, 3, 'sDoorOpenAnimFrames paints three frames');
    for (const pair of door.open) {
      assert.equal(pair.length, 2, 'a door is one top and one bottom metatile');
      for (const id of pair) assert(id >= 900 && id <= 929);
    }
  }
  // The last painted frame is the fully open door; a door that never changes is not a door.
  assert.deepEqual(new Set(DOOR_ANIMATIONS[584].open.map((p) => p[0])).size, 3);
});

test('Door frame timing and order follow sDoorOpenAnimFrames and sDoorCloseAnimFrames', () => {
  assert.equal(DOOR_FRAME_MS, 1000 / 15, 'four native ticks per frame at 60 fps');
  assert.deepEqual(DOOR_OPEN_FRAMES, [null, 0, 1, 2], 'open starts on the untouched tileset metatile');
  assert.deepEqual(DOOR_CLOSE_FRAMES, [2, 1, 0, null], 'close runs the other way and ends closed');
});

/** A clock the test steps by hand, so frames can be read at chosen times. */
function manualClock() {
  let now = 0, release = null;
  return {
    timeline: { now: () => now, wait: () => new Promise((resolve) => (release = resolve)) },
    at: (value) => (now = value),
    release: () => release(),
  };
}

test('The director walks the painted frames and never touches saved world state', async () => {
  const s = doorSession();
  const before = JSON.stringify(s.game.state.worldState);
  const clock = manualClock();
  const director = new DoorDirector({
    timeline: clock.timeline,
    maps: s.db.maps,
    reducedMotion: () => false,
  });
  assert(director.door({ map: 'LittlerootTown', x: 14, y: 8 }), 'the door metatile is recognised');
  assert.equal(director.door({ map: 'LittlerootTown', x: 14, y: 9 }), null, 'the mat in front of it is not');
  assert.equal(director.door({ map: 'LittlerootTown', x: 999, y: 999 }), null, 'out of bounds is not');
  assert.equal(director.sample(0), null, 'an idle director draws nothing');

  const playing = director.play({
    map: 'LittlerootTown',
    x: 14,
    y: 8,
    data: DOOR_ANIMATIONS[584],
    steps: DOOR_OPEN_FRAMES,
  });
  const frames = [];
  for (const ms of [0, DOOR_FRAME_MS, DOOR_FRAME_MS * 2, DOOR_FRAME_MS * 3]) {
    clock.at(ms);
    frames.push(director.sample());
  }
  assert.deepEqual(frames.map((f) => f.top), [null, 900, 902, 904]);
  assert.deepEqual(frames.map((f) => f.bottom), [null, 901, 903, 905]);
  assert.deepEqual(frames.map((f) => f.hidePlayer), [false, false, false, false]);
  assert.equal(frames[0].map, 'LittlerootTown');
  clock.at(DOOR_FRAME_MS * 4);
  clock.release();
  await playing;
  assert.equal(director.sample().top, 904, 'the opened door stays on screen after the swing');
  director.clear();
  assert.equal(director.sample(), null, 'and draws nothing once it is cleared');
  assert.equal(JSON.stringify(s.game.state.worldState), before, 'door frames never enter the world patch state');
});

test('The hidden latch outlives the closing animation and is released on arrival', async () => {
  const s = doorSession(), clock = manualClock();
  const director = new DoorDirector({
    timeline: clock.timeline,
    maps: s.db.maps,
    reducedMotion: () => false,
  });
  const door = { map: 'LittlerootTown', x: 14, y: 8, data: DOOR_ANIMATIONS[584] };
  const warp = createDoorWarp({ director, sound: () => {} });

  const plan = warp.enter({ map: 'LittlerootTown', direction: 'up', door });
  const open = director.sample(0);
  assert.equal(open.top, null, 'the swing starts on the untouched tileset metatile');
  assert.equal(open.hidePlayer, false, 'the player is visible while the door opens');

  // The swing finishes where the walk into the doorway begins; he is still drawn then.
  clock.at(DOOR_FRAME_MS * 4);
  clock.release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(director.hidden, false, 'the player walks in visible');
  assert.equal(director.sample(0).top, 904, 'and the door stays open while he walks through it');

  const closing = plan.close();
  clock.at(DOOR_FRAME_MS * 8);
  clock.release();
  await closing;
  assert.equal(director.hidden, true, 'he disappears as the door shuts behind him');
  const settled = director.sample(0);
  assert.equal(settled.hidePlayer, true, 'and is still not drawn through the map swap');
  assert.equal(settled.top, null);
  warp.arrive();
  assert.equal(director.sample(0), null, 'arriving releases the player for the new map');
});

test('A coordinate script that takes the step puts the door back instead of leaving it open', async () => {
  const s = doorSession(), g = s.game;
  // The truck exit and the neighbour walk-in both intercept a warp from a coordinate event.
  let intercepted = false;
  g.field.beforeWarp = () => {
    intercepted = true;
    return true;
  };
  assert(g.move('up'));
  for (let i = 0; i < 8 && g.motion.moving(g.timeline.now()); i++)
    await g.timeline.wait(g.motion.remaining(g.timeline.now()) || g.motion.duration);
  g.field.tick(g.timeline.now());

  assert(intercepted, 'the story owns this step');
  assert.equal(g.field.doorPlan, null, 'and the door plan is dropped with it');
  assert.equal(g.doorDirector.sample(g.timeline.now()), null, 'so the door falls back to its map tile');
  assert.equal(g.doorDirector.hidden, false);
  valid(s);
});

test('Stepping into a door opens it before the player walks, and the arrival is the mat cell', async () => {
  const s = doorSession(), g = s.game;
  const sounds = [];
  g.ui.sound = (id) => sounds.push(id);
  const mat = { ...pose(g.state.position) };

  assert(g.move('up'));
  const visual = g.motion.sample(g.state.position, g.timeline.now());
  assert.deepEqual([visual.x / 16, visual.y / 16], [mat[0], mat[1]],
    'the player is drawn on the mat, not inside the closed door');
  assert.equal(visual.moving, false, 'and is not walking yet');
  assert(g.motion.moving(g.timeline.now()), 'the session holds the input until it opens');
  assert(g.doorDirector.sample(g.timeline.now()).map === 'LittlerootTown',
    'and the door being animated is the one he is walking into');

  await step(s, 'up');

  assert.equal(sounds[0], 'emerald:door', 'the reference door sound plays before the swap');
  assert.equal(g.state.position.map, 'LittlerootTown_MaysHouse_1F');
  assert.deepEqual(pose(g.state.position), [2, 8, 'right'], 'the arrival is the reference warp-arrival cell');
  assert.equal(g.doorDirector.hidden, false, 'and the player is visible again on arrival');
  valid(s);
});

test('Leaving a house closes the door behind the player without hiding him', async () => {
  const s = doorSession(), g = s.game;
  await step(s, 'up');
  assert.equal(g.state.position.map, 'LittlerootTown_MaysHouse_1F');
  // The browser render loop samples the door every frame; a test has to ask for it.
  const shown = [], wait = g.timeline.wait.bind(g.timeline);
  g.timeline.wait = async (ms) => {
    await wait(ms);
    const frame = g.doorDirector.sample(g.timeline.now());
    if (frame?.top) shown.push(frame);
  };

  await step(s, 'down');

  assert.equal(g.state.position.map, 'LittlerootTown');
  assert.deepEqual(pose(g.state.position), [14, 9, 'down'], 'the mat is the arrival cell, not the solid door tile');
  // OldaleTown_BrendansHouse_1F style indoor doors are arrow warps, so no exit animation
  // there; this one is the animated Littleroot door the player just came out of.
  assert(shown.length, 'the exit door was drawn');
  assert.equal(shown[0].map, 'LittlerootTown');
  assert.equal(shown[0].y, 8, 'on the doorway above the player, never on his own cell');
  assert(shown[0].top, 'starting from the fully open frame the reference sets on exit');
  assert.equal(g.doorDirector.hidden, false, 'Task_ExitDoor never hides the player');
  valid(s);
});

test('The sliding door cue resolves to the installed render and falls back when absent', () => {
  const installed = new Map([
    ["emerald-audio:se_sliding_door", { kind: "sound" }],
    ["emerald-audio:se_door", { kind: "sound" }],
  ]);
  assert.equal(emeraldDoorSound("emerald:slidingDoor", installed), "emerald-audio:se_sliding_door");
  // The shipped pack renders SE_SLIDING_DOOR, so the fallback is the degraded path only.
  assert.equal(emeraldDoorSound("emerald:slidingDoor", new Map()), "emerald:door");
  assert.equal(
    emeraldDoorSound("emerald:slidingDoor", new Map([["emerald-audio:se_sliding_door", { kind: "music" }]])),
    "emerald:door",
    'a non-sound cue under that id is not usable',
  );
  // Every other cue id passes straight through.
  for (const id of ["emerald:door", "emerald:confirm", "emerald-audio:se_exit"])
    assert.equal(emeraldDoorSound(id, installed), id);
});

test('A sliding door and a swinging door resolve to their own cue, and a closed route does not animate', async () => {
  const s = doorSession(), g = s.game;
  const sounds = [];
  g.ui.sound = (id) => sounds.push(id);
  // OldaleTown's PokéMart door is METATILE_General_Door_PokeMart, a sliding door.
  assert.equal(DOOR_ANIMATIONS[65].sound, 'sliding');
  const warp = createDoorWarp({ director: g.doorDirector, sound: (id) => sounds.push(id) });
  assert(warp.enter({ map: 'OldaleTown', direction: 'up', door: { x: 14, y: 6 } }));
  assert.deepEqual(sounds, ['emerald:slidingDoor'], 'the sliding metatile asks for the sliding cue');
  // East/West approaches never open a door (field_control_avatar.c TryDoorWarp is north only).
  assert.equal(warp.enter({ map: 'OldaleTown', direction: 'right', door: { x: 14, y: 6 } }), null);
  // Walking through an arrow warp or an animated non-door tile stays a plain transition.
  assert.equal(warp.enter({ map: 'LittlerootTown', direction: 'up', door: { x: 10, y: 10 } }), null);
  assert.equal(sounds.length, 1);
  valid(s);
});
