import { loadContentSync } from "../../tools/content-io.mjs";
import { SceneDirector } from "../../src/presentation/scene-director.js";
import { createEmeraldSceneDefinitions } from "../../src/packs/emerald/presentation-scenes.js";
import { createEmeraldPlugins } from "../../src/game/emerald/assembly/extensions.js";
import { attachEmeraldExtensions } from "../../src/game/emerald/commands/extension-ports.js";
import { EmeraldAdventure } from "../../src/game/emerald/adventure.js";
import { createMonster } from "../../src/engine/model.js";
import { Timeline, TransitionController } from "../../src/engine/timeline.js";
import { BattleDirector } from "../../src/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../../src/engine/motion.js";
export { objectSchema } from "../../src/engine/extensions/values.js";

export function manifest(id, setup, permissions = []) {
  return { id, setup, permissions, apiVersion: 1, version: "1.0.0", dataVersion: 1 };
}

/**
 * Test arrangement only: production catalog, services and commands; no browser renderer.
 * By default it arranges a mid-adventure session; pass { fresh: true } for a new-game state.
 */
export function session(plugins = [], { fresh = false, storage = null } = {}) {
  const base = loadContentSync();
  const { db, catalog, host } = createEmeraldPlugins(base, plugins);
  let frame = 0;
  const saved = new Map(), dialogs = [];
  const timeline = new Timeline({ now: () => frame, wait: async (ms) => { frame += ms; } });
  const game = new EmeraldAdventure({
    db, catalog, plugins: host, timeline,
    sceneDirector:new SceneDirector({timeline,definitions:createEmeraldSceneDefinitions(host)}),
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(db.maps)),
    storage: storage || { getItem: id => saved.get(id) ?? null, setItem: (id, value) => saved.set(id, value),
      removeItem: id => saved.delete(id), key: index => [...saved.keys()][index] ?? null, get length() { return saved.size; } },
    wallNow: () => 1000,
  });
  game.attachUI({
    blocked: false, dialog: null,
    closeModal() {}, updateSide() {}, updateTime() {}, resetBattleMenu() {},
    drawBattleHUD() {}, announce() {}, checkGrowth() {}, showFacility() {}, toast() {},
    extensions: { refresh() {} },
    say: async (name, lines, _after, options) => { dialogs.push({ name, lines, ...(options ? { options } : {}) }); },
    choose: async (_name, _prompt, options) => options[0].id,
    showNewGameIntroduction: async () => ({ gender: "male", name: "小悠" }),
  });
  // Arrange an unlocked test scene, not an implementation of the original opening story.
  game.state.flags.rescued = true;
  if (!fresh) {
    // The truck opening already happened; examples start mid-adventure in the town.
    game.state.flags.introDone = true;
    game.state.flags.introState = 7;
    game.state.flags.roomChecked = true;
    game.state.flags.tvWatched = true;
    game.state.flags.neighborMet = true;
    game.state.flags.playerConfigured = true;
    game.state.flags.runningShoes = true;
    game.state.flags.truckLeft = true;
    game.enter({ map: "LittlerootTown", x: 10, y: 10, dir: "up" });
  }
  const mon = createMonster("mudkip", 10, db, game.rng);
  game.state.party.push(mon);
  const { bus } = attachEmeraldExtensions(game, host);
  return {
    game, db, host, catalog, bus, mon, saved, dialogs,
    async settle() {
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setImmediate(resolve));
        if (!game.busy && !game.storyBusy) return;
      }
      throw new Error("Example did not settle; inspect the active story/command lock");
    },
  };
}
