import { listNavigation } from "./ui/native-view.js";
/** UI preferences are local presentation state. No battle rules or save state are changed. */
export function createOptionsInterface({
  modal,
  root,
  document: doc,
  showMenu,
  showExtras,
  setTextPace,
  audioSettings,
}) {
  let pace = 1,
    frame = 1;
  const labels = ["慢", "中", "快"],
    multipliers = [2, 1, 0.5];
  function adjust(key, delta) {
    if (key === "pace") {
      pace = (pace + delta + 3) % 3;
      setTextPace(multipliers[pace]);
    } else if (key === "frame") {
      frame = ((frame - 1 + delta + 20) % 20) + 1;
      doc
        .getElementById("screen")
        ?.style?.setProperty(
          "--native-window-image",
          `url('assets/ui/window-${frame}.png')`,
        );
    } else if (key === "sound")
      audioSettings?.setEnabled(!audioSettings.enabled());
    showOptions(key);
  }
  function showOptions(selected = "pace") {
    modal(
      "设置",
      `<div class="native-window options-title">设置</div><div class="native-window options-list"><button class="native-row" data-option="pace"><span>文字速度</span><span>${labels.map((label, index) => `<span class="${pace === index ? "chosen" : ""}">${label}</span>`).join(" ")}</span></button><button class="native-row" data-option="sound" ${audioSettings ? "" : "disabled"}><span>声音</span><span>${audioSettings?.enabled() ? "开" : "关"}</span></button><button class="native-row" data-option="frame"><span>边框</span><span>类型 ${frame}</span></button><button class="native-row" data-open-extras>扩展功能</button><button class="native-row" data-options-cancel>取消</button></div>`,
      {
        type: "options",
        close: false,
        back: showMenu,
        navigate: (dir) => {
          if (dir === "left" || dir === "right") {
            const key = doc.activeElement?.dataset?.option;
            if (key) adjust(key, dir === "left" ? -1 : 1);
            return true;
          }
          return listNavigation(root, doc, ".options-list button", dir);
        },
      },
    );
    root
      .querySelectorAll("[data-option]")
      .forEach(
        (button) => (button.onclick = () => adjust(button.dataset.option, 1)),
      );
    root.querySelector("[data-open-extras]").onclick = showExtras;
    root.querySelector("[data-options-cancel]").onclick = showMenu;
    root.querySelector(`[data-option="${selected}"]`)?.focus();
  }
  return { showOptions };
}
