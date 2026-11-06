// Sistema de Som Procedural (Web Audio API) + WebRTC Voice Proximity
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.localStream = null;
    this.peerAudioStreams = new Map();
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Scanner de código de barras "BEEP"
  playBeep() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1760, this.ctx.currentTime); // Nota A6
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Caixa registradora "PLIM"
  playCashRegister() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // Alarme de Reunião de Emergência
  playEmergencyAlarm() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.25);
    osc.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);
  }

  // Inicializa microfone para Proximidade WebRTC
  async setupProximityMicrophone() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      return this.localStream;
    } catch (err) {
      console.warn("Microfone não autorizado ou indisponível:", err);
      return null;
    }
  }

  // Atualiza ganho espacial (volume) de acordo com a distância entre jogadores
  updateSpatialVolume(peerId, distance, maxDist = 20) {
    const audioEl = this.peerAudioStreams.get(peerId);
    if (!audioEl) return;
    if (distance > maxDist) {
      audioEl.volume = 0;
    } else {
      const vol = Math.max(0, 1 - (distance / maxDist));
      audioEl.volume = Math.min(1, vol * vol); // atenuação quadrática
    }
  }
}

export const soundManager = new SoundSystem();
