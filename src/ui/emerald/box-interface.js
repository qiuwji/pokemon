import { monsterIconURL, listNavigation } from "./ui/native-view.js";
import { partyMenuCards, partyMenuNavigation } from "./party-menu-view.js";
import { summaryPage } from "./ui/summary-view.js";
/** Screens own selection only; transfers and ordering use the host command facade. */
export function createBoxInterface(game, {
  modal, showMenu, closeModal, root, document: doc, hpTrack, updateSide,
  spriteURL, escapeHTML: esc, toast = () => {}, mountSprite,
}) {
  let box = 0, back = showMenu, selectedUid = null, swapUid = null;
  const name = mon => mon.egg ? "蛋" : mon.nickname || game.db.species[mon.species].name;
  const boxIndex = uid => game.state.box.findIndex(mon => mon.uid === uid);
  const partyIndex = uid => game.state.party.findIndex(mon => mon.uid === uid);
  const capacity = () => game.partyStorage?.boxLimit || 200;
  function finish(ok, message, redraw) {
    if (ok) { updateSide(); game.save(); }
    else toast(message);
    selectedUid = null;
    redraw();
  }
  function showPC() {
    back = showPC;
    selectedUid = swapUid = null;
    modal("宝可梦电脑", '<div class="native-window"><p>已连接宝可梦存储系统。<br>想做什么？</p><button data-pc="withdraw">取出宝可梦</button><button data-pc="deposit">存入宝可梦</button><button data-pc="organize">整理宝可梦</button><button data-pc="exit">关闭电脑</button></div>',
      { type: "pc", back: closeModal, close: false });
    root.querySelectorAll("[data-pc]").forEach(button => button.onclick = () => {
      const action = button.dataset.pc;
      if (action === "exit") closeModal();
      else if (action === "deposit") showDeposit(showPC);
      else showBox({ back: showPC });
    });
  }
  function showDeposit(returnTo = showBox) {
    modal("存入宝可梦", `<div data-native-party>${partyMenuCards(game.state.party, { db: game.db, escapeHTML: esc, hpTrack })}</div><div class="party-prompt">选择要存入电脑的宝可梦。<br>队伍需保留一只可以战斗的伙伴。</div><button class="party-cancel" data-deposit-back>取消</button>`,
      { type: "box-swap", close: false, back: returnTo, navigate: dir => partyMenuNavigation(root, doc, dir) });
    root.querySelector("[data-deposit-back]").onclick = returnTo;
    root.querySelectorAll("[data-mon]").forEach(button => {
      const uid = game.state.party[Number(button.dataset.mon)].uid;
      button.onclick = () => finish(game.depositBox(partyIndex(uid)),
        game.state.box.length >= capacity() ? "电脑已满，无法存入。" : "队伍中必须留下一只可以战斗的宝可梦。", () => showDeposit(returnTo));
    });
  }
  function showSwap(uid) {
    modal("选择交换的宝可梦", `<div data-native-party>${partyMenuCards(game.state.party, { db: game.db, escapeHTML: esc, hpTrack })}</div><div class="party-prompt">要和哪只宝可梦交换？</div><button class="party-cancel" data-swap-back>取消</button>`,
      { type: "box-swap", close: false, back: showBox, navigate: dir => partyMenuNavigation(root, doc, dir) });
    root.querySelector("[data-swap-back]").onclick = () => showBox();
    root.querySelectorAll("[data-mon]").forEach(button => {
      const partyUid = game.state.party[Number(button.dataset.mon)].uid;
      button.onclick = () => finish(game.exchangeBox(boxIndex(uid), partyIndex(partyUid)), "无法交换，请保留一只可以战斗的宝可梦。", showBox);
    });
  }
  function showSummary(uid, page = 0) {
    const mon = game.state.box.find(m => m.uid === uid);
    if (!mon) { showBox(); return; }
    const next = delta => showSummary(uid, (page + delta + 4) % 4);
    modal(name(mon), summaryPage(mon, { db: game.db, items: game.itemDefinitions, page,
      escapeHTML: esc, playerName: game.state.playerName, tools: false }),
      { type: "detail", close: false, back: showBox, navigate: dir => listNavigation(root, doc, "[data-summary-page], [data-summary-back]", dir, next) });
    if (!mon.egg && mountSprite) mountSprite(doc.getElementById("detail-sprite"), game.spriteClips.find(mon.species, "detail"));
    root.querySelector("[data-summary-back]").onclick = () => showBox();
    root.querySelectorAll("[data-summary-page]").forEach(button => button.onclick = () => next(Number(button.dataset.summaryPage)));
    root.querySelectorAll("[data-summary-move]").forEach(button => button.onfocus = () => {
      root.querySelector("[data-summary-move-info]").textContent = game.db.moves[mon.moves[Number(button.dataset.summaryMove)].id].description || "";
    });
  }
  function showBox(options = {}) {
    if (options.back) { back = options.back; selectedUid = swapUid = null; }
    const count = Math.max(1, Math.ceil(game.state.box.length / 30));
    box = Math.min(box, count - 1);
    const start = box * 30, selected = game.state.box.find(mon => mon.uid === selectedUid);
    modal("宝可梦电脑", `<div class="box-heading"><button data-box-page="-1" aria-label="上一个盒子">◀</button><span>盒子 ${box + 1}</span><button data-box-page="1" aria-label="下一个盒子">▶</button></div><div class="box-preview"><img data-box-preview alt="" hidden><div data-box-name>请选择宝可梦。</div></div><div class="storage-slots">${Array.from({ length: 30 }, (_, slot) => {
      const mon = game.state.box[start + slot];
      return mon ? `<button data-box="${esc(mon.uid)}" aria-label="${esc(name(mon))}"><span class="storage-icon"><img src="${esc(monsterIconURL(mon, game.db.resources))}" alt=""></span></button>` : '<span class="storage-empty"></span>';
    }).join("")}</div><div class="storage-footer">${game.state.box.length}/${capacity()} 只<br>${swapUid ? "选择要交换位置的宝可梦；取消可放弃整理。" : "队伍 " + game.state.party.length + "/6"}</div><div class="storage-controls"><button data-box-deposit>存入</button><button data-box-close>返回</button></div>${selected ? `<div class="box-actions native-window"><p>${esc(name(selected))}</p><button data-box-action="withdraw">取出</button><button data-box-action="exchange">与队伍交换</button><button data-box-action="summary">查看能力</button><button data-box-action="move">交换位置</button><button data-box-action="cancel">取消</button></div>` : ""}`,
      { type: "box", back: selectedUid || swapUid ? () => { selectedUid = swapUid = null; showBox(); } : () => back(), close: false,
        navigate: dir => selected ? listNavigation(root, doc, "[data-box-action]", dir) : listNavigation(root, doc, "[data-box], [data-box-deposit], [data-box-close]", dir,
          delta => { box = (box + delta + count) % count; showBox(); }) });
    root.querySelectorAll("[data-box-page]").forEach(button => button.onclick = () => { box = (box + Number(button.dataset.boxPage) + count) % count; selectedUid = null; showBox(); });
    root.querySelector("[data-box-close]").onclick = () => { selectedUid = swapUid = null; back(); };
    root.querySelector("[data-box-deposit]").onclick = () => showDeposit(showBox);
    root.querySelectorAll("[data-box]").forEach(button => {
      const uid = button.dataset.box, mon = game.state.box.find(m => m.uid === uid);
      button.onfocus = () => {
        const img = root.querySelector("[data-box-preview]");
        img.hidden = false; img.src = spriteURL(mon.egg ? "egg" : mon.species);
        root.querySelector("[data-box-name]").textContent = mon.egg ? "蛋" : `${name(mon)} Lv.${mon.level} HP ${mon.hp}/${mon.stats.hp}`;
      };
      button.onclick = () => {
        if (swapUid) { const from = swapUid; swapUid = null; finish(game.swapBox(boxIndex(from), boxIndex(uid)), "请选择另一只宝可梦。", showBox); }
        else { selectedUid = uid; showBox(); }
      };
    });
    root.querySelectorAll("[data-box-action]").forEach(button => button.onclick = () => {
      const uid = selectedUid, action = button.dataset.boxAction;
      selectedUid = null;
      if (action === "withdraw") {
        if (game.state.party.length >= 6) { toast("队伍已满，请选择一只伙伴交换。"); showSwap(uid); }
        else finish(game.withdrawBox(boxIndex(uid)), "暂时无法取出这只宝可梦。", showBox);
      } else if (action === "exchange") showSwap(uid);
      else if (action === "summary") showSummary(uid);
      else if (action === "move") { swapUid = uid; showBox(); }
      else showBox();
    });
    root.querySelector(selected ? "[data-box-action]" : "[data-box]")?.focus();
  }
  return { showBox, showPC };
}
