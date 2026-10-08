/** Free text input; the caller owns confirmation, cancellation and the profile commit. */
export function createNamingView({ document: doc, container, gender, name = "", onConfirm, onCancel }) {
  let active = true, composing = false;
  const view = doc.createElement("div"); view.className = "naming-native";
  const title = doc.createElement("label"); title.className = "naming-title";
  title.textContent = "你的名字？"; title.setAttribute("for", "trainer-name-input");
  const icon = doc.createElement("img"); icon.className = "naming-icon";
  icon.src = `generated/assets/ui/new-game-icon-${gender}.png`; icon.alt = "角色";
  const input = doc.createElement("input"); input.className = "naming-input"; input.value = name;
  input.setAttribute("id", "trainer-name-input"); input.setAttribute("type", "text");
  input.setAttribute("maxlength", "16"); input.setAttribute("enterkeyhint", "done");
  input.setAttribute("autocomplete", "off"); input.setAttribute("spellcheck", "false");
  input.setAttribute("placeholder", "在这里输入名字");
  input.setAttribute("aria-describedby", "trainer-name-help");
  const help = doc.createElement("div"); help.className = "naming-help"; help.setAttribute("id", "trainer-name-help");
  help.textContent = "直接输入名字，最多16个字。"; help.setAttribute("aria-live", "polite");
  const actions = doc.createElement("div"); actions.className = "naming-free-actions native-window";
  const button = (text, id, run) => {
    const b = doc.createElement("button"); b.textContent = text; b.setAttribute("data-naming-action", id);
    b.onclick = () => { if (active && !composing) run(); }; actions.append(b); return b;
  };
  const confirm = button("确定", "ok", () => {
    const value = input.value.trim();
    if (!value || value.length > 16) {
      help.textContent = !value ? "请输入你的名字。" : "名字最多16个字。";
      input.setAttribute("aria-invalid", "true"); input.focus(); return;
    }
    onConfirm(value);
  });
  const cancel = button("返回修改角色", "cancel", () => onCancel());
  input.oncompositionstart = () => { composing = true; };
  input.oncompositionend = () => { composing = false; };
  input.oninput = () => { if (active) { input.removeAttribute("aria-invalid"); help.textContent = "直接输入名字，最多16个字。"; } };
  input.onkeydown = event => {
    if (event.key === "Enter" && !event.isComposing && !composing) { event.preventDefault(); confirm.click(); }
  };
  view.append(title, icon, input, help, actions); container.append(view); input.focus();
  return { navigate: direction => { (direction === "left" || direction === "up" ? confirm : cancel).focus(); return true; },
    back: () => { if (active && !composing) onCancel(); }, dispose: () => { active = false; view.remove(); } };
}
