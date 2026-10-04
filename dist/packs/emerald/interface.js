import { SpriteCanvas } from "../../adapters/sprite-canvas.js";
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
    showMonster: (...args) => shell.showMonster(...args),
    showEvolutionOptions: (index) => shell.showEvolutionOptions(index),
    checkGrowth: () => shell.checkGrowth(),
  };
  const partyUI = createPartyInterface(game, deps),
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
      `<div class="menu-grid"><button class="menu-tile" data-page="party">宝可梦<small>查看队伍与招式</small></button><button class="menu-tile" data-page="bag">背包<small>道具与精灵球</small></button><button class="menu-tile" data-page="dex" ${!game.state.flags.pokedex ? "disabled" : ""}>宝可梦图鉴<small>${game.state.flags.pokedex ? "已发现 " + game.state.seen.length + " 种" : "博士的礼物"}</small></button><button class="menu-tile" data-page="clock">冒险时钟<small>游戏时间与游玩时长</small></button><button class="menu-tile" data-page="save">记录冒险<small>保存、导出与继续</small></button><button class="menu-tile" data-page="box">电脑盒子<small>${game.state.box.length} 位寄存伙伴</small></button><button class="menu-tile" data-page="daycare" ${game.canUseDaycare() ? "" : "disabled"}>育成研究<small>研究所寄存、蛋与交换</small></button><button class="menu-tile" data-page="movement">旅行与移动<small>自行车、冲浪与飞行</small></button><button class="menu-tile" data-page="facility">设施与活动<small>连战与插件游戏厅</small></button><button class="menu-tile" data-page="presentation">场景演出<small>可扩展演出示例</small></button><button class="menu-tile" data-page="network">扩展连接<small>本地验证与连接服务</small></button><button class="menu-tile" data-page="help">操作与范围<small>玩法说明</small></button></div><div class="modal-footer">X / Esc 返回冒险</div>`,
      { type: "menu" },
    );
    game.ui?.extensions?.mountSlot(
      "menu",
      root.querySelector(".menu-grid"),
      {},
      showMenu,
    );
    const actions = {
      party: () => shell.showParty(),
      bag: () => shell.showBag(),
      dex: shell.showDex,
      save: shell.showSave,
      clock: timeUI.showTime,
      box: shell.showBox,
      help: shell.showHelp,
      network: networkUI.showNetwork,
      facility: facilityUI.showFacility,
      presentation: presentationUI.showPresentation,
      movement: movementUI.showMovement,
      daycare: growthUI.showDaycare,
    };
    root
      .querySelectorAll("[data-page]")
      .forEach((b) => (b.onclick = actions[b.dataset.page]));
  }
  return shell;
}
