import { emeraldLaunchMenu } from "../../packs/emerald/launch-menu.js";

/** Two bounded cards per page; preview and navigation never mutate a save. */
export function createSaveSlotView({ document: doc, container, slots, selected, species, onSelect, onBack }) {
  let active = true, index = Math.max(0, slots.findIndex(slot => slot.id === selected));
  const page = doc.createElement("div"); page.className = "save-slot-page"; container.append(page);
  const focus = n => { index = Math.max(0, Math.min(slots.length - 1, n)); render(); };
  function render() {
    const start = Math.floor(index / 2) * 2;
    page.replaceChildren();
    const title = doc.createElement("p"); title.className = "save-slot-heading";
    title.textContent = `选择存档 · ${Math.floor(index / 2) + 1}/${Math.max(1, Math.ceil(slots.length / 2))}`; page.append(title);
    for (const [i, slot] of slots.slice(start, start + 2).entries()) {
      const button = doc.createElement("button"); button.className = "save-slot-card native-window";
      button.setAttribute("data-save-slot", slot.id); button.setAttribute("data-selected", String(start + i === index));
      button.setAttribute("aria-disabled", String(!slot.document));
      button.style.top = `${(16 + 60 * i) / 160 * 100}%`;
      const summary = slot.document && emeraldLaunchMenu(slot.document, species)[0].summary;
      const name = doc.createElement("strong"); name.textContent = `存档 ${slot.number} · ${summary?.name || "不可读取"}`;
      const details = doc.createElement("span"); details.textContent = summary ? `时间 ${summary.time} · 徽章 ${summary.badges}` : "原档已保留，请恢复对应版本或插件。";
      button.append(name, details);
      button.onclick = () => { if (active && slot.document) onSelect(slot); };
      button.onfocus = () => { index = start + i; for (const row of page.querySelectorAll("[data-save-slot]")) row.setAttribute("data-selected", String(row === button)); };
      page.append(button);
      if (start + i === index) button.focus();
    }
    const footer = doc.createElement("div"); footer.className = "save-slot-footer";
    for (const [label, action, disabled] of [["上一页", () => focus(start - 2), start === 0],
      ["返回", onBack, false], ["下一页", () => focus(start + 2), start + 2 >= slots.length]]) {
      const button = doc.createElement("button"); button.textContent = label; button.disabled = disabled;
      button.onclick = () => { if (active && !disabled) action(); }; footer.append(button);
      if (!slots.length && label === "返回") button.focus();
    }
    page.append(footer);
  }
  render();
  return { back: () => { if (active) onBack(); }, navigate: dir => {
    if (!active) return false;
    const delta = { up: -1, down: 1, left: -2, right: 2 }[dir];
    if (delta !== undefined) focus(index + delta);
    return true;
  }, dispose: () => { active = false; page.remove(); } };
}
