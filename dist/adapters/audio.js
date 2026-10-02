/** Host audio port: asset playback, generated cues, loops, fades and teardown. No gameplay access. */
export class AudioAdapter {
  constructor({
    cues = new Map(),
    createContext = () =>
      new (window.AudioContext || window.webkitAudioContext)(),
    createMedia = (source) => new Audio(source),
    schedule = (...args) => setTimeout(...args),
    cancel = (id) => clearTimeout(id),
    onError = () => {},
  } = {}) {
    Object.assign(this, {
      cues,
      createContext,
      createMedia,
      schedule,
      cancel,
      onError,
    });
    this.context = null;
    this._enabled = false;
    this.music = null;
    this.musicVoice = null;
    this.voices = new Set();
    this.generation = 0;
  }
  get enabled() {
    return this._enabled;
  }
  set enabled(value) {
    this._enabled = !!value;
    if (!this._enabled) {
      this.generation++;
      this.stopAll();
    } else if (this.music) this.setMusic(this.music, true);
  }
  contextReady() {
    this.context ??= this.createContext();
    Promise.resolve(this.context.resume()).catch(this.onError);
    return this.context;
  }
  tone(freq = 600, length = 0.07) {
    if (!this.enabled) return;
    try {
      const a = this.contextReady(),
        o = a.createOscillator(),
        g = a.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.025, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + length);
      o.connect(g);
      g.connect(a.destination);
      o.start();
      o.stop(a.currentTime + length);
    } catch (error) {
      this.onError(error);
    }
  }
  setMusic(id, force = false) {
    if (id === this.music && !force) return;
    this.music = id;
    this.generation++;
    if (this.musicVoice) this.stopVoice(this.musicVoice, 0.2);
    this.musicVoice = null;
    if (this.enabled && id) this.musicVoice = this.play(id, { music: true });
  }
  play(id, { music = false } = {}) {
    if (!this.enabled) return null;
    const cue = this.cues.get(id);
    if (!cue) {
      this.onError(new Error(`Unknown audio cue ${id}`));
      return null;
    }
    let voice;
    try {
      const a = this.contextReady(),
        gain = a.createGain();
      voice = {
        id,
        gain,
        nodes: [],
        timer: null,
        media: null,
        stopped: false,
        generation: this.generation,
      };
      this.voices.add(voice);
      gain.connect(a.destination);
      gain.gain.setValueAtTime(music ? 0 : cue.volume, a.currentTime);
      if (music)
        gain.gain.linearRampToValueAtTime(cue.volume, a.currentTime + 0.2);
      if (cue.source) {
        const media = this.createMedia(cue.source);
        voice.media = media;
        media.loop = cue.loop;
        const node = a.createMediaElementSource(media);
        node.connect(gain);
        voice.nodes.push(node);
        media.onended = () => this.stopVoice(voice);
        Promise.resolve(media.play()).catch((error) => {
          this.stopVoice(voice);
          this.onError(error);
        });
      } else {
        const cycle = () => {
          if (
            voice.stopped ||
            !this.enabled ||
            (music && voice.generation !== this.generation)
          )
            return;
          let at = a.currentTime + 0.02;
          voice.nodes = voice.nodes.filter((node) => !node.finished);
          for (const [note, duration] of cue.notes) {
            if (note) {
              const oscillator = a.createOscillator(),
                envelope = a.createGain();
              oscillator.type = "square";
              oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
              envelope.gain.setValueAtTime(1, at);
              envelope.gain.setValueAtTime(1, at + duration * 0.8);
              envelope.gain.linearRampToValueAtTime(0, at + duration);
              oscillator.connect(envelope);
              envelope.connect(gain);
              oscillator.onended = () => {
                oscillator.finished = true;
                oscillator.disconnect();
                envelope.disconnect();
              };
              voice.nodes.push(oscillator);
              oscillator.start(at);
              oscillator.stop(at + duration);
            }
            at += duration;
          }
          voice.timer = this.schedule(
            cue.loop ? cycle : () => this.stopVoice(voice),
            (at - a.currentTime) * 1000,
          );
        };
        cycle();
      }
      return voice;
    } catch (error) {
      if (voice) this.stopVoice(voice);
      this.onError(error);
      return null;
    }
  }
  stopVoice(voice, fade = 0) {
    if (!voice || voice.stopped) return;
    voice.stopped = true;
    this.cancel(voice.timer);
    const cleanup = () => {
      this.voices.delete(voice);
      voice.media?.pause();
      for (const node of voice.nodes) {
        try {
          node.stop?.();
          node.disconnect();
        } catch {}
      }
      voice.gain.disconnect();
    };
    if (fade && this.context) {
      voice.gain.gain.cancelScheduledValues(this.context.currentTime);
      voice.gain.gain.setValueAtTime(
        voice.gain.gain.value,
        this.context.currentTime,
      );
      voice.gain.gain.linearRampToValueAtTime(
        0,
        this.context.currentTime + fade,
      );
      voice.cleanupTimer = this.schedule(cleanup, fade * 1000);
    } else {
      this.cancel(voice.cleanupTimer);
      cleanup();
    }
  }
  stopAll() {
    for (const voice of [...this.voices]) {
      if (voice.stopped) {
        this.cancel(voice.cleanupTimer);
        voice.stopped = false;
      }
      this.stopVoice(voice);
    }
    this.musicVoice = null;
  }
  dispose() {
    this._enabled = false;
    this.stopAll();
    this.music = null;
    Promise.resolve(this.context?.close()).catch(this.onError);
    this.context = null;
  }
}
