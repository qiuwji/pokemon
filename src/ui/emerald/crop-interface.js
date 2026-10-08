/** A plot UI only reads crop snapshots and issues application commands. */
export function createCropInterface(
  game,
  { modal, root, escapeHTML: e, toast, closeModal },
) {
  const labels = {
    empty: "松软的土壤",
    planted: "刚种下的树果",
    sprouted: "树果发芽了",
    taller: "树苗长高了",
    flowering: "树果开花了",
    ripe: "树果成熟了",
  };
  function showBerryPlot(id) {
    const tree = game.cropView(id),
      definitions = game.catalog.crops;
    modal(
      "树果园",
      `<div class="save-box"><strong>${e(labels[tree.stage] || tree.stage)}</strong>${tree.kind ? `<p>${e(definitions[tree.kind].name)}</p><p>${tree.harvestable ? `可以收获 ${tree.yield} 颗树果。` : `距下个阶段：${tree.remainingMinutes} 分钟`}</p>` : ""}</div><div class="inline-actions">${
        tree.stage === "empty"
          ? `<select data-berry-kind>${Object.entries(definitions)
              .filter(([, d]) => game.itemQuantity(d.item) > 0)
              .map(
                ([kind, d]) =>
                  `<option value="${e(kind)}">${e(d.name)} × ${game.itemQuantity(d.item)}</option>`,
              )
              .join("")}</select><button data-crop="plant">种植</button>`
          : `<button data-crop="${tree.harvestable ? "harvest" : "water"}">${tree.harvestable ? "采摘" : "浇水"}</button>`
      }<button data-close-plot>返回冒险</button></div>`,
      { type: "berryPlot" },
    );
    root.querySelectorAll("[data-crop]").forEach(
      (button) =>
        (button.onclick = () => {
          const result = game.cropAction(
            id,
            button.dataset.crop,
            root.querySelector("[data-berry-kind]")?.value,
          );
          if (!result.ok) toast(result.reason);
          else {
            toast(
              button.dataset.crop === "plant"
                ? "种下了一颗树果。"
                : button.dataset.crop === "water"
                  ? "给树果浇了水。"
                  : "收下了树果。",
            );
            showBerryPlot(id);
            game.save();
          }
        }),
    );
    root.querySelector("[data-close-plot]").onclick = closeModal;
  }
  return { showBerryPlot };
}
