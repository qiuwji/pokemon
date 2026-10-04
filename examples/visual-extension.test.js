import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
test("a plugin composes appearance, camera range and independent fog", async () => {
  let api;
  const plugin = manifest("visual-demo", value => {
    api = value;
    api.content.register("appearances", "outfit", { name: "示例外观",
      variants: { default: { layers: [{ kind: "actor", actor: "ProfBirch", y: -16 }] } },
    });
    api.content.register("cameraProfiles", "wide", { name: "远景", columns: 30, rows: 20 });
    api.content.register("environmentLayers", "mist", { name: "雾层", visual: "weather.fog", opacity: 0.3 });
  }, ["appearance", "camera", "environment"]);
  const { game } = session([plugin]);
  const before = structuredClone(game.state.position);
  await api.commands.dispatch("core.appearance.set", { target: { kind: "player" }, appearance: "visual-demo:outfit" });
  const camera = await api.commands.dispatch("core.camera.acquire", { profile: "visual-demo:wide" });
  const mist = await api.commands.dispatch("core.environment.acquire", { layer: "visual-demo:mist" });
  assert.equal((await api.commands.dispatch("core.camera.view", {})).width, 480);
  assert.equal(api.query().view.environment.length, 1);
  assert.deepEqual(game.state.position, before);
  await api.commands.dispatch("core.camera.release", { token: camera.token });
  await api.commands.dispatch("core.environment.release", { token: mist.token });
  game.loadDocument(game.exportDocument());
  assert.equal(api.query().view.environment.length, 0);
  assert.equal(game.appearanceFrame({ kind: "player" }, {}).appearance, "visual-demo:outfit");
});
