export class AudioAdapter {
  constructor() {
    this.enabled = false;
    this.context = null;
  }
  tone(freq = 600, length = 0.07) {
    if (!this.enabled) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      const a = this.context;
      a.resume();
      const o = a.createOscillator(),
        g = a.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.025, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + length);
      o.connect(g);
      g.connect(a.destination);
      o.start();
      o.stop(a.currentTime + length);
    } catch {}
  }
}
