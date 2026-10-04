import { manifest, objectSchema } from "../../helpers/session.js";
/** Test-only room, dependent content, page and deferred observation fixture. */
export function createWorldFixture(baseMap) {
  return { ...manifest("fixture-world", (api) => {
    const item = api.content.register("items", "trail-biscuit", {
      name: "Fixture item", price: 120, contexts: ["field"], target: "party",
      effects: [{ op: "restoreHP", amount: 10 }], icon: "◇", description: "Test content",
    });
    api.content.register("maps", "annex", {
      id: "fixture-world:annex", title: "Fixture room", width: 8, height: 8,
      tileset: baseMap.tileset, indoor: true, blocks: Array(64).fill(baseMap.blocks[4 * baseMap.width + 5]),
      behavior: Array(64).fill(0), border: baseMap.border, connections: [], npcs: [], signs: [],
      warps: [{ x: 3, y: 7, elevation: 0, dest_map: baseMap.id, dest_warp_id: String(baseMap.warps.length) }],
      elements: [{ id: "fixture-world:observer", x: 3, y: 3, actor: "Boy1", dir: "down", kind: "talk", name: "Fixture", text: "Fixture", movement: { mode: "look", rangeX: 0, rangeY: 0 } }],
    });
    api.content.register("mapExtensions", "entrance", { map: baseMap.id,
      warps: [{ x: 12, y: 9, elevation: 0, dest_map: "fixture-world:annex", dest_warp_id: "0" }],
    });
    api.story.register("welcome", { trigger: "interact", once: true,
      match: ({ object }) => object?.id === "fixture-world:observer",
      commands: [{ type: "reward", id: "fixture-world:gift", items: { [item]: 1 } }],
    });
    const record = api.actions.register("record-step", {
      schema: objectSchema({ count: { type: "integer", minimum: 1, maximum: 128 } }),
      run: (ctx, { count = 1 }) => ctx.store.set("steps", (ctx.store.get("steps") || 0) + count),
    });
    let pending = 0, recording = false;
    const flush = () => {
      const view = api.query();
      if (!pending || recording || view.busy || view.battle) return;
      const count = Math.min(128, pending);
      recording = true;
      let committed = false;
      api.commands.dispatch(record, { count }).then(() => { pending -= count; committed = true; })
        .catch(() => {}).finally(() => { recording = false; if (committed) flush(); });
    };
    api.events.on("core:field-step", () => { pending++; flush(); });
    api.events.on("core:command-settled", flush);
    const page = api.ui.page("journal", { title: "Fixture", render: view => ({ kind: "text", text: String(view.store.get("steps") || 0) }) });
    api.ui.entry("detail", { slot: "monster.detail", label: "Fixture", page });
    api.ui.entry("menu", { slot: "menu", label: "Fixture", page });
    api.ui.hud("steps", { render: view => ({ kind: "text", text: String(view.store.get("steps") || 0) }) });
  }), validateData(data) {
    if (data.steps !== undefined && (!Number.isSafeInteger(data.steps) || data.steps < 0)) throw new Error("Invalid fixture steps");
  } };
}
