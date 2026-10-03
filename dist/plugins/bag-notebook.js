/** Optional complex-UI composition example. Plugin memory does not duplicate core inventory. */
export const bagNotebook = {
  id: "bag-notebook",
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: [],
  setup(api) {
    const save = api.actions.register("save", {
      schema: {
        type: "object",
        properties: {
          inBattle: { type: "boolean" },
          title: { type: "string", maxLength: 40 },
          pinned: { type: "boolean" },
          goal: { type: "integer", minimum: 0, maximum: 10 },
          category: { type: "string", enum: ["all", "items"] },
        },
        required: ["inBattle", "title", "pinned", "goal", "category"],
        additionalProperties: false,
      },
      run(ctx, input) {
        ctx.store.set("note", {
          title: input.title,
          pinned: input.pinned,
          goal: input.goal,
          category: input.category,
        });
        return { message: "背包笔记已记录。" };
      },
    });
    const theme = api.ui.theme("notebook", {
      background: "#e4ebce",
      foreground: "#394b38",
      border: "#788875",
      accent: "#769d68",
      spacing: 8,
      borderWidth: 2,
      fontSize: 14,
    });
    const summary = api.ui.component("inventory-summary", {
      schema: {
        type: "object",
        properties: { category: { type: "string", enum: ["all", "items"] } },
        required: ["category"],
        additionalProperties: false,
      },
      render(props, view) {
        const counts =
          props.category === "items"
            ? view
                .query()
                .inventory.pockets.items.slots.filter(Boolean)
                .map((s) => [s.item, s.count])
            : Object.entries(view.query().bag);
        return {
          kind: "table",
          columns: ["道具ID", "数量"],
          rows: counts.slice(0, 64),
        };
      },
    });
    api.ui.region("notes", {
      slot: "bag.content",
      when: (view) => !view.context.inBattle,
      render(view) {
        const note = view.store.get("note") || {
          title: "旅行准备",
          pinned: false,
          goal: 3,
          category: "all",
        };
        return {
          kind: "tabs",
          key: "notebook",
          value: "edit",
          theme,
          children: [
            {
              kind: "panel",
              key: "edit",
              label: "笔记",
              children: [
                {
                  kind: "form",
                  action: save,
                  children: [
                    {
                      kind: "input",
                      name: "title",
                      label: "笔记标题",
                      value: note.title,
                      maxLength: 40,
                    },
                    {
                      kind: "checkbox",
                      name: "pinned",
                      label: "标记重点",
                      value: note.pinned,
                    },
                    {
                      kind: "slider",
                      name: "goal",
                      label: "准备目标",
                      min: 0,
                      max: 10,
                      step: 1,
                      value: note.goal,
                    },
                    {
                      kind: "radio",
                      name: "category",
                      label: "库存范围",
                      value: note.category,
                      options: [
                        { label: "全部", value: "all" },
                        { label: "道具口袋", value: "items" },
                      ],
                    },
                    { kind: "button", text: "保存笔记", submit: true },
                  ],
                },
              ],
            },
            {
              kind: "panel",
              key: "stock",
              label: "库存查询",
              children: [
                {
                  kind: "component",
                  component: summary,
                  props: { category: note.category },
                },
              ],
            },
          ],
        };
      },
    });
  },
};
