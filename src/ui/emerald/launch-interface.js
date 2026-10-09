import { emeraldTitleClip } from "../../packs/emerald/title-presentation.js";
import { EMERALD_MOVIE_CHAPTERS, emeraldMovieClip } from "../../packs/emerald/launch-movie.js";
import { createLaunchMenuView } from "./launch-menu-view.js";
import { createSaveSlotView } from "./save-slot-view.js";

/** Startup owns its temporary screens. Save/reset still pass through application commands. */
export function createLaunchInterface(game, {
  document: doc, root, modal, closeModal, ownModalResource, holdInteraction,
  frameScene, frameClock, reducedMotion, showOptions, sound, setLaunchMusic = () => {}, titleFrames,
}) {
  let running = false, disposed = false, scene = null, cancel = null;
  const abort = () => { disposed = true; cancel?.(new Error("Launch disposed")); scene?.dispose(); };
  const alive = () => { if (disposed) throw new Error("Launch disposed"); };
  const newScene = () => {
    scene?.dispose();
    scene = frameScene({ reducedMotion: () => false });
    return scene;
  };
  function screen(title, type, create) {
    alive();
    return new Promise((resolve, reject) => {
      let settled = false, view;
      const finish = value => {
        if (settled) return;
        settled = true; cancel = null; closeModal(); resolve(value);
      };
      cancel = reject;
      modal(title, '<div data-launch-host></div>', {
        type, close: false, back: () => view?.back(), navigate: dir => view?.navigate(dir),
      });
      try {
        view = create(root.querySelector("[data-launch-host]"), finish);
        ownModalResource(() => {
          view.dispose?.();
          if (!settled) { settled = true; cancel = null; reject(new Error("Launch screen disposed")); }
        });
      } catch (error) { settled = true; closeModal(); cancel = null; reject(error); }
    });
  }
  async function animation(title, run, { directions = false, skip = true } = {}) {
    const player = newScene();
    try {
      return await screen(title, "launch-animation", (host, finish) => {
        let active = true;
        const button = doc.createElement("button"); button.className = "launch-animation-button";
        button.setAttribute("aria-label", "继续"); host.append(button); button.focus();
        const press = () => { if (active && skip) finish("pressed"); };
        button.onclick = press;
        // Each promise is observed, including playback rejected after an input interrupt.
        void run(player, () => active).then(() => { if (active) finish("ended"); }, error => { if (active) cancel?.(error); });
        return { back: press, navigate: () => { if (directions) press(); return true; }, dispose: () => { active = false; player.dispose(); } };
      });
    } finally { player.dispose(); }
  }
  async function fade(id) {
    const player = newScene(); player.canvas?.classList.add("launch-transition");
    await player.play(emeraldTitleClip(id)); alive();
  }
  async function movie() {
    if (reducedMotion()) return;
    await animation("开场动画", async (player, active) => {
      for (const chapter of EMERALD_MOVIE_CHAPTERS) {
        if (!active()) return;
        if (chapter.music) setLaunchMusic(chapter.music);
        for (let frame = 0; frame < chapter.frames && active(); frame += 240)
          await player.play(emeraldMovieClip(chapter.id, frame, 240), { onCue: sound });
      }
    }, { directions: true });
  }
  async function title() {
    const started = frameClock.now();
    setLaunchMusic("MUS_TITLE");
    if (!reducedMotion()) await animation("绿宝石", player => player.play(emeraldTitleClip("arrival")));
    const result = await animation("绿宝石 · 按键开始", async (player, active) => {
      let idleFrame = 0;
      while (active()) {
        const remaining = titleFrames - Math.floor((frameClock.now() - started) * 60 / 1000);
        if (remaining <= 0) return;
        const clip = emeraldTitleClip("idle", idleFrame, Math.min(240, remaining));
        if (reducedMotion()) {
          const still = clip.frames.at(-1);
          await player.play({ ...clip, frames: clip.frames.map(() => still) });
        } else await player.play(clip);
        idleFrame += clip.frames.length;
      }
    });
    setLaunchMusic(false);
    if (result === "pressed") await fade("fade-white");
    return result;
  }
  async function menu(selected) {
    scene?.dispose(); scene = null;
    const saved = game.saveStore.load(), raw = game.saveStore.raw();
    let chooseSlot = false;
    try { chooseSlot = game.saveSlotView().slots.length > (saved ? 1 : 0); } catch { /* The protected-save warning owns storage failures. */ }
    const result = await screen("绿宝石", "launch-menu", (host, finish) => {
      const view = createLaunchMenuView({ document: doc, container: host, saved, species: game.db.species, selected, chooseSlot, onSelect: finish });
      return { ...view, back: () => finish("title") };
    });
    return { result, saved, raw };
  }
  async function options() {
    await new Promise((resolve, reject) => {
      let settled = false;
      cancel = reject;
      const back = () => { if (!settled) { settled = true; cancel = null; closeModal(); resolve(); } };
      showOptions("pace", back, { extras: false });
    });
  }
  async function showLaunch() {
    if (running || disposed) throw new Error("Launch unavailable");
    if (!Number.isInteger(titleFrames) || titleFrames < 1) throw new Error("Title duration unavailable");
    running = true;
    const release = holdInteraction();
    try {
      setLaunchMusic(false);
      await animation("版权", player => player.play(emeraldTitleClip("copyright")), { skip: false });
      await movie();
      let selected;
      for (;;) {
        if (await title() === "ended") { await movie(); continue; }
        for (;;) {
          alive();
          const choice = await menu(selected);
          if (choice.result === "title") break;
          if (choice.result === "options") { await options(); selected = "options"; continue; }
          if (choice.result === "slots") {
            const view = game.saveSlotView();
            const slot = await screen("选择存档", "launch-slots", (host, finish) => createSaveSlotView({
              document: doc, container: host, slots: view.slots, selected: view.active, species: game.db.species,
              onSelect: finish, onBack: () => finish(null),
            }));
            if (!slot) { selected = "slots"; continue; }
            await fade("fade-black");
            try { await game.loadSaveSlot(slot.id, slot.raw); }
            catch (error) { game.ui.toast(error.code === "save_conflict" ? "存档已在另一页面更新，请重新选择。" : "存档读取失败，原进度已保留。"); continue; }
            return "continue";
          }
          // A second tab may have saved while this preview was open. Review the new preview first.
          if (game.saveStore.raw() !== choice.raw) { selected = choice.result; continue; }
          await fade("fade-black");
          if (choice.result === "continue") await game.loadDocument(choice.saved);
          else {
            try { if (!await game.reset()) throw new Error("New game unavailable"); }
            catch { game.ui.toast("无法创建新存档，原进度已保留。请检查浏览器存储空间。"); selected = "new"; continue; }
          }
          return choice.result;
        }
      }
    } finally {
      closeModal(); scene?.dispose(); scene = null; cancel = null; release(); running = false;
    }
  }
  return { showLaunch, disposeLaunch: abort };
}
