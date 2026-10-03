import { emeraldFieldPriority } from "./packs/emerald/field-layers.js";
import { TransitionPatterns } from "./presentation/transition-patterns.js";
import {
  createEmeraldAudio,
  emeraldMusic,
  emeraldBattleSound,
} from "./packs/emerald/audio-library.js";
import { SceneDirector } from "./presentation/scene-director.js";
import { SceneDOM } from "./adapters/scene-dom.js";
import { createEmeraldSceneDefinitions } from "./packs/emerald/presentation-scenes.js";
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
import { createEmeraldPresentation } from "./packs/emerald/animations.js";
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
    const reducedMotion = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    let game = null;
    const timeline = new Timeline(),
      camera = new CameraRig(timeline),
      presentation = createEmeraldPresentation({
        host,
        onError: console.error,
      }),
      renderer = new Renderer($("game"), db, assets, {
        playerActors: PACK.playerActors,
        fieldPriority: emeraldFieldPriority,
        travelActor: PACK.travelActor,
        cameraRig: camera,
        environment: (map, now, mapId) => ({
          weather: game?.weatherView(mapId).visual || null,
          hour: game?.timeView().initialized ? game.timeView().hour : 12,
        }),
        reducedMotion,
        presentation,
      });
    const transitions = new TransitionController(timeline, { reducedMotion });
    const audio = new AudioAdapter({
      cues: createEmeraldAudio(host),
      onError: console.error,
    });
    const detachAudio = host.events.on("core:audio-request", ({ payload }) =>
      audio.play(payload.id),
    );
    const audioVisibility = () => audio.setSuspended(document.hidden);
    document.addEventListener("visibilitychange", audioVisibility);
    audioVisibility();
    const director = new BattleDirector(timeline, {
      profiles: ANIMATION_PROFILES,
      registry: presentation,
      onCue: (kind) => {
        const id = emeraldBattleSound(kind, audio.cues);
        if (id) audio.play(id);
      },
      reducedMotion,
    });
    const sceneDefinitions = createEmeraldSceneDefinitions(host),
      sceneDirector = new SceneDirector({
        timeline,
        definitions: sceneDefinitions,
        reducedMotion,
        onCue: (id) => {
          if (id) audio.play(id);
        },
      }),
      sceneOverlay = new SceneDOM($("scene-animation"), {
        definitions: sceneDefinitions,
        assets,
        onError: console.error,
      });
    const growthOverlay = new GrowthDOM($("growth-animation"), {
      asset: (id) => db.resources?.[id + "-front"] || `assets/${id}-front.png`,
    });
    const patterns = new TransitionPatterns();
    for (const [id, definition] of host.transitionPatterns)
      patterns.register(id, definition.draw);
    const overlay = new TransitionDOM($("transition"), {
      patterns,
      onError: console.error,
    });
    let input, sceneTimer;
    const adventure = new EmeraldAdventure({
      playActive: () => !document.hidden,
      db,
      catalog,
      plugins: host,
      storage: localStorage,
      motion: renderer.motion,
      director,
      sceneDirector,
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
        game?.ui?.updateWeather(game.weatherView(id));
        game?.ui?.updateTime(game.timeView());
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
    game = createEmeraldCommandFacade(adventure, bus);
    const ui = createEmeraldInterface(game, {
      sound: (id) => audio.play(id),
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
      $("sound").ariaLabel = audio.enabled
        ? "关闭音乐与音效"
        : "开启音乐与音效";
      audio.play("emerald:confirm");
      ui.toast(audio.enabled ? "音效已开启。" : "音效已关闭。");
    };
    $("touch-a").onclick = () => ui.confirm();
    $("touch-b").onclick = () => ui.back();
    $("dialogue").onclick = () => ui.nextDialogue();
    $("game").onclick = () => {
      $("game").focus({ preventScroll: true });
      if (ui.dialog) ui.nextDialogue();
    };
    document.addEventListener("visibilitychange", () => game.pausePlayTime());
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
        audio.setMusic(
          emeraldMusic(
            {
              battle: !!game.battle,
              map: { ...game.world.map, id: game.state.position.map },
            },
            audio.cues,
          ),
        );
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
            action: game.actionDirector.sample(now),
          });
        sceneOverlay.render(sceneDirector.sample(now));
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
    window.addEventListener(
      "pagehide",
      () => {
        detachAudio();
        document.removeEventListener("visibilitychange", audioVisibility);
        audio.dispose();
      },
      { once: true },
    );
  } catch (error) {
    $("loading").innerHTML = "<p>游戏未能载入，请刷新页面重试。</p>";
    console.error(error);
  }
}
boot();
