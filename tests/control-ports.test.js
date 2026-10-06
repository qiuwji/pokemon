import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { layoutDocument } from "./helpers/layout-document.js";
import { ControlDOM } from "../src/adapters/control-dom.js";

test("UI identities reject stale and disabled choices and dispatch through the actual button", () => {
  const doc = layoutDocument(), root = doc.getElementById("modal-root");
  let selected = null;
  const controls = new ControlDOM({ root, dialogue: () => null, modalType: () => "story-choice" });
  const make = (label, disabled = false) => {
    const b = doc.createElement("button"); b.textContent = label; b.disabled = disabled;
    b.click = () => { selected = label; }; return b;
  };
  const local = make("重新开始"); local.setAttribute("data-control", "local");
  root.append(make("领取"), make("满包", true), local);
  const first = controls.inspect();
  assert.throws(() => controls.activate(first.buttons[1].id), /unavailable/);
  assert.throws(() => controls.activate(first.buttons[2].id), /unavailable/);
  controls.activate(first.buttons[0].id); assert.equal(selected, "领取");
  root.replaceChildren(make("领取"));
  assert.throws(() => controls.activate(first.buttons[0].id), /stale/);
  controls.activate(controls.inspect().buttons[0].id);
});

test("Core observation shares live world cells; UI input unblocks busy dialogue without altering domain state", () => {
  const s = session(), events = [];
  Object.assign(s.game.ui, { controlView: () => ({ dialogue: { text: "等待" }, buttons: [] }),
    controlConfirm: () => events.push("confirm"), back: () => events.push("back") });
  s.game.storyBusy = true; s.bus.active = "story-wait";
  const before = structuredClone(s.game.state), q = s.bus.executeSync("core.query", {}, "network");
  assert.equal(q.control.field.region.cells.length, q.control.field.region.width * q.control.field.region.height);
  assert.equal(q.control.ui.dialogue.text, "等待");
  assert(q.control.commands.some(d => d.id === "core.ui.input"));
  assert(!q.control.commands.some(d => d.id === "core.save.reset"));
  s.bus.executeSync("core.ui.input", { action: "confirm" }, "network");
  s.bus.executeSync("core.ui.input", { action: "back" }, "network");
  assert.deepEqual(events, ["confirm", "back"]);
  s.game.ui.dialog = {}; s.game.ui.nextDialogue = () => events.push("dialogue-confirm");
  s.bus.executeSync("core.ui.input", { action: "confirm" }, "network");
  assert.equal(events.at(-1), "dialogue-confirm");
  assert.deepEqual(s.game.state, before);
  assert.throws(() => s.bus.executeSync("core.ui.input", { action: "menu" }), /Menu unavailable/);
  assert.throws(() => s.bus.executeSync("core.ui.input", { action: "confirm", id: "bad" }), /Unexpected/);
});
