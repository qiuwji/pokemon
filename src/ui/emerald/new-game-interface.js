import { NEW_GAME_TEXT as text, newGameClip } from "../../packs/emerald/new-game-presentation.js";
import { createNamingView } from "./naming-view.js";

/** Awaited visual flow. Profile drafts remain local until the application accepts the result. */
export function createNewGameInterface({ document: doc, root, modal, closeModal, ownModalResource, choose, say, disposeDialogue = () => {}, frameScene, sound }) {
  function namePlayer(gender, name) {
    return new Promise((resolve, reject) => {
      let settled = false, view;
      const complete = value => { if (!settled) { settled = true; closeModal(); resolve(value); } };
      modal("训练家起名", '<div data-naming-host></div>', { type: "naming", close: false,
        back: () => view?.back(), navigate: direction => view?.navigate(direction) });
      try {
        view = createNamingView({ document: doc, container: root.querySelector("[data-naming-host]"), gender, name, onConfirm: complete, onCancel: () => complete(null) });
        ownModalResource(() => {
          view.dispose();
          if (!settled) { settled = true; reject(new Error("Naming screen disposed")); }
        });
      } catch (error) { settled = true; closeModal(); reject(error); }
    });
  }
  async function showNewGameIntroduction({ stopMusic = () => {} } = {}) {
    const scene = frameScene();
    let gender = "male", name = "";
    const play = (id, extra) => scene.play(newGameClip(id, { gender, ...extra }), { onCue: sound });
    const speak = lines => say("小田卷博士", Array.isArray(lines) ? lines : [lines]);
    try {
      await play("arrival");
      await speak(text.welcome);
      let release;
      const launch = () => { release ||= play("release").then(() => ({ ok: true }), error => ({ error })); };
      await say("小田卷博士", [{ runs: [{ text: text.pokemon }, { pauseMs: 1600 }] }], null, { onPause: launch });
      launch();
      await speak(text.speech);
      await speak(text.who);
      const released = await release;
      if (released.error) throw released.error;
      await play("hide-birch");
      await play("show-player");
      for (;;) {
        await speak(text.gender);
        let preview = gender;
        gender = await choose("选择角色", text.gender, [{ id: "male", label: "男孩" }, { id: "female", label: "女孩" }], null, {
          page: "new-game-gender", default: gender,
          onHighlight(next) {
            if (next === preview) return;
            const previousGender = preview; preview = next;
            return play("change-gender", { gender: next, previousGender });
          },
        });
        if (gender !== preview) await play("change-gender", { previousGender: preview });
        await speak(text.name);
        await play("naming-out");
        const draft = await namePlayer(gender, name);
        await play("naming-return");
        if (draft === null) continue;
        name = draft;
        await speak(text.confirm(name));
        const answer = await choose("确认名字", text.confirm(name), [{ id: "yes", label: "是" }, { id: "no", label: "否" }], "no", { page: "new-game-confirm" });
        if (answer === "yes") break;
      }
      await play("hide-player");
      await Promise.all([play("show-birch"), speak(text.moving(name))]);
      await play("hide-birch-final");
      await Promise.all([play("show-player-center"), speak(text.ready)]);
      stopMusic();
      await play("shrink");
      return { gender, name };
    } catch (error) {
      closeModal();
      disposeDialogue(error);
      throw error;
    } finally { scene.dispose(); }
  }
  return { showNewGameIntroduction };
}
