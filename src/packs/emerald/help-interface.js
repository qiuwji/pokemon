/** Owns this page and its navigation; gameplay changes are application commands. */
export function createHelpInterface(game, { modal, showMenu }) {
  function showHelp() {
    modal(
      "操作与范围",
      `<div class="help-table"><span><kbd>方向键 / WASD</kbd></span><span>移动。按住 Shift 跑步。</span><span><kbd>Z / 回车</kbd></span><span>调查、对话、确认。对话时点按游戏画面也可继续。</span><span><kbd>X / Esc</kbd></span><span>返回上一层菜单。</span><span><kbd>C / SELECT</kbd></span><span>使用背包中登记的关键道具。</span><span><kbd>M</kbd></span><span>打开冒险菜单。</span></div><p>触屏设备可使用画面下方的方向键和 A / B / SELECT 按钮。战斗菜单支持鼠标、方向键与确认键。</p><p>在队伍中选择宝可梦，可以查看能力、交换顺序、携带道具，或使用已学会的野外招式。</p><p>冒险记录保存在当前浏览器。换设备前，可在记录页面导出存档。</p><div class="modal-footer">素材及机制参考：<a href="https://github.com/pret/pokeemerald" target="_blank" rel="noopener" style="color:#b7d398">pret/pokeemerald</a> · Pokémon © Nintendo / Creatures / GAME FREAK</div>`,
      { back: showMenu, type: "help" },
    );
  }
  return { showHelp };
}
