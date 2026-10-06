import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
import { validateLayout } from "../src/engine/extensions/ui-registry.js";
test("detail entry renders a clickable action with persistent memory", async () => {
  let api;
  const plugin = manifest("page-demo", value => {
    api = value;
    const action = api.actions.register("pet", { schema: objectSchema(),
      run: ctx => ctx.store.set("pets", (ctx.store.get("pets") || 0) + 1),
    });
    const page = api.ui.page("care", { title: "互动示例",
      render: () => ({ kind: "button", text: "抚摸", action }),
    });
    api.ui.entry("care", { slot: "monster.detail", label: "互动", page });
  });
  const { game, host } = session([plugin]);
  const entry = host.ui.inSlot("monster.detail").find(e => e.owner === "page-demo");
  const page = host.ui.pages.get(entry.page);
  const layout = page.render(host.runtime.view("page-demo", { uid: game.state.party[0].uid }));
  validateLayout(layout, { actions: host.actions, resources: {}, themes: host.ui.themes });
  await api.commands.dispatch(layout.action, {});
  assert.equal(api.store.get("pets"), 1);
  game.loadDocument(game.exportDocument());
  assert.equal(api.store.get("pets"), 1);
});
