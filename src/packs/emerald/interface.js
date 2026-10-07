import { createTrainerInterface } from "./trainer-interface.js";
import { createOptionsInterface } from "./options-interface.js";
import { SpriteCanvas } from "../../adapters/sprite-canvas.js";
import { createDialogueHistoryInterface } from "./dialogue-history-interface.js";
import { createFacilityInterface } from "./facility-interface.js";
import { createCropInterface } from "./crop-interface.js";
import { createTimeInterface } from "./time-interface.js";
import { createPresentationInterface } from "./presentation-interface.js";
import { createUIShell } from "./ui-shell.js";
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
  } = {},
) {
  const shell = createUIShell(game, { document: doc, sound, dialogueClock });
  const { modal, root } = shell;
  const deps = {
    ...shell,
    document: doc,
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
    movementUI = createMovementInterface(game, deps),
    networkUI = createNetworkInterface(game, deps),
    presentationUI = createPresentationInterface(game, deps),
    battleUI = createBattleInterface(game, deps);
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
    networkUI,
    presentationUI,
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
  function showMenu() {
    if (game.busy || game.battle || shell.dialog) return;
    if (game.facilityActive) {
      shell.showFacility();
      return;
    }
    modal(
      "冒险菜单",
      `<div class="menu-grid start-menu">${game.state.flags.pokedex ? '<button class="menu-tile" data-page="dex">图鉴</button>' : ""}${game.state.party.length ? '<button class="menu-tile" data-page="party">宝可梦</button>' : ""}<button class="menu-tile" data-page="bag">背包</button><button class="menu-tile" data-page="trainer">${shell.escapeHTML(game.state.playerName)}</button><button class="menu-tile" data-page="save">记录</button><button class="menu-tile" data-page="settings">设置</button><button class="menu-tile" data-page="close">退出</button></div>`,
      { type: "menu" },
    );
    const actions = pageActions();
    root
      .querySelectorAll("button[data-page]")
      .forEach((b) => (b.onclick = actions[b.dataset.page]));
  }
  function pageActions() {
    return {
      close: shell.closeModal,
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
