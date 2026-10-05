import { TYPE_NAMES } from "./pack.js";
import { listNavigation } from "./ui/native-view.js";
/** A list and entry page project the recorded Pokédex; unseen entries reveal no species artwork. */
export function createDexInterface(
  game,
  { modal, showMenu, root, document: doc, spriteURL, escapeHTML: esc },
) {
  const list = Object.entries(game.db.species).sort(
    (a, b) => a[1].dex - b[1].dex,
  );
  function showDex(selectedId = null) {
    const selected = list.find(
      ([id]) => id === selectedId && game.state.seen.includes(id),
    );
    modal(
      "宝可梦图鉴",
      `<div class="dex-counts">看见 ${game.state.seen.length}<br>捕获 ${game.state.caught.length}</div><div class="dex-preview"><img data-dex-preview ${selected ? `src="${esc(spriteURL(selected[0]))}"` : "hidden"} alt=""></div><div class="dex-list">${list.map(([id, s]) => `<button class="native-row" data-dex="${esc(id)}" ${game.state.seen.includes(id) ? "" : "disabled"}><span>${game.state.caught.includes(id) ? "●" : " "} ${String(s.dex).padStart(3, "0")}</span><span>${esc(game.state.seen.includes(id) ? s.name : "————")}</span></button>`).join("")}</div><button class="native-return" data-dex-back>返回</button>`,
      {
        type: "dex",
        back: showMenu,
        close: false,
        navigate: (dir) =>
          listNavigation(root, doc, "[data-dex]:not(:disabled)", dir),
      },
    );
    root.querySelector("[data-dex-back]").onclick = showMenu;
    root.querySelectorAll("[data-dex]").forEach((button) => {
      button.onfocus = () => {
        const img = root.querySelector("[data-dex-preview]");
        img.hidden = false;
        img.src = spriteURL(button.dataset.dex);
      };
      button.onclick = () => showEntry(button.dataset.dex);
    });
    if (selected) root.querySelector(`[data-dex="${selected[0]}"]`)?.focus();
  }
  function showEntry(id) {
    if (!game.state.seen.includes(id)) return;
    const species = game.db.species[id],
      caught = game.state.caught.includes(id);
    modal(
      species.name,
      `<img class="dex-entry-sprite" src="${esc(spriteURL(id))}" alt="${esc(species.name)}"><div class="dex-entry-name">No.${String(species.dex).padStart(3, "0")} ${esc(species.name)}</div><div class="dex-entry-types">${species.types.map((t) => esc(TYPE_NAMES[t])).join(" / ")}</div><div class="dex-entry-text">${caught ? esc(species.description || "已经记录在图鉴中。") : "尚未捕获，详细资料还未记录。"}</div><button class="native-return" data-dex-back>返回</button>`,
      { type: "dex-info", back: () => showDex(id), close: false },
    );
    root.querySelector("[data-dex-back]").onclick = () => showDex(id);
  }
  return { showDex };
}
