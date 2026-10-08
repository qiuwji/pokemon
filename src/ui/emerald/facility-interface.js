/** Generic activity menu. Custom contest/game-room pages may use the same public commands. */
export function createFacilityInterface(
  game,
  { modal, root, showMenu, toast, escapeHTML },
) {
  function mount(view, selected) {
    for (const slot of ["facility.actions", "facility.content"])
      game.ui?.extensions?.mountSlot(
        slot,
        root.querySelector(".modal"),
        { facility: view.active?.facility || selected || null },
        () => showFacility(selected),
      );
  }
  function showFacility(selected = null) {
    const view = game.facilityView(),
      active = view.active;
    if (!active) {
      const definition = selected && view.definitions[selected];
      if (definition) {
        modal(
          definition.name,
          `<p>项目设施示例。活动中暂不保存；退出或结算后可以保存。</p>${definition.team ? `<p>选择 ${definition.team.min}～${definition.team.max} 位伙伴${definition.team.levelCap ? `，临时等级上限 ${definition.team.levelCap}` : ""}。</p><div class="save-box">${game.state.party.map((m) => `<label><input type="checkbox" data-facility-team value="${escapeHTML(m.uid)}" ${m.egg || m.hp <= 0 ? "disabled" : ""}>${escapeHTML(game.db.species[m.species].name)} Lv.${m.level}</label>`).join("<br>")}</div><p>原队伍、装备和背包不会被临时战斗修改。</p>` : "<p>本活动不需要选队。</p>"}<button data-enter-facility>进入</button>`,
          { type: "facility", back: () => showFacility() },
        );
        root.querySelector("[data-enter-facility]").onclick = () => {
          const team = [
            ...root.querySelectorAll("[data-facility-team]:checked"),
          ].map((node) => node.value);
          const result = game.enterFacility(selected, team);
          if (!result.ok) toast(result.reason);
          else showFacility();
        };
      } else {
        modal(
          "设施与活动",
          `<p>以下为框架示例；完整开拓区、华丽大赛和游戏厅内容尚未填充。</p><div class="menu-grid">${Object.entries(
            view.definitions,
          )
            .map(
              ([id, d]) =>
                `<button class="menu-tile" data-facility="${escapeHTML(id)}">${escapeHTML(d.name)}</button>`,
            )
            .join(
              "",
            )}</div>${view.results.length ? `<p>最近活动：${escapeHTML(view.definitions[view.results.at(-1).facility].name)} · ${{ win: "完成", loss: "挑战失败", quit: "已退出" }[view.results.at(-1).outcome]}</p>` : ""}`,
          { type: "facility", back: showMenu },
        );
        root
          .querySelectorAll("[data-facility]")
          .forEach(
            (node) =>
              (node.onclick = () => showFacility(node.dataset.facility)),
          );
      }
      mount(view, selected);
      return;
    }
    const name = view.definitions[active.facility].name;
    modal(
      name,
      `<div class="save-box">${Object.entries(active.data)
        .map(
          ([key, value]) =>
            `<p>${escapeHTML(key)}：${escapeHTML(Array.isArray(value) ? value.join(" · ") : JSON.stringify(value))}</p>`,
        )
        .join(
          "",
        )}</div><p>活动内暂不保存。当前金钱：¥${game.state.money}</p><div class="inline-actions">${view.actions.map((action) => `<button data-facility-action="${escapeHTML(action.id)}">${escapeHTML(action.label)}</button>`).join("")}${active.phase === "reward" ? "<button data-facility-claim>领取奖励并结束</button>" : ""}<button data-facility-quit>退出活动</button></div>`,
      {
        type: "facility",
        close: false,
        back: () => toast("请使用退出活动按钮。"),
      },
    );
    mount(view, selected);
    const perform = async (operation) => {
      try {
        const result = await operation();
        if (!result.ok) toast(result.reason);
        if (!game.battle) showFacility();
      } catch (error) {
        toast(error.message);
        if (!game.battle) showFacility();
      }
    };
    root
      .querySelectorAll("[data-facility-action]")
      .forEach(
        (node) =>
          (node.onclick = () =>
            void perform(() =>
              game.facilityAction(node.dataset.facilityAction),
            )),
      );
    const claim = root.querySelector("[data-facility-claim]");
    if (claim) claim.onclick = () => void perform(() => game.claimFacility());
    root.querySelector("[data-facility-quit]").onclick = () =>
      void perform(() => game.quitFacility());
  }
  return { showFacility };
}
