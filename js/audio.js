/**
 * RescueRoute — Web Audio API Emergency Siren & Alert Synthesizer
 * Pure vanilla Web Audio API - no external sound files required!
 */

class RescueAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.currentOscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.intervalId = null;
  }

  ensureContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Continuous rising & falling disaster siren wail
   */
  startDisasterSiren() {
    this.stop();
    this.ensureContext();
    this.isPlaying = true;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, this.audioCtx.currentTime);

    // Initial gain ramp
    gain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, this.audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();

    this.currentOscillator = osc;
    this.gainNode = gain;

    // Siren frequency cycle (wail from 450Hz to 950Hz)
    let rising = true;
    let freq = 450;
    this.intervalId = setInterval(() => {
      if (!this.isPlaying || !this.audioCtx) return;
      if (rising) {
        freq += 40;
        if (freq >= 950) rising = false;
      } else {
        freq -= 40;
        if (freq <= 450) rising = true;
      }
      try {
        osc.frequency.setTargetAtTime(freq, this.audioCtx.currentTime, 0.08);
      } catch (e) {
        // Safe catch for state transitions
      }
    }, 90);

    // Visualizer effect trigger
    const visualizer = document.getElementById('sirenVisualizer');
    if (visualizer) visualizer.classList.add('ringing');
  }

  /**
   * High-priority short pulsing beep alert
   */
  playWarningBeeps(count = 3) {
    this.ensureContext();
    let currentBeep = 0;

    const beep = () => {
      if (currentBeep >= count) return;
      currentBeep++;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5 note

      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.28);

      setTimeout(beep, 350);
    };

    beep();
  }

  /**
   * Gentle tactical confirmation chirp for dispatches
   */
  playDispatchChirp() {
    this.ensureContext();
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1040, this.audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.22);
  }

  /**
   * Stop any playing siren
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.currentOscillator) {
      try {
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.audioCtx.currentTime);
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
        this.currentOscillator.stop(this.audioCtx.currentTime + 0.12);
      } catch (e) {
        // Already stopped
      }
      this.currentOscillator = null;
      this.gainNode = null;
    }
    this.isPlaying = false;

    const visualizer = document.getElementById('sirenVisualizer');
    if (visualizer) visualizer.classList.remove('ringing');
  }

  toggleSiren() {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.startDisasterSiren();
      return true;
    }
  }
}

window.rescueAudio = new RescueAudioEngine();
