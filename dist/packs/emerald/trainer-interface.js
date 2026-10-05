import { playTime, BADGE_KEYS } from "./ui/native-view.js";
export function createTrainerInterface(
  game,
  { modal, showMenu, root, escapeHTML: esc },
) {
  function showTrainer(back = false) {
    const state = game.state,
      gender = state.playerGender || "male";
    modal(
      "训练家卡片",
      `<div class="trainer-native" style="background-image:url('assets/ui/trainer-${gender}-${back ? "back" : "front"}.png')">${back ? `<div class="trainer-back-data">${esc(state.playerName)}<br>图鉴 ${state.caught.length}<br>游玩时间 ${playTime(state.playSeconds)}</div>` : `<img class="trainer-portrait" src="assets/ui/trainer-portrait-${gender}.png" alt=""><div class="trainer-name">名字 ${esc(state.playerName)}</div><div class="trainer-money">金钱 ¥${state.money}</div><div class="trainer-dex">图鉴 ${state.caught.length}</div><div class="trainer-time">时间 ${playTime(state.playSeconds)}</div><div class="trainer-badges">${BADGE_KEYS.map((key, i) => `<span class="trainer-badge ${state.flags[key] ? "obtained" : ""}" style="--badge:${i}" aria-label="徽章 ${i + 1}${state.flags[key] ? " 已获得" : " 未获得"}"></span>`).join("")}</div>`}<button class="native-return" data-trainer-flip>${back ? "正面" : "背面"}</button></div>`,
      {
        type: "trainer",
        back: showMenu,
        close: false,
        navigate: () => {
          showTrainer(!back);
          return true;
        },
      },
    );
    root.querySelector("[data-trainer-flip]").onclick = () =>
      showTrainer(!back);
  }
  return { showTrainer };
}
