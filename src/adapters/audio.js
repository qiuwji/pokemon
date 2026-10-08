import { validateMusicTransition } from "../engine/extensions/music-transition-contracts.js";
import { automateVolume, envelopeLevel } from "./audio-envelope.js";
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
    this.musicTransition = null;
    this.musicTailUntil = 0;
    this.musicHolds = new Set();
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
      if (!voice.cleaned) {
        const at = this.context.currentTime;
        automateVolume(voice.gain.gain, voice.envelope, this.targetVolume(voice.cue), at);
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
  setMusic(id, transition = null) {
    transition = validateMusicTransition(transition);
    if (id !== null && this.cues.get(id)?.kind !== "music") {
      this.onError(new Error(`Unknown music cue ${id}`));
      return Promise.resolve(null);
    }
    if (id === this.music && (this.musicRequest || this.musicVoice?.id === id || !this.playable || this.musicHolds.size))
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
      this.stopVoice(this.musicVoice, transition?.fadeOutMs ?? this.musicVoice.cue.fadeOutMs ?? 250, transition?.steps);
      this.musicVoice = null;
    }
    this.music = id;
    this.musicTransition = transition;
    this.musicOffset = 0;
    this.musicRequest = null;
    return this.resumeMusic();
  }
  resumeMusic() {
    if (!this.playable || !this.music || this.musicHolds.size) return Promise.resolve(null);
    const id = this.music,
      token = ++this.musicGeneration;
    const request = this.start(id, this.cues.get(id), {
      musicToken: token,
      offset: this.musicOffset,
      transition: this.musicTransition,
    })
      .then((voice) => {
        if (voice && token === this.musicGeneration) {
          const previous = this.musicVoice;
          this.musicVoice = voice;
          if (previous && previous !== voice && !previous.stopped) {
            // Crossfade: the outgoing fade must last at least as long as the incoming
            // one, otherwise the summed level dips in the middle of the transition.
            const incomingFade = this.cues.get(id)?.fadeInMs ?? 0;
            this.stopVoice(
              previous,
              this.cues.get(id)?.fadePreviousMs ?? Math.max(previous.cue.fadeOutMs ?? 250, incomingFade),
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
  /** Covering a scene can wait for this completion; mute/disposal also release the wait. */
  holdMusic() {
    const lease = {};
    this.musicHolds.add(lease);
    if (this.musicHolds.size === 1) {
      this.musicGeneration++;
      this.musicRequest = null;
      const voice = this.musicVoice;
      if (voice) {
        this.musicOffset = voice.offset + Math.max(0, this.context.currentTime - voice.startedAt);
        this.stopVoice(voice);
      }
      this.musicVoice = null;
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.musicHolds.delete(lease);
      if (!this.musicHolds.size) {
        this.musicTransition = { mode: "after-fade", fadeOutMs: 0, fadeInMs: 0 };
        void this.resumeMusic().catch(this.onError);
      }
    };
  }

  fadeMusic(transition) {
    const previous = this.musicVoice;
    this.setMusic(null, transition);
    return previous?.finished || Promise.resolve();
  }
  async start(id, cue, { musicToken = null, offset = 0, transition = null } = {}) {
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
      let startAt = context.currentTime;
      if (musicToken !== null && transition?.mode === "after-fade") {
        const previous = this.musicVoice;
        if (previous && !previous.stopped) {
          if (previous.startedAt > context.currentTime) this.stopVoice(previous);
          else this.musicTailUntil = this.stopVoice(previous, transition.fadeOutMs ?? 0, transition.steps);
        }
        startAt = Math.max(startAt, this.musicTailUntil);
      } else if (musicToken !== null) this.musicTailUntil = 0;
      voice = {
        id,
        cue,
        gain,
        source,
        stopped: false,
        cleaned: false,
        startedAt: startAt,
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
      const fade = (transition?.fadeInMs ?? cue.fadeInMs ?? (cue.kind === "music" ? 200 : 0)) / 1000;
      voice.envelope = fade ? { start: startAt, end: startAt + fade, from: 0, to: 1, steps: transition?.steps } : null;
      automateVolume(gain.gain, voice.envelope, this.targetVolume(cue), startAt);
      source.onended = () => this.cleanup(voice);
      source.start(startAt, offset);
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
  stopVoice(voice, fadeMs = 0, steps = undefined) {
    if (!voice || voice.cleaned) return;
    if (!Number.isFinite(fadeMs) || fadeMs < 0 || fadeMs > 10000)
      throw new Error("Invalid audio stop fade");
    const at = this.context.currentTime;
    voice.stopped = true;
    if (fadeMs) {
      voice.envelope = { start: at, end: at + fadeMs / 1000,
        from: envelopeLevel(voice.envelope, at), to: 0, steps };
      automateVolume(voice.gain.gain, voice.envelope, this.targetVolume(voice.cue), at);
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
    return at + fadeMs / 1000;
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
    this.musicTailUntil = 0;
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
