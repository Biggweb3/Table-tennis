/**
 * Procedural Audio System using Web Audio API
 * Generates crisp, satisfying table-tennis sound effects without external audio assets:
 * - Paddle hit (crisp pop/click + rubber resonance)
 * - Table bounce (soft wooden thud + surface ping)
 * - Power shot (whoosh + thunderous crisp punch)
 * - Boo crowd sound (synthesized vocal formant descending groan/chorus)
 * - Hooray / Cheering crowd sound (synthesized rising joyous formant cheers + applause burst)
 * - Serve whoosh
 * - Point win / Point loss chimes
 * - Gentle outdoor wind ambience
 * - UI click
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambienceGain = null;
    this.masterGain = null;
    this.initialized = false;
    this.isWindPlaying = false;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(this.muted ? 0 : 0.18, this.ctx.currentTime);
      this.ambienceGain.connect(this.masterGain);

      this.initialized = true;
      this.startAmbience();
    } catch (e) {
      console.warn('Web Audio init failed:', e);
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  startAmbience() {
    if (!this.ctx || this.isWindPlaying) return;
    this.isWindPlaying = true;

    try {
      // Pink/Brown noise generator for gentle breeze
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      // Low frequency oscillator to make wind swell gently
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(120, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      whiteNoise.connect(filter);
      filter.connect(this.ambienceGain);

      whiteNoise.start();
      lfo.start();
    } catch (e) {
      console.warn('Ambience sound failed:', e);
    }
  }

  playPaddleHit(isPower = false, isPlayer = true) {
    if (!this.initialized || this.muted) return;
    try {
      const t = this.ctx.currentTime;

      // Crisp wooden "tok" + rubber pop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      const baseFreq = isPower ? 750 : (isPlayer ? 900 : 820);
      osc.type = isPower ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + (isPower ? 0.18 : 0.11));

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq * 1.2, t);
      filter.Q.setValueAtTime(3.0, t);

      // Noise burst for the crisp impact click
      const bufferSize = this.ctx.sampleRate * 0.04;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.008));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(isPower ? 0.7 : 0.45, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      noise.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      gain.gain.setValueAtTime(isPower ? 0.9 : 0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isPower ? 0.22 : 0.12));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      noise.start(t);
      osc.stop(t + 0.25);
      noise.stop(t + 0.05);

      // If power, add a lower punch boom
      if (isPower) {
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(220, t);
        subOsc.frequency.exponentialRampToValueAtTime(45, t + 0.28);
        subGain.gain.setValueAtTime(0.8, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        subOsc.connect(subGain);
        subGain.connect(this.masterGain);
        subOsc.start(t);
        subOsc.stop(t + 0.3);
      }
    } catch (e) {
      console.warn('Hit sound error:', e);
    }
  }

  playTableBounce(volume = 0.5) {
    if (!this.initialized || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      // Damped hollow wooden ping
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

      gain.gain.setValueAtTime(volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      // Fast click
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(1400, t);
      click.frequency.exponentialRampToValueAtTime(300, t + 0.02);
      clickGain.gain.setValueAtTime(volume * 0.3, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

      osc.connect(gain);
      gain.connect(this.masterGain);
      click.connect(clickGain);
      clickGain.connect(this.masterGain);

      osc.start(t);
      click.start(t);
      osc.stop(t + 0.09);
      click.stop(t + 0.03);
    } catch (e) {
      console.warn('Bounce sound error:', e);
    }
  }

  playServe() {
    if (!this.initialized || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(860, t + 0.12);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {
      console.warn('Serve sound error:', e);
    }
  }

  playPowerReady() {
    if (!this.initialized || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteTime = t + idx * 0.045;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.25, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.16);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(noteTime);
        osc.stop(noteTime + 0.18);
      });
    } catch (e) {
      console.warn('Power ready sound error:', e);
    }
  }

  // Playful crowd "BOOOO!" when the player misses
  playBoo() {
    if (!this.initialized || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      // Multivocal descending formant drone (simulates playful boooo)
      const pitches = [185, 175, 160, 145, 130];
      const masterBooGain = this.ctx.createGain();
      masterBooGain.gain.setValueAtTime(0.01, t);
      masterBooGain.gain.linearRampToValueAtTime(0.5, t + 0.15);
      masterBooGain.gain.exponentialRampToValueAtTime(0.001, t + 1.25);
      masterBooGain.connect(this.masterGain);

      // Bandpass filter to sculpt vocal "OOO" vowel formant (around 300Hz-500Hz)
      const formantFilter = this.ctx.createBiquadFilter();
      formantFilter.type = 'bandpass';
      formantFilter.frequency.setValueAtTime(420, t);
      formantFilter.frequency.exponentialRampToValueAtTime(290, t + 1.2);
      formantFilter.Q.setValueAtTime(4.0, t);
      formantFilter.connect(masterBooGain);

      pitches.forEach((p, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        // start slightly higher and slide down mournfully
        osc.frequency.setValueAtTime(p + (Math.random() * 8 - 4), t);
        osc.frequency.exponentialRampToValueAtTime(p * 0.72, t + 1.2);
        osc.connect(formantFilter);
        osc.start(t + i * 0.02);
        osc.stop(t + 1.3);
      });

      // Subtle crowd disappointment murmur
      const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.1, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'lowpass';
      nFilter.frequency.setValueAtTime(260, t);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.12, t);
      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 1.15);
    } catch (e) {
      console.warn('Boo sound error:', e);
    }
  }

  // Celebratory "HOORAY!" + applause when CPU misses
  playCheer() {
    if (!this.initialized || this.muted) return;
    try {
      const t = this.ctx.currentTime;

      // Joyful rising formant ("YAAAY / HOORAY")
      const pitches = [260, 330, 390, 520];
      const masterCheerGain = this.ctx.createGain();
      masterCheerGain.gain.setValueAtTime(0.01, t);
      masterCheerGain.gain.linearRampToValueAtTime(0.55, t + 0.12);
      masterCheerGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      masterCheerGain.connect(this.masterGain);

      const formant = this.ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.setValueAtTime(700, t);
      formant.frequency.exponentialRampToValueAtTime(1100, t + 0.35);
      formant.frequency.exponentialRampToValueAtTime(800, t + 1.3);
      formant.Q.setValueAtTime(3.5, t);
      formant.connect(masterCheerGain);

      pitches.forEach(p => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(p * 0.85, t);
        osc.frequency.exponentialRampToValueAtTime(p * 1.15, t + 0.25);
        osc.frequency.exponentialRampToValueAtTime(p, t + 1.3);
        osc.connect(formant);
        osc.start(t);
        osc.stop(t + 1.35);
      });

      // Realistic crowd clapping / applause simulation
      const applauseLen = 1.3;
      const clapCount = 38;
      for (let i = 0; i < clapCount; i++) {
        const clapTime = t + 0.05 + Math.random() * (applauseLen - 0.1);
        const oscClap = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();
        oscClap.type = 'triangle';
        oscClap.frequency.setValueAtTime(800 + Math.random() * 600, clapTime);
        const clapVol = 0.06 + Math.random() * 0.08;
        cGain.gain.setValueAtTime(clapVol, clapTime);
        cGain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.035);
        oscClap.connect(cGain);
        cGain.connect(this.masterGain);
        oscClap.start(clapTime);
        oscClap.stop(clapTime + 0.04);
      }
    } catch (e) {
      console.warn('Cheer sound error:', e);
    }
  }

  // Celebratory victory fanfare
  playVictory() {
    if (!this.initialized || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      // High triumphant brass-like chord: C5 - E5 - G5 - C6
      const chord = [523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + idx * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.4);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + 1.45);
      });
      setTimeout(() => this.playCheer(), 300);
    } catch (e) {
      console.warn('Victory sound error:', e);
    }
  }

  // Match defeat cue
  playDefeat() {
    if (!this.initialized || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [392.00, 369.99, 349.23, 311.13]; // G4, F#4, F4, D#4 descending
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + idx * 0.16;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + 0.65);
      });
      setTimeout(() => this.playBoo(), 400);
    } catch (e) {
      console.warn('Defeat sound error:', e);
    }
  }

  playUIClick() {
    if (!this.initialized || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {
      console.warn('UI Click sound error:', e);
    }
  }

  playNewRecord() {
    if (!this.initialized || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [659.25, 880, 1174.66]; // E5, A5, D6
      notes.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + i * 0.08);
        gain.gain.setValueAtTime(0.3, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.35);
      });
    } catch (e) {
      console.warn('New record sound error:', e);
    }
  }
}

export const sound = new SoundManager();
