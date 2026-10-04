import { loadContentSync } from "../../tools/content-io.mjs";
import { SceneDirector } from "../../dist/presentation/scene-director.js";
import { createEmeraldSceneDefinitions } from "../../dist/packs/emerald/presentation-scenes.js";
import { createEmeraldPlugins } from "../../dist/packs/emerald/extensions.js";
import { attachEmeraldExtensions } from "../../dist/packs/emerald/extension-ports.js";
import { EmeraldAdventure } from "../../dist/packs/emerald/adventure.js";
import { createMonster } from "../../dist/engine/model.js";
import { Timeline, TransitionController } from "../../dist/engine/timeline.js";
import { BattleDirector } from "../../dist/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../../dist/engine/motion.js";
export { objectSchema } from "../../dist/engine/extensions/values.js";

export function manifest(id, setup, permissions = []) {
  return { id, setup, permissions, apiVersion: 1, version: "1.0.0", dataVersion: 1 };
}

/** Test arrangement only: production catalog, services and commands; no browser renderer. */
export function session(plugins = []) {
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
    storage: { getItem: id => saved.get(id) ?? null, setItem: (id, value) => saved.set(id, value) },
    wallNow: () => 1000,
  });
  game.attachUI({
    blocked: false, dialog: null,
    closeModal() {}, updateSide() {}, updateTime() {}, resetBattleMenu() {},
    drawBattleHUD() {}, announce() {}, checkGrowth() {}, showFacility() {}, toast() {},
    extensions: { refresh() {} },
    say: async (name, lines, _after, options) => { dialogs.push({ name, lines, ...(options ? { options } : {}) }); },
    choose: async (_name, _prompt, options) => options[0].id,
  });
  // Arrange an unlocked test scene, not an implementation of the original opening story.
  game.state.flags.rescued = true;
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
