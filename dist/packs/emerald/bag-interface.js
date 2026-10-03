/** Owns this page and its navigation; gameplay changes are application commands. */
export function createBagInterface(
  game,
  {
    modal,
    closeModal,
    showMenu,
    root,
    partyCard,
    toast,
    updateSide,
    sound,
    escapeHTML,
  },
) {
  const ITEMS = game.itemDefinitions;
  function showBag(inBattle = false) {
    const shortcut = game.registeredItemView();
    const view = game.bagView(inBattle);
    const rows = Object.entries(view.pockets).flatMap(([pocket, definition]) =>
      definition.slots.flatMap((slot, index) =>
        slot
          ? [{ ...slot, reference: { pocket, index, item: slot.item } }]
          : [],
      ),
    );
    const row = ({ item: id, count, reference }) => {
      const item = ITEMS[id];
      const usable =
        item.contexts.includes(inBattle ? "battle" : "field") &&
        (item.target === "field"
          ? !inBattle && game.itemActionOptions(id).some((action) => action.ok)
          : item.target === "enemy"
            ? game.itemPlan(id, undefined, inBattle, reference).ok
            : (inBattle ? game.battle.party : game.state.party).some(
                (m, index) => game.itemPlan(id, index, inBattle, reference).ok,
              ));
      return `<div class="bag-item"><div class="bag-icon">${escapeHTML(item.icon || "◆")}</div><div><strong>${escapeHTML(item.name)} × ${count}</strong><p>${escapeHTML(item.description || "")}</p></div><button class="secondary-button" data-item="${escapeHTML(id)}" ${!usable ? "disabled" : ""}>使用</button>${!inBattle && item.registerable ? `<button class="secondary-button" data-register-item="${escapeHTML(id)}">${shortcut.selection?.item === id ? "已登记" : "登记"}</button>` : ""}</div>`;
    };
    modal(
      "背包",
      Object.entries(view.pockets)
        .map(
          ([pocket, definition]) =>
            `<section><h3>${escapeHTML(definition.label)} · ${definition.used}/${definition.capacity}</h3>${
              rows
                .filter((entry) => entry.reference.pocket === pocket)
                .map(row)
                .join("") || "<p>这个口袋是空的。</p>"
            }</section>`,
        )
        .join("") +
        `<div class="modal-footer">${inBattle ? "使用道具会占用这一回合。" : "精灵球可以在野生宝可梦战斗中使用。"}</div>`,
      { back: inBattle ? closeModal : showMenu, type: "bag" },
    );
    root.querySelectorAll("[data-register-item]").forEach((button) => {
      button.onclick = () =>
        chooseItemRegistration(button.dataset.registerItem);
    });
    root.querySelectorAll("[data-item]").forEach(
      (button, rowIndex) =>
        (button.onclick = () => {
          const id = button.dataset.item,
            slot = rows[rowIndex].reference;
          if (ITEMS[id].target === "field") chooseItemAction(id);
          else if (ITEMS[id].target === "enemy")
            void game.turn({ kind: "item", item: id, slot });
          else chooseItemTarget(id, inBattle, slot);
        }),
    );
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
      (inBattle ? game.battle.party : game.state.party)
        .map((m, i) => partyCard(m, i))
        .join(""),
      { back: () => showBag(inBattle), type: "item-target" },
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
        sound("emerald:confirm");
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
      sound("emerald:confirm");
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
