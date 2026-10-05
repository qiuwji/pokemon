import { validateAudioCue } from "../engine/extensions/audio-contracts.js";
/** Resource player: decoding, channels, sample loops and host lifecycle. No gameplay access. */
export class AudioAdapter {
  constructor({
    cues = new Map(),
    createContext = () => new window.AudioContext(),
    fetchAsset = (source) => fetch(source),
    onError = () => {},
  } = {}) {
    this.cues = new Map(
      [...cues].map(([id, cue]) => [id, validateAudioCue(cue)]),
    );
    Object.assign(this, { createContext, fetchAsset, onError });
    this.context = null;
    this.buffers = new Map();
    this.voices = new Set();
    this.volumes = { master: 1, music: 1, sound: 1 };
    this._enabled = false;
    this.suspended = false;
    this.disposed = false;
    this.music = null;
    this.musicVoice = null;
    this.musicOffset = 0;
    this.generation = 0;
    this.musicGeneration = 0;
    this.musicRequest = null;
  }
  get enabled() {
    return this._enabled;
  }
  set enabled(value) {
    value = !!value;
    if (this.disposed || value === this._enabled) return;
    this._enabled = value;
    if (value) {
      this.unlock().catch(this.onError);
      this.resumeMusic();
    } else this.pausePlayback();
  }
  get playable() {
    return this.enabled && !this.suspended && !this.disposed;
  }
  contextReady() {
    if (this.disposed) throw new Error("Audio player is disposed");
    return (this.context ??= this.createContext());
  }
  async unlock() {
    await this.contextReady().resume();
  }
  async load(id) {
    const cue = this.cues.get(id);
    if (!cue) throw new Error(`Unknown audio cue ${id}`);
    const context = this.contextReady();
    if (!this.buffers.has(cue.source)) {
      const request = (async () => {
        const response = await this.fetchAsset(cue.source);
        if (!response.ok)
          throw new Error(
            `Audio resource failed: ${cue.source} (${response.status})`,
          );
        return context.decodeAudioData(await response.arrayBuffer());
      })();
      this.buffers.set(cue.source, request);
      request.catch(() => {
        if (this.buffers.get(cue.source) === request)
          this.buffers.delete(cue.source);
      });
    }
    const buffer = await this.buffers.get(cue.source);
    if (cue.loopEnd !== undefined && cue.loopEnd > buffer.duration)
      throw new Error(`Audio loop exceeds resource: ${id}`);
    return buffer;
  }
  preload(ids) {
    return Promise.all(ids.map((id) => this.load(id)));
  }
  targetVolume(cue) {
    return cue.volume * this.volumes.master * this.volumes[cue.kind];
  }
  setVolume(channel, value) {
    if (
      !Object.hasOwn(this.volumes, channel) ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    )
      throw new Error("Invalid audio channel volume");
    this.volumes[channel] = value;
    for (const voice of this.voices)
      if (!voice.stopped) {
        const at = this.context.currentTime;
        voice.gain.gain.cancelScheduledValues(at);
        voice.gain.gain.setValueAtTime(this.targetVolume(voice.cue), at);
      }
  }
  async play(id) {
    const cue = this.cues.get(id);
    if (!cue || cue.kind !== "sound") {
      this.onError(new Error(`Unknown sound cue ${id}`));
      return null;
    }
    return this.start(id, cue);
  }
  setMusic(id) {
    if (id !== null && this.cues.get(id)?.kind !== "music") {
      this.onError(new Error(`Unknown music cue ${id}`));
      return Promise.resolve(null);
    }
    if (id === this.music && (this.musicRequest || this.musicVoice?.id === id || !this.playable))
      return this.musicRequest || Promise.resolve(this.musicVoice);
    // Cancel an in-flight replacement when returning to the still-playing scene.
    if (id !== null && id === this.musicVoice?.id && !this.musicVoice.stopped) {
      this.musicGeneration++;
      this.music = id;
      this.musicRequest = null;
      return Promise.resolve(this.musicVoice);
    }
    this.musicGeneration++;
    if (id === null && this.musicVoice) {
      this.stopVoice(this.musicVoice, this.musicVoice.cue.fadeOutMs ?? 250);
      this.musicVoice = null;
    }
    this.music = id;
    this.musicOffset = 0;
    this.musicRequest = null;
    return this.resumeMusic();
  }
  resumeMusic() {
    if (!this.playable || !this.music) return Promise.resolve(null);
    const id = this.music,
      token = ++this.musicGeneration;
    const request = this.start(id, this.cues.get(id), {
      musicToken: token,
      offset: this.musicOffset,
    })
      .then((voice) => {
        if (voice && token === this.musicGeneration) {
          const previous = this.musicVoice;
          this.musicVoice = voice;
          if (previous && previous !== voice) {
            // Crossfade: the outgoing fade must last at least as long as the incoming
            // one, otherwise the summed level dips in the middle of the transition.
            const incomingFade = this.cues.get(id)?.fadeInMs ?? 0;
            this.stopVoice(
              previous,
              Math.max(previous.cue.fadeOutMs ?? 250, incomingFade),
            );
          }        }
        return voice;
      })
      .finally(() => {
        if (this.musicRequest === request) this.musicRequest = null;
      });
    this.musicRequest = request;
    return request;
  }
  async start(id, cue, { musicToken = null, offset = 0 } = {}) {
    if (!this.playable) return null;
    const generation = this.generation;
    let voice, gain, source;
    try {
      const buffer = await this.load(id);
      if (
        !this.playable ||
        generation !== this.generation ||
        (musicToken !== null && musicToken !== this.musicGeneration)
      )
        return null;
      const context = this.contextReady(),
        active = [...this.voices].filter((v) => !v.stopped && v.id === id);
      if (cue.kind === "sound" && active.length >= (cue.maxVoices ?? 8))
        this.stopVoice(active[0]);
      if (this.voices.size >= 64)
        this.stopVoice(this.voices.values().next().value);
      gain = context.createGain();
      source = context.createBufferSource();
      voice = {
        id,
        cue,
        gain,
        source,
        stopped: false,
        cleaned: false,
        startedAt: context.currentTime,
        offset,
      };
      voice.finished = new Promise((resolve) => { voice.finish = resolve; });
      this.voices.add(voice);
      source.buffer = buffer;
      source.loop = cue.loop;
      if (cue.loopStart !== undefined) {
        source.loopStart = cue.loopStart;
        source.loopEnd = cue.loopEnd;
      }
      const end = cue.loopEnd ?? buffer.duration,
        begin = cue.loopStart ?? 0;
      offset =
        cue.loop && offset >= end
          ? begin + ((offset - begin) % (end - begin))
          : Math.min(offset, buffer.duration);
      voice.offset = offset;
      source.connect(gain);
      gain.connect(context.destination);
      const fade = (cue.fadeInMs ?? (cue.kind === "music" ? 200 : 0)) / 1000,
        target = this.targetVolume(cue);
      gain.gain.setValueAtTime(fade ? 0 : target, context.currentTime);
      if (fade)
        gain.gain.linearRampToValueAtTime(target, context.currentTime + fade);
      source.onended = () => this.cleanup(voice);
      source.start(0, offset);
      return voice;
    } catch (error) {
      if (voice) this.stopVoice(voice);
      else {
        source?.disconnect();
        gain?.disconnect();
      }
      this.onError(error);
      return null;
    }
  }
  cleanup(voice) {
    if (voice.cleaned) return;
    voice.cleaned = true;
    voice.finish?.();
    voice.stopped = true;
    this.voices.delete(voice);
    voice.source.onended = null;
    voice.source.disconnect();
    voice.gain.disconnect();
    if (this.musicVoice === voice) this.musicVoice = null;
  }
  stopVoice(voice, fadeMs = 0) {
    if (!voice || voice.cleaned) return;
    if (!Number.isFinite(fadeMs) || fadeMs < 0 || fadeMs > 10000)
      throw new Error("Invalid audio stop fade");
    const at = this.context.currentTime;
    voice.stopped = true;
    if (fadeMs) {
      voice.gain.gain.cancelAndHoldAtTime(at);
      voice.gain.gain.linearRampToValueAtTime(0, at + fadeMs / 1000);
      try {
        voice.source.stop(at + fadeMs / 1000);
      } catch {
        this.cleanup(voice);
      }
    } else {
      try {
        voice.source.stop();
      } catch {
        /* An unstarted/ended source still owns connections to release. */
      } finally {
        this.cleanup(voice);
      }
    }
  }
  pausePlayback() {
    this.generation++;
    this.musicGeneration++;
    this.musicRequest = null;
    if (this.musicVoice?.id === this.music)
      this.musicOffset =
        this.musicVoice.offset +
        Math.max(0, this.context.currentTime - this.musicVoice.startedAt);
    this.stopAll();
  }
  setSuspended(value) {
    value = !!value;
    if (this.disposed || value === this.suspended) return;
    this.suspended = value;
    if (value) this.pausePlayback();
    else this.resumeMusic();
  }
  stopAll() {
    this.generation++;
    this.musicGeneration++;
    this.musicRequest = null;
    for (const voice of [...this.voices]) this.stopVoice(voice);
    this.musicVoice = null;
  }
  dispose() {
    if (this.disposed) return;
    this.pausePlayback();
    this.disposed = true;
    this._enabled = false;
    this.music = null;
    this.buffers.clear();
    Promise.resolve(this.context?.close()).catch(this.onError);
    this.context = null;
  }
}
