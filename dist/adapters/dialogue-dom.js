import {
  compileDialogueLine,
  DialoguePlayer,
} from "../presentation/dialogue-player.js";
/** Owns DOM and one cancellable frame loop; never advances a story or modifies game state. */
export class DialogueDOM {
  constructor({
    document,
    container,
    effects,
    now,
    request,
    cancel,
    reducedMotion = () => false,
    onError = () => {},
  }) {
    Object.assign(this, {
      doc: document,
      container,
      effects,
      now,
      request,
      cancel,
      reducedMotion,
      onError,
    });
    this.player = new DialoguePlayer();
    this.epoch = 0;
    this.handle = null;
  }
  show(name, line, options) {
    const track = compileDialogueLine(line, options);
    this.stop();
    this.player.start(track, this.now());
    this.container.hidden = false;
    const title = this.doc.createElement("strong");
    title.textContent = name;
    const body = this.doc.createElement("span");
    body.className = "dialogue-body";
    body.setAttribute("aria-hidden", "true");
    this.nodes = track.glyphs.map((g) => {
      const n = this.doc.createElement("span");
      n.textContent = g.text;
      n.className = "dialogue-glyph";
      if (g.style.color) n.style.color = g.style.color;
      if (g.style.effect) n.style.display = "inline-block";
      return n;
    });
    this.parameters = track.glyphs.map((g) =>
      g.style.effect
        ? this.effects.parameters(g.style.effect, g.style.parameters)
        : null,
    );
    body.append(...this.nodes);
    this.prompt = this.doc.createElement("span");
    this.prompt.className = "continue";
    this.prompt.textContent = "▼ Z / 确认";
    this.container.replaceChildren(title, body, this.prompt);
    this.update();
  }
  get complete() {
    return this.player.sample(this.now(), {
      reducedMotion: this.reducedMotion(),
    }).complete;
  }
  update() {
    const now = this.now(),
      reducedMotion = this.reducedMotion(),
      frame = this.player.sample(now, { reducedMotion });
    this.nodes.forEach((n, index) => {
      n.style.visibility = index < frame.visible ? "visible" : "hidden";
      const glyph = this.player.track.glyphs[index];
      const visual =
        glyph.style.effect && index < frame.visible
          ? this.effects.sample(glyph.style.effect, this.parameters[index], {
              elapsedMs: frame.elapsedMs,
              index,
              reducedMotion,
            })
          : { x: 0, y: 0, opacity: 1 };
      n.style.transform = `translate(${visual.x}px, ${visual.y}px)`;
      n.style.opacity = String(visual.opacity);
    });
    this.prompt.hidden = !frame.complete;
    if (
      !frame.complete ||
      (!reducedMotion && this.parameters.some((p) => p !== null))
    )
      this.schedule();
  }
  schedule() {
    if (this.handle !== null) return;
    const epoch = this.epoch;
    this.handle = this.request(() => {
      if (epoch !== this.epoch) return;
      this.handle = null;
      try {
        this.update();
      } catch (error) {
        this.stop();
        this.onError(error);
      }
    });
  }
  skip() {
    this.player.skip();
    if (this.handle !== null) {
      this.cancel(this.handle);
      this.handle = null;
    }
    this.update();
  }
  stop() {
    this.epoch++;
    if (this.handle !== null) this.cancel(this.handle);
    this.handle = null;
    this.player.stop();
  }
  hide() {
    this.stop();
    this.container.hidden = true;
    this.container.replaceChildren();
    this.nodes = [];
    this.parameters = [];
  }
}
