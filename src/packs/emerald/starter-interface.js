import { PACK, TYPE_NAMES } from "./pack.js";
import { listNavigation } from "./ui/native-view.js";
/** Original bag scene: choose a ball, inspect its occupant, then confirm. Selection is UI state only. */
export function createStarterInterface(
  game,
  { document: doc, modal, closeModal, root, spriteURL, escapeHTML: esc },
) {
  function starterPicker(selected = 1, preview = false) {
    const id = PACK.starters[selected],
      species = game.db.species[id];
    modal(
      "选择宝可梦",
      `<div class="starter-balls">${PACK.starters.map((id, index) => `<button class="starter-ball starter-ball-${index}" data-starter="${id}" ${preview ? "disabled" : ""} aria-label="${esc(game.db.species[id].name)}"><span class="starter-ball-art"><img src="generated/assets/ui/starter-balls.png" alt=""></span></button>`).join("")}</div>${preview ? `<div class="starter-preview"><img src="${esc(spriteURL(id))}" alt="${esc(species.name)}"></div><div class="native-window starter-label">${esc(TYPE_NAMES[species.types[0]])}属性宝可梦<br>${esc(species.name)}</div><div class="native-window starter-confirm"><button id="choose-starter">是</button><button id="rechoose">否</button></div>` : '<div class="native-window starter-instruction">请选择宝可梦。</div>'}`,
      {
        type: "starter",
        close: false,
        back: preview ? () => starterPicker(selected) : null,
        navigate: (dir) =>
          listNavigation(
            root,
            doc,
            preview ? ".starter-confirm button" : "[data-starter]",
            dir,
          ),
      },
    );
    root
      .querySelectorAll("[data-starter]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            starterPicker(PACK.starters.indexOf(button.dataset.starter), true)),
      );
    if (preview) {
      doc.getElementById("rechoose").onclick = () => starterPicker(selected);
      doc.getElementById("choose-starter").onclick = () => {
        closeModal();
        void game.chooseStarter(id);
      };
    } else root.querySelector(`[data-starter="${id}"]`)?.focus();
  }
  function chooseStarter(species) {
    if (game.ui.modalType !== "starter")
      throw new Error("Starter selection is not open");
    const choice = root.querySelector(`[data-starter="${species}"]`);
    if (!choice) throw new Error("Invalid starter");
    choice.click();
    doc.getElementById("choose-starter")?.click();
  }
  return { starterPicker, chooseStarter };
}
