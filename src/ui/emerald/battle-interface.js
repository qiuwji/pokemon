import { nativeUIControls } from "../../adapters/native-ui-controls.js";
import { experienceAt } from "../../engine/model.js";
import { TYPE_NAMES, STATUS_NAMES } from "../../packs/emerald/pack.js";
/** Two-column battle menu cursor. Horizontal moves preserve rows, vertical moves preserve columns. */
export function battleOptionIndex(selected, dir, count) {
  if (!count) return 0;
  const column = selected % 2,
    row = Math.floor(selected / 2);
  if (dir === "left" || dir === "right") {
    const target = row * 2 + (1 - column);
    return target < count ? target : selected;
  }
  const rows = Math.ceil(count / 2),
    delta = dir === "up" ? -1 : 1;
  return Math.min(((row + delta + rows) % rows) * 2 + column, count - 1);
}
/** Emerald battle menu adapter: owns focus and layout, sends actions, never mutates domain state. */
export function createBattleInterface(
  game,
  {
    document: doc,
    hpTrack,
    hpColor,
    escapeHTML,
    showParty,
    showBag,
    demonstrateBagItem,
    sound = () => {},
  },
) {
  const root = doc.getElementById("battle-hud"),
    db = game.db;
  if (root.style) root.style.containerType = "size";
  let demoSubmit = null;
  let selected = 0,
    page = "main",
    selectedMove = null,
    selectedAugment = null;
  let narration = "";
  const buttons = () =>
    [...root.querySelectorAll(".battle-options button:not(:disabled)")].filter(
      (button) => !button.closest?.("[hidden]"),
    );
  root.addEventListener(
    "click",
    (event) => {
      if (game.autoBattle) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      const button = event.target.closest?.("button");
      if (event.isTrusted && button && !button.disabled && !game.busy)
        sound("emerald:confirm");
    },
    true,
  );
  const friendly = (frame, c) =>
    frame.view.sides.find((s) => s.id === c.sideId)?.allianceId ===
    frame.view.homeAlliance;
  function headingHTML(m) {
    const gender = m.gender === "male" ? "♂" : m.gender === "female" ? "♀" : "";
    return `<span class="mon-name">${escapeHTML(db.species[m.species].name)}<span class="mon-gender">${gender}</span></span><span class="mon-level">Lv.${m.level}</span>`;
  }
  function status(c, home, multi, index) {
    const m = c.monster,
      side = home ? "player" : "enemy";
    // Healthbox sprite centres in battle_interface.c, minus the 64×32 main sprite origin.
    const x = multi ? home ? 127 + index * 12 : 12 - index * 12 : home ? 126 : 12,
      y = multi ? home ? 60 + index * 25 : 3 + index * 25 : home ? 72 : 14,
      position = `style="left:${x * 100 / 240}%;top:${y * 100 / 160}%"`;
    if (!m)
      return `<div class="battle-status ${side} ${multi ? "multi" : ""} empty" data-seat="${c.seatId}" ${position}>空位</div>`;
    const s = db.species[m.species],
      base = experienceAt(m.level, s.growth),
      next = experienceAt(m.level + 1, s.growth);
    return `<div class="battle-status ${side} ${multi ? "multi" : ""}" data-seat="${c.seatId}" data-identity="${m.uid}:${m.level}" ${position}><div class="mon-heading">${headingHTML(m)}</div>${hpTrack(m)}${home ? `<div class="hp-value"><span class="condition">${STATUS_NAMES[m.status] || ""}</span><span class="hp-number">${m.hp} / ${m.stats.hp}</span></div><div class="exp-track"><i style="width:${Math.max(0, Math.min(100, ((m.exp - base) / (next - base)) * 100))}%"></i></div>` : ""}</div>`;
  }
  function seatLabel(b, id) {
    const seat = b.roster.seat(id),
      side = [...b.roster.sides.values()].findIndex(
        (s) => s.id === seat.sideId,
      ),
      index =
        [...b.roster.seats.values()]
          .filter((s) => s.sideId === seat.sideId)
          .findIndex((s) => s.id === id) + 1;
    return `${b.roster.alliance(id) === b.homeAlliance ? "伙伴" : `对方${side > 1 ? "阵营 " + side : ""}`} ${index}`;
  }
  function act(action) {
    return (demoSubmit || ((selection) => game.turn(selection)))({
      ...action,
      seat: game.battle.commandSeat,
      ...(game.battle.player ? { actor: game.battle.player.uid } : {}),
    });
  }
  function pickMove(index, augment = null) {
    const b = game.battle,
      moveId = augment
        ? b.augments.options(b.commandSeat, index).find((o) => o.id === augment)
            ?.moveId
        : b.movesFor(b.commandSeat)[index]?.id,
      move = index < 0 ? { effect: "recoil" } : db.moves[moveId];
    if (!move) {
      page = "moves";
      selectedAugment = null;
      draw();
      return;
    }
    const mode = b.targeting.mode(move);
    if (
      ["selected", "user-or-selected"].includes(mode) &&
      b.targeting.candidates(b.commandSeat, move).length > 1
    ) {
      page = "targets";
      selectedMove = index;
      selectedAugment = augment;
      selected = 0;
      draw();
    } else return act({ kind: "move", index, ...(augment ? { augment } : {}) });
  }
  function chooseAction(kind) {
    if (kind === "fight") { page = "moves"; selected = 0; draw(); }
    if (kind === "party") showParty(true);
    if (kind === "bag") showBag(true);
    if (kind === "run") return act({ kind: "run" });
  }
  function draw(message = null) {
    if (message) narration = message;
    for (const slot of ["battle.actions", "battle.moves", "battle.targets"])
      game.ui?.extensions?.unmountSlot(slot);
    const b = game.battle;
    if (!b) {
      root.hidden = true;
      return;
    }
    root.hidden = false;
    const frame = game.director.sample();
    if (!frame) return;
    const multi = frame.combatants.length > 2,
      home = frame.combatants.filter((c) => friendly(frame, c)),
      away = frame.combatants.filter((c) => !friendly(frame, c));
    let options,
      prompt =
        escapeHTML(message || (b.script === "wally" ? "小光" : b.player ? b.name(b.player) : "伙伴")) + (message ? "" : "<br>要做什么？");
    if (game.busy) options = "";
    else if (!(b.player?.hp > 0) || b.replacements.get(b.commandSeat)) {
      prompt = b.replacements.get(b.commandSeat)
        ? "接棒：请选择接替的伙伴。"
        : "请选择下一位伙伴。";
      options = '<button data-action="party">替换宝可梦</button>';
    } else if (page === "moves") {
      prompt = "选择招式<br><small>X 返回</small>";
      options = b
        .movesFor(b.commandSeat)
        .map((slot, i) => {
          const move = db.moves[slot.id],
            supported = b.moveEffects.supports(move.effect);
          return `<button data-move="${i}" ${(!b.moveAvailable(b.commandSeat, i) && b.movesFor(b.commandSeat).some((m, j) => b.moveAvailable(b.commandSeat, j))) || !supported ? "disabled" : ""}>${escapeHTML(move.name)}<small>${supported ? TYPE_NAMES[move.type] + " · PP " + slot.pp : "效果尚未开放"}</small></button>`;
        })
        .join("");
      options += b
        .movesFor(b.commandSeat)
        .flatMap((slot, index) => b.augments.options(b.commandSeat, index))
        .map(
          (o) =>
            `<button data-move="${o.index}" data-augment="${escapeHTML(o.id)}">${escapeHTML(o.name)}<small>${escapeHTML(db.moves[o.moveId].name)} · ${o.remaining ?? "∞"}</small></button>`,
        )
        .join("");
      if (
        !b
          .movesFor(b.commandSeat)
          .some((m, i) => b.moveAvailable(b.commandSeat, i))
      )
        options =
          '<button data-move="-1">挣扎<small>没有可用招式</small></button>';
    } else if (page === "targets") {
      prompt = "选择目标<br><small>X 返回</small>";
      const move =
        selectedMove < 0
          ? { effect: "recoil" }
          : db.moves[
              selectedAugment
                ? b.augments
                    .options(b.commandSeat, selectedMove)
                    .find((o) => o.id === selectedAugment)?.moveId
                : b.movesFor(b.commandSeat)[selectedMove].id
            ];
      if (!move) {
        page = "moves";
        selectedAugment = null;
        draw();
        return;
      }
      options = b.targeting
        .candidates(b.commandSeat, move)
        .sort(
          (a, c) =>
            Number(!b.roster.isOpposing(b.commandSeat, a.id)) -
            Number(!b.roster.isOpposing(b.commandSeat, c.id)),
        )
        .map(
          (s) =>
            `<button data-target="${s.id}">${escapeHTML(db.species[b.roster.occupant(s.id).species].name)}<small>${b.roster.isOpposing(b.commandSeat, s.id) ? "对方" : "友方"} · ${seatLabel(b, s.id)}</small></button>`,
        )
        .join("");
    } else
      options =
        '<button data-action="fight">战斗</button><button data-action="bag">背包</button><button data-action="party">宝可梦</button><button data-action="run">逃跑</button>';
    const queued = b.decisions.pending.size;
    const plan = multi
      ? `<div class="battle-plan">${queued ? `已选择 ${queued} 个行动 · ` : ""}${escapeHTML(seatLabel(b, b.commandSeat))}${queued && !game.busy ? "<button data-cancel>重选</button>" : ""}</div>`
      : "";
    root.innerHTML =
      away.map((c, i) => status(c, false, multi, i)).join("") +
      home.map((c, i) => status(c, true, multi, i)).join("") +
      plan +
      `<div class="battle-menu" data-battle-page="${page}">${game.busy ? `<div class="battle-log-text">${escapeHTML(narration)}</div>` : `<div class="battle-message">${prompt}</div><div class="battle-options ${page === "targets" ? "target-options" : ""}"><div class="native-options">${options}</div></div>`}</div>`;
    root.querySelectorAll("[data-action]").forEach(
      (button) =>
        (button.onclick = () => {
          return chooseAction(button.dataset.action);
        }),
    );
    root
      .querySelectorAll("[data-move]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            pickMove(+button.dataset.move, button.dataset.augment || null)),
      );
    root.querySelectorAll("[data-target]").forEach(
      (button) =>
        (button.onclick = () =>
          void act({
            kind: "move",
            index: selectedMove,
            ...(selectedAugment ? { augment: selectedAugment } : {}),
            target: { kind: "seat", id: button.dataset.target },
          })),
    );
    root
      .querySelector("[data-cancel]")
      ?.addEventListener("click", () => void game.turn({ kind: "cancel" }));
    if (!game.busy)
      game.ui?.extensions?.mountSlot(
        page === "moves"
          ? "battle.moves"
          : page === "targets"
            ? "battle.targets"
            : "battle.actions",
        root.querySelector(".battle-options"),
        { seat: b.commandSeat, page },
        () => draw(),
        {
          nativeRoot: root.querySelector(".native-options"),
          controls: nativeUIControls(
            root.querySelectorAll(".native-options button"),
            (button) =>
              button.dataset.move !== undefined
                ? `move:${button.dataset.move}${button.dataset.augment ? ":" + button.dataset.augment : ""}`
                : button.dataset.target !== undefined
                  ? `target:${button.dataset.target}`
                  : button.dataset.action,
          ),
        },
      );
    if (selected >= buttons().length) selected = 0;
    refresh(frame);
    buttons()[selected]?.classList.add("selected");
    if (page === "moves" && !game.busy) {
      const button = buttons()[selected],
        slot = b.movesFor(b.commandSeat)[Number(button?.dataset.move)];
      const move = button?.dataset.augment
        ? db.moves[
            b.augments
              .options(b.commandSeat, Number(button.dataset.move))
              .find((o) => o.id === button.dataset.augment)?.moveId
          ]
        : slot && db.moves[slot.id];
      const panel = root.querySelector(".battle-message");
      if (panel && move)
        panel.innerHTML = `PP ${slot.pp}/${move.pp}<br>属性 ${escapeHTML(TYPE_NAMES[move.type])}`;
    }
  }
  function refresh(frame) {
    if (!frame) return;
    if (root.style) {
      const clip = frame.clip;
      root.style.clipPath = clip ? `inset(${clip.y * 100 / 160}% ${(240 - clip.x - clip.width) * 100 / 240}% ${(160 - clip.y - clip.height) * 100 / 160}% ${clip.x * 100 / 240}%)` : "";
    }
    for (const c of frame.combatants) {
      const el = [...root.querySelectorAll("[data-seat]")].find(
          (e) => e.dataset.seat === c.seatId,
        ),
        m = c.monster;
      if (!el || !m) continue;
      const box = frame.statusBoxes?.find(box => box.seatId === c.seatId);
      el.hidden = box ? box.opacity === 0 : frame.view.kind === "entry" && !frame.actors.some(a => a.seatId === c.seatId && a.opacity > 0);
      if (el.style) {
        el.style.opacity = String(box?.opacity ?? 1);
        // Positions are native pixels, rendered as viewport fractions without display-scale drift.
        el.style.transform = box ? `translate(${(box.x || 0) * 100 / 240}cqw, ${(box.y || 0) * 100 / 160}cqh)` : "";
      }
      const identity = `${m.uid}:${m.level}`;
      if (el.dataset.identity !== identity) {
        el.dataset.identity = identity;
        const heading = el.querySelector(".mon-heading");
        if (heading)
          heading.innerHTML = headingHTML(m);
      }
      const bar = el.querySelector(".hp-track i");
      if (bar) {
        const fraction = frame.healthBars?.find(bar => bar.seatId === c.seatId)?.fraction ?? m.hp / m.stats.hp;
        bar.style.width = `${fraction * 100}%`;
        bar.style.background = hpColor(m);
      }
      const number = el.querySelector(".hp-number");
      if (number) number.textContent = `${m.hp} / ${m.stats.hp}`;
      const condition = el.querySelector(".condition");
      if (condition) condition.textContent = STATUS_NAMES[m.status] || "";
      const xp = el.querySelector(".exp-track i");
      if (xp) {
        const growth = db.species[m.species].growth,
          base = experienceAt(m.level, growth),
          next = experienceAt(m.level + 1, growth);
        xp.style.width = `${Math.max(0, Math.min(100, ((m.exp - base) / (next - base)) * 100))}%`;
      }
    }
  }
  return {
    draw,
    refresh,
    async demonstrate(action, { wait, submit }) {
      demoSubmit = submit;
      try {
        page = "main"; selected = 0; draw();
        await wait(64 * 1000 / 60);
        if (action.kind === "move") {
          sound("emerald:confirm"); chooseAction("fight");
          selected = action.index; draw();
          await wait(80 * 1000 / 60);
          sound("emerald:confirm");
          return await pickMove(action.index);
        }
        if (action.kind === "item") {
          selected = battleOptionIndex(selected, "right", 4); sound("emerald:confirm"); draw();
          await wait(64 * 1000 / 60);
          return await demonstrateBagItem(action, { wait, submit });
        }
        throw new Error("Unsupported demonstration action");
      } finally { demoSubmit = null; }
    },
    reset() {
      narration = "";
      page = "main";
      selected = 0;
      selectedMove = null;
      selectedAugment = null;
    },
    confirm() {
      const button = buttons()[selected];
      if (!game.busy && !game.autoBattle && button) {
        sound("emerald:confirm");
        button.click();
      }
    },
    navigate(dir) {
      if (game.busy || game.autoBattle) return;
      const count = buttons().length;
      if (count) {
        selected = battleOptionIndex(selected, dir, count);
        sound("emerald:confirm");
        draw();
      }
    },
    back() {
      if (game.busy || game.autoBattle) return;
      if (page === "targets") {
        page = "moves";
        selected = 0;
        draw();
      } else if (page === "moves") {
        page = "main";
        selected = 0;
        draw();
      } else if (game.battle?.decisions.pending.size)
        void game.turn({ kind: "cancel" });
    },
  };
}
