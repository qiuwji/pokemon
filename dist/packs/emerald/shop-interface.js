/** Owns this page and its navigation; gameplay changes are application commands. */
export function createShopInterface(
  game,
  { modal, root, updateSide, sound, toast },
) {
  const ITEMS = game.itemDefinitions;
  function showShop() {
    modal(
      "友好商店",
      `<p>欢迎光临！现有零花钱 ¥${game.state.money.toLocaleString("zh-CN")}</p>${Object.entries(
        ITEMS,
      )
        .filter(([,item]) => item.shopStock !== false && item.price > 0)
        .map(
          ([id, item]) =>
            `<div class="bag-item"><div class="bag-icon">${item.icon}</div><div><strong>${item.name} · ¥${item.price}</strong><p>${item.description}</p><p>持有 ${game.state.bag[id] || 0} 个</p></div><button class="secondary-button" data-buy="${id}" ${!game.canBuyItem(id) ? "disabled" : ""}>购买 1 个</button></div>`,
        )
        .join(
          "",
        )}${!game.state.flags.pokedex ? '<p class="notice">领取图鉴后即可购买精灵球。</p>' : ""}`,
      { type: "shop" },
    );
    root.querySelectorAll("[data-buy]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.buy;
          if (!game.buyItem(id)) return;
          updateSide();
          game.save();
          showShop();
          sound("emerald:purchase");
          toast(`买到了 1 个${ITEMS[id].name}。`);
        }),
    );
  }
  return { showShop };
}
