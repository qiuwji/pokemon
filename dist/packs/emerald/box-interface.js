/** Owns this page and its navigation; gameplay changes are application commands. */
export function createBoxInterface(
  game,
  { modal, showMenu, root, partyCard, updateSide, spriteURL, escapeHTML },
) {
  const db = game.db;
  function showBox() {
    modal(
      "电脑 · 宝可梦盒子",
      `<p>队伍满员时捕获的宝可梦会送到这里。你可以交换盒子里的伙伴与当前队伍。</p>${game.state.box.length ? `<div class="box-grid">${game.state.box.map((m, i) => `<button class="box-mon" data-box="${i}"><img src="${escapeHTML(spriteURL(m.egg ? "egg" : m.species))}" alt=""><strong>${m.egg ? "宝可梦的蛋" : db.species[m.species].name}</strong><small>${m.egg ? "一起行走，等待孵化" : `Lv.${m.level} · ${m.hp}/${m.stats.hp} HP`}</small></button>`).join("")}</div>` : "<p>盒子里还没有宝可梦。</p>"}`,
      { back: showMenu, type: "box" },
    );
    root.querySelectorAll("[data-box]").forEach(
      (b) =>
        (b.onclick = () => {
          const i = +b.dataset.box;
          if (game.state.party.length < 6) {
            game.withdrawBox(i);
            updateSide();
            game.save();
            showBox();
            return;
          }
          modal(
            "选择要交换的伙伴",
            game.state.party.map((m, j) => partyCard(m, j)).join(""),
            { back: showBox, type: "box-swap" },
          );
          root.querySelectorAll("[data-mon]").forEach(
            (c) =>
              (c.onclick = () => {
                const j = +c.dataset.mon;
                game.exchangeBox(i, j);
                updateSide();
                game.save();
                showBox();
              }),
          );
        }),
    );
  }
  return { showBox };
}
