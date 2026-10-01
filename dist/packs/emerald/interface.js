import { experienceAt } from "../../engine/model.js";
import {
  PACK,
  TYPE_NAMES,
  STATUS_NAMES,
  ABILITIES,
  NATURES,
  ITEMS,
  questFor,
} from "./pack.js";
// Emerald-specific DOM interface. It sends commands; it does not execute combat rules.
export function createEmeraldInterface(
  game,
  { document: doc = document, tone = () => {} } = {},
) {
  const $ = (id) => doc.getElementById(id),
    root = $("modal-root"),
    canvas = $("game"),
    db = game.db,
    saveStore = game.saveStore;
  let dialog = null,
    modalBack = null,
    modalType = null,
    modalFocus = null,
    selected = 0,
    battleSub = "main",
    toastTimer;
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

  function updateSide() {
    const q = questFor(game.state.flags);
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
      : `<div class="party-empty"><div class="starter-preview">${PACK.starters.map((s) => `<img src="assets/${s}-front.png" alt="${db.species[s].name}">`).join("")}</div><p>还没有搭档<br>第一位伙伴正在等你。</p></div>`;
    $("party-list")
      .querySelectorAll("[data-mon]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            if (!game.busy && !game.battle && !dialog)
              showMonster(+b.dataset.mon);
          }),
      );
    $("field-note").textContent = game.state.flags.pokedex
      ? "在草丛里寻找下一位伙伴，记得随时保存冒险。"
      : game.state.flags.rivalWon
        ? "博士正在研究所等你。沿原路回到未白镇吧。"
        : game.state.flags.rescued
          ? "北边的古辰镇有宝可梦中心。恢复体力，再去找小遥。"
          : "风吹过草丛，新的冒险就在小镇的北边。";
  }

  function hpColor(m) {
    const r = m.hp / m.stats.hp;
    return r > 0.5 ? "#81c989" : r > 0.2 ? "#dcb652" : "#cf6860";
  }

  function hpTrack(m) {
    return `<div class="hp-track"><i style="width:${(m.hp / m.stats.hp) * 100}%;background:${hpColor(m)}"></i></div>`;
  }

  function partyCard(m, i) {
    const s = db.species[m.species];
    return `<button class="party-card" data-mon="${i}"><img src="assets/${m.species}-front.png" alt=""><div class="mon-main"><div class="mon-heading">${s.name}<span>Lv.${m.level}</span></div>${hpTrack(m)}<div class="hp-value"><span class="type-pill">${m.status ? STATUS_NAMES[m.status] : s.types.map((t) => TYPE_NAMES[t]).join(" / ")}</span><span>${m.hp} / ${m.stats.hp}</span></div></div></button>`;
  }

  function say(name, lines, after = null) {
    return new Promise((resolve) => {
      dialog = {
        name,
        lines,
        index: 0,
        after: () => {
          after?.();
          resolve();
        },
      };
      renderDialogue();
      announce(lines[0]);
      game.clearInput();
    });
  }

  function renderDialogue() {
    const d = $("dialogue");
    if (!dialog) {
      d.hidden = true;
      return;
    }
    d.hidden = false;
    d.innerHTML = `<strong>${escapeHTML(dialog.name)}</strong>${escapeHTML(dialog.lines[dialog.index])}<span class="continue">▼ Z / 确认</span>`;
  }

  function nextDialogue() {
    if (!dialog) return;
    tone(660);
    if (++dialog.index >= dialog.lines.length) {
      const cb = dialog.after;
      dialog = null;
      renderDialogue();
      cb?.();
      updateSide();
      game.save();
    } else {
      renderDialogue();
      announce(dialog.lines[dialog.index]);
    }
  }

  function modal(
    title,
    body,
    { back = null, type = "generic", close = true } = {},
  ) {
    if (!root.children.length) modalFocus = document.activeElement;
    modalBack = back;
    modalType = type;
    game.clearInput();
    root.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><div class="modal-header"><h2>${escapeHTML(title)}</h2>${close ? '<button id="modal-close" aria-label="关闭">×</button>' : ""}</div>${body}</section></div>`;
    if ($("modal-close"))
      $("modal-close").onclick = () => (back ? back() : closeModal());
    requestAnimationFrame(() =>
      (
        root.querySelector(".menu-tile") || root.querySelector("button")
      )?.focus(),
    );
  }

  function closeModal() {
    root.innerHTML = "";
    modalType = null;
    modalBack = null;
    game.clearInput();
    modalFocus?.focus();
    modalFocus = null;
    canvas.focus({ preventScroll: true });
  }

  function starterPicker() {
    modal(
      "选择你的第一位伙伴",
      `<p>博士正被野生蛇纹熊追赶！背包里有三个精灵球，选择一只宝可梦去帮助他。</p><div class="starter-grid">${PACK.starters.map((id) => `<button class="starter-choice" data-starter="${id}"><img src="assets/${id}-front.png" alt="${db.species[id].name}"><strong>${db.species[id].name}</strong><span>${TYPE_NAMES[db.species[id].types[0]]}属性 · Lv.5</span></button>`).join("")}</div><div class="modal-footer">选择后，它将成为与你一起旅行的搭档。</div>`,
      { type: "starter" },
    );
    root.querySelectorAll("[data-starter]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.starter;
          modal(
            `就决定是 ${db.species[id].name} 吗？`,
            `<div class="detail-row"><img src="assets/${id}-front.png" alt=""><div><p>${TYPE_NAMES[db.species[id].types[0]]}属性 · Lv.5</p><p>与它一起踏上丰缘的冒险。</p></div></div><div class="choice-actions"><button id="choose-starter" class="primary-button">选择 ${db.species[id].name}</button><button id="rechoose" class="secondary-button">再看一看</button></div>`,
            { back: starterPicker, type: "starter" },
          );
          $("rechoose").onclick = starterPicker;
          $("choose-starter").onclick = () => {
            closeModal();
            void game.chooseStarter(id);
          };
        }),
    );
  }

  function battleStatus(m, side) {
    const s = db.species[m.species];
    let xp = "";
    if (side === "player") {
      const base = experienceAt(m.level, s.growth),
        next = experienceAt(m.level + 1, s.growth);
      xp = `<div class="exp-track"><i style="width:${Math.max(0, Math.min(100, ((m.exp - base) / (next - base)) * 100))}%"></i></div>`;
    }
    return `<div class="battle-status ${side}" data-side="${side}"><div class="mon-heading">${s.name} <span>${m.gender} Lv.${m.level}</span></div>${hpTrack(m)}${side === "player" ? `<div class="hp-value">${m.status ? STATUS_NAMES[m.status] + " · " : ""}<span class="hp-number">${m.hp} / ${m.stats.hp}</span></div>${xp}` : ""}</div>`;
  }

  function drawBattleHUD(message = null) {
    if (!game.battle) {
      $("battle-hud").hidden = true;
      return;
    }
    $("battle-hud").hidden = false;
    const p = game.director.view.player,
      e = game.director.view.enemy;
    let options = "",
      prompt = message || `${db.species[p.species].name}<br>要做什么？`;
    if (game.busy) {
      options = "";
    } else if (game.battle.player.hp <= 0) {
      options = '<button data-baction="party">替换宝可梦</button>';
      prompt = "请选择下一位伙伴。";
    } else if (battleSub === "moves") {
      prompt = '选择招式<br><small style="font-size:12px">X 返回</small>';
      options = game.battle.player.moves
        .map((slot, i) => {
          const mv = db.moves[slot.id];
          return `<button data-move="${i}" ${slot.pp === 0 && game.battle.player.moves.some((m) => m.pp > 0) ? "disabled" : ""}>${mv.name}<small>${TYPE_NAMES[mv.type]} · PP ${slot.pp} / ${mv.pp}</small></button>`;
        })
        .join("");
      if (!game.battle.player.moves.some((m) => m.pp > 0))
        options =
          '<button data-struggle="true">挣扎<small>没有可用招式</small></button>';
    } else
      options =
        '<button data-baction="fight">战斗</button><button data-baction="bag">背包</button><button data-baction="party">宝可梦</button><button data-baction="run">逃跑</button>';
    $("battle-hud").innerHTML =
      battleStatus(e, "enemy") +
      battleStatus(p, "player") +
      `<div class="battle-menu">${game.busy ? `<div class="battle-log-text">${escapeHTML(message || "…")}</div>` : `<div class="battle-message">${prompt}</div><div class="battle-options">${options}</div>`}</div>`;
    const btns = [
      ...$("battle-hud").querySelectorAll(
        ".battle-options button:not(:disabled)",
      ),
    ];
    if (selected >= btns.length) selected = 0;
    btns[selected]?.classList.add("selected");
    $("battle-hud")
      .querySelectorAll("[data-baction]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            if (b.dataset.baction === "fight") {
              battleSub = "moves";
              selected = 0;
              drawBattleHUD();
            }
            if (b.dataset.baction === "bag") showBag(true);
            if (b.dataset.baction === "party") showParty(true);
            if (b.dataset.baction === "run") game.turn({ kind: "run" });
          }),
      );
    $("battle-hud")
      .querySelectorAll("[data-move]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            game.turn({ kind: "move", index: +b.dataset.move })),
      );
    $("battle-hud")
      .querySelector("[data-struggle]")
      ?.addEventListener("click", () => game.turn({ kind: "move", index: -1 }));
  }

  function confirmBattle() {
    if (game.busy) {
      return;
    }
    const bs = [
      ...$("battle-hud").querySelectorAll(
        ".battle-options button:not(:disabled)",
      ),
    ];
    bs[selected]?.click();
  }

  function checkGrowth() {
    if (dialog || game.battle || game.busy) return;
    for (const mon of game.state.party) {
      if (mon.pendingMoves?.length) {
        const id = mon.pendingMoves[0];
        modal(
          "学习新的招式",
          `<p>${db.species[mon.species].name} 想学习 ${db.moves[id].name}，但是已经掌握了四个招式。选择要忘记的招式。</p><div class="move-list">${mon.moves.map((s, i) => `<button class="move-summary" data-forget="${i}">${db.moves[s.id].name}<small>PP ${s.pp} / ${db.moves[s.id].pp}</small></button>`).join("")}</div><div class="inline-actions"><button id="skip-move" class="secondary-button">不学习这个招式</button></div>`,
          { type: "learning", close: false },
        );
        const done = (i) => {
          game.learnMove(mon, i);
          closeModal();
          updateSide();
          game.save();
          checkGrowth();
        };
        root
          .querySelectorAll("[data-forget]")
          .forEach((b) => (b.onclick = () => done(+b.dataset.forget)));
        $("skip-move").onclick = () => done(null);
        return;
      }
      const evolution = db.evolutions[mon.species];
      if (
        evolution &&
        mon.level >= evolution.level &&
        mon.evolutionSkipped !== mon.level
      ) {
        modal(
          "伙伴正在进化",
          `<div class="detail-row"><img src="assets/${mon.species}-front.png" alt=""><div><p>${db.species[mon.species].name} 身上出现了光芒！</p><p>它将进化成 ${db.species[evolution.to].name}。</p></div></div><div class="choice-actions"><button class="primary-button" id="evolve">继续进化</button><button class="secondary-button" id="cancel-evolve">停止进化</button></div>`,
          { type: "evolution", close: false },
        );
        $("evolve").onclick = () => {
          game.evolve(mon);
          closeModal();
          toast(`进化成了 ${db.species[mon.species].name}！`);
          updateSide();
          game.save();
          checkGrowth();
        };
        $("cancel-evolve").onclick = () => {
          game.evolve(mon, { cancel: true });
          closeModal();
          game.save();
          checkGrowth();
        };
        return;
      }
    }
    game.save();
  }

  function showParty(inBattle = false) {
    modal(
      inBattle ? "替换宝可梦" : "我的队伍",
      game.state.party.length
        ? game.state.party.map((m, i) => partyCard(m, i)).join("")
        : `<p>还没有宝可梦。到 101 号道路调查博士的背包，选择你的搭档。</p>`,
      { back: inBattle ? closeModal : showMenu, type: "party" },
    );
    root
      .querySelectorAll("[data-mon]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            inBattle
              ? game.turn({ kind: "switch", index: +b.dataset.mon })
              : showMonster(+b.dataset.mon)),
      );
  }

  function showMonster(index) {
    const m = game.state.party[index];
    if (!m) return;
    const s = db.species[m.species];
    modal(
      s.name,
      `<div class="detail-row"><img src="assets/${m.species}-front.png" alt="${s.name}"><div><p>Lv.${m.level} · ${m.gender} · ${s.types.map((t) => TYPE_NAMES[t]).join(" / ")}</p><p>${NATURES[m.nature]}性格 · 特性：${ABILITIES[m.ability] || m.ability}</p><p>HP ${m.hp} / ${m.stats.hp} ${m.status ? " · " + STATUS_NAMES[m.status] : ""}</p><p>距离升级还需 ${Math.max(0, experienceAt(m.level + 1, s.growth) - m.exp)} 点经验</p></div></div><div class="detail-stats">${Object.entries(
        {
          hp: "体力",
          atk: "攻击",
          def: "防御",
          spa: "特攻",
          spd: "特防",
          spe: "速度",
        },
      )
        .map(([k, v]) => `<div>${v}<strong>${m.stats[k]}</strong></div>`)
        .join("")}</div><div class="move-list">${m.moves
        .map((slot) => {
          const v = db.moves[slot.id];
          return `<div class="move-summary">${v.name}<small>${TYPE_NAMES[v.type]} · 威力 ${v.power || "—"} · PP ${slot.pp} / ${v.pp}</small></div>`;
        })
        .join(
          "",
        )}</div><div class="inline-actions"><button class="secondary-button" id="lead" ${index === 0 ? "disabled" : ""}>设为首发</button><button class="secondary-button" id="use-potion" ${!game.state.bag.potion || m.hp <= 0 || m.hp === m.stats.hp ? "disabled" : ""}>使用伤药 (${game.state.bag.potion})</button></div>`,
      { back: () => showParty(), type: "detail" },
    );
    $("lead").onclick = () => {
      game.setLead(index);
      updateSide();
      game.save();
      showParty();
    };
    $("use-potion").onclick = () => {
      game.usePotion(index);
      updateSide();
      game.save();
      showMonster(index);
      tone(800);
    };
  }

  function showBag(inBattle = false) {
    modal(
      "背包",
      Object.entries(ITEMS)
        .map(
          ([id, item]) =>
            `<div class="bag-item"><div class="bag-icon">${id === "pokeball" ? "◉" : "✚"}</div><div><strong>${item.name} × ${game.state.bag[id]}</strong><p>${item.description}</p></div><button class="secondary-button" data-item="${id}" ${!game.state.bag[id] || (!inBattle && id === "pokeball") ? "disabled" : ""}>使用</button></div>`,
        )
        .join("") +
        `<div class="modal-footer">${inBattle ? "使用道具会占用这一回合。" : "精灵球可以在野生宝可梦战斗中使用。"}</div>`,
      { back: inBattle ? closeModal : showMenu, type: "bag" },
    );
    root.querySelectorAll("[data-item]").forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.item === "pokeball") game.turn({ kind: "ball" });
          else if (inBattle) chooseHealTarget();
          else {
            showParty();
            toast("选择需要回复体力的伙伴。");
          }
        }),
    );
  }

  function chooseHealTarget() {
    modal(
      "伤药 · 选择伙伴",
      game.state.party.map((m, i) => partyCard(m, i)).join(""),
      { back: () => showBag(true), type: "heal-target" },
    );
    root
      .querySelectorAll("[data-mon]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            game.turn({ kind: "potion", index: +b.dataset.mon })),
      );
  }

  function showDex() {
    const list = Object.entries(db.species).sort((a, b) => a[1].dex - b[1].dex);
    modal(
      "宝可梦图鉴",
      `<p>已发现 ${game.state.seen.length} 种 · 已捕获 ${game.state.caught.length} 种</p><div class="dex-grid">${list
        .map(([id, s]) => {
          const found = game.state.seen.includes(id);
          return `<div class="dex-entry ${found ? "" : "unseen"}"><span>No.${String(s.dex).padStart(3, "0")}</span><img src="assets/${id}-front.png" alt="${found ? s.name : "未知宝可梦"}"><strong>${found ? s.name : "???"}</strong><span>${game.state.caught.includes(id) ? "● 已捕获" : found ? "已发现" : "尚未发现"}</span></div>`;
        })
        .join(
          "",
        )}</div><div class="modal-footer">当前图鉴收录序章及其部分进化形态，后续可继续补充。</div>`,
      { back: showMenu, type: "dex" },
    );
  }

  function showShop() {
    modal(
      "友好商店",
      `<p>欢迎光临！现有零花钱 ¥${game.state.money.toLocaleString("zh-CN")}</p>${Object.entries(
        ITEMS,
      )
        .map(
          ([id, item]) =>
            `<div class="bag-item"><div class="bag-icon">${id === "pokeball" ? "◉" : "✚"}</div><div><strong>${item.name} · ¥${item.price}</strong><p>${item.description}</p><p>持有 ${game.state.bag[id]} 个</p></div><button class="secondary-button" data-buy="${id}" ${game.state.money < item.price || (id === "pokeball" && !game.state.flags.pokedex) ? "disabled" : ""}>购买 1 个</button></div>`,
        )
        .join(
          "",
        )}${!game.state.flags.pokedex ? '<p class="notice">领取图鉴后即可购买精灵球。</p>' : ""}`,
      { type: "shop" },
    );
    root.querySelectorAll("[data-buy]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.buy;
          if (!game.buyItem(id)) return;
          updateSide();
          game.save();
          showShop();
          tone(880);
          toast(`买到了 1 个${ITEMS[id].name}。`);
        }),
    );
  }

  function showBox() {
    modal(
      "电脑 · 宝可梦盒子",
      `<p>队伍满员时捕获的宝可梦会送到这里。你可以交换盒子里的伙伴与当前队伍。</p>${game.state.box.length ? `<div class="box-grid">${game.state.box.map((m, i) => `<button class="box-mon" data-box="${i}"><img src="assets/${m.species}-front.png" alt=""><strong>${db.species[m.species].name}</strong><small>Lv.${m.level} · ${m.hp}/${m.stats.hp} HP</small></button>`).join("")}</div>` : "<p>盒子里还没有宝可梦。</p>"}`,
      { back: showMenu, type: "box" },
    );
    root.querySelectorAll("[data-box]").forEach(
      (b) =>
        (b.onclick = () => {
          const i = +b.dataset.box;
          if (game.state.party.length < 6) {
            game.withdrawBox(i);
            updateSide();
            game.save();
            showBox();
            return;
          }
          modal(
            "选择要交换的伙伴",
            game.state.party.map((m, j) => partyCard(m, j)).join(""),
            { back: showBox, type: "box-swap" },
          );
          root.querySelectorAll("[data-mon]").forEach(
            (c) =>
              (c.onclick = () => {
                const j = +c.dataset.mon;
                game.exchangeBox(i, j);
                updateSide();
                game.save();
                showBox();
              }),
          );
        }),
    );
  }

  function showMenu() {
    if (game.busy || game.battle || dialog) return;
    modal(
      "冒险菜单",
      `<div class="menu-grid"><button class="menu-tile" data-page="party">宝可梦<small>查看队伍与招式</small></button><button class="menu-tile" data-page="bag">背包<small>道具与精灵球</small></button><button class="menu-tile" data-page="dex" ${!game.state.flags.pokedex ? "disabled" : ""}>宝可梦图鉴<small>${game.state.flags.pokedex ? "已发现 " + game.state.seen.length + " 种" : "博士的礼物"}</small></button><button class="menu-tile" data-page="save">记录冒险<small>保存、导出与继续</small></button><button class="menu-tile" data-page="box">电脑盒子<small>${game.state.box.length} 位寄存伙伴</small></button><button class="menu-tile" data-page="help">操作与范围<small>玩法说明</small></button></div><div class="modal-footer">X / Esc 返回冒险</div>`,
      { type: "menu" },
    );
    const actions = {
      party: showParty,
      bag: () => showBag(),
      dex: showDex,
      save: showSave,
      box: showBox,
      help: showHelp,
    };
    root
      .querySelectorAll("[data-page]")
      .forEach((b) => (b.onclick = actions[b.dataset.page]));
  }

  function showSave() {
    const saved = saveStore.load();
    modal(
      "记录冒险",
      `<div class="save-box"><strong>${game.world.map.title} · ${game.state.party.length} 位伙伴</strong><p>已探索 ${game.state.seen.length} 种宝可梦 · 游玩 ${Math.floor(game.state.playSeconds / 60)} 分钟</p><p>${saved ? "上次保存：" + new Date(saved.savedAt).toLocaleString("zh-CN") : "尚未保存"}</p></div><div class="inline-actions"><button id="save-now" class="primary-button">保存进度</button><button id="continue-save" class="secondary-button" ${!saved ? "disabled" : ""}>读取存档</button><button id="export-save" class="secondary-button">导出存档</button><button id="import-save" class="secondary-button">导入存档</button><input id="save-file" type="file" accept="application/json,.json" hidden></div><p class="notice">进度保存在当前浏览器。切换设备前，请先导出存档。</p><div class="modal-footer"><button id="new-game" class="text-button" style="color:#cbb18e">重新开始冒险</button></div>`,
      { back: showMenu, type: "save" },
    );
    $("save-now").onclick = () => {
      game.save(true);
      showSave();
    };
    $("continue-save").onclick = () => {
      const d = saveStore.load();
      if (!d) return;
      game.loadDocument(d);
      closeModal();
      updateSide();
      toast("已读取存档。");
    };
    $("export-save").onclick = () => {
      const blob = new Blob([JSON.stringify(game.exportDocument(), null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "emerald-save.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    $("import-save").onclick = () => $("save-file").click();
    $("save-file").onchange = async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      try {
        if (file.size > 1024 * 1024) throw new Error();
        const d = JSON.parse(await file.text());
        game.loadDocument(d);
        closeModal();
        updateSide();
        game.save(true);
      } catch {
        toast("这个存档无法读取，请选择有效的序章存档。");
      }
    };
    $("new-game").onclick = () => {
      modal(
        "重新开始冒险",
        `<p>当前浏览器里的进度将被新的冒险覆盖。你可以先返回菜单导出存档。</p><div class="choice-actions"><button class="secondary-button" id="keep-game">继续当前冒险</button><button class="primary-button" id="reset-game">重新开始</button></div>`,
        { back: showSave, type: "reset" },
      );
      $("keep-game").onclick = showSave;
      $("reset-game").onclick = () => {
        game.reset();
        closeModal();
        updateSide();
        game.save();
      };
    };
  }

  function showHelp() {
    modal(
      "操作与范围",
      `<div class="help-table"><span><kbd>方向键 / WASD</kbd></span><span>移动。按住 Shift 跑步。</span><span><kbd>Z / 回车</kbd></span><span>调查、对话、确认。对话时点按游戏画面也可继续。</span><span><kbd>X / Esc</kbd></span><span>返回上一层菜单。</span><span><kbd>M</kbd></span><span>打开冒险菜单。</span></div><p>触屏设备可使用画面下方的方向键和 A / B 按钮。战斗菜单支持鼠标、方向键与确认键。</p><p>本次序章：未白镇、101 号道路、古辰镇、103 号道路西部，以及研究所、主角的家、宝可梦中心和友好商店。</p><p>已加入三选一初始精灵、博士救助、小遥对战、草丛遇敌、捕捉、经验、能力变化、部分异常状态、学习招式、部分进化、回复与本机存档。</p><p class="notice">开场搬家演出、完整剧情、全部地图、道馆、双打，以及未列出的招式和特性效果尚未实现。地图与像素素材源于原作，非官方同人演示。</p><div class="modal-footer">素材及机制参考：<a href="https://github.com/pret/pokeemerald" target="_blank" rel="noopener" style="color:#b7d398">pret/pokeemerald</a> · Pokémon © Nintendo / Creatures / GAME FREAK</div>`,
      { back: showMenu, type: "help" },
    );
  }

  function back() {
    if (game.busy && !dialog) return;
    if (modalType === "learning" || modalType === "evolution") return;
    if (root.children.length) {
      modalBack ? modalBack() : closeModal();
      return;
    }
    if (dialog) {
      nextDialogue();
      return;
    }
    if (game.battle && !game.busy && battleSub === "moves") {
      battleSub = "main";
      selected = 0;
      drawBattleHUD();
    }
  }

  function refreshBattle(frame) {
    if (!frame) return;
    for (const side of ["player", "enemy"]) {
      const el = $("battle-hud").querySelector(`[data-side="${side}"]`),
        m = frame.view[side];
      if (!el) continue;
      const bar = el.querySelector(".hp-track i");
      bar.style.width = `${(m.hp / m.stats.hp) * 100}%`;
      bar.style.background = hpColor(m);
      const number = el.querySelector(".hp-number");
      if (number) number.textContent = `${m.hp} / ${m.stats.hp}`;
    }
  }
  return {
    toast,
    announce,
    updateSide,
    say,
    nextDialogue,
    starterPicker,
    drawBattleHUD,
    refreshBattle,
    confirmBattle,
    checkGrowth,
    showParty,
    showBag,
    showMenu,
    showHelp,
    showShop,
    back,
    closeModal,
    renderDialogue,
    get dialog() {
      return dialog;
    },
    get modalType() {
      return modalType;
    },
    get blocked() {
      return !!dialog || !!root.children.length;
    },
    resetBattleMenu() {
      battleSub = "main";
      selected = 0;
    },
    navigateBattle(dir) {
      if (game.busy) return;
      selected = (selected + (dir === "up" || dir === "left" ? -1 : 1) + 4) % 4;
      drawBattleHUD();
    },
    confirm() {
      if (root.children.length) {
        root.querySelector("button:focus")?.click();
      } else game.interact();
    },
    navigateMenu(dir) {
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
      const bs = [...root.querySelectorAll("button:not(:disabled),input")],
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
    chooseStarter(species) {
      if (modalType !== "starter")
        throw new Error("Starter selection is not open");
      const choice = root.querySelector(`[data-starter="${species}"]`);
      if (!choice) throw new Error("Invalid starter");
      choice.click();
      $("choose-starter")?.click();
    },
  };
}
