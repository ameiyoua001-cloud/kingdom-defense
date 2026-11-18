import { SaveManager } from './SaveManager';

/**
 * 原创音效合成器：用 WebAudio 即时合成短音效，
 * 不依赖任何外部音频文件（全部为本项目原创波形设计）。
 * AudioContext 在首次用户手势后创建/恢复，兼容自动播放策略。
 */
class SfxImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = SaveManager.sound;

  /** 在用户首次点击时调用 */
  unlock(): void {
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    SaveManager.setSound(this.enabled);
    return this.enabled;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol = 0.5, slideTo?: number, delay = 0): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.4, lowpass = 1200, delay = 0): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  click(): void { this.tone(660, 0.06, 'triangle', 0.3); }
  build(): void { this.noise(0.12, 0.5, 900); this.tone(220, 0.15, 'triangle', 0.4, 330, 0.03); }
  upgrade(): void { this.tone(440, 0.09, 'triangle', 0.4); this.tone(660, 0.09, 'triangle', 0.4, undefined, 0.08); this.tone(880, 0.14, 'triangle', 0.4, undefined, 0.16); }
  sell(): void { this.tone(520, 0.12, 'sine', 0.4, 260); this.tone(780, 0.08, 'sine', 0.25, undefined, 0.08); }
  arrow(): void { this.noise(0.05, 0.18, 3500); }
  magic(): void { this.tone(880, 0.16, 'sine', 0.22, 1400); }
  cannon(): void { this.noise(0.25, 0.55, 500); this.tone(90, 0.22, 'sine', 0.5, 45); }
  explosion(): void { this.noise(0.35, 0.5, 350); }
  hit(): void { this.noise(0.04, 0.14, 2000); }
  coin(): void { this.tone(1180, 0.07, 'square', 0.12); this.tone(1560, 0.1, 'square', 0.1, undefined, 0.05); }
  lifeLost(): void { this.tone(300, 0.25, 'sawtooth', 0.3, 120); }
  waveStart(): void { this.tone(392, 0.16, 'triangle', 0.35); this.tone(523, 0.22, 'triangle', 0.35, undefined, 0.14); }
  soldierDie(): void { this.tone(240, 0.18, 'sawtooth', 0.2, 90); }
  victory(): void { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.35, undefined, i * 0.15)); }
  defeat(): void { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.35, undefined, i * 0.2)); }
  error(): void { this.tone(180, 0.12, 'square', 0.2); }
}

export const Sfx = new SfxImpl();