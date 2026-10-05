import { partyMenuCards, partyMenuNavigation } from "./party-menu-view.js";
import { nativeUIControls } from "../../adapters/native-ui-controls.js";
import { summaryPage } from "./ui/summary-view.js";
import { listNavigation } from "./ui/native-view.js";
/** Owns this page and its navigation; gameplay changes are application commands. */
export function createPartyInterface(
  game,
  {
    document: doc,
    mountSprite,
    modal,
    closeModal,
    showMenu,
    root,
    hpTrack,
    updateSide,
    escapeHTML,
    showEvolutionOptions,
    showPartyFieldMove,
  },
) {
  const db = game.db,
    ITEMS = game.itemDefinitions;
  const $ = (id) => doc.getElementById(id);
  function showParty(
    inBattle = false,
    { selectedUid = null, actionUid = null, swapUid = null } = {},
  ) {
    const party = inBattle ? game.battle.party : game.state.party;
    const selected = party.find((m) => m.uid === actionUid);
    const fieldMoves =
      selected && !inBattle ? game.partyFieldMoveOptions(selected.uid) : [];
    const actions = selected
      ? [
          ...(inBattle ? [{ id: "shift", label: "替换" }] : []),
          { id: "summary", label: "查看能力" },
          ...fieldMoves.map((a, i) => ({
            id: `field:${i}`,
            label: a.name,
            field: true,
          })),
          ...(!inBattle && party.length > 1
            ? [{ id: "swap", label: "交换" }]
            : []),
          ...(!inBattle && !selected.egg
            ? [{ id: "item", label: "道具" }]
            : []),
          { id: "cancel", label: "取消" },
        ]
      : [];
    const back = () =>
      actionUid || swapUid
        ? showParty(inBattle, { selectedUid: actionUid || swapUid })
        : inBattle
          ? closeModal()
          : showMenu();
    modal(
      inBattle ? "替换宝可梦" : "宝可梦",
      "<div data-native-party>" +
        partyMenuCards(party, {
          db,
          escapeHTML,
          hpTrack,
          selectedUid: actionUid || selectedUid,
        }) +
        "</div>" +
        `<div class="party-prompt">${escapeHTML(selected ? `对${selected.egg ? "蛋" : db.species[selected.species].name}做什么？` : swapUid ? "要和哪只宝可梦交换？" : party.length ? "请选择宝可梦。" : "还没有宝可梦。")}</div><button class="party-cancel" data-party-cancel>取消</button>` +
        (selected
          ? `<div class="party-action-menu">${actions.map((a) => `<button data-party-action="${a.id}"${a.field ? ' class="field-move"' : ""}>${escapeHTML(a.label)}</button>`).join("")}</div>`
          : "") +
        '<div data-extension-slot="party.list"></div><div data-extension-slot="party.actions"></div><div data-extension-slot="party.content"></div>',
      {
        back,
        type: "party",
        close: false,
        navigate: (dir) => partyMenuNavigation(root, doc, dir),
      },
    );
    root.querySelectorAll("[data-mon]").forEach(
      (button) =>
        (button.onclick = () => {
          const mon = party[Number(button.dataset.mon)];
          if (swapUid) {
            if (mon.uid !== swapUid && !game.swapParty(swapUid, mon.uid))
              return;
            updateSide();
            game.save();
            showParty(false, { selectedUid: mon.uid });
          } else showParty(inBattle, { actionUid: mon.uid });
        }),
    );
    const cancel = root.querySelector("[data-party-cancel]");
    if (cancel) cancel.onclick = back;
    root.querySelectorAll("[data-party-action]").forEach(
      (button) =>
        (button.onclick = () => {
          const id = button.dataset.partyAction,
            index = party.findIndex((m) => m.uid === selected.uid);
          if (id === "summary")
            showMonster(index, {
              back: () => showParty(inBattle, { actionUid: selected.uid }),
              inBattle,
            });
          else if (id === "shift") {
            closeModal();
            void game.turn({ kind: "switch", index });
          } else if (id === "swap")
            showParty(false, {
              swapUid: selected.uid,
              selectedUid: selected.uid,
            });
          else if (id === "item")
            showEquipment(selected.uid, index, {
              back: () => showParty(false, { actionUid: selected.uid }),
            });
          else if (id === "cancel") back();
          else if (id.startsWith("field:"))
            showPartyFieldMove(
              selected.uid,
              fieldMoves[Number(id.slice(6))].move,
            );
        }),
    );
    game.ui?.extensions?.mountSlot(
      "party.list",
      root.querySelector('[data-extension-slot="party.list"]'),
      { inBattle },
      () => showParty(inBattle, { selectedUid, actionUid, swapUid }),
      {
        nativeRoot: root.querySelector("[data-native-party]"),
        controls: nativeUIControls(
          root.querySelectorAll("[data-mon]"),
          (button) => `party:${button.dataset.mon}`,
        ),
      },
    );
    for (const slot of ["party.actions", "party.content"])
      game.ui?.extensions?.mountSlot(
        slot,
        root.querySelector(`[data-extension-slot="${slot}"]`),
        { inBattle, ...(selected ? { uid: selected.uid } : {}) },
        () => showParty(inBattle, { actionUid }),
      );
    if (selected) root.querySelector("[data-party-action]")?.focus();
    else
      root
        .querySelector(
          `[data-mon="${Math.max(
            0,
            party.findIndex((m) => m.uid === selectedUid),
          )}"]`,
        )
        ?.focus();
  }

  function showMonster(
    index,
    {
      back = () => showParty(),
      inBattle = false,
      page: requestedPage = 0,
    } = {},
  ) {
    const m = (inBattle ? game.battle.party : game.state.party)[index];
    if (!m) return;
    const s = db.species[m.species];
    const pages = m.egg
      ? ["蛋的信息"]
      : ["宝可梦信息", "宝可梦能力", "战斗招式", "华丽大赛招式"];
    const page = Math.min(Math.max(0, requestedPage), pages.length - 1);
    const next = (delta) =>
      showMonster(index, {
        back,
        inBattle,
        page: (page + delta + pages.length) % pages.length,
      });
    modal(
      s.name,
      summaryPage(m, {
        db,
        items: ITEMS,
        page,
        escapeHTML,
        playerName: game.state.playerName,
      }),
      {
        back,
        type: "detail",
        close: false,
        navigate: (dir) =>
          listNavigation(
            root,
            doc,
            ".summary-moves button, .summary-navigation button, .summary-tools button",
            dir,
            next,
          ),
      },
    );
    if (!m.egg)
      mountSprite(
        $("detail-sprite"),
        game.spriteClips.find(m.species, "detail"),
      );
    root
      .querySelectorAll("[data-summary-page]")
      .forEach(
        (button) =>
          (button.onclick = () => next(Number(button.dataset.summaryPage))),
      );
    root.querySelector("[data-summary-back]").onclick = back;
    root.querySelectorAll("[data-summary-move]").forEach(
      (button) =>
        (button.onfocus = () => {
          const move = db.moves[m.moves[Number(button.dataset.summaryMove)].id];
          const panel = root.querySelector("[data-summary-move-info]");
          if (panel)
            panel.textContent =
              page === 2
                ? move.description || ""
                : move.contest?.description || "华丽大赛资料尚未收录。";
          const values = root.querySelector("[data-summary-move-values]");
          if (values)
            values.textContent =
              page === 2
                ? `威力 ${move.power || "—"}\n命中 ${move.accuracy || "—"}`
                : "";
        }),
    );
    for (const slot of ["monster.detail", "monster.content"])
      game.ui?.extensions?.mountSlot(
        slot,
        root.querySelector(`[data-extension-slot="${slot}"]`),
        { uid: m.uid },
        () => showMonster(index, { back, inBattle, page }),
      );
    if (m.egg) return;
    $("held-item").disabled = inBattle;
    $("growth-options").disabled = inBattle;
    $("lead").disabled = inBattle || index === 0;
    $("use-potion").disabled =
      inBattle ||
      !game.itemQuantity("potion") ||
      m.hp <= 0 ||
      m.hp === m.stats.hp;
    $("held-item").onclick = () =>
      showEquipment(m.uid, index, {
        back: () => showMonster(index, { back, inBattle, page }),
      });
    $("growth-options").onclick = () => showEvolutionOptions(index);
    $("lead").onclick = () => {
      game.setLead(index);
      updateSide();
      game.save();
      showParty();
    };
    $("use-potion").onclick = () => {
      const result = game.useItem("potion", index);
      if (!result.ok) {
        game.ui.toast(result.reason);
        return;
      }
      updateSide();
      game.save();
      showMonster(index, { back, inBattle, page });
    };
  }

  function showEquipment(uid, index, { back = () => showMonster(index) } = {}) {
    const mon = game.state.party.find((m) => m.uid === uid);
    if (!mon) return;
    const choices = Object.entries(ITEMS).filter(
      ([id]) => game.equipment.definitions[id] && game.itemQuantity(id) > 0,
    );
    modal(
      "持有道具",
      `<p>当前持有：${escapeHTML(ITEMS[mon.heldItem]?.name || "无")}</p><div class="menu-list">${choices.map(([id, item]) => `<button data-equip="${id}">${escapeHTML(item.name)} × ${game.itemQuantity(id)}<small>${escapeHTML(item.description)}</small></button>`).join("")}${mon.heldItem ? "<button data-remove-held>取下持有道具</button>" : ""}</div>${!choices.length ? "<p>背包里没有可持有的道具。友好商店可以买到树果与训练道具。</p>" : ""}`,
      { back, type: "equipment" },
    );
    const equip = (id) => {
      const result = game.equipItem(uid, id);
      if (result.ok) {
        game.save();
        back();
      } else game.ui.toast(result.reason);
    };
    root
      .querySelectorAll("[data-equip]")
      .forEach(
        (button) => (button.onclick = () => equip(button.dataset.equip)),
      );
    root
      .querySelector("[data-remove-held]")
      ?.addEventListener("click", () => equip(null));
  }
  return { showParty, showMonster, showEquipment };
}
