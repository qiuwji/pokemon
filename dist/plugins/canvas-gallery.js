import { objectSchema } from "../engine/extensions/values.js";

/** Optional host-lifecycle example; no rule, DOM, timing or resource ownership in the plugin. */
export const canvasGallery = {
  id: "canvas-gallery",
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: [],
  setup(api) {
    const visual = api.presentation.register("orbit", {
      duration: 1600,
      loop: true,
      schema: objectSchema({ selected: { type: "boolean" } }, ["selected"]),
      draw(ctx, frame) {
        const { width, height, progress, payload } = frame;
        ctx.fillStyle = "#283d43";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = payload.selected ? "#eab96c" : "#b4e0a6";
        const x = Math.round(
            width / 2 + (Math.cos(progress * Math.PI * 2) * width) / 4,
          ),
          y = Math.round(
            height / 2 + (Math.sin(progress * Math.PI * 2) * height) / 4,
          );
        ctx.fillRect(x - 4, y - 4, 8, 8);
        ctx.fillRect(
          Math.round(width / 2) - 2,
          Math.round(height / 2) - 2,
          4,
          4,
        );
      },
    });
    const action = api.actions.register("touch", {
      schema: objectSchema(
        {
          uid: { type: "string", minLength: 1 },
          pointer: objectSchema(
            {
              x: { type: "number", minimum: 0, maximum: 512 },
              y: { type: "number", minimum: 0, maximum: 512 },
              source: { type: "string", enum: ["pointer", "keyboard"] },
            },
            ["x", "y", "source"],
          ),
        },
        ["pointer"],
      ),
      run(ctx, input) {
        if (input.uid && !ctx.query().party.some((m) => m.uid === input.uid))
          throw new Error("伙伴已离开队伍。");
        ctx.store.set("last-touch", input);
        return { message: "已记录画布互动。" };
      },
    });
    const render = (view) => {
      const last = view.store.get("last-touch");
      return {
        kind: "panel",
        children: [
          {
            kind: "text",
            text: "点击像素画布；切换页面或关闭后宿主释放播放实例。",
          },
          {
            kind: "canvas",
            key: "orbit",
            width: 200,
            height: 160,
            visual,
            payload: { selected: !!last },
            action,
            alt: "像素轨道互动",
          },
          {
            kind: "text",
            text: last
              ? `上次互动：${Math.round(last.pointer.x)}, ${Math.round(last.pointer.y)}`
              : "尚未互动",
          },
        ],
      };
    };
    const page = api.ui.page("gallery", { title: "像素画布示例", render });
    api.ui.entry("gallery", { slot: "menu", label: "像素画布示例", page });
    api.ui.region("portrait", { slot: "monster.content", render });
  },
};
