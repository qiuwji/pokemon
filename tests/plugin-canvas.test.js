import test from "node:test";
import assert from "node:assert/strict";
import {
  manifest,
  session,
  objectSchema,
} from "./helpers/session.js";
import { canvasAdapter } from "./helpers/canvas-extension-fixture.js";
import { validateLayout } from "../src/engine/extensions/layout-contracts.js";
import {
  sampleVisual,
  VisualTimeline,
} from "../src/presentation/visual-timeline.js";
import { ExtensionFeedback } from "../src/presentation/extension-feedback.js";

const pointerSchema = objectSchema(
  {
    x: { type: "number" },
    y: { type: "number" },
    source: { type: "string", enum: ["pointer", "keyboard"] },
  },
  ["x", "y", "source"],
);
function fixture({
  draw,
  render,
  run,
  loop = true,
  duration = 100,
  schema,
  setup,
} = {}) {
  let api;
  const frames = [],
    s = session([
      manifest("canvas-test", (value) => {
        api = value;
        const visual = api.presentation.register("visual", {
          duration,
          loop,
          ...(schema ? { schema } : {}),
          draw: draw || ((_ctx, f) => frames.push(f)),
        });
        const action = api.actions.register("touch", {
          schema: objectSchema({ pointer: pointerSchema }, ["pointer"]),
          run: run || ((ctx, input) => ctx.store.set("point", input.pointer)),
        });
        const tree = {
          kind: "canvas",
          width: 200,
          height: 100,
          visual,
          action,
          alt: "互动精灵",
          key: "portrait",
        };
        api.ui.page("page", {
          title: "Canvas",
          render: render || (() => tree),
        });
        setup?.(api, tree);
      }),
    ]);
  return { ...s, api, frames, adapter: canvasAdapter(s) };
}
const contract = (s) => ({
  actions: s.host.actions,
  visuals: s.host.presentation,
  resources: s.db.resources,
  themes: s.host.ui.themes,
  components: s.host.ui.components,
});

test("Canvas registration and layout reject bad refs, callable data, schema input and resource budgets before mounting", () => {
  for (const extra of [
    { loop: "yes" },
    { mystery: 1 },
    { duration: 0 },
    { schema: { type: "number" } },
  ])
    assert.throws(() =>
      session([
        manifest("invalid", (api) =>
          api.presentation.register("v", {
            duration: 100,
            draw() {},
            ...extra,
          }),
        ),
      ]),
    );
  const s = fixture({
      schema: objectSchema(
        { mood: { type: "number", minimum: 0, maximum: 100 } },
        ["mood"],
      ),
    }),
    base = {
      kind: "canvas",
      visual: "canvas-test:visual",
      width: 200,
      height: 200,
      alt: "精灵",
      payload: { mood: 10 },
    };
  assert(Object.isFrozen(validateLayout(base, contract(s))));
  for (const extra of [
    { width: 0 },
    { height: 513 },
    { width: 1.2 },
    { visual: "missing" },
    { alt: "" },
    { payload: { mood: 101 } },
    { payload: { mood: () => 1 } },
    { draw() {} },
  ])
    assert.throws(() => validateLayout({ ...base, ...extra }, contract(s)));
  assert.throws(
    () =>
      validateLayout(
        { kind: "panel", children: Array.from({ length: 17 }, () => base) },
        contract(s),
      ),
    /budget/,
  );
});

test("Visual samples separate looping, terminal frames, hidden and reduced intervals with backwards-clock high water", () => {
  assert.equal(sampleVisual({ duration: 100, loop: true }, 250).progress, 0.5);
  assert.equal(sampleVisual({ duration: 100, loop: true }, 250).cycle, 2);
  assert.equal(sampleVisual({ duration: 100 }, 250).progress, 1);
  assert.equal(
    sampleVisual({ duration: 100, loop: true }, 250, { reducedMotion: true })
      .progress,
    0,
  );
  assert.throws(() => sampleVisual({ duration: 100 }, NaN), /time/);
  const t = new VisualTimeline({ duration: 100, loop: true });
  assert.equal(t.sample(0).elapsedMs, 0);
  assert.equal(t.sample(20).elapsedMs, 20);
  assert.equal(t.sample(30, { visible: false }), null);
  assert.equal(t.sample(500).elapsedMs, 20);
  assert.equal(t.sample(520).elapsedMs, 40);
  assert.equal(t.sample(510).elapsedMs, 40);
  assert.equal(t.sample(530).elapsedMs, 50);
  t.sample(540, { reducedMotion: true });
  assert.equal(t.sample(1000).elapsedMs, 50);
});

test("Canvas mounts arbitrary sizes, samples independent visible frames and stops hidden tabs, closed pages and stale players", () => {
  const s = fixture({
      render: () => ({
        kind: "tabs",
        value: "first",
        children: [
          {
            kind: "panel",
            key: "first",
            label: "一",
            children: [
              {
                kind: "canvas",
                visual: "canvas-test:visual",
                width: 200,
                height: 100,
                alt: "A",
              },
            ],
          },
          {
            kind: "panel",
            key: "second",
            label: "二",
            children: [
              {
                kind: "canvas",
                visual: "canvas-test:visual",
                width: 80,
                height: 90,
                alt: "B",
              },
            ],
          },
        ],
      }),
    }),
    a = s.adapter;
  a.ext.showPage("canvas-test:page");
  a.frame(0);
  a.frame(25);
  assert.equal(s.frames.length, 2);
  assert.equal(s.frames[1].progress, 0.25);
  assert.equal(s.frames[1].width, 200);
  a.root.querySelector('[role="tablist"]').children[1].onclick();
  a.frame(500);
  a.frame(525);
  assert.equal(s.frames.length, 4);
  assert.equal(s.frames.at(-1).width, 80);
  assert.equal(s.frames.at(-1).progress, 0.25);
  a.root.querySelector('[role="tablist"]').children[0].onclick();
  a.frame(600);
  assert.equal(s.frames.at(-1).progress, 0.25);
  const old = [...a.ext.layout.canvases.values()][0].values().next().value;
  a.shell.closeModal();
  a.frame(1000);
  old.render(1100, { visible: true });
  assert.equal(s.frames.length, 5);
  assert.equal(a.ext.layout.canvases.size, 0);
});

test("Canvas clicks use logical coordinates, keyboard center and protected real transactions without changing core state", async () => {
  const s = fixture(),
    a = s.adapter,
    before = structuredClone(s.game.state.party);
  a.ext.showPage("canvas-test:page");
  let button = a.root.querySelector("button");
  assert.equal(button.getAttribute("aria-label"), "互动精灵");
  await button.onclick({ detail: 1, clientX: 110, clientY: 70 });
  assert.deepEqual(s.api.store.get("point"), {
    x: 50,
    y: 25,
    source: "pointer",
  });
  button = a.root.querySelector("button");
  await button.onclick({ detail: 0 });
  assert.deepEqual(s.api.store.get("point"), {
    x: 100,
    y: 50,
    source: "keyboard",
  });
  const saved = s.game.exportDocument();
  s.game.loadDocument(saved);
  assert.deepEqual(s.api.store.get("point"), {
    x: 100,
    y: 50,
    source: "keyboard",
  });
  await a.root
    .querySelector("button")
    .onclick({ detail: 1, clientX: -1, clientY: 0 });
  assert.deepEqual(s.api.store.get("point"), {
    x: 100,
    y: 50,
    source: "keyboard",
  });
  assert.deepEqual(s.game.state.party, before);
});

test("Reduced-motion and finite visual mounts retain a single static or terminal frame without a second timer", () => {
  const s = fixture(),
    a = s.adapter;
  a.motion(true);
  a.ext.showPage("canvas-test:page");
  a.frame(0);
  a.frame(500);
  assert.equal(s.frames.length, 1);
  assert.equal(s.frames[0].reducedMotion, true);
  a.motion(false);
  a.frame(1000);
  a.frame(1025);
  assert.equal(s.frames.at(-1).progress, 0.25);
  const finite = fixture({ loop: false }),
    f = finite.adapter;
  f.ext.showPage("canvas-test:page");
  f.frame(0);
  f.frame(100);
  f.frame(150);
  assert.equal(finite.frames.length, 2);
  assert.equal(finite.frames[1].progress, 1);
});

test("Draw failure restores context, disposes only that visual and forbids writes or async callbacks", async () => {
  let attempted;
  const s = fixture({
      draw: (_ctx, frame) => {
        assert(Object.isFrozen(frame.payload));
        assert(Object.isFrozen(frame.view));
        attempted = s.api.commands.dispatch("canvas-test:touch", {
          pointer: { x: 0, y: 0, source: "keyboard" },
        });
        attempted.catch(() => {});
        throw new Error("draw failed");
      },
      render: () => ({
        kind: "canvas",
        width: 20,
        height: 30,
        visual: "canvas-test:visual",
        alt: "故障测试",
      }),
    }),
    a = s.adapter;
  a.ext.showPage("canvas-test:page");
  let saves = 0,
    restores = 0;
  const ctx = a.root.querySelector("canvas").getContext("2d");
  ctx.save = () => saves++;
  ctx.restore = () => restores++;
  a.frame(0);
  a.frame(100);
  await assert.rejects(attempted, /read-only/);
  assert.equal(s.api.store.get("point"), null);
  assert.equal(saves, 1);
  assert.equal(restores, 1);
  const async = fixture({ draw: async () => {} });
  async.adapter.ext.showPage("canvas-test:page");
  async.adapter.frame(0);
  assert.equal(
    [...async.adapter.ext.layout.canvases.values()][0].values().next().value
      .disposed,
    true,
  );
});

test("Region and HUD refresh release old resources and disappearing content; closing modals preserves the HUD", async () => {
  const s = fixture({
      setup(api, tree) {
        api.ui.region("region", {
          slot: "bag.content",
          render: () => tree,
          when: (view) => !view.store.get("point"),
        });
        const { action, ...picture } = tree;
        api.ui.hud("hud", { render: () => picture });
      },
    }),
    a = s.adapter;
  a.ext.refreshHUD();
  a.ext.mountSlot("bag.content", a.root);
  a.frame(0);
  assert.equal(a.ext.layout.canvases.size, 2);
  await s.api.commands.dispatch("canvas-test:touch", {
    pointer: { x: 0, y: 0, source: "keyboard" },
  });
  a.ext.refresh();
  assert.equal(a.ext.layout.canvases.size, 1);
  a.ext.showPage("canvas-test:page");
  a.frame(25);
  assert.equal(a.ext.layout.canvases.size, 2);
  a.shell.closeModal();
  a.frame(50);
  assert.equal(a.ext.layout.canvases.size, 1);
  a.ext.refreshHUD();
  assert.equal(a.ext.layout.canvases.size, 1);
  a.ext.dispose();
  assert.equal(a.ext.layout.canvases.size, 0);
});

test("Canvas build failure disposes earlier siblings and leaves other scopes intact", () => {
  const s = fixture({
      render: () => ({
        kind: "panel",
        children: [0, 1].map(() => ({
          kind: "canvas",
          visual: "canvas-test:visual",
          width: 20,
          height: 20,
          alt: "精灵",
        })),
      }),
    }),
    a = s.adapter;
  const create = a.doc.createElement;
  let count = 0;
  a.doc.createElement = (tag) => {
    const n = create(tag);
    if (tag === "canvas" && ++count === 2) n.getContext = () => null;
    return n;
  };
  a.ext.showPage("canvas-test:page");
  assert.equal(a.ext.layout.canvases.size, 0);
  assert.match(a.errors[0].message, /unavailable/);
});

test("Invalid feedback schema and mounted-only loops fail before committing queued plugin state", async () => {
  const s = fixture({
    setup(api) {
      const once = api.presentation.register("once", {
        duration: 100,
        schema: objectSchema({ n: { type: "number", minimum: 0 } }, ["n"]),
        draw() {},
      });
      api.actions.register("bad", {
        schema: objectSchema(),
        run(ctx) {
          ctx.store.set("changed", 1);
          ctx.feedback(once, { n: -1 });
        },
      });
      api.actions.register("loop", {
        schema: objectSchema(),
        run(ctx) {
          ctx.store.set("changed", 1);
          ctx.feedback("canvas-test:visual");
        },
      });
    },
  });
  await assert.rejects(
    s.api.commands.dispatch("canvas-test:bad"),
    /numeric bounds/,
  );
  await assert.rejects(s.api.commands.dispatch("canvas-test:loop"), /mounted/);
  assert.equal(s.api.store.get("changed"), null);
  assert.throws(() => s.api.presentation.play("canvas-test:visual"), /mounted/);
});

test("Finite feedback consumes immutable sampled frames and separate assets, expires and supports reduced motion", () => {
  const s = fixture({ loop: false }),
    a = s.adapter;
  const feedback = new ExtensionFeedback(a.ext.layout.visuals, {
    now: () => 0,
  });
  feedback.play("canvas-test:visual", {});
  const ctx = a.ext.worldCanvas.getContext("2d");
  feedback.draw(ctx, {}, { mode: "field" }, 50, { reducedMotion: true });
  assert.equal(s.frames[0].progress, 0);
  assert.equal(s.frames[0].width, 320);
  feedback.draw(ctx, {}, {}, 100);
  assert.equal(s.frames.length, 1);
  assert.equal(feedback.active.length, 0);
});

test("Disabled form Canvas refuses clicks; one in-flight action cannot remount a closed page", async () => {
  const s = fixture({
      render: () => ({
        kind: "form",
        disabled: true,
        action: "canvas-test:touch",
        children: [
          {
            kind: "canvas",
            visual: "canvas-test:visual",
            width: 40,
            height: 40,
            alt: "Disabled",
            action: "canvas-test:touch",
          },
        ],
      }),
    }),
    a = s.adapter;
  a.ext.showPage("canvas-test:page");
  await a.root.querySelector("button").onclick({ detail: 0 });
  assert.equal(s.api.store.get("point"), null);
  const active = fixture(),
    b = active.adapter;
  b.ext.showPage("canvas-test:page");
  b.frame(0);
  const dispatch = b.ext.layout.dispatch;
  let release,
    count = 0;
  b.ext.layout.dispatch = async (...args) => {
    count++;
    await new Promise((resolve) => {
      release = resolve;
    });
    return dispatch(...args);
  };
  const button = b.root.querySelector("button"),
    pending = button.onclick({ detail: 0 });
  await button.onclick({ detail: 0 });
  assert.equal(count, 1);
  b.shell.closeModal();
  release();
  await pending;
  b.frame(500);
  assert.equal(active.api.store.get("point").x, 100);
  assert.equal(b.ext.layout.canvases.size, 0);
  assert.equal(b.root.children.length, 0);
  assert.equal(active.frames.length, 1);
});

test("Document visibility pauses Canvas even when the host stops producing hidden frames and releases its subscription", () => {
  const s = fixture(),
    a = s.adapter;
  a.ext.showPage("canvas-test:page");
  a.frame(0);
  a.frame(20);
  a.visibility(true);
  // Browsers suspend the host RAF; no hidden frame is delivered.
  a.visibility(false);
  a.frame(1000);
  a.frame(1020);
  assert.equal(s.frames.at(-1).elapsedMs, 40);
  assert.equal(a.listeners.get("visibilitychange").size, 1);
  a.ext.dispose();
  assert.equal(a.listeners.get("visibilitychange").size, 0);
});
