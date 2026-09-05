/**
 * 程序化音景。
 *
 * 不加载任何音频文件：风是带通滤波的噪声，浪是低通噪声上叠一条极慢的涌浪包络，
 * 洞窟是用噪声合成的脉冲响应做的混响，竖琴是三个分音的指数衰减。
 * 每一幕给一组配比，靠"风大/浪高/嗡鸣重/混响长"四个旋钮拉开听感差别。
 */

export interface AudioProfile {
  /** 风 0–1 */
  wind: number;
  /** 浪 0–1 */
  surf: number;
  /** 低频嗡鸣 0–1：不安与神性 */
  drone: number;
  /** 空间混响湿度 0–1：洞窟与柱廊 */
  space: number;
  /** 风的音色中心频率（Hz），风暴更高更尖 */
  windTone: number;
}

export const AUDIO: Record<string, AudioProfile> = {
  openSea: { wind: 0.55, surf: 0.75, drone: 0.25, space: 0.1, windTone: 520 },
  calmShore: { wind: 0.2, surf: 0.42, drone: 0.12, space: 0.12, windTone: 380 },
  storm: { wind: 0.95, surf: 0.95, drone: 0.4, space: 0.3, windTone: 780 },
  hall: { wind: 0.12, surf: 0.18, drone: 0.3, space: 0.85, windTone: 300 },
  silence: { wind: 0.06, surf: 0.1, drone: 0.45, space: 0.6, windTone: 240 },
  strait: { wind: 0.45, surf: 0.6, drone: 0.35, space: 0.45, windTone: 460 },
  endlessDay: { wind: 0.18, surf: 0.35, drone: 0.2, space: 0.25, windTone: 340 },
};

export type AudioProfileName = keyof typeof AUDIO;

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // 粉噪：比白噪声更接近风与海的频谱
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57555 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.16;
  }
  return buffer;
}

function impulseResponse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return buffer;
}

export class Soundscape {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private surfGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private muted = false;
  private profile: AudioProfile = AUDIO.openSea!;
  private visionDuck = 1;

  /** 必须在一次用户手势里调用，否则浏览器不允许出声。 */
  resume(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = impulseResponse(ctx, 3.2, 2.4);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.15;
    convolver.connect(this.wet);
    this.wet.connect(this.master);

    this.dry = ctx.createGain();
    this.dry.gain.value = 1;
    this.dry.connect(this.master);

    const bus = ctx.createGain();
    bus.connect(this.dry);
    bus.connect(convolver);

    const noise = noiseBuffer(ctx, 6);

    // --- 风 ---
    const windSource = ctx.createBufferSource();
    windSource.buffer = noise;
    windSource.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 520;
    this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    windSource.connect(this.windFilter).connect(this.windGain).connect(bus);
    windSource.start();

    // 风的阵：两条不同周期的 LFO 叠在带通频率与音量上
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.07;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 180;
    gust.connect(gustDepth).connect(this.windFilter.frequency);
    gust.start();

    const breath = ctx.createOscillator();
    breath.frequency.value = 0.041;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 0.05;
    breath.connect(breathDepth).connect(this.windGain.gain);
    breath.start();

    // --- 浪 ---
    const surfSource = ctx.createBufferSource();
    surfSource.buffer = noise;
    surfSource.loop = true;
    surfSource.playbackRate.value = 0.72;
    const surfFilter = ctx.createBiquadFilter();
    surfFilter.type = 'lowpass';
    surfFilter.frequency.value = 480;
    this.surfGain = ctx.createGain();
    this.surfGain.gain.value = 0;
    surfSource.connect(surfFilter).connect(this.surfGain).connect(bus);
    surfSource.start();

    const swell = ctx.createOscillator();
    swell.frequency.value = 0.085;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.09;
    swell.connect(swellDepth).connect(this.surfGain.gain);
    swell.start();

    // --- 低频嗡鸣：两个失谐正弦，是全作的"神在场"信号 ---
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    this.droneGain.connect(bus);
    for (const freq of [55, 82.41, 110.3]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = freq < 60 ? 0.5 : 0.22;
      osc.connect(g).connect(this.droneGain);
      osc.start();
    }

    this.applyProfile(this.profile, 0.01);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.15);
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** 换一幕：所有旋钮在几秒内平滑过去，不做硬切。 */
  applyProfile(profile: AudioProfile, seconds = 2.5): void {
    this.profile = profile;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const tau = Math.max(seconds / 3, 0.01);
    this.windGain?.gain.setTargetAtTime(profile.wind * 0.35 * this.visionDuck, t, tau);
    this.surfGain?.gain.setTargetAtTime(profile.surf * 0.4 * this.visionDuck, t, tau);
    this.droneGain?.gain.setTargetAtTime(profile.drone * 0.055, t, tau);
    this.wet?.gain.setTargetAtTime(profile.space * 0.55, t, tau);
    this.windFilter?.frequency.setTargetAtTime(profile.windTone, t, tau);
  }

  /** 幻象：环境退到很远，只剩嗡鸣。 */
  setVision(active: boolean): void {
    this.visionDuck = active ? 0.18 : 1;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain?.gain.setTargetAtTime(this.profile.wind * 0.35 * this.visionDuck, t, 0.5);
    this.surfGain?.gain.setTargetAtTime(this.profile.surf * 0.4 * this.visionDuck, t, 0.5);
    this.droneGain?.gain.setTargetAtTime(active ? 0.12 : this.profile.drone * 0.055, t, 0.5);
  }

  /** 触碰到东西：一声七弦琴的泛音。 */
  pluck(semitone = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.dry) return;
    const base = 196 * Math.pow(2, semitone / 12);
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.12, t + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    out.connect(this.dry);
    if (this.wet) out.connect(this.wet);

    [1, 2, 3.02, 4.05].forEach((mult, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 0 ? 'triangle' : 'sine';
      osc.frequency.value = base * mult;
      const g = ctx.createGain();
      g.gain.value = 0.9 / (index + 1) ** 1.6;
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 2.8);
    });
  }

  /** 一步脚步声：短促的滤波噪声，音高随地面材质微变。 */
  footstep(brightness = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.dry) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.14);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 320 * brightness;
    filter.Q.value = 1.1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.075, t);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.13);
    src.connect(filter).connect(gain).connect(this.dry);
    src.start(t);
    src.stop(t + 0.15);
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
  }
}
