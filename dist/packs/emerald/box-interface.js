import { monsterIconURL, listNavigation } from "./ui/native-view.js";
import { partyMenuCards, partyMenuNavigation } from "./party-menu-view.js";
/** Storage page uses 30 visual slots per box. Storage capacity and transfers remain domain rules. */
export function createBoxInterface(
  game,
  {
    modal,
    showMenu,
    root,
    document: doc,
    hpTrack,
    updateSide,
    spriteURL,
    escapeHTML: esc,
  },
) {
  let box = 0;
  function showBox() {
    const count = Math.max(1, Math.ceil(game.state.box.length / 30));
    box = Math.min(box, count - 1);
    const start = box * 30;
    modal(
      "宝可梦电脑",
      `<div class="box-heading"><button data-box-page="-1">◀</button><span>盒子 ${box + 1}</span><button data-box-page="1">▶</button></div><div class="box-preview"><img data-box-preview alt="" hidden><span data-box-name>请选择宝可梦。</span></div><div class="storage-slots">${Array.from(
        { length: 30 },
        (_, slot) => {
          const mon = game.state.box[start + slot];
          return mon
            ? `<button data-box="${start + slot}" aria-label="${esc(mon.egg ? "蛋" : game.db.species[mon.species].name)}"><span class="storage-icon"><img src="${esc(monsterIconURL(mon, game.db.resources))}" alt=""></span></button>`
            : '<span class="storage-empty"></span>';
        },
      ).join(
        "",
      )}</div><div class="storage-footer">${game.state.box.length} 只宝可梦</div><button class="native-return" data-box-close>退出</button>`,
      {
        type: "box",
        back: showMenu,
        close: false,
        navigate: (dir) =>
          listNavigation(root, doc, "[data-box]", dir, (delta) => page(delta)),
      },
    );
    const page = (delta) => {
      box = (box + delta + count) % count;
      showBox();
    };
    root
      .querySelectorAll("[data-box-page]")
      .forEach(
        (button) =>
          (button.onclick = () => page(Number(button.dataset.boxPage))),
      );
    root.querySelector("[data-box-close]").onclick = showMenu;
    root.querySelectorAll("[data-box]").forEach((button) => {
      const index = Number(button.dataset.box),
        mon = game.state.box[index];
      button.onfocus = () => {
        const img = root.querySelector("[data-box-preview]");
        img.hidden = false;
        img.src = spriteURL(mon.egg ? "egg" : mon.species);
        root.querySelector("[data-box-name]").textContent = mon.egg
          ? "蛋"
          : `${game.db.species[mon.species].name} Lv.${mon.level}`;
      };
      button.onclick = () => {
        if (game.state.party.length < 6) {
          game.withdrawBox(index);
          updateSide();
          game.save();
          showBox();
          return;
        }
        modal(
          "选择交换的宝可梦",
          `<div data-native-party>${partyMenuCards(game.state.party, { db: game.db, escapeHTML: esc, hpTrack })}</div><div class="party-prompt">要和哪只宝可梦交换？</div>`,
          {
            type: "box-swap",
            back: showBox,
            navigate: (dir) => partyMenuNavigation(root, doc, dir),
          },
        );
        root.querySelectorAll("[data-mon]").forEach(
          (choice) =>
            (choice.onclick = () => {
              game.exchangeBox(index, Number(choice.dataset.mon));
              updateSide();
              game.save();
              showBox();
            }),
        );
      };
    });
  }
  return { showBox };
}
