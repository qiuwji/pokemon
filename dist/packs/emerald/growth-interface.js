/** Reusable controls are supplied by the page shell; all mutations go through application commands. */
export function createGrowthInterface(
  game,
  {
    document: doc,
    spriteURL,
    modal,
    closeModal,
    showMenu,
    showMonster,
    root,
    toast,
    updateSide,
    escapeHTML,
  },
) {
  const db = game.db,
    $ = (id) => doc.getElementById(id);
  const name = (mon) =>
    mon.egg ? "宝可梦的蛋" : game.db.species[mon.species].name;
  const redraw = (result) => {
    if (!result.ok)
      toast(result.reason || "请保留一位能战斗的伙伴，并在队伍里留出空位。");
    updateSide();
    game.save();
    showDaycare();
  };
  function showDaycare() {
    if (!game.canUseDaycare()) {
      toast("请到小田卷博士研究所参加育成研究。");
      return;
    }
    const view = game.daycareView();
    modal(
      "研究所 · 育成研究",
      `<p>请研究员照顾伙伴。外出行走可以积累经验；有合适的两位伙伴时，也可能发现一颗蛋。</p>
      <div class="menu-grid">${view.slots.map((s) => `<div class="save-box"><strong>${escapeHTML(s.name)}</strong><p>Lv.${s.mon.level} · 领回费用 ¥${s.price}</p><button class="secondary-button" data-withdraw="${escapeHTML(s.uid)}">领回伙伴</button></div>`).join("")}</div>
      <p>${view.slots.length === 2 ? (view.compatibility >= 50 ? "两位伙伴相处得很好。" : view.compatibility ? "两位伙伴相处得还不错。" : "两位伙伴更喜欢和其他宝可梦一起玩。") : "最多可以同时寄存两位伙伴。"}</p>
      ${view.egg ? '<button class="primary-button" data-collect>发现了一颗蛋 · 领取</button>' : ""}
      <h3>选择寄存的伙伴</h3><div class="menu-grid">${game.state.party.map((m) => `<button class="menu-tile" data-deposit="${escapeHTML(m.uid)}" ${m.egg || view.slots.length >= 2 ? "disabled" : ""}>${escapeHTML(name(m))}<small>Lv.${m.level}</small></button>`).join("")}</div>
      <button class="secondary-button" data-trades>与研究员交换伙伴</button><p>蛋需要随队行走才能孵化。火焰之躯或熔岩铠甲可以缩短孵化时间。</p>`,
      { back: showMenu, type: "daycare" },
    );
    root
      .querySelectorAll("[data-deposit]")
      .forEach(
        (b) =>
          (b.onclick = () => redraw(game.depositDaycare(b.dataset.deposit))),
      );
    root
      .querySelectorAll("[data-withdraw]")
      .forEach(
        (b) =>
          (b.onclick = () => redraw(game.withdrawDaycare(b.dataset.withdraw))),
      );
    const collect = root.querySelector("[data-collect]");
    if (collect)
      collect.onclick = async () => {
        closeModal();
        const result = await game.collectEgg();
        redraw(result);
      };
    root.querySelector("[data-trades]").onclick = () => {
      game.prepareTradePartner();
      showTrades();
    };
  }
  function showTrades(selectedUid = null) {
    const selected = game.state.party.find((m) => m.uid === selectedUid);
    modal(
      "研究员 · 交换伙伴",
      `<p>选择你想送出的伙伴，再选择研究员的伙伴。双方会保留各自收到的宝可梦；之后还可以交换回来。</p><h3>你的伙伴</h3><div class="menu-grid">${game.state.party.map((m) => `<button class="menu-tile" data-offer="${escapeHTML(m.uid)}">${escapeHTML(name(m))}<small>${m.uid === selectedUid ? "已选择" : `Lv.${m.level}`}</small></button>`).join("")}</div><h3>研究员的伙伴</h3><div class="menu-grid">${game.state.tradePartner.map((m) => `<button class="menu-tile" data-receive="${escapeHTML(m.uid)}" ${selected ? "" : "disabled"}>${escapeHTML(name(m))}<small>Lv.${m.level}</small></button>`).join("")}</div>`,
      { back: showDaycare, type: "trade" },
    );
    root
      .querySelectorAll("[data-offer]")
      .forEach((b) => (b.onclick = () => showTrades(b.dataset.offer)));
    root.querySelectorAll("[data-receive]").forEach(
      (b) =>
        (b.onclick = async () => {
          const uid = b.dataset.receive;
          closeModal();
          const result = await game.performTrade(selectedUid, uid);
          if (!result.ok) toast(result.reason || "现在不能交换伙伴。");
          updateSide();
          game.save();
          checkGrowth();
        }),
    );
  }
  function showEvolutionOptions(index) {
    const mon = game.state.party[index];
    if (!mon || mon.egg) return;
    const options = Object.entries(game.state.bag).flatMap(([id, amount]) => {
      if (!amount) return [];
      const plan = game.evolutionPlan(mon, { trigger: "item", item: id });
      return plan ? [{ id, plan }] : [];
    });
    modal(
      "伙伴的成长",
      `<p>亲密度：${mon.friendship ?? 70} · 美丽度：${mon.beauty ?? 0}</p><p>某些伙伴需要进化石，或在交换时携带特定道具；还有伙伴的成长与亲密度、时间、能力或个体性格有关。</p><div class="menu-grid">${options.map(({ id, plan }) => `<button class="menu-tile" data-stone="${escapeHTML(id)}">使用 ${escapeHTML(game.items.definitions[id].name)}<small>进化为 ${escapeHTML(game.db.species[plan.to].name)}</small></button>`).join("")}</div>${options.length ? "" : "<p>目前没有可使用的进化道具。</p>"}`,
      { back: () => showMonster(index), type: "growth" },
    );
    root.querySelectorAll("[data-stone]").forEach(
      (b) =>
        (b.onclick = async () => {
          const selected = options.find((v) => v.id === b.dataset.stone);
          closeModal();
          const result = await game.animateEvolution(mon, selected.plan);
          toast(
            result.ok
              ? `进化成了 ${game.db.species[mon.species].name}！`
              : result.reason || "进化条件已变化。",
          );
          updateSide();
          game.save();
          checkGrowth();
        }),
    );
  }
  function checkGrowth() {
    if (game.ui?.dialog || root.children.length || game.battle || game.busy)
      return;
    for (const mon of game.state.party) {
      if (mon.egg) continue;
      if (mon.pendingMoves?.length) {
        const id = mon.pendingMoves[0];
        modal(
          "学习新的招式",
          `<p>${db.species[mon.species].name} 想学习 ${db.moves[id].name}，但是已经掌握了四个招式。选择要忘记的招式。</p><div class="move-list">${mon.moves.map((s, i) => `<button class="move-summary" data-forget="${i}">${db.moves[s.id].name}<small>PP ${s.pp} / ${db.moves[s.id].pp}</small></button>`).join("")}</div><div class="inline-actions"><button id="skip-move" class="secondary-button">不学习这个招式</button></div>`,
          { type: "learning", close: false },
        );
        const done = (i) => {
          game.learnMove(mon, i);
          closeModal();
          updateSide();
          game.save();
          checkGrowth();
        };
        root
          .querySelectorAll("[data-forget]")
          .forEach((b) => (b.onclick = () => done(+b.dataset.forget)));
        $("skip-move").onclick = () => done(null);
        return;
      }
      const evolution = game.evolutionPlan(mon);
      if (evolution) {
        modal(
          "伙伴正在进化",
          `<div class="detail-row"><img src="${escapeHTML(spriteURL(mon.species))}" alt=""><div><p>${db.species[mon.species].name} 身上出现了光芒！</p><p>它将进化成 ${db.species[evolution.to].name}。</p></div></div><div class="choice-actions"><button class="primary-button" id="evolve">继续进化</button><button class="secondary-button" id="cancel-evolve">停止进化</button></div>`,
          { type: "evolution", close: false },
        );
        $("evolve").onclick = async () => {
          closeModal();
          const result = await game.animateEvolution(mon, evolution);
          toast(
            result.ok
              ? `进化成了 ${db.species[mon.species].name}！`
              : result.reason || "进化未完成。",
          );
          updateSide();
          game.save();
          checkGrowth();
        };
        $("cancel-evolve").onclick = () => {
          game.evolve(mon, { cancel: true, plan: evolution });
          closeModal();
          game.save();
          checkGrowth();
        };
        return;
      }
    }
    game.save();
  }
  return { showDaycare, showEvolutionOptions, checkGrowth };
}
