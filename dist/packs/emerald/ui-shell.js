import { ControlDOM } from "../../adapters/control-dom.js";
import { dialogueDescription } from "../../engine/dialogue.js";
import { DialogueDOM } from "../../adapters/dialogue-dom.js";
import { ChoiceDOM } from "../../adapters/choice-dom.js";
import { createTextEffects } from "../../presentation/text-effects.js";
import { PACK, TYPE_NAMES, STATUS_NAMES, questFor } from "./pack.js";
/** Shared UI services. Domain mutations use the supplied application command facade. */
export function createUIShell(
  game,
  {
    document: doc = document,
    sound = () => {},
    dialogueClock = null,
    textEffects = game.textEffects || createTextEffects(),
    reducedMotion = game.reducedMotion || (() => false),
  } = {},
) {
  const navigation = {};
  const requestFrame =
    doc.defaultView?.requestAnimationFrame?.bind(doc.defaultView) ||
    ((callback) => setTimeout(callback, 0));
  const $ = (id) => doc.getElementById(id),
    root = $("modal-root"),
    canvas = $("game"),
    db = game.db;
  let dialog = null,
    modalBack = null,
    modalType = null,
    modalNavigate = null,
    modalFocus = null,
    toastTimer;
  const modalResources = new Set();
  const frameHost = doc.defaultView;
  const clock = dialogueClock || {
    now: () => game.timeline?.now() ?? performance.now(),
    request:
      frameHost?.requestAnimationFrame?.bind(frameHost) ||
      ((fn) => setTimeout(fn, 16)),
    cancel: frameHost?.cancelAnimationFrame?.bind(frameHost) || clearTimeout,
  };
  const dialogueView = new DialogueDOM({
    document: doc,
    container: $("dialogue"),
    effects: textEffects,
    ...clock,
    reducedMotion,
    onError: (error) => disposeDialogue(error),
  });
  const controls = new ControlDOM({ root, document: doc, dialogue: () => dialog, modalType: () => modalType });
  const escapeHTML = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function toast(text) {
    $("toast").textContent = text;
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 3000);
  }

  function announce(text) {
    $("announcer").textContent = text;
  }

  function updateWeather(weather) {
    const node = doc.getElementById("weather");
    if (node)
      node.textContent = game.db.maps[weather.map].indoor
        ? ["none", "clear"].includes(weather.kind)
          ? "室内"
          : "室内 · " + weather.label
        : weather.label;
  }
  function updateSide() {
    game.ui?.updateTime?.(game.timeView());
    updateWeather(game.weatherView());
    game.ui?.extensions?.refreshHUD();
    const q = questFor(game.state) || {
      title: "自由探索", description: "当前没有待办任务，可以继续探索丰缘。", number: "—",
    };
    $("quest-title").textContent = q.title;
    $("quest-description").textContent = q.description;
    $("quest-number").textContent = q.number;
    const titles = ["救助小田卷博士", "与小遥对战", "领取图鉴与精灵球"];
    const done = [
      game.state.flags.rescued,
      game.state.flags.rivalWon,
      game.state.flags.pokedex,
    ];
    const current = done.findIndex((x) => !x);
    $("quest-progress").innerHTML = titles
      .map(
        (t, i) =>
          `<li class="${done[i] ? "done" : i === current ? "current" : ""}">${t}</li>`,
      )
      .join("");
    $("party-count").textContent = game.state.party.length + " / 6";
    $("money").textContent = "¥ " + game.state.money.toLocaleString("zh-CN");
    $("caught-count").textContent = String(game.state.caught.length).padStart(
      2,
      "0",
    );
    $("party-list").innerHTML = game.state.party.length
      ? game.state.party
          .slice(0, 3)
          .map((m, i) => partyCard(m, i))
          .join("") +
        (game.state.party.length > 3
          ? `<div class="party-more">还有 ${game.state.party.length - 3} 位伙伴</div>`
          : "")
      : `<div class="party-empty"><div class="starter-preview">${PACK.starters.map((s) => `<img src="${escapeHTML(spriteURL(s))}" alt="${db.species[s].name}">`).join("")}</div><p>还没有搭档<br>第一位伙伴正在等你。</p></div>`;
    $("party-list")
      .querySelectorAll("[data-mon]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            if (!game.busy && !game.battle && !dialog)
              navigation.showMonster?.(+b.dataset.mon);
          }),
      );
    $("field-note").textContent = game.state.flags.pokedex
      ? "在草丛里寻找下一位伙伴，记得随时保存冒险。"
      : game.state.flags.rivalWon
        ? "博士正在研究所等你。沿原路回到未白镇吧。"
        : game.state.flags.rescued
          ? "北边的古辰镇有宝可梦中心。恢复体力，再去找小遥。"
          : "风吹过草丛，新的冒险就在小镇的北边。";
    if (game.saveWarning) $("field-note").textContent = game.saveWarning;
  }

  const spriteURL = (id) =>
    game.db.resources?.[id + "-front"] || `assets/${id}-front.png`;
  function hpColor(m) {
    const r = m.hp / m.stats.hp;
    return r > 0.5 ? "#81c989" : r > 0.2 ? "#dcb652" : "#cf6860";
  }

  function hpTrack(m) {
    return `<div class="hp-track"><i style="width:${(m.hp / m.stats.hp) * 100}%;background:${hpColor(m)}"></i></div>`;
  }

  function partyCard(m, i) {
    const s = db.species[m.species];
    if (m.egg)
      return `<button class="party-card" data-mon="${i}"><img src="assets/egg-front.png" alt="蛋"><div class="mon-main"><div class="mon-heading">宝可梦的蛋</div><p>${m.egg.cycles > 10 ? "一起行走，等待孵化。" : "里面传来了细小的声音。"}</p></div></button>`;
    return `<button class="party-card" data-mon="${i}"><img src="${escapeHTML(spriteURL(m.species))}" alt=""><div class="mon-main"><div class="mon-heading">${s.name}<span>Lv.${m.level}</span></div>${hpTrack(m)}<div class="hp-value"><span class="type-pill">${m.status ? STATUS_NAMES[m.status] : s.types.map((t) => TYPE_NAMES[t]).join(" / ")}</span><span>${m.hp} / ${m.stats.hp}</span></div></div></button>`;
  }

  function say(name, lines, after = null, options = {}) {
    if (dialog)
      return Promise.reject(new Error("A dialogue is already active"));
    let description;
    try {
      description = dialogueDescription(
        { name, lines, ...options },
        (id, data) => textEffects.parameters(id, data),
      );
    } catch (error) {
      return Promise.reject(error);
    }
    return new Promise((resolve, reject) => {
      dialog = {
        ...description,
        index: 0,
        renderedIndex: -1,
        after,
        resolve,
        reject,
      };
      try {
        renderDialogue();
        game.control?.record("dialogue.started", { name: description.name, lines: description.lines.length });
        announce(description.lines[0].text);
        game.clearInput();
      } catch (error) {
        disposeDialogue(error);
      }
    });
  }
  function disposeDialogue(reason = new Error("Dialogue disposed")) {
    const previous = dialog;
    dialog = null;
    dialogueView.hide();
    if (previous) game.control?.record("dialogue.closed", { reason: reason.message });
    previous?.reject(reason);
  }

  function choose(name, prompt, options, cancel, policy = {}) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const complete = (id) => {
        if (settled || !options.some((o) => o.id === id && !o.disabled)) return;
        settled = true;
        game.control?.record("choice.selected", { name, id });
        closeModal();
        resolve(id);
      };
      const fail = (error) => {
        if (settled) return;
        settled = true;
        closeModal();
        reject(error);
      };
      modal(name, `<div id="story-choice-content"></div>`, {
        type: "story-choice",
        close: false,
        back: () => {
          if (cancel) complete(cancel);
        },
      });
      const view = new ChoiceDOM({
        document: doc,
        container: $("story-choice-content"),
        clock,
        onSelect: complete,
        onError: fail,
      });
      ownModalResource(() => {
        view.dispose();
        if (!settled) {
          settled = true;
          reject(new Error("Story choice disposed"));
        }
      });
      try {
        view.mount(prompt, options, policy);
        game.control?.record("choice.opened", { name, prompt, options });
      } catch (error) {
        fail(error);
      }
    });
  }
  function renderDialogue() {
    if (!dialog) {
      dialogueView.hide();
      return;
    }
    if (dialog.renderedIndex === dialog.index) {
      dialogueView.update();
      return;
    }
    dialogueView.show(
      dialog.lines[dialog.index].name ?? dialog.name,
      dialog.lines[dialog.index],
      {
        speed: dialog.speed,
        mode: dialog.mode,
      },
    );
    dialog.renderedIndex = dialog.index;
  }

  function nextDialogue() {
    if (!dialog) return;
    try {
      sound("emerald:confirm");
      if (!dialogueView.complete) {
        dialogueView.skip();
        return;
      }
      if (++dialog.index >= dialog.lines.length) {
        const completed = dialog;
        game.control?.record("dialogue.completed", { name: dialog.name });
        dialog = null;
        renderDialogue();
        game.clearInput();
        try {
          completed.after?.();
          updateSide();
          game.save();
          completed.resolve();
        } catch (error) {
          completed.reject(error);
        }
      } else {
        renderDialogue();
        game.control?.record("dialogue.line", { name: dialog.lines[dialog.index].name ?? dialog.name, index: dialog.index });
        announce(dialog.lines[dialog.index].text);
      }
    } catch (error) {
      disposeDialogue(error);
    }
  }

  function modal(
    title,
    body,
    { back = null, type = "generic", close = true, navigate = null } = {},
  ) {
    disposeModalResources();
    game.ui?.extensions?.unmountRegions();
    if (!root.children.length) modalFocus = doc.activeElement;
    modalBack = back;
    modalType = type;
    modalNavigate = navigate;
    game.clearInput();
    root.innerHTML = `<div class="modal-backdrop" data-modal-page="${escapeHTML(type)}" data-gender="${escapeHTML(game.state.playerGender)}"><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><div class="modal-header"><h2>${escapeHTML(title)}</h2>${close ? '<button id="modal-close" aria-label="关闭">×</button>' : ""}</div>${body}</section></div>`;
    if ($("modal-close"))
      $("modal-close").onclick = () => (back ? back() : closeModal());
    requestFrame(() => {
      const buttons = [...root.querySelectorAll("button")].filter(
        (button) => !button.disabled,
      );
      if (!buttons.includes(doc.activeElement)) buttons[0]?.focus();
    });
  }

  function closeModal() {
    disposeModalResources();
    game.ui?.extensions?.unmountRegions();
    root.innerHTML = "";
    modalType = null;
    modalNavigate = null;
    modalBack = null;
    game.clearInput();
    modalFocus?.focus();
    modalFocus = null;
    canvas.focus({ preventScroll: true });
  }
  function ownModalResource(dispose) {
    let active = true;
    const release = () => {
      if (!active) return;
      active = false;
      modalResources.delete(release);
      dispose();
    };
    modalResources.add(release);
    return release;
  }
  function disposeModalResources() {
    for (const release of [...modalResources]) release();
  }
  function back() {
    if (
      game.busy &&
      !dialog &&
      !["story-choice", "fishing", "clock"].includes(modalType)
    )
      return;
    if (modalType === "learning" || modalType === "evolution") return;
    if (root.children.length) {
      modalBack ? modalBack() : closeModal();
      return;
    }
    if (dialog) {
      nextDialogue();
      return;
    }
    if (game.battle) navigation.backBattle?.();
  }
  return {
    controlView: () => controls.inspect(),
    controlActivate: (id) => controls.activate(id),
    controlConfirm: () => root.children.length ? controls.confirm() : game.interact(),
    ownModalResource,
    disposeModalResources,
    frameClock: clock,
    reducedMotion,
    document: doc,
    root,
    canvas,
    sound,
    modal,
    closeModal,
    toast,
    announce,
    escapeHTML,
    updateSide,
    updateWeather,
    partyCard,
    spriteURL,
    hpTrack,
    hpColor,
    say,
    choose,
    nextDialogue,
    renderDialogue,
    disposeDialogue,
    back,
    connect(actions) {
      Object.assign(navigation, actions);
    },
    checkGrowth: () => navigation.checkGrowth?.(),
    get dialog() {
      return dialog;
    },
    get modalType() {
      return modalType;
    },
    get blocked() {
      return !!dialog || !!root.children.length;
    },
    confirm() {
      if (root.children.length) {
        const button = root.querySelector("button:focus:not(:disabled)") ||
          root.querySelector("button:not(:disabled):not(#modal-close)");
        button?.click();
      } else game.interact();
    },
    navigateMenu(dir) {
      if (modalNavigate?.(dir)) return;
      const buttons = [
        ...root.querySelectorAll("button:not(:disabled):not(#modal-close)"),
      ];
      if (!buttons.length) return;
      const index = buttons.indexOf(doc.activeElement),
        delta = dir === "up" || dir === "left" ? -1 : 1;
      buttons[
        (Math.max(0, index) + delta + buttons.length) % buttons.length
      ].focus();
    },
    focusTrap(e) {
      if (!root.children.length) return;
      const bs = [
          ...root.querySelectorAll(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex]:not([tabindex="-1"])',
          ),
        ].filter((node) => !node.hidden && node.getClientRects().length),
        first = bs[0],
        last = bs.at(-1);
      if (e.shiftKey && doc.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && doc.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    },
  };
}
