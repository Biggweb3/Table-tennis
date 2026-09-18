export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
    this.currentWeather = 'SUNNY';

    // Ambient gain buses
    this.ambienceMaster = null;
    this.windGain = null;
    this.rainGain = null;
    this.windNode = null;
    this.rainNode = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.initialized = true;
      this.startAmbience();
    } catch (e) {
      console.warn("AudioContext init failed", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ambienceMaster && this.ctx) {
      this.ambienceMaster.gain.setValueAtTime(this.muted ? 0 : 1.0, this.ctx.currentTime);
    }
    return this.muted;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ambienceMaster && this.ctx) {
      this.ambienceMaster.gain.setValueAtTime(this.muted ? 0 : 1.0, this.ctx.currentTime);
    }
  }

  startAmbience() {
    if (!this.ctx || this.ambienceMaster) return;
    try {
      this.ambienceMaster = this.ctx.createGain();
      this.ambienceMaster.gain.value = this.muted ? 0 : 1.0;
      this.ambienceMaster.connect(this.ctx.destination);

      // 1. Wind Ambience
      const bufSize = this.ctx.sampleRate * 2;
      const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const output = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) output[i] = Math.random() * 2 - 1;

      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = noiseBuf;
      windSrc.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 380;
      windFilter.Q.value = 1.3;

      const windLfo = this.ctx.createOscillator();
      windLfo.frequency.value = 0.18;
      const windLfoGain = this.ctx.createGain();
      windLfoGain.gain.value = 150;
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.035;

      windSrc.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.ambienceMaster);

      windSrc.start();
      windLfo.start();
      this.windNode = windSrc;

      // 2. Rain Ambience
      const rainBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const rData = rainBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) rData[i] = (Math.random() * 2 - 1) * 0.4;

      const rainSrc = this.ctx.createBufferSource();
      rainSrc.buffer = rainBuf;
      rainSrc.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 2200;

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0.0; // starts at 0 unless rainy

      rainSrc.connect(rainFilter);
      rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.ambienceMaster);

      rainSrc.start();
      this.rainNode = rainSrc;
    } catch (e) {
      console.warn("Ambience start error", e);
    }
  }

  setWeather(weather) {
    this.currentWeather = weather;
    if (!this.ctx || !this.windGain || !this.rainGain) return;
    const t = this.ctx.currentTime;

    // Smooth audio transitions
    if (weather === 'SUNNY') {
      this.windGain.gain.linearRampToValueAtTime(0.025, t + 2.0);
      this.rainGain.gain.linearRampToValueAtTime(0.0, t + 2.0);
    } else if (weather === 'WINDY') {
      this.windGain.gain.linearRampToValueAtTime(0.08, t + 2.0);
      this.rainGain.gain.linearRampToValueAtTime(0.0, t + 2.0);
    } else if (weather === 'RAINY') {
      this.windGain.gain.linearRampToValueAtTime(0.03, t + 2.0);
      this.rainGain.gain.linearRampToValueAtTime(0.065, t + 2.0);
    } else if (weather === 'SNOWY') {
      this.windGain.gain.linearRampToValueAtTime(0.015, t + 2.0);
      this.rainGain.gain.linearRampToValueAtTime(0.0, t + 2.0);
    }
  }

  // Paddle Hit
  playPaddleHit(isPlayer = true, power = 1.0) {
    if (this.muted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const baseFreq = isPlayer ? 680 * (power > 1.2 ? 1.15 : 1.0) : 560;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.06);

    oscGain.gain.setValueAtTime(0.4 * Math.min(1.5, power), t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    // Rubber / wood pop transient click
    const clickSize = Math.floor(this.ctx.sampleRate * 0.02);
    const clickBuf = this.ctx.createBuffer(1, clickSize, this.ctx.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickSize; i++) {
      clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (clickSize * 0.25));
    }
    const clickSrc = this.ctx.createBufferSource();
    clickSrc.buffer = clickBuf;

    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = 'highpass';
    clickFilter.frequency.value = 1200;

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.35 * Math.min(1.5, power), t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    clickSrc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(this.ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
    clickSrc.start(t);
  }

  // Table Bounce
  playTableBounce(speed = 1.0) {
    if (this.muted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.045);

    const vol = Math.min(0.3, 0.15 + speed * 0.08);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Net hit
  playNetHit() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  // Serve
  playServe() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.09);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Power ready chime
  playPowerReady() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    [600, 800, 1100].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);
      gain.gain.setValueAtTime(0.18, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.13);
    });
  }

  // Playful crowd "BOOOO!"
  playBoo() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const dur = 1.35;

    const freqs = [140, 160, 175, 190];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * 1.05, t);
      osc.frequency.setValueAtTime(f, t + 0.2);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, t + dur);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500 + idx * 25, t);
      filter.Q.value = 3.5;

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.15);
      gain.gain.setValueAtTime(0.12, t + dur * 0.65);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + dur);
    });
  }

  // Celebratory crowd "HOORAY!" + applause
  playHooray() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const dur = 1.4;

    const cheerFreqs = [280, 350, 440, 560];
    cheerFreqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f * 0.85, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.18);
      osc.frequency.setValueAtTime(f * 1.2, t + 0.35);
      osc.frequency.exponentialRampToValueAtTime(f * 0.9, t + dur * 0.7);

      filter.type = 'bandpass';
      filter.frequency.value = 850 + idx * 80;
      filter.Q.value = 2.0;

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + dur);
    });

    // Crisp applause clapping
    const clapDur = 1.2;
    const clapBufSize = Math.floor(this.ctx.sampleRate * clapDur);
    const clapBuf = this.ctx.createBuffer(1, clapBufSize, this.ctx.sampleRate);
    const cData = clapBuf.getChannelData(0);

    for (let i = 0; i < clapBufSize; i++) {
      if (Math.random() < 0.015) {
        const decay = Math.min(80, clapBufSize - i);
        const amp = (Math.random() * 0.6 + 0.4) * (1 - i / clapBufSize);
        for (let j = 0; j < decay; j++) {
          cData[i + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / 15);
        }
      }
    }

    const clapSrc = this.ctx.createBufferSource();
    clapSrc.buffer = clapBuf;

    const clapFilter = this.ctx.createBiquadFilter();
    clapFilter.type = 'highpass';
    clapFilter.frequency.value = 1400;

    const clapGain = this.ctx.createGain();
    clapGain.gain.setValueAtTime(0.001, t);
    clapGain.gain.linearRampToValueAtTime(0.28, t + 0.15);
    clapGain.gain.exponentialRampToValueAtTime(0.001, t + clapDur);

    clapSrc.connect(clapFilter);
    clapFilter.connect(clapGain);
    clapGain.connect(this.ctx.destination);

    clapSrc.start(t);
  }

  // Victory fanfare
  playVictory() {
    if (this.muted || !this.ctx) return;
    this.resume();
    this.playHooray();

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.13);

      gain.gain.setValueAtTime(0.001, t + i * 0.13);
      gain.gain.linearRampToValueAtTime(0.2, t + i * 0.13 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.13 + (i === 3 ? 0.8 : 0.25));

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.13);
      osc.stop(t + i * 0.13 + (i === 3 ? 0.85 : 0.27));
    });
  }

  // Defeat cue
  playDefeat() {
    if (this.muted || !this.ctx) return;
    this.resume();
    this.playBoo();

    const t = this.ctx.currentTime;
    const notes = [440, 415.3, 392, 349.23];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.22);

      gain.gain.setValueAtTime(0.001, t + i * 0.22);
      gain.gain.linearRampToValueAtTime(0.18, t + i * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.22 + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.22);
      osc.stop(t + i * 0.22 + 0.5);
    });
  }

  // Level Up chime
  playLevelUp() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);

      gain.gain.setValueAtTime(0.001, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, t + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.42);
    });
  }

  // UI click
  playClick() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  // New record chime
  playNewRecord() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    [587.33, 739.99, 880, 1174.66].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.08);
      gain.gain.setValueAtTime(0.2, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.36);
    });
  }
}
