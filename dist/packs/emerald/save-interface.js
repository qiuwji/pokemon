/** Owns this page and its navigation; gameplay changes are application commands. */
export function createSaveInterface(
  game,
  { document: doc, modal, closeModal, showMenu, updateSide, toast },
) {
  const saveStore = game.saveStore;
  const $ = (id) => doc.getElementById(id);
  function showSave() {
    const saved = saveStore.load();
    modal(
      "记录冒险",
      `<div class="save-box"><strong>${game.world.map.title} · ${game.state.party.length} 位伙伴</strong><p>已探索 ${game.state.seen.length} 种宝可梦 · 游玩 ${Math.floor(game.state.playSeconds / 60)} 分钟</p><p>${saved ? "上次保存：" + new Date(saved.savedAt).toLocaleString("zh-CN") : "尚未保存"}</p></div><div class="inline-actions"><button id="save-now" class="primary-button">保存进度</button><button id="continue-save" data-control="local" class="secondary-button" ${!saved ? "disabled" : ""}>读取存档</button><button id="export-save" class="secondary-button">导出存档</button><button id="import-save" data-control="local" class="secondary-button">导入存档</button><input id="save-file" type="file" accept="application/json,.json" hidden></div><p class="notice">进度保存在当前浏览器。切换设备前，请先导出存档。</p><div class="modal-footer"><button id="new-game" data-control="local" class="text-button" style="color:#cbb18e">重新开始冒险</button></div>`,
      { back: showMenu, type: "save" },
    );
    $("save-now").onclick = () => {
      game.save(true);
      showSave();
    };
    $("continue-save").onclick = () => {
      const d = saveStore.load();
      if (!d) return;
      game.loadDocument(d);
      closeModal();
      updateSide();
      toast("已读取存档。");
    };
    $("export-save").onclick = () => {
      const blob = new Blob([JSON.stringify(game.exportDocument(), null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = doc.createElement("a");
      a.href = url;
      a.download = "emerald-save.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    $("import-save").onclick = () => {
      $("save-file").value = "";
      $("save-file").click();
    };
    $("save-file").onchange = async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      try {
        if (file.size > 1024 * 1024) throw new Error();
        const d = JSON.parse(await file.text());
        game.loadDocument(d);
        closeModal();
        updateSide();
        game.save(true);
      } catch (error) {
        toast(
          error.message.startsWith("存档需要插件")
            ? error.message
            : "这个存档无法读取，请选择有效的当前版本存档。",
        );
      }
    };
    $("new-game").onclick = () => {
      modal(
        "重新开始冒险",
        `<p>当前浏览器里的进度将被新的冒险覆盖。你可以先返回菜单导出存档。</p><div class="choice-actions"><button class="secondary-button" id="keep-game">继续当前冒险</button><button class="primary-button" id="reset-game" data-control="local">重新开始</button></div>`,
        { back: showSave, type: "reset" },
      );
      $("keep-game").onclick = showSave;
      $("reset-game").onclick = () => {
        game.reset();
        closeModal();
        updateSide();
        game.save();
      };
    };
  }
  return { showSave };
}
