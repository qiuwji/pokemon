import { manifest, objectSchema } from "../../helpers/session.js";
/** Test-only controlled form, component, theme and drafts fixture. */
export const formFixture = manifest("fixture-form", api => {
  const fields = { inBattle: { type: "boolean" }, title: { type: "string", maxLength: 40 },
    pinned: { type: "boolean" }, goal: { type: "integer", minimum: 0, maximum: 10 },
    category: { type: "string", enum: ["all", "items"] } };
  const save = api.actions.register("save", { schema: objectSchema(fields, Object.keys(fields)),
    run(ctx, { title, pinned, goal, category }) { ctx.store.set("note", { title, pinned, goal, category }); return { message: "Saved" }; },
  });
  const theme = api.ui.theme("notebook", { background: "#e4ebce", foreground: "#394b38", border: "#788875", accent: "#769d68", spacing: 8, borderWidth: 2, fontSize: 14 });
  const summary = api.ui.component("inventory-summary", {
    schema: objectSchema({ category: fields.category }, ["category"]),
    render(props, view) {
      const rows = props.category === "items" ? view.query().inventory.pockets.items.slots.filter(Boolean).map(s => [s.item, s.count]) : Object.entries(view.query().bag);
      return { kind: "table", columns: ["ID", "Count"], rows: rows.slice(0, 64) };
    },
  });
  api.ui.region("notes", { slot: "bag.content", when: view => !view.context.inBattle, render(view) {
    const note = view.store.get("note") || { title: "Fixture", pinned: false, goal: 3, category: "all" };
    return { kind: "tabs", key: "notebook", value: "edit", theme, children: [
      { kind: "panel", key: "edit", label: "Edit", children: [{ kind: "form", action: save, children: [
        { kind: "input", name: "title", label: "Title", value: note.title, maxLength: 40 },
        { kind: "checkbox", name: "pinned", label: "Pinned", value: note.pinned },
        { kind: "slider", name: "goal", label: "Goal", min: 0, max: 10, step: 1, value: note.goal },
        { kind: "radio", name: "category", label: "Category", value: note.category, options: [{ label: "All", value: "all" }, { label: "Items", value: "items" }] },
        { kind: "button", text: "Save", submit: true },
      ] }] },
      { kind: "panel", key: "stock", label: "Stock", children: [{ kind: "component", component: summary, props: { category: note.category } }] },
    ] };
  } });
});
