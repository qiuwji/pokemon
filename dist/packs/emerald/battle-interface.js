import { experienceAt } from "../../engine/model.js";
import { TYPE_NAMES, STATUS_NAMES } from "./pack.js";
/** Emerald battle menu adapter: owns focus and layout, sends actions, never mutates domain state. */
export function createBattleInterface(
  game,
  { document: doc, hpTrack, hpColor, escapeHTML, showParty, showBag },
) {
  const root = doc.getElementById("battle-hud"),
    db = game.db;
  let selected = 0,
    page = "main",
    selectedMove = null;
  const buttons = () => [
    ...root.querySelectorAll(".battle-options button:not(:disabled)"),
  ];
  const friendly = (frame, c) =>
    frame.view.sides.find((s) => s.id === c.sideId)?.allianceId ===
    frame.view.homeAlliance;
  function status(c, home, multi, index) {
    const m = c.monster,
      side = home ? "player" : "enemy";
    const position = multi
      ? `style="left:${home ? 55 : 2}%;top:${home ? 43 + index * 14 : 2 + index * 13}%"`
      : "";
    if (!m)
      return `<div class="battle-status ${side} ${multi ? "multi" : ""} empty" data-seat="${c.seatId}" ${position}>空位</div>`;
    const s = db.species[m.species],
      base = experienceAt(m.level, s.growth),
      next = experienceAt(m.level + 1, s.growth);
    return `<div class="battle-status ${side} ${multi ? "multi" : ""}" data-seat="${c.seatId}" data-identity="${m.uid}:${m.level}" ${position}><div class="mon-heading">${escapeHTML(s.name)} <span>${m.gender} Lv.${m.level}</span></div>${hpTrack(m)}${home ? `<div class="hp-value"><span class="condition">${STATUS_NAMES[m.status] || ""}</span><span class="hp-number">${m.hp} / ${m.stats.hp}</span></div><div class="exp-track"><i style="width:${Math.max(0, Math.min(100, ((m.exp - base) / (next - base)) * 100))}%"></i></div>` : ""}</div>`;
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
    return game.turn({
      ...action,
      seat: game.battle.commandSeat,
      actor: game.battle.player?.uid,
    });
  }
  function pickMove(index) {
    const b = game.battle,
      mon = b.player,
      move = index < 0 ? { effect: "recoil" } : db.moves[mon.moves[index].id],
      mode = b.targeting.mode(move);
    if (
      ["selected", "user-or-selected"].includes(mode) &&
      b.targeting.candidates(b.commandSeat, move).length > 1
    ) {
      page = "targets";
      selectedMove = index;
      selected = 0;
      draw();
    } else void act({ kind: "move", index });
  }
  function draw(message = null) {
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
    let options = "",
      prompt =
        message ||
        `${b.player ? db.species[b.player.species].name : "伙伴"}<br>要做什么？`;
    if (game.busy) options = "";
    else if (!(b.player?.hp > 0)) {
      prompt = "请选择下一位伙伴。";
      options = '<button data-action="party">替换宝可梦</button>';
    } else if (page === "moves") {
      prompt = "选择招式<br><small>X 返回</small>";
      options = b.player.moves
        .map((slot, i) => {
          const move = db.moves[slot.id],
            supported = b.moveEffects.supports(move.effect);
          return `<button data-move="${i}" ${(!b.moveAvailable(b.commandSeat, i) && b.player.moves.some((m, j) => b.moveAvailable(b.commandSeat, j))) || !supported ? "disabled" : ""}>${escapeHTML(move.name)}<small>${supported ? TYPE_NAMES[move.type] + " · PP " + slot.pp : "效果尚未开放"}</small></button>`;
        })
        .join("");
      if (!b.player.moves.some((m, i) => b.moveAvailable(b.commandSeat, i)))
        options =
          '<button data-move="-1">挣扎<small>没有可用招式</small></button>';
    } else if (page === "targets") {
      prompt = "选择目标<br><small>X 返回</small>";
      const move =
        selectedMove < 0
          ? { effect: "recoil" }
          : db.moves[b.player.moves[selectedMove].id];
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
    const foeSide = frame.view.sides.filter(
        (s) => s.allianceId !== b.homeAlliance,
      ),
      count = foeSide.reduce((n, s) => n + s.remaining, 0),
      total = foeSide.reduce((n, s) => n + s.total, 0);
    const team =
      !multi && total > 1
        ? `<div class="enemy-team" aria-label="对方队伍剩余 ${count} / ${total}">对方队伍 ${"●".repeat(count)}${"○".repeat(total - count)}</div>`
        : "";
    root.innerHTML =
      team +
      away.map((c, i) => status(c, false, multi, i)).join("") +
      home.map((c, i) => status(c, true, multi, i)).join("") +
      plan +
      `<div class="battle-menu">${game.busy ? `<div class="battle-log-text">${escapeHTML(message || "…")}</div>` : `<div class="battle-message">${prompt}</div><div class="battle-options ${page === "targets" ? "target-options" : ""}">${options}</div>`}</div>`;
    root.querySelectorAll("[data-action]").forEach(
      (button) =>
        (button.onclick = () => {
          const kind = button.dataset.action;
          if (kind === "fight") {
            page = "moves";
            selected = 0;
            draw();
          }
          if (kind === "party") showParty(true);
          if (kind === "bag") showBag(true);
          if (kind === "run") void act({ kind: "run" });
        }),
    );
    root
      .querySelectorAll("[data-move]")
      .forEach(
        (button) => (button.onclick = () => pickMove(+button.dataset.move)),
      );
    root.querySelectorAll("[data-target]").forEach(
      (button) =>
        (button.onclick = () =>
          void act({
            kind: "move",
            index: selectedMove,
            target: { kind: "seat", id: button.dataset.target },
          })),
    );
    root
      .querySelector("[data-cancel]")
      ?.addEventListener("click", () => void game.turn({ kind: "cancel" }));
    if (selected >= buttons().length) selected = 0;
    buttons()[selected]?.classList.add("selected");
  }
  function refresh(frame) {
    if (!frame) return;
    for (const c of frame.combatants) {
      const el = [...root.querySelectorAll("[data-seat]")].find(
          (e) => e.dataset.seat === c.seatId,
        ),
        m = c.monster;
      if (!el || !m) continue;
      const identity = `${m.uid}:${m.level}`;
      if (el.dataset.identity !== identity) {
        el.dataset.identity = identity;
        const heading = el.querySelector(".mon-heading");
        if (heading)
          heading.innerHTML = `${escapeHTML(db.species[m.species].name)} <span>${m.gender} Lv.${m.level}</span>`;
      }
      const bar = el.querySelector(".hp-track i");
      if (bar) {
        bar.style.width = `${(m.hp / m.stats.hp) * 100}%`;
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
    reset() {
      page = "main";
      selected = 0;
      selectedMove = null;
    },
    confirm() {
      if (!game.busy) buttons()[selected]?.click();
    },
    navigate(dir) {
      if (game.busy) return;
      const count = buttons().length;
      if (count) {
        selected =
          (selected + (["up", "left"].includes(dir) ? -1 : 1) + count) % count;
        draw();
      }
    },
    back() {
      if (game.busy) return;
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
