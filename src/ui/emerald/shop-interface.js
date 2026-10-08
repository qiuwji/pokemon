import { itemIconURL, listNavigation } from "./ui/native-view.js";
import { emeraldMartStock } from "../../packs/emerald/mart-stock.js";
/** Buy list and selected description use original shop windows. Prices and purchases are domain calls. */
export function createShopInterface(
  game,
  {
    modal,
    root,
    document: doc,
    closeModal,
    updateSide,
    sound,
    toast,
    escapeHTML: esc,
  },
) {
  const items = game.itemDefinitions;
  function showShop(selectedId = null) {
    const nativeStock = emeraldMartStock(game.state);
    const stock = nativeStock ? nativeStock.map(id => [id, items[id]]) : Object.entries(items).filter(
      ([, item]) => item.shopStock !== false && item.price > 0,
    );
    modal(
      "友好商店",
      `<div class="native-window shop-money">金钱 ¥${game.state.money}</div><div class="native-window shop-list">${stock.map(([id, item]) => `<button class="native-row" data-buy="${esc(id)}" ${game.canBuyItem(id) ? "" : "disabled"}><span>${esc(item.name)}</span><span>¥${item.price}</span></button>`).join("")}<button class="native-row" data-shop-exit>退出</button></div><div class="shop-description" data-shop-description></div><img class="shop-item-icon" data-shop-icon alt=""><div data-extension-slot="shop.actions"></div><div data-extension-slot="shop.content"></div>`,
      {
        type: "shop",
        close: false,
        back: closeModal,
        navigate: (dir) => listNavigation(root, doc, ".shop-list button", dir),
      },
    );
    const describe = (id) => {
      root.querySelector("[data-shop-description]").textContent = items[id]
        ? `${items[id].description || ""} 持有 ${game.itemQuantity(id)} 个。`
        : "欢迎再次光临！";
      const icon = root.querySelector("[data-shop-icon]");
      icon.hidden = !id;
      if (id) icon.src = itemIconURL(id, game.db.resources);
    };
    describe(selectedId || stock[0]?.[0]);
    root.querySelector("[data-shop-exit]").onclick = closeModal;
    root.querySelectorAll("[data-buy]").forEach((button) => {
      button.onfocus = () => describe(button.dataset.buy);
      button.onclick = () => {
        const id = button.dataset.buy;
        if (!game.buyItem(id)) return;
        updateSide();
        game.save();
        showShop(id);
        sound("emerald:purchase");
        toast(`买到了 1 个${items[id].name}。`);
      };
    });
    for (const slot of ["shop.actions", "shop.content"])
      game.ui?.extensions?.mountSlot(
        slot,
        root.querySelector(`[data-extension-slot="${slot}"]`),
        {},
        () => showShop(selectedId),
      );
    if (selectedId) root.querySelector(`[data-buy="${selectedId}"]`)?.focus();
  }
  return { showShop };
}
