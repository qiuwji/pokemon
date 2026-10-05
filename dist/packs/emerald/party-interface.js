import { partyMenuCards, partyMenuNavigation } from "./party-menu-view.js";
import { nativeUIControls } from "../../adapters/native-ui-controls.js";
import { experienceAt } from "../../engine/model.js";
import { TYPE_NAMES, STATUS_NAMES, ABILITIES, NATURES } from "./pack.js";
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
    sound,
    showEvolutionOptions,
    showPartyFieldMove,
  },
) {
  const db = game.db,
    ITEMS = game.itemDefinitions;
  const $ = (id) => doc.getElementById(id);
  function showParty(inBattle = false, { selectedUid = null, actionUid = null, swapUid = null } = {}) {
    const party = inBattle ? game.battle.party : game.state.party;
    const selected = party.find(m => m.uid === actionUid);
    const fieldMoves = selected && !inBattle ? game.partyFieldMoveOptions(selected.uid) : [];
    const actions = selected ? [
      ...(inBattle ? [{id:'shift',label:'替换'}] : []),
      {id:'summary',label:'查看能力'},
      ...fieldMoves.map((a,i) => ({id:`field:${i}`,label:a.name,field:true})),
      ...(!inBattle && party.length > 1 ? [{id:'swap',label:'交换'}] : []),
      ...(!inBattle && !selected.egg ? [{id:'item',label:'道具'}] : []),
      {id:'cancel',label:'取消'},
    ] : [];
    const back = () => actionUid || swapUid ? showParty(inBattle,{selectedUid:actionUid || swapUid}) : inBattle ? closeModal() : showMenu();
    modal(inBattle ? '替换宝可梦' : '宝可梦',
      '<div data-native-party>' + partyMenuCards(party, {db,escapeHTML,hpTrack,selectedUid:actionUid || selectedUid}) + '</div>' +
      `<div class="party-prompt">${escapeHTML(selected ? `对${selected.egg ? '蛋' : db.species[selected.species].name}做什么？` : swapUid ? '要和哪只宝可梦交换？' : party.length ? '请选择宝可梦。' : '还没有宝可梦。')}</div><button class="party-cancel" data-party-cancel>取消</button>` +
      (selected ? `<div class="party-action-menu">${actions.map(a => `<button data-party-action="${a.id}"${a.field ? ' class="field-move"' : ''}>${escapeHTML(a.label)}</button>`).join('')}</div>` : '') +
      '<div data-extension-slot="party.list"></div><div data-extension-slot="party.actions"></div><div data-extension-slot="party.content"></div>',
      {back,type:'party',close:false,navigate:dir=>partyMenuNavigation(root,doc,dir)},
    );
    root.querySelectorAll('[data-mon]').forEach(button => button.onclick = () => {
      const mon = party[Number(button.dataset.mon)];
      if (swapUid) {
        if (mon.uid !== swapUid && !game.swapParty(swapUid,mon.uid)) return;
        updateSide(); game.save(); showParty(false,{selectedUid:mon.uid});
      } else showParty(inBattle,{actionUid:mon.uid});
      sound('emerald:confirm');
    });
    const cancel = root.querySelector('[data-party-cancel]');
    if (cancel) cancel.onclick = back;
    root.querySelectorAll('[data-party-action]').forEach(button => button.onclick = () => {
      const id = button.dataset.partyAction, index = party.findIndex(m => m.uid === selected.uid);
      sound('emerald:confirm');
      if (id === 'summary') showMonster(index,{back:()=>showParty(inBattle,{actionUid:selected.uid}),inBattle});
      else if (id === 'shift') {closeModal(); void game.turn({kind:'switch',index});}
      else if (id === 'swap') showParty(false,{swapUid:selected.uid,selectedUid:selected.uid});
      else if (id === 'item') showEquipment(selected.uid,index,{back:()=>showParty(false,{actionUid:selected.uid})});
      else if (id === 'cancel') back();
      else if (id.startsWith('field:')) showPartyFieldMove(selected.uid,fieldMoves[Number(id.slice(6))].move);
    });
    game.ui?.extensions?.mountSlot('party.list',root.querySelector('[data-extension-slot="party.list"]'),
      {inBattle},()=>showParty(inBattle,{selectedUid,actionUid,swapUid}),{
        nativeRoot:root.querySelector('[data-native-party]'),
        controls:nativeUIControls(root.querySelectorAll('[data-mon]'),button=>`party:${button.dataset.mon}`),
      });
    for (const slot of ['party.actions','party.content'])
      game.ui?.extensions?.mountSlot(slot,root.querySelector(`[data-extension-slot="${slot}"]`),
        {inBattle,...(selected ? {uid:selected.uid} : {})},()=>showParty(inBattle,{actionUid}));
    if (selected) root.querySelector('[data-party-action]')?.focus();
    else root.querySelector(`[data-mon="${Math.max(0,party.findIndex(m=>m.uid===selectedUid))}"]`)?.focus();
  }

  function showMonster(index, { back = () => showParty(), inBattle = false } = {}) {
    const m = (inBattle ? game.battle.party : game.state.party)[index];
    if (!m) return;
    const s = db.species[m.species];
    if (m.egg) {
      modal(
        "宝可梦的蛋",
        `<div class="detail-row"><img src="assets/egg-front.png" alt="蛋"><div><p>从育成研究中收到的蛋。</p><p>${m.egg.cycles > 10 ? "看起来还需要一段时间才能孵化。" : "里面能听到声音。好像快要孵出来了！"}</p></div></div><p>带着它一起行走吧。蛋不能参加战斗、使用伤药或携带道具。</p>`,
        { back, type: "detail" },
      );
      return;
    }
    modal(
      s.name,
      `<div class="detail-row"><canvas id="detail-sprite" class="detail-sprite" width="64" height="64" role="img" aria-label="${escapeHTML(s.name)}"></canvas><div><p>Lv.${m.level} · ${m.gender} · ${s.types.map((t) => TYPE_NAMES[t]).join(" / ")}</p><p>${NATURES[m.nature]}性格 · 特性：${ABILITIES[m.ability] || m.ability}</p><p>持有：${ITEMS[m.heldItem]?.name || "无"}</p><p>HP ${m.hp} / ${m.stats.hp} ${m.status ? " · " + STATUS_NAMES[m.status] : ""}</p><p>距离升级还需 ${Math.max(0, experienceAt(m.level + 1, s.growth) - m.exp)} 点经验</p></div></div><div class="detail-stats">${Object.entries(
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
        )}</div><div class="inline-actions"><button class="secondary-button" id="growth-options" ${inBattle ? "disabled" : ""}>伙伴的成长</button><button class="secondary-button" id="held-item" ${inBattle ? "disabled" : ""}>持有道具</button><button class="secondary-button" id="lead" ${inBattle || index === 0 ? "disabled" : ""}>设为首发</button><button class="secondary-button" id="use-potion" ${inBattle || !game.itemQuantity("potion") || m.hp <= 0 || m.hp === m.stats.hp ? "disabled" : ""}>使用伤药 (${game.itemQuantity("potion")})</button></div>`,
      { back, type: "detail" },
    );
    mountSprite($("detail-sprite"), game.spriteClips.find(m.species, "detail"));
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
