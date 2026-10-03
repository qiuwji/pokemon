/** Owns this page and its navigation; gameplay changes are application commands. */
export function createBagInterface(
  game,
  { modal, closeModal, showMenu, root, partyCard, toast, updateSide, sound },
) {
  const ITEMS = game.itemDefinitions;
  function showBag(inBattle = false) {
    modal(
      "背包",
      Object.entries(ITEMS)
        .filter(
          ([id, item]) => item.contexts.length || (game.state.bag[id] || 0) > 0,
        )
        .map(([id, item]) => {
          const usable =
            item.contexts.includes(inBattle ? "battle" : "field") &&
            (item.target === "enemy"
              ? game.itemPlan(id, undefined, inBattle).ok
              : (inBattle ? game.battle.party : game.state.party).some(
                  (m, index) => game.itemPlan(id, index, inBattle).ok,
                ));
          return `<div class="bag-item"><div class="bag-icon">${item.icon}</div><div><strong>${item.name} × ${(inBattle ? game.battle.bag : game.state.bag)[id] || 0}</strong><p>${item.description}</p></div><button class="secondary-button" data-item="${id}" ${!usable ? "disabled" : ""}>使用</button></div>`;
        })
        .join("") +
        `<div class="modal-footer">${inBattle ? "使用道具会占用这一回合。" : "精灵球可以在野生宝可梦战斗中使用。"}</div>`,
      { back: inBattle ? closeModal : showMenu, type: "bag" },
    );
    root.querySelectorAll("[data-item]").forEach(
      (button) =>
        (button.onclick = () => {
          const id = button.dataset.item;
          if (ITEMS[id].target === "enemy")
            void game.turn({ kind: "item", item: id });
          else chooseItemTarget(id, inBattle);
        }),
    );
  }
  function chooseItemTarget(id, inBattle) {
    modal(
      `${ITEMS[id].name} · 选择伙伴`,
      (inBattle ? game.battle.party : game.state.party)
        .map((m, i) => partyCard(m, i))
        .join(""),
      { back: () => showBag(inBattle), type: "item-target" },
    );
    root.querySelectorAll("[data-mon]").forEach((button) => {
      const index = +button.dataset.mon;
      button.disabled = !game.itemPlan(id, index, inBattle).ok;
      button.onclick = () => {
        if (inBattle) {
          void game.turn({ kind: "item", item: id, index });
          return;
        }
        const result = game.useItem(id, index);
        if (!result.ok) {
          toast(result.reason);
          return;
        }
        updateSide();
        game.save();
        showBag(false);
        sound("emerald:confirm");
        toast(`使用了${ITEMS[id].name}。`);
      };
    });
  }
  return { showBag, chooseItemTarget };
}
