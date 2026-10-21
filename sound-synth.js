// Web Audio API Sound Synthesizer for Gaming Overlay Alerts
class SoundSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.volume = 0.5;
    this.muted = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  setMuted(muted) {
    this.muted = muted;
  }

  playTone(freq, startTime, duration, type = 'sine', gainMultiplier = 1) {
    if (this.muted || this.volume <= 0) return;
    this.init();

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    const masterGain = this.audioCtx.createGain();
    masterGain.gain.setValueAtTime(this.volume * gainMultiplier, startTime);

    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.3, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(masterGain);
    masterGain.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // 5 Minutes Warning: Pleasant dual chime
  play5MinAlert() {
    if (this.muted) return;
    this.init();
    const now = this.audioCtx.currentTime;
    this.playTone(659.25, now, 0.25, 'sine', 0.6); // E5
    this.playTone(880.00, now + 0.15, 0.45, 'triangle', 0.7); // A5
  }

  // 1 Minute Warning: More energetic alert
  play1MinAlert() {
    if (this.muted) return;
    this.init();
    const now = this.audioCtx.currentTime;
    this.playTone(880.00, now, 0.18, 'triangle', 0.8);
    this.playTone(1174.66, now + 0.12, 0.18, 'triangle', 0.8);
    this.playTone(1318.51, now + 0.24, 0.40, 'sine', 0.9);
  }

  // Spawn Alert: Heroic triumph fanfare!
  playSpawnAlert() {
    if (this.muted) return;
    this.init();
    const now = this.audioCtx.currentTime;
    // C5 - E5 - G5 - C6 rapid fanfare
    this.playTone(523.25, now, 0.15, 'triangle', 0.7);
    this.playTone(659.25, now + 0.12, 0.15, 'triangle', 0.7);
    this.playTone(783.99, now + 0.24, 0.18, 'triangle', 0.8);
    this.playTone(1046.50, now + 0.38, 0.65, 'sine', 1.0);
  }

  // Button click preview
  playClick() {
    if (this.muted) return;
    this.init();
    const now = this.audioCtx.currentTime;
    this.playTone(1200, now, 0.04, 'sine', 0.2);
  }
}

window.soundSynth = new SoundSynthesizer();
