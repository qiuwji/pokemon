import { emeraldStartMenu } from "../../packs/emerald/start-menu.js";
import { listNavigation } from "./ui/native-view.js";
import { createRegionMapInterface } from "./region-map-interface.js";
import { createTrainerInterface } from "./trainer-interface.js";
import { createOptionsInterface } from "./options-interface.js";
import { SpriteCanvas } from "../../adapters/sprite-canvas.js";
import { createDialogueHistoryInterface } from "./dialogue-history-interface.js";
import { createFacilityInterface } from "./facility-interface.js";
import { createCropInterface } from "./crop-interface.js";
import { createTimeInterface } from "./time-interface.js";
import { createPresentationInterface } from "./presentation-interface.js";
import { createUIShell } from "./ui-shell.js";
import { createNewGameInterface } from "./new-game-interface.js";
import { createLaunchInterface } from "./launch-interface.js";
import { FrameSceneDOM } from "../../adapters/frame-scene-dom.js";
import { ExtensionDOM } from "../../adapters/extension-dom.js";
import { createPartyInterface } from "./party-interface.js";
import { createBagInterface } from "./bag-interface.js";
import { createDexInterface } from "./dex-interface.js";
import { createShopInterface } from "./shop-interface.js";
import { createBoxInterface } from "./box-interface.js";
import { createSaveInterface } from "./save-interface.js";
import { createHelpInterface } from "./help-interface.js";
import { createStarterInterface } from "./starter-interface.js";
import { createGrowthInterface } from "./growth-interface.js";
import { createMovementInterface } from "./movement-interface.js";
import { createNetworkInterface } from "./network-interface.js";
import { createBattleInterface } from "./battle-interface.js";
/** Composition only: shared shell, page factories and one menu entry. */
export function createEmeraldInterface(
  game,
  {
    document: doc = document,
    sound = () => {},
    extensionAssets = {},
    dialogueClock = null,
    audioSettings = null,
    playFieldSequence = null,
    createFrameScene = options => new FrameSceneDOM(options),
    setLaunchMusic,
    titleFrames,
  } = {},
) {
  const shell = createUIShell(game, { document: doc, sound, dialogueClock, playFieldSequence });
  const { modal, root } = shell;
  const deps = {
    ...shell,
    document: doc,
    frameScene: (options = {}) => createFrameScene({ document: doc, host: doc.getElementById("screen"), width: 240, height: 160,
      assets: extensionAssets, resources: game.db.resources, timeline: game.timeline, clock: shell.frameClock, reducedMotion: shell.reducedMotion, ...options }),
    mountSprite: (canvas, clip) => {
      const player = new SpriteCanvas({
        canvas,
        assets: extensionAssets,
        clock: shell.frameClock,
        reducedMotion: shell.reducedMotion,
        onError: (error) => shell.toast(error.message),
      });
      shell.ownModalResource(() => player.stop());
      player.play(clip);
      return player;
    },
    showMenu: () => showMenu(),
    showRegionMap: (...args) => shell.showRegionMap(...args),
    showParty: (...args) => shell.showParty(...args),
    showBag: (...args) => shell.showBag(...args),
    demonstrateBagItem: (...args) => bagUI.demonstrateBagItem(...args),
    showMonster: (...args) => shell.showMonster(...args),
    showPartyFieldMove: (...args) => shell.showPartyFieldMove(...args),
    showEvolutionOptions: (index) => shell.showEvolutionOptions(index),
    checkGrowth: () => shell.checkGrowth(),
  };
  const optionsUI = createOptionsInterface({
      ...deps,
      showExtras: () => showExtras(),
      audioSettings,
    }),
    trainerUI = createTrainerInterface(game, deps),
    historyUI = createDialogueHistoryInterface(game, deps),
    partyUI = createPartyInterface(game, deps),
    bagUI = createBagInterface(game, deps),
    dexUI = createDexInterface(game, deps),
    saveUI = createSaveInterface(game, deps),
    timeUI = createTimeInterface(game, deps),
    facilityUI = createFacilityInterface(game, deps),
    cropUI = createCropInterface(game, deps),
    boxUI = createBoxInterface(game, deps),
    shopUI = createShopInterface(game, deps),
    helpUI = createHelpInterface(game, deps),
    starterUI = createStarterInterface(game, deps),
    growthUI = createGrowthInterface(game, deps),
    mapUI = createRegionMapInterface(game, deps),
    movementUI = createMovementInterface(game, deps),
    networkUI = createNetworkInterface(game, deps),
    presentationUI = createPresentationInterface(game, deps),
    battleUI = createBattleInterface(game, deps),
    newGameUI = createNewGameInterface(deps),
    launchUI = createLaunchInterface(game, { ...deps, showOptions: optionsUI.showOptions, setLaunchMusic, titleFrames });
  Object.assign(
    shell,
    optionsUI,
    trainerUI,
    historyUI,
    partyUI,
    bagUI,
    dexUI,
    saveUI,
    timeUI,
    facilityUI,
    cropUI,
    boxUI,
    shopUI,
    helpUI,
    starterUI,
    growthUI,
    movementUI,
    mapUI,
    networkUI,
    presentationUI,
    newGameUI,
    launchUI,
    {
      showMenu,
      demonstrateBattleAction: (...args) => battleUI.demonstrate(...args),
      drawBattleHUD: (message) => battleUI.draw(message),
      refreshBattle: (frame) => battleUI.refresh(frame),
      confirmBattle: () => battleUI.confirm(),
      resetBattleMenu: () => battleUI.reset(),
      navigateBattle: (dir) => battleUI.navigate(dir),
    },
  );
  shell.connect({
    showMonster: shell.showMonster,
    checkGrowth: shell.checkGrowth,
    backBattle: () => battleUI.back(),
    confirmBattle: () => battleUI.confirm(),
  });
  if (game.plugins)
    shell.extensions = new ExtensionDOM({
      host: game.plugins,
      shell,
      document: doc,
      resources: game.db.resources,
      assets: extensionAssets,
      now: game.timeline.now,
    });
  let menuSelection = null;
  function showMenu() {
    if (game.busy || game.battle || shell.dialog || shell.saveBlocked) return;
    if (game.facilityActive) {
      shell.showFacility();
      return;
    }
    const entries = emeraldStartMenu(game.state);
    modal("冒险菜单", `<div class="start-menu">${entries.map(entry =>
      `<button class="menu-tile" data-page="${entry.id}">${shell.escapeHTML(entry.label)}</button>`).join("")}</div>`, {
      type: "menu", close: false,
      navigate: direction => listNavigation(root, doc, ".start-menu button", direction),
    });
    const actions = pageActions();
    root.querySelectorAll("button[data-page]").forEach(button => {
      button.onfocus = () => { menuSelection = button.dataset.page; };
      button.onclick = actions[button.dataset.page];
    });
    if (menuSelection) root.querySelector(`button[data-page="${menuSelection}"]`)?.focus();
  }

  function pageActions() {
    return {
      close: shell.closeModal,
      map: () => shell.showRegionMap({ back: showMenu }),
      settings: optionsUI.showOptions,
      extensions: showExtras,
      trainer: trainerUI.showTrainer,
      party: () => shell.showParty(),
      bag: () => shell.showBag(),
      dex: shell.showDex,
      save: shell.showSave,
      clock: timeUI.showTime,
      box: shell.showBox,
      help: shell.showHelp,
      history: historyUI.showDialogueHistory,
      resume: () => {
        shell.closeModal();
        void game.resumeStory();
      },
      network: networkUI.showNetwork,
      facility: facilityUI.showFacility,
      presentation: presentationUI.showPresentation,
      movement: movementUI.showMovement,
      daycare: growthUI.showDaycare,
    };
  }
  function showExtras() {
    const labels = {
      map: "地图",
      movement: "旅行与移动",
      clock: "时钟",
      box: "电脑盒子",
      history: "对话记录",
      daycare: "育成研究",
      facility: "设施与活动",
      presentation: "场景演出",
      network: "扩展连接",
      help: "操作说明",
    };
    modal(
      "设置与扩展",
      `<div class="menu-grid">${game.state.story.session?.status === "ready" ? '<button class="menu-tile" data-page="resume">继续剧情</button>' : ""}${Object.entries(
        labels,
      )
        .map(
          ([id, label]) =>
            `<button class="menu-tile" data-page="${id}" ${id === "daycare" && !game.canUseDaycare() ? "disabled" : ""}>${label}</button>`,
        )
        .join("")}</div>`,
      { type: "extensions", back: optionsUI.showOptions },
    );
    game.ui?.extensions?.mountSlot(
      "menu",
      root.querySelector(".menu-grid"),
      {},
      showExtras,
    );
    const actions = pageActions();
    root
      .querySelectorAll("button[data-page]")
      .forEach((b) => (b.onclick = actions[b.dataset.page]));
  }
  return shell;
}
