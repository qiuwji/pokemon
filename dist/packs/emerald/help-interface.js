/** Owns this page and its navigation; gameplay changes are application commands. */
export function createHelpInterface(game, { modal, showMenu }) {
  function showHelp() {
    modal(
      "操作与范围",
      `<div class="help-table"><span><kbd>方向键 / WASD</kbd></span><span>移动。按住 Shift 跑步。</span><span><kbd>Z / 回车</kbd></span><span>调查、对话、确认。对话时点按游戏画面也可继续。</span><span><kbd>X / Esc</kbd></span><span>返回上一层菜单。</span><span><kbd>M</kbd></span><span>打开冒险菜单。</span></div><p>触屏设备可使用画面下方的方向键和 A / B 按钮。战斗菜单支持鼠标、方向键与确认键。</p><p>本次序章：未白镇、101 号道路、古辰镇、103 号道路西部，以及研究所、主角的家、宝可梦中心和友好商店。</p><p>已加入三选一初始精灵、博士救助、小遥对战、草丛遇敌、捕捉、经验、能力变化、部分异常状态、学习招式、部分进化、回复与本机存档。</p><p class="notice">开场搬家演出、完整剧情、全部地图、道馆，以及未列出的招式效果尚未实现。双打、训练家队伍、特性与持有道具已加入，旅行菜单可以借用本次研究装备。地图与像素素材源于原作，非官方同人演示。</p><div class="modal-footer">素材及机制参考：<a href="https://github.com/pret/pokeemerald" target="_blank" rel="noopener" style="color:#b7d398">pret/pokeemerald</a> · Pokémon © Nintendo / Creatures / GAME FREAK</div>`,
      { back: showMenu, type: "help" },
    );
  }
  return { showHelp };
}
