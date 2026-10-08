import test from "node:test";
import assert from "node:assert/strict";
import { session } from "../tests/helpers/session.js";
import { audioPlugin } from "../generated/plugins/emerald-audio.js";
import { createEmeraldAudio, emeraldMusic } from "../src/packs/emerald/audio-library.js";

test("The intro resolves MUS_ROUTE122 and keeps the truck silent throughout FadeOutBGM(4)", () => {
  const { host, db } = session([audioPlugin]), cues = createEmeraldAudio(host), map = db.maps.InsideOfTruck;
  assert.equal(emeraldMusic({ map, storyMusic: "MUS_ROUTE122" }, cues), "emerald-audio:mus_route122");
  assert.equal(cues.get("emerald-audio:mus_route122").fadeOutMs, 1067);
  assert.equal(emeraldMusic({ map, storyMusic: false }, cues), null);
});
