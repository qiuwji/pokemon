import test from "node:test";
import assert from "node:assert/strict";
import { session } from "../tests/helpers/session.js";
import { audioPlugin } from "../generated/plugins/emerald-audio.js";
import { createEmeraldPresentation } from "../src/game/emerald/assembly/animations.js";
import { emeraldBattleLayout, EMERALD_BATTLE_VIEWPORT } from "../src/packs/emerald/battle-presentation.js";
import { emeraldBattleSong } from "../src/packs/emerald/audio-library.js";

function arrange() {
  const s = session([audioPlugin]), g = s.game;
  Object.assign(g.director, { registry: createEmeraldPresentation({ host: s.host }), layout: emeraldBattleLayout, viewport: EMERALD_BATTLE_VIEWPORT });
  s.mon.moves = [{ id: "pound", pp: 35 }];
  s.mon.stats.atk = 5000; s.mon.stats.spe = 5000;
  return s;
}

test("installed native entry and exit run through public commands, settle once, reveal the field and permit reentry", async () => {
  const s = arrange(), g = s.game, phases = [], transitions = [], music = [], wait = g.timeline.wait;
  g.timeline.wait = async ms => {
    const frame = g.director.sample(g.timeline.now() + ms / 2);
    if (frame?.view.introPhase) phases.push({ phase: frame.view.introPhase, back: frame.view.sendBack, sprites: frame.sprites });
    if (g.transitions.active?.kind === "battle-exit") {
      transitions.push({ phase: g.transitions.active.phase, battle: !!g.battle });
      if (g.battle) music.push(emeraldBattleSong(g.battleMusicContext()));
    }
    return wait(ms);
  };
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  assert(phases.some(p => p.phase === "slide" && p.sprites.some(s => s.resource.startsWith("battle-anim-entry_"))));
  assert(phases.some(p => p.phase === "send" && p.back === false));
  assert(phases.some(p => p.phase === "send" && p.back === true));
  const battle = g.battle, before = g.state.money;
  let turns = 0;
  while (g.battle && turns++ < 6) await s.bus.execute("core.battle.action", { kind: "move", index: 0 });
  await s.settle();
  assert.equal(battle.result, "win");
  assert.equal(g.battle, null);
  assert.equal(g.director.sample(), null);
  assert.equal(g.transitions.busy, false);
  assert.equal(s.mon.moves[0].pp, 35 - turns);
  assert(g.state.money > before);
  assert(music.every(id => id === "MUS_VICTORY_TRAINER"));
  assert(transitions.some(t => t.phase === "cover" && t.battle));
  assert(transitions.some(t => t.phase === "reveal" && !t.battle));
  const paid = g.state.money;
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  while (g.battle && turns++ < 12) await s.bus.execute("core.battle.action", { kind: "move", index: 0 });
  await s.settle();
  assert.equal(g.state.money, paid, "the trainer receipt prevents a duplicate reward");
});

test("native entry preparation failure releases the staged battle and can retry the same public encounter", async () => {
  const s = arrange(), g = s.game, registry = g.director.registry;
  g.director.registry = { eventAnimation: () => null, prepareSequence() { throw new Error("entry resource failed"); } };
  await assert.rejects(s.bus.execute("core.battle.start", { trainerId: "youngster" }), /entry resource failed/);
  assert.equal(g.battle, null); assert.equal(g.busy, false); assert.equal(g.transitions.busy, false);
  g.director.registry = registry;
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  assert(g.battle); assert.equal(g.busy, false);
});

test("challenge dialogue failure waits for parallel tray playback cleanup before releasing the public battle", async () => {
  const s = arrange(), g = s.game;
  g.ui.say = async () => { throw new Error("challenge page closed"); };
  await assert.rejects(s.bus.execute("core.battle.start", { trainerId: "youngster" }), /challenge page closed/);
  assert.equal(g.battle, null); assert.equal(g.director.sample(), null); assert.equal(g.busy, false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(g.director.heldFrame, null, "a late parallel completion cannot restore the cleared tray");
});

test("a real loss shows both whiteout pages in combat before blackout and releases the field continuation", async () => {
  const s = arrange(), g = s.game, pages = [], say = g.ui.say;
  s.mon.hp = 1; s.mon.stats.atk = 1; s.mon.stats.def = 1; s.mon.stats.spe = 1;
  g.ui.say = async (name, lines, ...args) => { pages.push({ lines, inBattle: !!g.battle }); return say(name, lines, ...args); };
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  const battle = g.battle;
  battle.enemy.moves = [{ id: "pound", pp: 35 }];
  await s.bus.execute("core.battle.action", { kind: "move", index: 0 });
  await s.settle();
  assert.equal(battle.result, "loss");
  assert(pages.some(page => page.inBattle && page.lines.length === 2 && page.lines[1].includes("眼前一片漆黑")));
  assert.equal(g.battle, null); assert.equal(g.busy, false); assert.equal(g.director.sample(), null);
});
