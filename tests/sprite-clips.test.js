import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateSpriteClip } from "../dist/engine/extensions/sprite-clip-contracts.js";
import {
  SpriteClips,
  sampleSpriteClip,
} from "../dist/presentation/sprite-clips.js";
import { SpriteCanvas } from "../dist/adapters/sprite-canvas.js";
import { DETAIL_SPRITE_FRAMES } from "../dist/packs/emerald/detail-sprite-frames.js";
import { createUIShell } from "../dist/packs/emerald/ui-shell.js";
import { createPartyInterface } from "../dist/packs/emerald/party-interface.js";
import { layoutDocument } from "./helpers/layout-document.js";
import { manifest, session } from "../examples/helpers/session.js";
const clip = () =>
  validateSpriteClip({
    width: 64,
    height: 64,
    loop: true,
    frames: [
      {
        resource: "sheet",
        rect: { x: 0, y: 0, width: 64, height: 64 },
        durationMs: 50,
      },
      {
        resource: "sheet",
        rect: { x: 0, y: 64, width: 64, height: 64 },
        durationMs: 100,
      },
    ],
  });
function clockPort() {
  let time = 0,
    id = 0;
  const pending = new Map(),
    discarded = [];
  return {
    now: () => time,
    request: (fn) => {
      pending.set(++id, fn);
      return id;
    },
    cancel: (key) => {
      if (pending.has(key)) discarded.push(pending.get(key));
      pending.delete(key);
    },
    step(ms) {
      time += ms;
      const todo = [...pending.values()];
      pending.clear();
      todo.forEach((fn) => fn());
    },
    get pending() {
      return pending.size;
    },
    discarded,
  };
}
function canvasPort() {
  const calls = [];
  return {
    calls,
    width: 64,
    height: 64,
    getContext: () => ({
      clearRect(...args) {
        calls.push(["clear", ...args]);
      },
      drawImage(...args) {
        calls.push(["image", ...args]);
      },
    }),
  };
}
test("Clip validation rejects invalid timing, dimensions, shape and binding; definitions are deeply immutable", () => {
  const d = clip();
  assert(Object.isFrozen(d.frames[0].rect));
  for (const changes of [
    { width: 0 },
    { height: NaN },
    { loop: "yes" },
    { frames: [] },
    { frames: [{ resource: "sheet", durationMs: 0 }] },
    { frames: [{ resource: "sheet", durationMs: 10001 }] },
    {
      frames: [
        {
          resource: "sheet",
          durationMs: 10,
          rect: { x: -1, y: 0, width: 1, height: 1 },
        },
      ],
    },
    { match: { species: "mudkip", view: "" } },
    { random: true },
  ])
    assert.throws(
      () => validateSpriteClip({ ...d, ...changes }),
      /sprite clip/,
    );
  assert.throws(
    () =>
      validateSpriteClip({
        ...d,
        frames: Array.from({ length: 7 }, () => ({
          resource: "sheet",
          durationMs: 10000,
        })),
      }),
    /sprite clip/,
  );
});
test("Pure frame sampling uses exact boundaries, loop modulo, finite clocks and reduced-motion first frame", () => {
  const d = clip();
  assert.equal(sampleSpriteClip(d, -1).index, 0);
  assert.equal(sampleSpriteClip(d, 49).index, 0);
  assert.equal(sampleSpriteClip(d, 50).index, 1);
  assert.equal(sampleSpriteClip(d, 149).index, 1);
  assert.equal(sampleSpriteClip(d, 150).index, 0);
  assert.equal(sampleSpriteClip(d, 1000001).index, 1);
  assert.deepEqual(sampleSpriteClip(d, 50), sampleSpriteClip(d, 50));
  assert.equal(sampleSpriteClip({ ...d, loop: false }, 150).complete, true);
  assert.equal(sampleSpriteClip({ ...d, loop: false }, 150).index, 1);
  assert.equal(sampleSpriteClip(d, 80, { reducedMotion: true }).index, 0);
  assert.throws(() => sampleSpriteClip(d, NaN), /clock/);
});
test("Registry rejects unknown resources/species and conflicting explicit bindings while allowing replacement of native defaults", () => {
  const r = new SpriteClips({
      resources: { sheet: "sheet.png" },
      species: { mudkip: {} },
    }),
    d = { ...clip(), match: { species: "mudkip", view: "detail" } };
  r.register("base", d, { fallback: true });
  r.register("custom", { ...d, loop: false });
  assert.equal(r.find("mudkip").loop, false);
  assert(Object.isFrozen(r.get("custom")));
  assert.throws(() => r.register("conflict", d), /Conflicting/);
  assert.throws(
    () =>
      r.register("bad", {
        ...d,
        match: { species: "unknown", view: "detail" },
      }),
    /Unknown sprite species/,
  );
  assert.throws(
    () =>
      r.register("missing", {
        ...d,
        frames: [{ resource: "missing", durationMs: 10 }],
      }),
    /Unknown sprite resource/,
  );
  assert.equal(r.find("mudkip", "other"), null);
  r.seal();
  assert.throws(() => r.register("late", d), /sealed/);
});
test("Canvas player crops actual frames, draws only changes, letterboxes and cancels stale callbacks on replacement", () => {
  const clock = clockPort(),
    canvas = canvasPort(),
    image = { width: 64, height: 128 },
    p = new SpriteCanvas({ canvas, assets: { sheet: image }, clock });
  p.play(clip());
  assert.equal(canvas.calls.at(-1)[3], 0);
  clock.step(25);
  assert.equal(canvas.calls.length, 2);
  clock.step(25);
  assert.equal(canvas.calls.at(-1)[3], 64);
  p.stop();
  const stale = clock.discarded.at(-1);
  p.play({ ...clip(), frames: [{ resource: "sheet", durationMs: 1 }] });
  const count = canvas.calls.length;
  stale();
  assert.equal(canvas.calls.length, count);
  assert.equal(clock.pending, 0);
  assert.equal(canvas.calls.at(-1)[6], 16); // 64x128 static image fits a 64x64 viewport.
});
test("Missing/oversized resource frames fail before the first draw, and asynchronous drawing failures release the loop", () => {
  const clock = clockPort(),
    canvas = canvasPort(),
    errors = [],
    p = new SpriteCanvas({
      canvas,
      assets: { sheet: { width: 64, height: 64 } },
      clock,
      onError: (e) => errors.push(e),
    });
  assert.throws(() => p.play(clip()), /outside image/);
  assert.equal(canvas.calls.length, 0);
  assert.equal(clock.pending, 0);
  assert.throws(
    () =>
      p.play({ ...clip(), frames: [{ resource: "missing", durationMs: 1 }] }),
    /Missing sprite image/,
  );
  const image = { width: 64, height: 128 };
  p.assets.sheet = image;
  p.play(clip());
  p.ctx.drawImage = () => {
    throw new Error("Drawing failure");
  };
  clock.step(50);
  assert.equal(errors[0].message, "Drawing failure");
  assert.equal(clock.pending, 0);
  assert.equal(p.clip, null);
});
test("Reduced motion and single frames draw once; non-loop clips finish without a lingering timer", () => {
  const clock = clockPort(),
    canvas = canvasPort(),
    p = new SpriteCanvas({
      canvas,
      assets: { sheet: { width: 64, height: 128 } },
      clock,
      reducedMotion: () => true,
    });
  p.play(clip());
  assert.equal(clock.pending, 0);
  assert.equal(canvas.calls.at(-1)[3], 0);
  p.reducedMotion = () => false;
  p.play({ ...clip(), loop: false });
  clock.step(150);
  assert.equal(clock.pending, 0);
  assert.equal(canvas.calls.at(-1)[3], 64);
  p.play({ ...clip(), frames: [clip().frames[0]] });
  assert.equal(clock.pending, 0);
});
test("Public plugin clip registration replaces only presentation; duplicates and bad references fail at startup", () => {
  const d = { ...clip(), match: { species: "mudkip", view: "detail" } },
    plugin = manifest("sprite-demo", (api) => {
      const resource = api.content.register(
        "resources",
        "sheet",
        "assets/poochyena-front.png",
      );
      api.presentation.sprite("hello", {
        ...d,
        frames: d.frames.map((f) => ({ ...f, resource })),
      });
    });
  const s = session([plugin]),
    before = structuredClone(s.game.state);
  assert.equal(s.game.spriteClips.find("mudkip").frames.length, 2);
  assert.deepEqual(s.game.state, before);
  assert(s.game.spriteClips.get("sprite-demo:hello"));
  const bad = manifest("bad", (api) => api.presentation.sprite("missing", d));
  assert.throws(() => session([bad]), /Unknown sprite resource/);
  const repeated = manifest("repeat", (api) => {
    api.presentation.sprite("one", {
      ...d,
      frames: [{ resource: "mudkip-front", durationMs: 100 }],
    });
    api.presentation.sprite("two", {
      ...d,
      frames: [{ resource: "mudkip-front", durationMs: 100 }],
    });
  });
  assert.throws(() => session([repeated]), /Conflicting sprite binding/);
});
test("Every generated native clip has real asset rectangles; current single and multiple sheets select correct metadata", () => {
  const s = session(),
    r = s.game.spriteClips;
  assert.equal(r.find("mudkip").frames.length, 1);
  assert(r.find("poochyena").frames.length > 1);
  for (const [species, count] of Object.entries(DETAIL_SPRITE_FRAMES)) {
    const raw = fs.readFileSync(
      new URL(`../dist/assets/${species}-front.png`, import.meta.url),
    );
    assert.equal(raw.readUInt32BE(16), 64);
    assert.equal(raw.readUInt32BE(20), count * 64);
    assert.equal(r.find(species).frames.length, count);
  }
});
test("Shared modal lifecycle disposes page resources exactly once on replacement, close and explicit host disposal", () => {
  const s = session(),
    doc = layoutDocument(),
    ui = createUIShell(s.game, { document: doc });
  s.game.attachUI(ui);
  let count = 0;
  const release = ui.ownModalResource(() => count++);
  ui.modal("first", "");
  assert.equal(count, 1);
  release();
  assert.equal(count, 1);
  ui.ownModalResource(() => count++);
  ui.closeModal();
  assert.equal(count, 2);
  ui.closeModal();
  assert.equal(count, 2);
  ui.ownModalResource(() => count++);
  ui.disposeModalResources();
  assert.equal(count, 3);
});
test("Real detail page mounts the registered clip and shared shell releases its playback on page navigation", () => {
  const s = session(),
    doc = layoutDocument(),
    clock = clockPort(),
    shell = createUIShell(s.game, { document: doc, dialogueClock: clock }),
    canvas = canvasPort();
  doc.getElementById("detail-sprite").getContext = canvas.getContext;
  s.mon.species = "poochyena"; // Arrange an existing species; presentation must not write the individual.
  const before = structuredClone(s.game.state),
    players = [];
  let ui;
  s.game.attachUI(shell);
  ui = createPartyInterface(s.game, {
    ...shell,
    document: doc,
    showMenu() {},
    showEvolutionOptions() {},
    mountSprite: (n, d) => {
      const player = new SpriteCanvas({
        canvas: n,
        assets: { "poochyena-front": { width: 64, height: 256 } },
        clock,
      });
      players.push(player);
      shell.ownModalResource(() => player.stop());
      player.play(d);
    },
  });
  ui.showMonster(0);
  assert.equal(shell.modalType, "detail");
  assert.equal(players.length, 1);
  assert.equal(clock.pending, 1);
  assert.deepEqual(s.game.state, before);
  shell.closeModal();
  assert.equal(clock.pending, 0);
  assert.equal(players[0].clip, null);
});
