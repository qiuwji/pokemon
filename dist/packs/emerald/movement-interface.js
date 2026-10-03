/** Navigation and controls only; permissions, movement and travel are application services. */
export function createMovementInterface(
  game,
  { modal, closeModal, showMenu, root, toast, escapeHTML },
) {
  function showMovement() {
    const modes = game.movementOptions(),
      fieldActions = game.fieldActionOptions(),
      techniques = game.movementTechniqueOptions(),
      flights = game.travel.list();
    modal(
      "旅行与移动",
      `<p>当前：${escapeHTML(modes.find((v) => v.id === game.state.movement.mode)?.name || "冲浪")}</p>
      <div class="menu-grid">${modes.map((v) => `<button class="menu-tile" data-mode="${v.id}" ${v.allowed ? "" : "disabled"}>${escapeHTML(v.name)}<small>${v.allowed ? "切换移动方式" : "尚未获得或此处不能骑车"}</small></button>`).join("")}</div>
      ${techniques.length > 1 ? `<h3>骑行技巧</h3><div class="menu-grid">${techniques.map((v) => `<button class="menu-tile" data-technique="${escapeHTML(v.id)}">${escapeHTML(v.name)}</button>`).join("")}</div>` : ""}
      <h3>野外行动</h3><div class="menu-grid">${fieldActions.map((v, index) => `<button class="menu-tile" data-field-action="${index}" ${v.ok ? "" : "disabled"}>${escapeHTML(v.name)}<small>${v.ok ? "使用野外行动" : escapeHTML(v.reason)}</small></button>`).join("")}</div>
      <h3>飞往已到访的城镇</h3><div class="menu-grid">${flights.map((v) => `<button class="menu-tile" data-flight="${v.id}" ${v.ok ? "" : "disabled"}>${escapeHTML(v.name)}<small>${v.ok ? "准备起飞" : escapeHTML(v.reason)}</small></button>`).join("")}</div>
      <p>自行车需要实际持有对应道具；冲浪和飞行需要相应徽章与招式。</p>`,
      { back: showMenu, type: "movement" },
    );
    root.querySelectorAll("[data-mode]").forEach(
      (button) =>
        (button.onclick = () => {
          const result = game.setMovementMode(button.dataset.mode);
          if (!result.ok) toast(result.reason);
          else {
            closeModal();
            game.save();
          }
        }),
    );
    root.querySelectorAll("[data-technique]").forEach((button) => {
      button.onclick = () => {
        const result = game.setMovementTechnique(button.dataset.technique);
        if (!result.ok) toast(result.reason);
        else closeModal();
      };
    });
    root.querySelectorAll("[data-flight]").forEach(
      (button) =>
        (button.onclick = async () => {
          const id = button.dataset.flight;
          closeModal();
          const result = await game.flyTo(id);
          if (!result.ok) toast(result.reason);
        }),
    );
    root.querySelectorAll("[data-field-action]").forEach(
      (button) =>
        (button.onclick = async () => {
          const action = fieldActions[Number(button.dataset.fieldAction)];
          closeModal();
          const result = await game.performFieldAction(
            action.id,
            action.input || {},
          );
          if (!result.ok) toast(result.reason);
        }),
    );
  }
  function showSurf() {
    const available = game.fieldCapabilities().surf;
    modal(
      "水面在轻轻摇晃",
      `<p>${available ? "要和伙伴一起使用冲浪吗？" : "如果有能够冲浪的伙伴和相应的徽章，就可以渡过水面。"}</p><div class="choice-actions"><button class="primary-button" data-surf ${available ? "" : "disabled"}>使用冲浪</button><button class="secondary-button" data-cancel>返回</button></div>`,
      { back: closeModal, type: "surf" },
    );
    root.querySelector("[data-cancel]").onclick = closeModal;
    root.querySelector("[data-surf]").onclick = async () => {
      closeModal();
      const result = await game.boardSurf();
      if (!result.ok) toast(result.reason);
      else game.save();
    };
  }
  function showFieldAction(id) {
    const action = game.fieldActionOptions().find((entry) => entry.id === id);
    if (!action) return;
    modal(
      action.name,
      `<p>${escapeHTML(action.ok ? "要使用这项野外行动吗？" : action.reason)}</p><button data-use-field-action ${action.ok ? "" : "disabled"}>${escapeHTML(action.name)}</button><button data-cancel>返回</button>`,
      { back: closeModal, type: "field-action" },
    );
    root.querySelector("[data-cancel]").onclick = closeModal;
    root.querySelector("[data-use-field-action]").onclick = async () => {
      closeModal();
      const result = await game.performFieldAction(
        action.id,
        action.input || {},
      );
      if (!result.ok) toast(result.reason);
    };
  }
  function showFishing() {
    modal(
      "钓鱼",
      `<p data-fishing-text>正在抛竿……</p><button data-reel>收竿</button><button data-cancel-fishing>收起鱼竿</button>`,
      { back: () => game.reelFishing({ cancel: true }), type: "fishing" },
    );
    root.querySelector("[data-reel]").onclick = () => game.reelFishing();
    root.querySelector("[data-cancel-fishing]").onclick = () =>
      game.reelFishing({ cancel: true });
  }
  function updateFishing(view) {
    const text = root.querySelector("[data-fishing-text]");
    if (text)
      text.textContent =
        view.phase === "wait"
          ? "·".repeat(view.dots) || "等待鱼儿……"
          : view.phase === "bite"
            ? "咬钩了！快收竿！"
            : view.result === "caught"
              ? "钓到宝可梦了！"
              : view.result === "no-bite"
                ? "连一口都没咬……"
                : view.result === "escaped"
                  ? "鱼儿逃走了……"
                  : "正在抛竿……";
  }
  function closeFishing() {
    closeModal();
  }
  return {
    showMovement,
    showSurf,
    showFieldAction,
    showFishing,
    updateFishing,
    closeFishing,
  };
}
