import { experienceAt } from "../../engine/model.js";
import { TYPE_NAMES, STATUS_NAMES, ABILITIES, NATURES } from "./pack.js";
/** Owns this page and its navigation; gameplay changes are application commands. */
export function createPartyInterface(
  game,
  {
    document: doc,
    spriteURL,
    modal,
    closeModal,
    showMenu,
    root,
    partyCard,
    updateSide,
    escapeHTML,
    sound,
    showEvolutionOptions,
  },
) {
  const db = game.db,
    ITEMS = game.itemDefinitions;
  const $ = (id) => doc.getElementById(id);
  function showParty(inBattle = false) {
    modal(
      inBattle ? "替换宝可梦" : "我的队伍",
      (game.state.party.length
        ? (inBattle ? game.battle.party : game.state.party)
            .map((m, i) => partyCard(m, i))
            .join("")
        : `<p>还没有宝可梦。到 101 号道路调查博士的背包，选择你的搭档。</p>`) +
        '<div data-extension-slot="party.actions"></div><div data-extension-slot="party.content"></div>',
      { back: inBattle ? closeModal : showMenu, type: "party" },
    );
    for (const slot of ["party.actions", "party.content"])
      game.ui?.extensions?.mountSlot(
        slot,
        root.querySelector(`[data-extension-slot="${slot}"]`),
        { inBattle },
        () => showParty(inBattle),
      );
    root
      .querySelectorAll("[data-mon]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            inBattle
              ? game.turn({ kind: "switch", index: +b.dataset.mon })
              : showMonster(+b.dataset.mon)),
      );
  }

  function showMonster(index) {
    const m = game.state.party[index];
    if (!m) return;
    const s = db.species[m.species];
    if (m.egg) {
      modal(
        "宝可梦的蛋",
        `<div class="detail-row"><img src="assets/egg-front.png" alt="蛋"><div><p>从育成研究中收到的蛋。</p><p>${m.egg.cycles > 10 ? "看起来还需要一段时间才能孵化。" : "里面能听到声音。好像快要孵出来了！"}</p></div></div><p>带着它一起行走吧。蛋不能参加战斗、使用伤药或携带道具。</p>`,
        { back: () => showParty(), type: "detail" },
      );
      return;
    }
    modal(
      s.name,
      `<div class="detail-row"><img src="${escapeHTML(spriteURL(m.species))}" alt="${s.name}"><div><p>Lv.${m.level} · ${m.gender} · ${s.types.map((t) => TYPE_NAMES[t]).join(" / ")}</p><p>${NATURES[m.nature]}性格 · 特性：${ABILITIES[m.ability] || m.ability}</p><p>持有：${ITEMS[m.heldItem]?.name || "无"}</p><p>HP ${m.hp} / ${m.stats.hp} ${m.status ? " · " + STATUS_NAMES[m.status] : ""}</p><p>距离升级还需 ${Math.max(0, experienceAt(m.level + 1, s.growth) - m.exp)} 点经验</p></div></div><div class="detail-stats">${Object.entries(
        {
          hp: "体力",
          atk: "攻击",
          def: "防御",
          spa: "特攻",
          spd: "特防",
          spe: "速度",
        },
      )
        .map(([k, v]) => `<div>${v}<strong>${m.stats[k]}</strong></div>`)
        .join("")}</div><div class="move-list">${m.moves
        .map((slot) => {
          const v = db.moves[slot.id];
          return `<div class="move-summary">${v.name}<small>${TYPE_NAMES[v.type]} · 威力 ${v.power || "—"} · PP ${slot.pp} / ${v.pp}</small></div>`;
        })
        .join(
          "",
        )}</div><div class="inline-actions"><button class="secondary-button" id="growth-options">伙伴的成长</button><button class="secondary-button" id="held-item">持有道具</button><button class="secondary-button" id="lead" ${index === 0 ? "disabled" : ""}>设为首发</button><button class="secondary-button" id="use-potion" ${!game.itemQuantity("potion") || m.hp <= 0 || m.hp === m.stats.hp ? "disabled" : ""}>使用伤药 (${game.itemQuantity("potion")})</button></div>`,
      { back: () => showParty(), type: "detail" },
    );
    game.ui?.extensions?.mountSlot(
      "monster.detail",
      root.querySelector(".inline-actions"),
      { uid: m.uid },
      () => showMonster(game.state.party.findIndex((mon) => mon.uid === m.uid)),
    );
    game.ui?.extensions?.mountSlot(
      "monster.content",
      root.querySelector(".detail-stats"),
      { uid: m.uid },
      () => showMonster(game.state.party.findIndex((mon) => mon.uid === m.uid)),
    );
    $("held-item").onclick = () => showEquipment(m.uid, index);
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
      showMonster(index);
      sound("emerald:confirm");
    };
  }

  function showEquipment(uid, index) {
    const mon = game.state.party.find((m) => m.uid === uid);
    if (!mon) return;
    const choices = Object.entries(ITEMS).filter(
      ([id]) => game.equipment.definitions[id] && game.itemQuantity(id) > 0,
    );
    modal(
      "持有道具",
      `<p>当前持有：${escapeHTML(ITEMS[mon.heldItem]?.name || "无")}</p><div class="menu-list">${choices.map(([id, item]) => `<button data-equip="${id}">${escapeHTML(item.name)} × ${game.itemQuantity(id)}<small>${escapeHTML(item.description)}</small></button>`).join("")}${mon.heldItem ? "<button data-remove-held>取下持有道具</button>" : ""}</div>${!choices.length ? "<p>背包里没有可持有的道具。友好商店可以买到树果与训练道具。</p>" : ""}`,
      { back: () => showMonster(index), type: "equipment" },
    );
    const equip = (id) => {
      const result = game.equipItem(uid, id);
      if (result.ok) {
        game.save();
        showMonster(index);
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
