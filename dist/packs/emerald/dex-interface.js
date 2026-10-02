/** Owns this page and its navigation; gameplay changes are application commands. */
export function createDexInterface(
  game,
  { modal, showMenu, spriteURL, escapeHTML },
) {
  const db = game.db;
  function showDex() {
    const list = Object.entries(db.species).sort((a, b) => a[1].dex - b[1].dex);
    modal(
      "宝可梦图鉴",
      `<p>已发现 ${game.state.seen.length} 种 · 已捕获 ${game.state.caught.length} 种</p><div class="dex-grid">${list
        .map(([id, s]) => {
          const found = game.state.seen.includes(id);
          return `<div class="dex-entry ${found ? "" : "unseen"}"><span>No.${String(s.dex).padStart(3, "0")}</span><img src="${escapeHTML(spriteURL(id))}" alt="${found ? s.name : "未知宝可梦"}"><strong>${found ? s.name : "???"}</strong><span>${game.state.caught.includes(id) ? "● 已捕获" : found ? "已发现" : "尚未发现"}</span></div>`;
        })
        .join(
          "",
        )}</div><div class="modal-footer">当前图鉴收录序章及其部分进化形态，后续可继续补充。</div>`,
      { back: showMenu, type: "dex" },
    );
  }
  return { showDex };
}
