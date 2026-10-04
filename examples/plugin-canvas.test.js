import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "./helpers/session.js";
import { canvasAdapter } from "../tests/helpers/canvas-extension-fixture.js";
test("a plugin mounts a looping clickable visual with saved interaction and host cleanup", async () => {
  let api;
  const frames = [], plugin = manifest("canvas-demo", value => {
    api = value;
    const visual = api.presentation.register("portrait", { duration: 100, loop: true,
      draw: (_ctx, frame) => frames.push(frame.progress),
    });
    const action = api.actions.register("touch", { schema: objectSchema({ pointer: objectSchema({
      x: { type: "number" }, y: { type: "number" }, source: { type: "string" },
    }, ["x", "y", "source"]) }, ["pointer"]), run: (ctx, input) => ctx.store.set("point", input.pointer) });
    const page = api.ui.page("portrait", { title: "互动", render: () => ({
      kind: "canvas", width: 200, height: 100, visual, action, alt: "互动画像",
    }) });
    api.ui.entry("portrait", { slot: "monster.detail", page, label: "互动" });
  });
  const s = session([plugin]), a = canvasAdapter(s);
  a.ext.showPage("canvas-demo:portrait"); a.frame(0); a.frame(125);
  assert.deepEqual(frames, [0, 0.25]);
  await a.root.querySelector("button").onclick({ detail: 0 });
  assert.deepEqual(api.store.get("point"), { x: 100, y: 50, source: "keyboard" });
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(api.store.get("point").x, 100);
  a.shell.closeModal(); a.frame(200);
  assert.equal(a.ext.layout.canvases.size, 0);
});
