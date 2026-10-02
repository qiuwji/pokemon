import { SCENE_DEMOS } from "./presentation-scenes.js";
/** Developer-visible content slice demonstrations, not completed gameplay facilities. */
export function createPresentationInterface(
  game,
  { modal, root, showMenu, toast },
) {
  function showPresentation() {
    modal(
      "场景演出",
      `<p>可复用的场景演出示例。</p><div class="menu-grid">${SCENE_DEMOS.map((s) => `<button data-scene="${s.id}">${s.label}</button>`).join("")}</div>`,
      { type: "presentation", back: showMenu },
    );
    root.querySelectorAll("[data-scene]").forEach(
      (button) =>
        (button.onclick = async () => {
          try {
            const result = await game.playPresentation(
              "emerald:" + button.dataset.scene,
              {
                species:
                  game.state.party.find((m) => !m.egg)?.species || "mudkip",
              },
            );
            if (!result?.ok) toast(result?.reason || "演出暂时无法开始。");
          } catch (error) {
            toast(error.message);
          }
        }),
    );
  }
  return { showPresentation };
}
