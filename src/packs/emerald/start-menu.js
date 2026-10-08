/** BuildNormalStartMenu / AddStartMenuWindow: content policies, no DOM or service instances. */
export function emeraldStartMenu(state) {
  return [
    ...(state.flags.pokedex ? [{ id: "dex", label: "图鉴" }] : []),
    ...(state.party.length ? [{ id: "party", label: "宝可梦" }] : []),
    { id: "bag", label: "背包" },
    ...(state.flags.pokenavReceived ? [{ id: "map", label: "宝可导航" }] : []),
    { id: "trainer", label: state.playerName || "玩家" },
    { id: "save", label: "记录" }, { id: "settings", label: "设置" }, { id: "close", label: "退出" },
  ];
}
