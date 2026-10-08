import { emeraldLaunchMenu } from "../../packs/emerald/launch-menu.js";

/** One original single-save menu; UI owns focus, caller owns load/reset. */
export function createLaunchMenuView({ document: doc, container, saved, species, selected, onSelect }) {
  let active = true;
  const page = doc.createElement("div"); page.className = "launch-menu-native";
  const buttons = emeraldLaunchMenu(saved, species).map(entry => {
    const button = doc.createElement("button"); button.className = "launch-menu-window native-window";
    button.setAttribute("data-launch-action", entry.id);
    button.style.top = `${entry.top / 160 * 100}%`;
    button.style.height = `${entry.height / 160 * 100}%`;
    const title = doc.createElement("span"); title.className = "launch-menu-label"; title.textContent = entry.label;
    button.append(title);
    if (entry.summary) {
      const info = entry.summary;
      button.setAttribute("data-gender", info.gender);
      for (const [id, label, value, left, top] of [["name", "玩家", info.name, 0, 17], ["time", "时间", info.time, 108, 17],
        ...(info.dex === null ? [] : [["dex", "图鉴", info.dex, 0, 33]]), ["badges", "徽章", info.badges, 108, 33]]) {
        const row = doc.createElement("span"); row.className = "launch-save-info";
        row.style.left = `${left / 208 * 100}%`; row.style.top = `${top / 48 * 100}%`;
        const key = doc.createElement("span"), text = doc.createElement("span");
        key.textContent = label; text.textContent = String(value); text.className = "launch-save-value";
        if (id === "name") text.style.fontSize = `${Math.min(8, 64 / [...info.name].length) / 240 * 100}cqw`;
        row.append(key, text); button.append(row);
      }
    }
    button.onfocus = () => { if (active) { for (const b of buttons) b.setAttribute("data-selected", String(b === button)); } };
    button.onclick = () => { if (active) onSelect(entry.id); };
    page.append(button); return button;
  });
  container.append(page);
  const focus = buttons.find(b => b.getAttribute("data-launch-action") === selected) || buttons[0];
  focus.focus(); focus.onfocus();
  return { navigate: dir => {
    if (!active) return false;
    if (!["up", "down"].includes(dir)) return true;
    const i = buttons.indexOf(doc.activeElement);
    buttons[Math.max(0, Math.min(buttons.length - 1, i + (dir === "up" ? -1 : 1)))].focus();
    return true;
  }, dispose: () => { active = false; page.remove(); } };
}
