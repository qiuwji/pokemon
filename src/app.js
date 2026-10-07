import { MapNameDOM } from "./adapters/map-name-dom.js";
import { emeraldBattleCues } from "./packs/emerald/battle-audio.js";
import { PixelDisplay } from "./adapters/pixel-display.js";
import { emeraldTransitionPatterns } from "./packs/emerald/battle-transition-canvas.js";
import { loadContent } from "./adapters/content-loader.js";
import { loadPluginCatalog } from "./adapters/plugin-loader.js";
import { createPluginManager } from "./adapters/plugin-manager-dom.js";
import {
  readPluginSettings,
  startPlugins,
} from "./adapters/plugin-settings.js";
import { emeraldFieldPriority } from "./packs/emerald/field-layers.js";
import { TransitionPatterns } from "./presentation/transition-patterns.js";
import {
  createEmeraldAudio,
  emeraldMusic,
  emeraldBattleSound,
  emeraldDoorSound,
} from "./packs/emerald/audio-library.js";
import { SceneDirector } from "./presentation/scene-director.js";
import { SceneDOM } from "./adapters/scene-dom.js";
import { InteractionDOM } from "./adapters/interaction-dom.js";
import { createEmeraldSceneDefinitions } from "./packs/emerald/presentation-scenes.js";
import { createEmeraldCommandFacade } from "./packs/emerald/command-facade.js";
import { createEmeraldPlugins } from "./packs/emerald/extensions.js";
import { attachEmeraldExtensions } from "./packs/emerald/extension-ports.js";
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
import {
  createEmeraldPresentation,
  emeraldBallResource,
} from "./packs/emerald/animations.js";
import {
  ANIMATION_PROFILES,
  emeraldMoveProfile,
} from "./packs/emerald/animation-profiles.js";
import { EMERALD_BATTLE_INTRO } from "./packs/emerald/battle-intro.js";
import { emeraldBattleLayout, EMERALD_BATTLE_VIEWPORT } from "./packs/emerald/battle-presentation.js";
import { emeraldReflectionSurface, emeraldReflectionResource, emeraldReflectionScale, emeraldReflectionColumns } from "./packs/emerald/field-reflections.js";
import { EMERALD_BATTLE_BACKGROUNDS } from "./packs/emerald/battle-backgrounds.js";
import { emeraldTypeColor } from "./packs/emerald/battle-palette.js";

// Composition root: chooses a content pack, adapters and services; no gameplay rules.
const $ = (id) => document.getElementById(id);
async function boot() {
  let input,
    pluginManager,
    game = null;
  try {
    const base = assertPackContent(
      await loadContent(new URL("./content/manifest.json", import.meta.url)),
    );
    const parameters = new URLSearchParams(location.search);
    const environment = parameters.get("e2e") === "1" ? "test" : "production";
    const catalogURL = new URL("./plugins/catalog.json", import.meta.url);
    const response = await fetch(catalogURL);
    if (!response.ok) throw new Error("Plugin catalog unavailable");
    const launchCatalog = await response.json();
    pluginManager = createPluginManager({
      document,
      storage: localStorage,
      catalog: launchCatalog,
      parameters,
      environment,
      beforeOpen: () => input?.clear(),
      afterClose: () => input?.clear(),
      restart: (entries) => {
        game?.save();
        const url = new URL(location.href);
        url.searchParams.delete("plugins");
        url.searchParams.delete("disable-plugins");
        for (const entry of entries)
          url.searchParams.delete(entry.flag || entry.id);
        location.assign(url.href);
      },
    });
    const plugins = await loadPluginCatalog({
      url: catalogURL,
      manifest: launchCatalog,
      selection: readPluginSettings(localStorage),
      parameters,
      content: base,
      environment,
    });
    const { host, catalog, db } = createEmeraldPlugins(
      base,
      plugins,
      console.error,
    );
    const assets = await loadAssets(db);
    const reducedMotion = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeline = new Timeline(),
      camera = new CameraRig(timeline, {
        baseFocus: (player) => game?.cameraFocus(player) || player,
      }),
      presentation = createEmeraldPresentation({
        host,
        onError: console.error,
        typeColors: emeraldTypeColor,
      }),
      renderer = new Renderer($("game"), db, assets, {
        projection: (size, now) => game?.cameraProjection(size, now) || null,
        cameraConfiguration: () =>
          game?.cameraConfiguration() || { columns: 20, rows: 14, zoom: 1 },
        environmentLayers: () => game?.environmentFrames() || [],
        objectTransforms: (now) => sceneDirector.objectTransforms(now),
        appearanceView: (target, context) =>
          game?.appearanceFrame(target, context) || null,
        movementPresentation: () =>
          catalog.movement[game?.state.movement.mode]?.presentation || {},
        fieldPriority: emeraldFieldPriority,
        reflectionSurface: emeraldReflectionSurface,
        reflectionResource: emeraldReflectionResource,
        reflectionScale: emeraldReflectionScale,
        reflectionColumns: emeraldReflectionColumns,
        travelActor: PACK.travelActor,
        cameraRig: camera,
        environment: (map, now, mapId) => ({
          fieldEffects: game?.fieldEffectView(),
          weather: game?.weatherView(mapId).visual || null,
          hour: game?.timeView().initialized ? game.timeView().hour : 12,
        }),
        reducedMotion,
        presentation,
        battleBackgrounds: EMERALD_BATTLE_BACKGROUNDS,
      });
    const pixelDisplay = new PixelDisplay($("game"), (width, height) =>
      renderer.resizeSurface(width, height),
    );
    const transitions = new TransitionController(timeline, { reducedMotion });
    const audio = new AudioAdapter({
      cues: createEmeraldAudio(host),
      onError: console.error,
    });
    // Decode short input/capture cues before the first gesture; never block boot on audio.
    void audio
      .preload([
        "emerald:confirm",
        "emerald:ball.throw",
        "emerald:ball.shake",
        "emerald:ball.open",
      ])
      .catch(console.error);
    const detachAudio = host.events.on("core:audio-request", ({ payload }) =>
      audio.play(payload.id),
    );
    const audioVisibility = () => audio.setSuspended(document.hidden);
    document.addEventListener("visibilitychange", audioVisibility);
    audioVisibility();
    const director = new BattleDirector(timeline, {
      profiles: ANIMATION_PROFILES,
      registry: presentation,
      cuePlan: emeraldBattleCues,
      ballResource: emeraldBallResource,
      resolveMessage: (event) => presentation.resolveMessage(event),
      intro: EMERALD_BATTLE_INTRO,
      layout: emeraldBattleLayout,
      viewport: EMERALD_BATTLE_VIEWPORT,
      profileFor: emeraldMoveProfile,
      typeColors: emeraldTypeColor,
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
        onError: console.error,
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
      asset: (id) => db.resources?.[id + "-front"] || `generated/assets/${id}-front.png`,
    });
    const patterns = new TransitionPatterns();
    for (const [id, draw] of Object.entries(emeraldTransitionPatterns(assets)))
      patterns.register(id, draw);
    for (const [id, definition] of host.transitionPatterns)
      patterns.register(id, definition.draw);
    const overlay = new TransitionDOM($("transition"), {
      patterns,
      onError: console.error,
    });
    const mapName = new MapNameDOM({
      element: $("scene-name"),
      schedule: setTimeout.bind(window),
      cancel: clearTimeout.bind(window),
    });
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
        mapName.show(title, db.maps[id]);
      },
    });
    const { bus, interactions } = attachEmeraldExtensions(adventure, host);
    const interactionInput = {
      active: () => interactions.active(),
      declares: (action) => interactions.declares(action),
      set: (action, active) => interactions.input(action, active),
      cancel: () => interactions.cancel(),
      clear: () => interactions.clearInput(),
    };
    const interactionLayer = new InteractionDOM({
      canvas: $("interaction-layer"),
      assets,
      onError: console.error,
    });
    game = createEmeraldCommandFacade(adventure, bus);
    const ui = createEmeraldInterface(game, {
      sound: (id) => audio.play(emeraldDoorSound(id, audio.cues)),
      extensionAssets: assets,
      audioSettings: {
        enabled: () => audio.enabled,
        setEnabled: (value) => {
          audio.enabled = value;
          $("sound").textContent = value ? "♫" : "♪";
          $("sound").ariaLabel = value ? "关闭音乐与音效" : "开启音乐与音效";
        },
      },
    });
    game.attachUI(ui);
    // A rejected save silently starts a new adventure; keep the reason visible instead of a fleeting toast.
    if (adventure.saveWarning)
      $("save-status").textContent = adventure.saveWarning;
    game.attachSound((cue) => audio.play(cue));
    const startupIssues = await startPlugins(plugins, bus);
    if (startupIssues.length) ui.toast(startupIssues.join("；"));
    if (parameters.get("control") === "1") void ui.connectControl();
    input = new BrowserInput({
      game,
      ui,
      externalBlocked: () => pluginManager.active,
      interactionInput,
    });
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
    $("touch-a").onclick = () => {
      if (!interactionInput.active()) return ui.confirm();
      if (input.route("confirm", "touch:a", true)) {
        input.route("confirm", "touch:a", false);
        return;
      }
      if (!interactions.declares("confirm")) return;
      interactions.input("confirm", true);
      interactions.input("confirm", false);
    };
    $("touch-b").onclick = () =>
      interactionInput.active() ? interactions.cancel() : ui.back();
    $("dialogue").onclick = () => ui.nextDialogue();
    $("game").onclick = () => {
      $("game").focus({ preventScroll: true });
      if (ui.dialog) ui.nextDialogue();
    };
    document.addEventListener("visibilitychange", () => {
      game.pausePlayTime();
      // Freeze the session clock while hidden and rebase it on return.
      if (document.hidden) interactions.pauseAll();
      else interactions.resumeAll();
    });
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
        if (interactions.active()) {
          try {
            interactions.advance(now);
            const view = interactions.view();
            interactionLayer.render(view.frame);
          } catch (error) {
            console.error(error);
            interactionLayer.clear();
          }
        } else {
          interactionLayer.clear();
          audio.setMusic(
          emeraldMusic(
            {
              battle: game.battleMusicContext(),
              storyMusic: game.storyMusic,
              flags: game.state.flags,
              map: { ...game.world.map, id: game.state.position.map },
            },
            audio.cues,
          ),
        );
        input.tick();
        const visible = renderer.visibleMaps(game.state.position, now);
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
            door: game.doorDirector?.sample(now) || null,
          });
        sceneOverlay.render(sceneDirector.sample(now));
        overlay.render(transitions.sample(now));
        growthOverlay.render(game.growthDirector.sample(now));
          ui.extensions?.render(now, {
            mode: game.battle ? "battle" : "field",
            position: { ...game.state.position },
          });
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    window.addEventListener(
      "pagehide",
      () => {
        pixelDisplay.dispose();
        detachAudio();
        document.removeEventListener("visibilitychange", audioVisibility);
        audio.dispose();
        ui.disposeDialogue();
        ui.disposeModalResources();
        ui.extensions?.dispose();
      },
      { once: true },
    );
  } catch (error) {
    $("loading").innerHTML = "<p>游戏未能载入，请刷新页面重试。</p>";
    console.error(error);
  }
}
boot();
