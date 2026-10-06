import {
  itemIconURL,
  listNavigation,
  bagPockets,
  bagPicture,
} from "./ui/native-view.js";
import { partyMenuCards, partyMenuNavigation } from "./party-menu-view.js";
/** Owns this page and its navigation; gameplay changes are application commands. */
export function createBagInterface(
  game,
  {
    modal,
    closeModal,
    showMenu,
    root,
    document: doc,
    hpTrack,
    toast,
    updateSide,
    escapeHTML,
  },
) {
  const ITEMS = game.itemDefinitions;
  let pocketIndex = 0;
  function showBag(inBattle = false, selection = null, context = false) {
    const shortcut = game.registeredItemView(),
      view = game.bagView(inBattle);
    const pockets = bagPockets(view.pockets);
    pocketIndex = Math.min(pocketIndex, pockets.length - 1);
    const [pocket, definition] = pockets[pocketIndex];
    const rows = definition.slots.flatMap((slot, index) =>
      slot ? [{ ...slot, reference: { pocket, index, item: slot.item } }] : [],
    );
    const selected = rows.find(row => row.reference.pocket === selection?.pocket && row.reference.index === selection?.index && row.item === selection?.item) || rows[0];
    const contextItem = context ? selected?.item : null;
    const usable = (row) => {
      const item = ITEMS[row.item];
      return (
        item.contexts.includes(inBattle ? "battle" : "field") &&
        (item.target === "field"
          ? !inBattle && game.itemActionOptions(row.item).some((a) => a.ok)
          : item.target === "enemy"
            ? game.itemPlan(row.item, undefined, inBattle, row.reference).ok
            : (inBattle ? game.battle.party : game.state.party).some(
                (m, index) =>
                  game.itemPlan(row.item, index, inBattle, row.reference).ok,
              ))
      );
    };
    const turnPocket = (delta) => {
      pocketIndex = (pocketIndex + delta + pockets.length) % pockets.length;
      showBag(inBattle);
    };
    modal(
      "背包",
      `<div class="bag-pocket"><button data-pocket="-1" aria-label="前一个口袋">◀</button><span>${escapeHTML(definition.label)}</span><button data-pocket="1" aria-label="下一个口袋">▶</button></div>
      <img class="bag-picture" src="${bagPicture(pocket, game.state.playerGender || "male")}" alt="背包">
      <div class="native-window bag-list">${rows.map((row) => `<button class="native-row" data-item="${escapeHTML(row.item)}" data-slot-index="${row.reference.index}"><span>${escapeHTML(ITEMS[row.item].name)}</span><span>${shortcut.selection?.item === row.item ? "SELECT " : ""}×${row.count}</span></button>`).join("")}<button class="native-row" data-bag-close>关闭背包</button></div>
      <div class="bag-description" data-item-description></div><img class="bag-selected-icon" data-item-icon alt="">
      ${contextItem ? `<div class="native-window bag-context"><button data-use-item ${usable(selected) ? "" : "disabled"}>使用</button>${!inBattle && ITEMS[contextItem].registerable ? `<button data-register-item="${escapeHTML(contextItem)}">${shortcut.selection?.item === contextItem ? "取消登记" : "登记"}</button>` : ""}<button data-item-cancel>取消</button></div>` : ""}
      <div data-extension-slot="bag.actions"></div><div data-extension-slot="bag.content"></div>`,
      {
        back: contextItem
          ? () => showBag(inBattle, selected.reference)
          : inBattle
            ? closeModal
            : showMenu,
        type: "bag",
        close: false,
        navigate: (dir) =>
          listNavigation(
            root,
            doc,
            contextItem ? ".bag-context button" : ".bag-list button",
            dir,
            contextItem ? null : turnPocket,
          ),
      },
    );
    const describe = (id) => {
      const description = root.querySelector("[data-item-description]"),
        icon = root.querySelector("[data-item-icon]");
      if (description)
        description.textContent = ITEMS[id]?.description || "返回冒险。";
      if (icon) {
        icon.hidden = !id;
        if (id) icon.src = itemIconURL(id, game.db.resources);
      }
    };
    describe(selected?.item);
    root
      .querySelectorAll("[data-pocket]")
      .forEach(
        (button) =>
          (button.onclick = () => turnPocket(Number(button.dataset.pocket))),
      );
    root.querySelector("[data-bag-close]").onclick = inBattle
      ? closeModal
      : showMenu;
    root.querySelectorAll("[data-item]").forEach((button) => {
      button.onfocus = () => describe(button.dataset.item);
      button.onclick = () =>
        showBag(inBattle, rows.find(row => row.reference.index === Number(button.dataset.slotIndex)).reference, true);
    });
    const use = root.querySelector("[data-use-item]");
    if (use) use.onclick = () => {
      const row = selected,
        id = row.item;
      if (ITEMS[id].target === "field") chooseItemAction(id);
      else if (ITEMS[id].target === "enemy") {
        closeModal();
        void game.turn({ kind: "item", item: id, slot: row.reference });
      } else chooseItemTarget(id, inBattle, row.reference);
    };
    const cancel = root.querySelector("[data-item-cancel]");
    if (cancel) cancel.onclick = () => showBag(inBattle, selected.reference);
    root
      .querySelectorAll("[data-register-item]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            chooseItemRegistration(button.dataset.registerItem)),
      );
    for (const slot of ["bag.actions", "bag.content"])
      game.ui?.extensions?.mountSlot(
        slot,
        root.querySelector(`[data-extension-slot="${slot}"]`),
        { inBattle },
        () => showBag(inBattle, selected?.reference),
      );
    if (contextItem)
      root.querySelector(".bag-context button:not(:disabled)")?.focus();
    else root.querySelector(`[data-slot-index="${selected?.reference.index}"]`)?.focus();
  }
  function chooseItemRegistration(id) {
    const actions = game.itemActionOptions(id);
    const register = (action) => {
      const selection = game.registeredItemView().selection;
      const result =
        selection?.item === id && selection.action === action
          ? game.unregisterItem()
          : game.registerItem(id, action);
      if (!result.ok) {
        toast(result.reason);
        return;
      }
      showBag(false);
      toast(
        result.selection
          ? "已登记。探索时按 C 或触屏 SELECT 使用。"
          : "已取消登记。",
      );
    };
    if (actions.length === 1) {
      register(actions[0].id);
      return;
    }
    modal(
      `${ITEMS[id].name} · 登记行动`,
      actions
        .map(
          (action) =>
            `<button data-register-action="${escapeHTML(action.id)}">${escapeHTML(action.name)}</button>`,
        )
        .join(""),
      { back: () => showBag(false), type: "item-registration" },
    );
    root
      .querySelectorAll("[data-register-action]")
      .forEach(
        (button) =>
          (button.onclick = () => register(button.dataset.registerAction)),
      );
  }
  function chooseItemAction(id) {
    const actions = game.itemActionOptions(id);
    const perform = async (action) => {
      closeModal();
      const result = await game.performItemAction(id, action);
      if (!result.ok) toast(result.reason);
      updateSide();
    };
    if (actions.length === 1) {
      void perform(actions[0].id);
      return;
    }
    modal(
      ITEMS[id].name,
      actions
        .map(
          (action) =>
            `<button data-item-action="${escapeHTML(action.id)}" ${action.ok ? "" : "disabled"}>${escapeHTML(action.name)}</button>`,
        )
        .join(""),
      { back: () => showBag(false), type: "item-actions" },
    );
    root.querySelectorAll("[data-item-action]").forEach(
      (button) =>
        (button.onclick = () => {
          void perform(button.dataset.itemAction);
        }),
    );
  }
  function chooseItemTarget(id, inBattle, slot) {
    modal(
      `${ITEMS[id].name} · 选择伙伴`,
      `<div data-native-party>${partyMenuCards(inBattle ? game.battle.party : game.state.party, { db: game.db, escapeHTML, hpTrack })}</div><div class="party-prompt">${escapeHTML(ITEMS[id].name)}：选择宝可梦。</div>`,
      {
        back: () => showBag(inBattle),
        type: "item-target",
        navigate: (dir) => partyMenuNavigation(root, doc, dir),
      },
    );
    root.querySelectorAll("[data-mon]").forEach((button) => {
      const index = +button.dataset.mon;
      button.disabled = !game.itemPlan(id, index, inBattle, slot).ok;
      button.onclick = () => {
        if (!inBattle && ITEMS[id].learningMethod) {
          chooseLearningMove(
            ITEMS[id].learningMethod,
            game.state.party[index]?.uid,
            slot,
          );
          return;
        }
        if (inBattle) {
          void game.turn({
            kind: "item",
            item: id,
            index,
            ...(slot ? { slot } : {}),
          });
          return;
        }
        const result = game.useItem(id, index, slot);
        if (!result.ok) {
          toast(result.reason);
          return;
        }
        updateSide();
        game.save();
        showBag(false);
        toast(`使用了${ITEMS[id].name}。`);
      };
    });
  }
  function chooseLearningMove(method, uid, slot) {
    const view = game.learningView(method, uid, slot);
    if (!view.ok) {
      toast(view.reason);
      return;
    }
    const mon = game.state.party.find((value) => value.uid === uid);
    const move = game.db.moves[view.move];
    const commit = (index) => {
      const result = game.teachMove(method, uid, index, slot);
      if (!result.ok) {
        toast(result.reason);
        return;
      }
      updateSide();
      game.save();
      showBag(false);
      toast(`学会了${move.name}。`);
    };
    modal(
      "学习招式",
      `<p>让${escapeHTML(game.db.species[mon.species].name)}学习${escapeHTML(move.name)}？${view.cost.count ? "成功后消耗道具。" : "不会消耗道具。"}</p>` +
        (view.requiresReplacement
          ? `<p>请选择要忘记的招式。秘传招式不能在这里遗忘。</p><div class="move-list">${mon.moves.map((slot, index) => `<button class="move-summary" data-replace="${index}" ${view.replaceable.includes(index) ? "" : "disabled"}>${escapeHTML(game.db.moves[slot.id].name)}<small>PP ${slot.pp}</small></button>`).join("")}</div>`
          : `<button class="primary-button" data-learn>学习</button>`),
      { back: () => showBag(false), type: "machine-learning" },
    );
    root
      .querySelectorAll("[data-replace]")
      .forEach(
        (button) => (button.onclick = () => commit(+button.dataset.replace)),
      );
    const learn = root.querySelector("[data-learn]");
    if (learn) learn.onclick = () => commit(undefined);
  }
  return { showBag, chooseItemTarget, chooseLearningMove };
}
