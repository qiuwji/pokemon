import { createEmeraldCommandFacade } from "./packs/emerald/command-facade.js";
import { createEmeraldPlugins } from "./packs/emerald/extensions.js";
import { attachEmeraldExtensions } from "./packs/emerald/extension-ports.js";
import { companionCare } from "./plugins/companion-care.js";
import { createFieldJournal } from "./plugins/field-journal.js";
import { PACK } from "./packs/emerald/pack.js";
import { assertPackContent } from "./packs/emerald/content.js";
import { Renderer, loadAssets } from "./adapters/canvas-renderer.js";
import { BrowserInput } from "./adapters/browser-input.js";
import { registerGameTools } from "./adapters/browser-tools.js";
import { GrowthDOM } from "./adapters/growth-dom.js";
import { AudioAdapter } from "./adapters/audio.js";
import { Timeline, TransitionController } from "./engine/timeline.js";
import { CameraRig } from "./engine/camera.js";
import { BattleDirector } from "./presentation/battle-director.js";
import { TransitionDOM } from "./presentation/transition-dom.js";
import { EmeraldAdventure } from "./packs/emerald/adventure.js";
import { createEmeraldInterface } from "./packs/emerald/interface.js";
import { ANIMATION_PROFILES } from "./packs/emerald/story.js";

// Composition root: chooses a content pack, adapters and services; no gameplay rules.
const $ = (id) => document.getElementById(id);
async function boot() {
  try {
    const response = await fetch("content.json");
    if (!response.ok) throw new Error("内容未能载入");
    const base = assertPackContent(await response.json());
    const { host, catalog, db } = createEmeraldPlugins(
      base,
      [
        companionCare,
        createFieldJournal(base.maps.LittlerootTown_ProfessorBirchsLab),
      ],
      console.error,
    );
    const assets = await loadAssets(db);
    const timeline = new Timeline(),
      camera = new CameraRig(timeline),
      renderer = new Renderer($("game"), db, assets, {
        playerActors: PACK.playerActors,
        travelActor: PACK.travelActor,
        cameraRig: camera,
      });
    const reducedMotion = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitions = new TransitionController(timeline, { reducedMotion });
    const director = new BattleDirector(timeline, {
      profiles: ANIMATION_PROFILES,
      reducedMotion,
    });
    const growthOverlay = new GrowthDOM($("growth-animation"));
    const overlay = new TransitionDOM($("transition")),
      audio = new AudioAdapter();
    let input, sceneTimer;
    const adventure = new EmeraldAdventure({
      db,
      catalog,
      plugins: host,
      storage: localStorage,
      motion: renderer.motion,
      director,
      transitions,
      timeline,
      camera,
      reducedMotion,
      clearInput: () => input?.clear(),
      onSave: (time, loaded = false) =>
        ($("save-status").textContent = time
          ? loaded
            ? "已读取存档"
            : "已保存 · " +
              new Date(time).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })
          : "尚未存档"),
      onMap: (title, id) => {
        $("location").textContent = title;
        $("weather").textContent = db.maps[id].indoor ? "室内" : "晴朗 · 白天";
        $("scene-name").textContent = title;
        $("scene-name").classList.add("show");
        clearTimeout(sceneTimer);
        sceneTimer = setTimeout(
          () => $("scene-name").classList.remove("show"),
          2200,
        );
      },
    });
    const { bus } = attachEmeraldExtensions(adventure, host);
    const game = createEmeraldCommandFacade(adventure, bus);
    const ui = createEmeraldInterface(game, {
      tone: (...args) => audio.tone(...args),
      extensionAssets: assets,
    });
    game.attachUI(ui);
    input = new BrowserInput({ game, ui });
    $("loading").hidden = true;
    $("save").onclick = () => game.save(true);
    $("menu").onclick = () => ui.showMenu();
    $("help").onclick = () => {
      if (!game.busy && !game.battle && !ui.dialog) ui.showHelp();
    };
    $("party-open").onclick = () => {
      if (!game.busy && !game.battle && !ui.dialog) ui.showParty();
    };
    $("sound").onclick = () => {
      audio.enabled = !audio.enabled;
      $("sound").textContent = audio.enabled ? "♫" : "♪";
      $("sound").ariaLabel = audio.enabled ? "关闭音效" : "开启音效";
      audio.tone();
      ui.toast(audio.enabled ? "音效已开启。" : "音效已关闭。");
    };
    $("touch-a").onclick = () => ui.confirm();
    $("touch-b").onclick = () => ui.back();
    $("dialogue").onclick = () => ui.nextDialogue();
    $("game").onclick = () => {
      $("game").focus({ preventScroll: true });
      if (ui.dialog) ui.nextDialogue();
    };
    setInterval(() => {
      if (!document.hidden) game.advancePlayTime();
    }, 1000);
    await registerGameTools({
      inspect: () => game.inspect(),
      interact: () => game.interact(),
      chooseStarter: (species) => ui.chooseStarter(species),
      move: async (dir, steps) => {
        for (let i = 0; i < steps; i++) {
          if (game.battle || ui.blocked || game.storyBusy) break;
          await game.waitForMovement();
          if (!game.move(dir)) break;
          await game.waitForMovement();
        }
      },
      battleAction: async (action) => {
        if (!game.battle || game.busy || ui.blocked)
          throw new Error("Battle is not ready");
        await game.turn(action);
      },
    });
    function frame(now) {
      if (!document.hidden) {
        input.tick();
        const visible = renderer.graph.visible(
          game.state.position.map,
          renderer.cameraAt(game.state.position, now),
        );
        game.tick(now, visible);
        const battleFrame = director.sample(now);
        if (battleFrame) {
          renderer.battle(battleFrame);
          ui.refreshBattle(battleFrame);
        } else
          renderer.world(game.world, game.field.npcs, now, {
            emotes: [...game.fieldDirector.emotes.values()],
            movementMode: game.state.movement.mode,
            travel: game.travelDirector.sample(now),
          });
        overlay.render(transitions.sample(now));
        growthOverlay.render(game.growthDirector.sample(now));
        ui.extensions?.render(now, {
          mode: game.battle ? "battle" : "field",
          position: { ...game.state.position },
        });
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } catch (error) {
    $("loading").innerHTML = "<p>游戏未能载入，请刷新页面重试。</p>";
    console.error(error);
  }
}
boot();
