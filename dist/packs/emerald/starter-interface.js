import { PACK, TYPE_NAMES } from "./pack.js";
/** Owns this page and its navigation; gameplay changes are application commands. */
export function createStarterInterface(
  game,
  { document: doc, modal, closeModal, root, spriteURL, escapeHTML },
) {
  const db = game.db;
  const $ = (id) => doc.getElementById(id);
  function starterPicker() {
    modal(
      "选择你的第一位伙伴",
      `<p>博士正被野生蛇纹熊追赶！背包里有三个精灵球，选择一只宝可梦去帮助他。</p><div class="starter-grid">${PACK.starters.map((id) => `<button class="starter-choice" data-starter="${id}"><img src="${escapeHTML(spriteURL(id))}" alt="${db.species[id].name}"><strong>${db.species[id].name}</strong><span>${TYPE_NAMES[db.species[id].types[0]]}属性 · Lv.5</span></button>`).join("")}</div><div class="modal-footer">选择后，它将成为与你一起旅行的搭档。</div>`,
      { type: "starter" },
    );
    root.querySelectorAll("[data-starter]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.starter;
          modal(
            `就决定是 ${db.species[id].name} 吗？`,
            `<div class="detail-row"><img src="${escapeHTML(spriteURL(id))}" alt=""><div><p>${TYPE_NAMES[db.species[id].types[0]]}属性 · Lv.5</p><p>与它一起踏上丰缘的冒险。</p></div></div><div class="choice-actions"><button id="choose-starter" class="primary-button">选择 ${db.species[id].name}</button><button id="rechoose" class="secondary-button">再看一看</button></div>`,
            { back: starterPicker, type: "starter" },
          );
          $("rechoose").onclick = starterPicker;
          $("choose-starter").onclick = () => {
            closeModal();
            void game.chooseStarter(id);
          };
        }),
    );
  }
  function chooseStarter(species) {
    if (game.ui.modalType !== "starter")
      throw new Error("Starter selection is not open");
    const choice = root.querySelector(`[data-starter="${species}"]`);
    if (!choice) throw new Error("Invalid starter");
    choice.click();
    $("choose-starter")?.click();
  }
  return { starterPicker, chooseStarter };
}
