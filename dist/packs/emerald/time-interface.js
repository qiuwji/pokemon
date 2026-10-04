import { WallClockDial, drawWallClock } from "../../presentation/wall-clock-dial.js";
/** A pixel menu observes the saved world clock; initial setup is an application command. */
export function createTimeInterface(
  game,
  { modal, root, closeModal, showMenu, toast, document: doc, ownModalResource },
) {
  let renderClock = null;
  const pad = (n) => String(n).padStart(2, "0");
  const clockText = (view) =>
    view.initialized
      ? `第 ${view.day + 1} 天 · ${pad(view.hour)}:${pad(view.minute)}`
      : "时钟还没有设定";
  const playText = (view) =>
    `${Math.floor(view.playSeconds / 3600)}:${pad(Math.floor(view.playSeconds / 60) % 60)}:${pad(view.playSeconds % 60)}`;
  function showTime({ story = false, close = (commit) => commit(), confirm = (h, m) => game.startClock(h, m) } = {}) {
    const view = game.timeView(), dial = new WallClockDial(view.initialized ? view.hour : 10, view.initialized ? view.minute : 0);
    let settled = false, resolve;
    const result = new Promise((done) => { resolve = done; });
    const finish = (status) => {
      if (settled) return;
      settled = true;
      return close(() => { closeModal(); resolve({ status }); });
    };
    modal("冒险时钟",
      `<div class="clock-panel"><canvas data-clock-dial width="240" height="160" tabindex="0" role="img" aria-label="时钟表盘" style="image-rendering:pixelated;width:100%;max-width:720px;touch-action:none"></canvas><strong data-clock-time>${clockText(view)}</strong></div>${!view.initialized ? `<p>左右调整分针，上下调整小时；可拖动分针。</p><div class="inline-actions clock-controls"><input data-clock-hour type="hidden" value="10"><input data-clock-minute type="hidden" value="0"><button data-clock-adjust="-60" aria-label="减少一小时">时 −</button><button data-clock-adjust="60" aria-label="增加一小时">时 ＋</button><button data-clock-adjust="-1" aria-label="减少一分钟">分 −</button><button data-clock-adjust="1" aria-label="增加一分钟">分 ＋</button><button data-start-clock>确认时间</button><button data-cancel-clock>稍后再设</button></div>` : '<button data-clock-return>返回</button>'}<p>游玩时长：<span data-play-time>${playText(view)}</span></p><p data-tide></p>`,
      { type: "clock", back: async () => { await finish("cancelled"); if (!story) showMenu(); } });
    const canvas = root.querySelector("[data-clock-dial]"), ctx = canvas.getContext("2d");
    const hour = root.querySelector("[data-clock-hour]"), minute = root.querySelector("[data-clock-minute]");
    const ImageClass = doc.defaultView?.Image;
    const art = {};
    const gender = game.state.playerGender || 'male';
    const mode = view.initialized ? 'view' : 'start';
    if (ImageClass) for (const [key, suffix] of [['background', mode], ['hands', 'hands']]) {
      const image = new ImageClass();
      art[key] = image;
      image.onload = () => { if (!settled) render(); };
      image.onerror = () => { if (!settled) toast('时钟资源加载失败，请刷新重试。'); };
      image.src = `assets/wallclock-${gender}-${suffix}.png`;
    }
    const render = () => {
      const value = dial.value();
      drawWallClock(ctx, value, art);
      const label = root.querySelector('[data-clock-time]');
      if (label && !view.initialized) label.textContent = `${pad(value.hour)}:${pad(value.minute)}`;
      if (hour) { hour.value = String(value.hour); minute.value = String(value.minute); }
      canvas.setAttribute("aria-label", `时钟 ${pad(value.hour)}:${pad(value.minute)}`);
    };
    render();
    renderClock = (time) => drawWallClock(ctx, time, art);
    canvas.focus?.();
    if (hour) {
      root.querySelectorAll('[data-clock-adjust]').forEach((button) => {
        button.onclick = () => { dial.adjust(Number(button.dataset.clockAdjust)); render(); };
      });
      hour.onchange = minute.onchange = () => { dial.minutes = Number(hour.value) * 60 + Number(minute.value); render(); };
      canvas.onkeydown = (e) => {
        const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 60, ArrowDown: -60 }[e.key];
        if (delta !== undefined) { e.preventDefault(); e.stopPropagation(); dial.adjust(delta); render(); }
      };
      const point = (e) => {
        const bounds = canvas.getBoundingClientRect();
        dial.point((e.clientX - bounds.left) * 240 / bounds.width - 120,
          (e.clientY - bounds.top) * 160 / bounds.height - 80);
        render();
      };
      canvas.onpointerdown = (e) => { canvas.setPointerCapture(e.pointerId); point(e); };
      canvas.onpointermove = (e) => { if (canvas.hasPointerCapture(e.pointerId)) point(e); };
      canvas.onpointerup = (e) => canvas.releasePointerCapture(e.pointerId);
      root.querySelector("[data-start-clock]").onclick = () => {
        const value = { hour: Number(hour.value), minute: Number(minute.value) }, response = confirm(value.hour, value.minute);
        if (!response.ok) { toast(response.reason); return; }
        finish("confirmed");
        if (!story) game.save();
      };
      root.querySelector("[data-cancel-clock]").onclick = () => finish("cancelled");
    } else root.querySelector("[data-clock-return]").onclick = () => finish("viewed");
    ownModalResource(() => {
      renderClock = null;
      for (const image of Object.values(art)) image.onload = image.onerror = null;
      canvas.onkeydown = canvas.onpointerdown = canvas.onpointermove = canvas.onpointerup = null;
      if (!settled) { settled = true; resolve({ status: "cancelled" }); }
    });
    return result;
  }
  function updateTime(view) {
    const clock = root.querySelector("[data-clock-time]"),
      play = root.querySelector("[data-play-time]"),
      tide = root.querySelector("[data-tide]");
    if (clock && view.initialized) clock.textContent = clockText(view);
    const dial = root.querySelector("[data-clock-dial]");
    if (dial && view.initialized) renderClock?.(view);
    if (play) play.textContent = playText(view);
    if (tide && view.initialized)
      tide.textContent =
        view.tide === "high" ? "浅滩洞穴：涨潮时段" : "浅滩洞穴：退潮时段";
    const weather = doc.getElementById("weather"),
      map = game.world.map;
    if (weather)
      weather.textContent = `${map.indoor ? "室内" : { rain: "雨天", sun: "晴朗", sand: "沙尘", hail: "冰雹" }[map.presentation?.weather] || "晴朗"} · ${view.initialized ? `${pad(view.hour)}:${pad(view.minute)}` : "时钟未设定"}`;
  }
  return { showTime, updateTime };
}
