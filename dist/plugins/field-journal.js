import { objectSchema } from "../engine/extensions/values.js";
/** Independent example: content, grid room, story, menu, HUD and event-driven memory. */
export function createFieldJournal(baseMap) {
  return {
    id: "field-journal",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    validateData(data) {
      if (
        data.steps !== undefined &&
        (!Number.isSafeInteger(data.steps) || data.steps < 0)
      )
        throw new Error("Invalid journal steps");
    },
    setup(api) {
      const biscuit = api.content.register("items", "trail-biscuit", {
        name: "旅途小饼干",
        price: 120,
        contexts: ["field"],
        target: "party",
        effects: [{ op: "restoreHP", amount: 10 }],
        icon: "◇",
        description: "观察室制作的小饼干，恢复 10 点体力。",
      });
      const roomId = "field-journal:annex",
        floor = baseMap.blocks[4 * baseMap.width + 5];
      api.content.register("maps", "annex", {
        id: roomId,
        title: "野外观察室",
        width: 8,
        height: 8,
        tileset: baseMap.tileset,
        indoor: true,
        blocks: Array(64).fill(floor),
        behavior: Array(64).fill(0),
        border: baseMap.border,
        connections: [],
        npcs: [],
        signs: [],
        warps: [
          {
            x: 3,
            y: 7,
            elevation: 0,
            dest_map: baseMap.id,
            dest_warp_id: String(baseMap.warps.length),
          },
        ],
        elements: [
          {
            id: "field-journal:observer",
            x: 3,
            y: 3,
            actor: "Boy1",
            dir: "down",
            kind: "talk",
            name: "观察员",
            text: "一边探索，一边记录旅途。",
            movement: { mode: "look", rangeX: 0, rangeY: 0 },
          },
        ],
      });
      api.content.register("mapExtensions", "lab-entrance", {
        map: baseMap.id,
        warps: [
          { x: 12, y: 9, elevation: 0, dest_map: roomId, dest_warp_id: "0" },
        ],
      });
      api.story.register("welcome", {
        trigger: "interact",
        once: true,
        match: ({ object }) => object?.id === "field-journal:observer",
        build: () => [
          {
            type: "dialog",
            name: "观察员",
            lines: [
              "欢迎来到野外观察室！旅途手记会记录探索的步数。",
              "这份小饼干送给你。带着伙伴继续探索吧。",
            ],
          },
          {
            type: "reward",
            id: "field-journal:welcome-gift",
            items: { [biscuit]: 1 },
          },
        ],
      });
      const record = api.actions.register("record-step", {
        schema: objectSchema(),
        run(ctx) {
          ctx.store.set("steps", (ctx.store.get("steps") || 0) + 1);
        },
      });
      api.events.on("core:field-step", () => {
        if (!api.query().busy) api.commands.dispatch(record).catch(() => {});
      });
      const page = api.ui.page("journal", {
        title: "旅途 · 观察手记",
        render: (view) => ({
          kind: "panel",
          children: [
            { kind: "heading", text: "与伙伴一起探索" },
            {
              kind: "text",
              text: `已记录 ${view.store.get("steps") || 0} 步。`,
            },
            {
              kind: "text",
              text: "研究所东侧通道通往观察室。这张房间地图、观察员、赠送道具和页面都来自同一个独立插件。",
            },
          ],
        }),
      });
      api.ui.entry("detail", {
        slot: "monster.detail",
        label: "旅途手记",
        page,
      });
      api.ui.entry("menu", { slot: "menu", label: "旅途手记", page });
      api.ui.hud("steps", {
        render: (view) => ({
          kind: "text",
          text: `◇ 观察手记 · ${view.store.get("steps") || 0} 步`,
        }),
      });
    },
  };
}
