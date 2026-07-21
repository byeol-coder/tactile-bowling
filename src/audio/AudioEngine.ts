// Web Audio 기반 합성 오디오 엔진. 외부 오디오 파일에 의존하지 않는다.
// 브라우저 자동재생 정책: 사용자의 첫 입력 후 resume() 으로 활성화.

export type Channel = 'music' | 'effects';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private gains: Record<Channel, GainNode | null> = { music: null, effects: null };
  private vols: Record<Channel, number> = { music: 0.4, effects: 0.8 };
  private started = false;

  /** 첫 사용자 입력에서 호출. */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    (['music', 'effects'] as Channel[]).forEach((ch) => {
      const g = this.ctx!.createGain();
      g.gain.value = this.vols[ch];
      g.connect(this.master!);
      this.gains[ch] = g;
    });
    this.started = true;
  }

  isReady(): boolean {
    return this.started;
  }

  setVolume(ch: Channel, v: number): void {
    this.vols[ch] = v;
    const g = this.gains[ch];
    if (g) g.gain.value = v;
  }

  /** pan: -1(왼쪽) ~ +1(오른쪽). 공/거터 위치를 스테레오로 전달. */
  private tone(opts: {
    freq: number;
    dur: number;
    type?: OscillatorType;
    pan?: number;
    channel?: Channel;
    gain?: number;
    slideTo?: number;
  }): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, now);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), now + opts.dur);
    panner.pan.value = clamp(opts.pan ?? 0, -1, 1);
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
    osc.connect(g).connect(panner).connect(this.gains[opts.channel ?? 'effects'] ?? this.master!);
    osc.start(now);
    osc.stop(now + opts.dur + 0.02);
  }

  private noise(dur: number, pan = 0, gain = 0.35): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    src.connect(g).connect(panner).connect(this.gains.effects ?? this.master!);
    src.start(now);
  }

  // --- 이벤트 사운드 ---
  move(pan: number): void { this.tone({ freq: 320, dur: 0.08, pan, gain: 0.18 }); }
  fine(pan: number): void { this.tone({ freq: 440, dur: 0.04, pan, gain: 0.12 }); }
  powerTick(level: number): void { this.tone({ freq: 200 + level * 400, dur: 0.05, gain: 0.15 }); }
  release(pan: number): void { this.tone({ freq: 160, dur: 0.25, type: 'triangle', pan, slideTo: 90, gain: 0.35 }); }
  roll(pan: number): void { this.noise(0.18, pan, 0.14); }
  gutterWarn(pan: number): void { this.tone({ freq: 520, dur: 0.18, type: 'square', pan, gain: 0.22 }); }

  pinHit(pan: number): void { this.noise(0.12, pan, 0.4); this.tone({ freq: 900, dur: 0.06, pan, gain: 0.15 }); }
  strike(): void {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.3 }), i * 90));
  }
  spare(): void {
    [523, 784].forEach((f, i) => setTimeout(() => this.tone({ freq: f, dur: 0.2, type: 'triangle', gain: 0.28 }), i * 120));
  }
  open(): void { this.tone({ freq: 330, dur: 0.18, type: 'sine', gain: 0.22 }); }
  gutter(): void { this.tone({ freq: 140, dur: 0.5, type: 'sawtooth', gain: 0.25, slideTo: 80 }); }
  turnChange(): void { [660, 660].forEach((f, i) => setTimeout(() => this.tone({ freq: f, dur: 0.1, gain: 0.2 }), i * 140)); }
  gameEnd(): void { [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.3 }), i * 140)); }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export const audio = new AudioEngine();
