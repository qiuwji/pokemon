/** Navigation and controls only; permissions, movement and travel are application services. */
export function createMovementInterface(
  game,
  { modal, closeModal, showMenu, root, toast, escapeHTML },
) {
  function showMovement() {
    const modes = game.movementOptions(),
      flights = game.travel.list(),
      training = game.state.flags.fieldTraining;
    modal(
      "旅行与移动",
      `<p>当前：${escapeHTML(modes.find((v) => v.id === game.state.movement.mode)?.name || "冲浪")}</p>
      <div class="menu-grid">${modes.map((v) => `<button class="menu-tile" data-mode="${v.id}" ${v.allowed ? "" : "disabled"}>${escapeHTML(v.name)}<small>${v.allowed ? "切换移动方式" : "尚未获得或此处不能骑车"}</small></button>`).join("")}</div>
      <h3>飞往已到访的城镇</h3><div class="menu-grid">${flights.map((v) => `<button class="menu-tile" data-flight="${v.id}" ${v.ok ? "" : "disabled"}>${escapeHTML(v.name)}<small>${v.ok ? "准备起飞" : escapeHTML(v.reason)}</small></button>`).join("")}</div>
      ${!training ? `<p>完成博士的图鉴委托后，可以借用两辆研究用自行车，并在本次野外研究中试用冲浪与飞行。</p><button class="primary-button" data-equipment ${game.state.flags.pokedex ? "" : "disabled"}>领取研究用移动装备</button>` : `<p>已借用研究装备。面对水面按 A 使用冲浪，靠岸后自动改为步行。</p>`}`,
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
    root.querySelectorAll("[data-flight]").forEach(
      (button) =>
        (button.onclick = async () => {
          const id = button.dataset.flight;
          closeModal();
          const result = await game.flyTo(id);
          if (!result.ok) toast(result.reason);
        }),
    );
    const equipment = root.querySelector("[data-equipment]");
    if (equipment)
      equipment.onclick = () => {
        if (game.claimFieldEquipment()) {
          game.save();
          showMovement();
        }
      };
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
  return { showMovement, showSurf };
}
