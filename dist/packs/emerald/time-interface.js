/** A pixel menu observes the saved world clock; initial setup is an application command. */
export function createTimeInterface(
  game,
  { modal, root, closeModal, showMenu, toast, document: doc },
) {
  const pad = (n) => String(n).padStart(2, "0");
  const clockText = (view) =>
    view.initialized
      ? `第 ${view.day + 1} 天 · ${pad(view.hour)}:${pad(view.minute)}`
      : "时钟还没有设定";
  const playText = (view) =>
    `${Math.floor(view.playSeconds / 3600)}:${pad(Math.floor(view.playSeconds / 60) % 60)}:${pad(view.playSeconds % 60)}`;
  function showTime() {
    const view = game.timeView();
    modal(
      "冒险时钟",
      `<div class="save-box"><strong data-clock-time>${clockText(view)}</strong><p>游玩时长：<span data-play-time>${playText(view)}</span></p><p data-tide>${view.initialized ? (view.tide === "high" ? "浅滩洞穴：涨潮时段" : "浅滩洞穴：退潮时段") : "设定时钟后，时间事件开始运行。"}</p></div>${!view.initialized ? `<p>现在是几点？请设定家里的时钟。</p><div class="inline-actions"><label>时<select data-clock-hour>${Array.from({ length: 24 }, (_, n) => `<option value="${n}" ${n === 12 ? "selected" : ""}>${pad(n)}</option>`).join("")}</select></label><label>分<select data-clock-minute>${Array.from({ length: 60 }, (_, n) => `<option value="${n}">${pad(n)}</option>`).join("")}</select></label><button data-start-clock>开始计时</button></div>` : ""}<p>离开游戏后，世界时间仍会继续。游玩时长只记录游戏页面处于前台的时间。</p>`,
      { type: "clock", back: showMenu },
    );
    const start = root.querySelector("[data-start-clock]");
    if (start)
      start.onclick = () => {
        const result = game.startClock(
          Number(root.querySelector("[data-clock-hour]").value),
          Number(root.querySelector("[data-clock-minute]").value),
        );
        if (!result.ok) toast(result.reason);
        else {
          closeModal();
          game.save();
        }
      };
  }
  function updateTime(view) {
    const clock = root.querySelector("[data-clock-time]"),
      play = root.querySelector("[data-play-time]"),
      tide = root.querySelector("[data-tide]");
    if (clock) clock.textContent = clockText(view);
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
