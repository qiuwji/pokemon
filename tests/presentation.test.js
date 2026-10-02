import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { BattleSession } from "../dist/engine/battle-session.js";
import { FieldSession } from "../dist/engine/field-session.js";
import { SceneGraph, GridMotion } from "../dist/engine/motion.js";
import { CommandRunner } from "../dist/engine/commands.js";
import { validateContent } from "../dist/engine/content.js";
import { Battle } from "../dist/engine/battle.js";
import { Random, createMonster } from "../dist/engine/model.js";
import { usePotion, evolveMonster } from "../dist/engine/party.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
const db = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
function manualClock() {
  let time = 0;
  const waits = [];
  const timeline = new Timeline({
    now: () => time,
    wait: (ms) =>
      new Promise((resolve) => waits.push({ at: time + ms, resolve })),
  });
  return {
    timeline,
    async advance(ms) {
      time += ms;
      for (const w of [...waits])
        if (w.at <= time) {
          waits.splice(waits.indexOf(w), 1);
          w.resolve();
        }
      await new Promise(setImmediate);
    },
    waits,
  };
}
function view(hp = 20) {
  return {
    player: { species: "mudkip", hp, stats: { hp: 20 } },
    enemy: { species: "poochyena", hp: 12, stats: { hp: 12 } },
  };
}

test("Scene commit occurs at full coverage exactly once; duplicate transition is refused", async () => {
  const clock = manualClock(),
    transition = new TransitionController(clock.timeline);
  let commits = 0;
  const job = transition.run("door", () => {
    assert.equal(transition.sample().opacity, 1);
    commits++;
  });
  assert(transition.busy);
  assert.equal(await transition.run("door", () => commits++), false);
  await clock.advance(110);
  assert.equal(transition.sample().opacity, 0.5);
  assert.equal(commits, 0);
  await clock.advance(110);
  assert.equal(commits, 0);
  assert(transition.sample().covered);
  await clock.advance(32);
  assert.equal(commits, 1);
  await clock.advance(96);
  await clock.advance(220);
  await job;
  assert(!transition.busy);
});
test("Transition failures release the input lock", async () => {
  const timeline = new Timeline({ now: () => 0, wait: async () => {} }),
    transition = new TransitionController(timeline);
  await assert.rejects(
    transition.run("door", () => {
      throw new Error("failed");
    }),
  );
  assert(!transition.busy);
});
test("HP interpolation is visual only; a zero-HP actor remains visible until faint finishes", async () => {
  const clock = manualClock(),
    director = new BattleDirector(clock.timeline);
  director.reset(view());
  const target = view(0),
    event = { kind: "hurt", side: 0, ...target };
  const job = director.play(event);
  await clock.advance(260);
  assert.equal(director.sample().view.player.hp, 10);
  assert.equal(target.player.hp, 0);
  assert.equal(director.sample().actors[0].opacity, 1);
  await clock.advance(390);
  await job;
  const faint = director.play({ kind: "faint", side: 0, ...target });
  await clock.advance(325);
  assert.equal(director.sample().actors[0].opacity, 0.5);
  assert(director.sample().actors[0].y > 0);
  await clock.advance(325);
  await faint;
  assert.equal(director.sample().actors[0].opacity, 0);
});
test("Capture shakes follow domain result; failed capture restores opponent and successful capture seals ball", async () => {
  for (const caught of [false, true]) {
    const clock = manualClock(),
      director = new BattleDirector(clock.timeline);
    director.reset(view());
    let job = director.play({ kind: "ball", ...view() });
    await clock.advance(850);
    await job;
    assert.equal(director.sample().actors[1].opacity, 0);
    job = director.play({ kind: "capture", caught, shakes: 2, ...view() });
    await clock.advance(1340);
    assert.equal(director.sample().ball !== null, caught);
    assert(
      caught
        ? director.sample().actors[1].opacity === 0
        : director.sample().actors[1].opacity > 0 &&
            director.sample().actors[1].opacity < 1,
    );
    await clock.advance(200);
    await job;
    assert.equal(director.sample().actors[1].opacity, caught ? 0 : 1);
  }
});
test("Combat session rejects repeated actions while presenting the previous turn", async () => {
  const clock = manualClock(),
    director = new BattleDirector(clock.timeline),
    transition = new TransitionController(clock.timeline);
  let calculations = 0;
  const session = new BattleSession({ director, transitions: transition });
  session.battle = {
    act: () => {
      calculations++;
      return [{ kind: "text", ...view() }];
    },
    ended: false,
    decisions: { required: () => ["home:0"] },
  };
  director.reset(view());
  const job = session.act({ kind: "move", index: 0 });
  assert.equal(await session.act({ kind: "move", index: 0 }), false);
  assert.equal(calculations, 1);
  await clock.advance(550);
  await job;
  assert(!session.busy);
});
test("A different tiny content pack reuses the field session without Emerald names or DOM", async () => {
  const map = () => ({
    width: 4,
    height: 4,
    blocks: Array(16).fill(0),
    behavior: Array(16).fill(0),
    connections: [],
    npcs: [],
    signs: [],
    warps: [],
  });
  const maps = { Meadow: map(), Cabin: map() };
  maps.Meadow.warps = [
    { x: 2, y: 1, dest_map: "MAP_CABIN", dest_warp_id: "0" },
  ];
  maps.Cabin.warps = [
    { x: 2, y: 2, dest_map: "MAP_MEADOW", dest_warp_id: "0" },
  ];
  const clock = manualClock(),
    position = { map: "Meadow", x: 1, y: 1, dir: "right" },
    motion = new GridMotion(new SceneGraph(maps));
  const transition = new TransitionController(clock.timeline);
  let steps = 0;
  const field = new FieldSession({
    maps,
    position,
    motion,
    transitions: transition,
    now: clock.timeline.now,
    objects: () => [],
    onStep: () => steps++,
  });
  assert(field.move("right"));
  assert.equal(position.map, "Meadow");
  assert.equal(steps, 0);
  await clock.advance(160);
  field.tick(160);
  assert(transition.busy);
  assert.equal(position.map, "Meadow");
  assert(!field.move("right"));
  await clock.advance(220);
  await clock.advance(32);
  assert.equal(position.map, "Cabin");
  assert.equal(steps, 0);
  await clock.advance(96);
  await clock.advance(220);
  assert.equal(steps, 1);
  assert(!field.busy);
});
test("Story commands await dialogue before applying later rewards; unknown commands fail explicitly", async () => {
  const order = [];
  let finish;
  const runner = new CommandRunner({
    dialog: () =>
      new Promise((resolve) => {
        finish = resolve;
        order.push("dialog");
      }),
    grant: () => order.push("grant"),
  });
  const job = runner.run([{ type: "dialog" }, { type: "grant" }]);
  assert.deepEqual(order, ["dialog"]);
  finish();
  await job;
  assert.deepEqual(order, ["dialog", "grant"]);
  await assert.rejects(runner.run([{ type: "unknown" }]), /Unknown/);
});
test("Reduced motion removes shaking while preserving HP timing and blackout commit", async () => {
  const clock = manualClock(),
    director = new BattleDirector(clock.timeline, {
      reducedMotion: () => true,
    });
  director.reset(view());
  const job = director.play({ kind: "hurt", side: 0, ...view(0) });
  await clock.advance(96);
  const frame = director.sample();
  assert.equal(frame.actors[0].x, 0);
  assert(!frame.actors[0].flash);
  assert.equal(frame.view.player.hp, 10);
  await clock.advance(144);
  await job;
});
test("Content contract rejects missing grid tiles, invalid learnsets and dimensions", () => {
  assert.deepEqual(validateContent(db), []);
  const bad = structuredClone(db);
  bad.maps.Route101.blocks.pop();
  bad.species.mudkip.learnset.push({ level: 2, move: "missing" });
  assert(validateContent(bad).some((x) => x === "maps.Route101.blocks"));
  assert(validateContent(bad).some((x) => x.includes("learnset.missing")));
});
test("Battle events expose semantic animation metadata and immutable health snapshots", () => {
  const rng = new Random(73),
    party = [createMonster("mudkip", 5, db, rng)],
    enemy = createMonster("poochyena", 2, db, rng);
  const battle = new Battle({
    party,
    enemy,
    db,
    rng,
    bag: { potion: 1, pokeball: 1 },
  });
  const events = battle.act({ kind: "move", index: 0 }),
    move = events.find((e) => e.kind === "move" && e.actorUid === party[0].uid);
  assert.equal(move.move.id, "tackle");
  assert.equal(move.move.type, "normal");
  const away = move.combatants.find(
    (c) => c.seatId === move.targetSeat,
  ).monster;
  const snapshot = away.hp;
  enemy.hp = 0;
  assert.equal(away.hp, snapshot);
});
test("Party commands reject invalid use and evolution never revives a fainted member", () => {
  const rng = new Random(1),
    mon = createMonster("mudkip", 16, db, rng),
    state = { party: [mon], bag: { potion: 1 } };
  assert.equal(usePotion(state, 0), false);
  mon.hp = 0;
  assert(evolveMonster(mon, db));
  assert.equal(mon.hp, 0);
  assert.equal(state.bag.potion, 1);
});
test("Pack application rejects out-of-context inventory commands and preserves compatible saves", () => {
  const clock = manualClock(),
    transitions = new TransitionController(clock.timeline),
    director = new BattleDirector(clock.timeline);
  const store = new Map(),
    storage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
    };
  const game = new EmeraldAdventure({
    db,
    storage,
    motion: new GridMotion(new SceneGraph(db.maps)),
    director,
    transitions,
    timeline: clock.timeline,
  });
  game.state.party = [createMonster("mudkip", 5, db, game.rng)];
  game.state.flags.rescued = true;
  game.state.flags.starter = "mudkip";
  assert.equal(game.buyItem("pokeball"), false);
  const doc = game.exportDocument();
  game.state.money = 0;
  game.loadDocument(doc);
  assert.equal(game.state.money, 3000);
  assert.notEqual(game.state, doc.state);
  game.combat.battle = {};
  assert.equal(game.usePotion(0), false);
  assert.equal(game.setLead(0), false);
  assert.throws(() => game.loadDocument(doc));
});
test("Versioned storage migrates older saves without rewriting source and rejects future versions", async () => {
  const { SaveStore } = await import("../dist/engine/save-store.js");
  const raw = { version: 1, savedAt: 100, state: { name: "player" } };
  const storage = {
    getItem: () => JSON.stringify(raw),
    setItem: () => {
      throw new Error("Should not write during read");
    },
  };
  const store = new SaveStore(storage, "demo", (s) => s.coins === 10, 2, {
    migrations: { 1: (s) => ({ ...s, coins: 10 }) },
  });
  assert.equal(store.load().state.coins, 10);
  assert.equal(raw.state.coins, undefined);
  assert.equal(store.decode({ version: 3, state: { coins: 10 } }), null);
});
test("Completed combat returns at dialogue boundary without waiting for the next user confirmation", async () => {
  const clock = manualClock(),
    transitions = new TransitionController(clock.timeline),
    director = new BattleDirector(clock.timeline),
    storage = { getItem: () => null, setItem: () => {} };
  const game = new EmeraldAdventure({
    db,
    storage,
    motion: new GridMotion(new SceneGraph(db.maps)),
    director,
    transitions,
    timeline: clock.timeline,
  });
  game.state.party = [createMonster("mudkip", 5, db, game.rng)];
  let acknowledge;
  const ui = {
    dialog: null,
    resetBattleMenu() {},
    drawBattleHUD() {},
    updateSide() {},
    checkGrowth() {},
    toast() {},
    say() {
      this.dialog = {};
      return new Promise((resolve) => {
        acknowledge = () => {
          this.dialog = null;
          resolve();
        };
      });
    },
  };
  game.attachUI(ui);
  game.combat.battle = {
    ended: true,
    result: "caught",
    enemy: createMonster("wurmple", 3, db, game.rng),
    act: () => [],
  };
  director.reset(view());
  const turn = game.combat.act({ kind: "ball" });
  await clock.advance(220);
  await clock.advance(32);
  await clock.advance(96);
  await clock.advance(220);
  assert.equal(await turn, true);
  assert(ui.dialog);
  assert(game.storyBusy);
  assert(!game.combat.busy);
  assert.equal(game.state.party.length, 2);
  acknowledge();
  await new Promise(setImmediate);
  assert(!game.storyBusy);
});
test("Missed moves identify the failed hit so presentation does not draw an impact", () => {
  const rng = new Random(1),
    party = [createMonster("mudkip", 5, db, rng)],
    enemy = createMonster("poochyena", 2, db, rng),
    battle = new Battle({
      party,
      enemy,
      db,
      rng: { next: () => 0.999, int: (max) => max - 1 },
      bag: {},
    });
  battle.executeMove(0, 0);
  const move = battle.events.find((e) => e.kind === "move");
  assert.equal(move.move.successful, false);
  assert(!battle.events.some((e) => e.kind === "hurt"));
  const clock = manualClock(),
    director = new BattleDirector(clock.timeline);
  director.reset(view());
  director.stage(move);
  assert.equal(director.sample().effect.successful, false);
});
