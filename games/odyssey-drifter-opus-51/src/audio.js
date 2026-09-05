/**
 * audio.js — 全程序化音频（无外部资产）
 *
 * 声音层级纪律（来自立项报告 §11）：
 *   足音 = 拍点 / 线鸣 = 张力 / 脉冲 = 释放 / 风声 = 呼吸
 * 音乐垫层永远低于这四层，且四层信息在静音时都有视觉冗余。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const { clamp, lerp } = LL.core;

  function createAudio() {
    const AC = global.AudioContext || global.webkitAudioContext;
    const api = {
      ready: false, muted: false, ctx: null,
      unlock, setMute, footstep, toeTap, drawStart, drawUpdate, drawEnd,
      commit, pulse, sync, snap, land, stumble, rewind, chord, setPhase, tick, whoosh,
    };
    if (!AC) { // 无 WebAudio 时全部降级为空操作
      for (const k of Object.keys(api)) if (typeof api[k] === 'function') api[k] = () => {};
      api.unlock = () => {}; api.setMute = () => {};
      return api;
    }

    let ctx = null, master = null, wetGain = null, windGain = null, windFilter = null;
    let padGain = null, padOsc = [], lineOsc = null, lineGain = null, lineFilter = null;
    let phaseTone = 0;

    function unlock() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      ctx = new AC();
      api.ctx = ctx;
      master = ctx.createGain();
      master.gain.value = 0.75;
      master.connect(ctx.destination);

      // 反馈延迟当作廉价空间感
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.26;
      const fb = ctx.createGain();
      fb.gain.value = 0.34;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2200;
      wetGain = ctx.createGain();
      wetGain.gain.value = 0.32;
      wetGain.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);
      damp.connect(master);

      // 风：呼吸底噪
      const noise = makeNoiseSource(6);
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 420;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0.0;
      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      noise.start();

      // 线鸣：张力驱动的持续音
      lineOsc = ctx.createOscillator();
      lineOsc.type = 'sawtooth';
      lineOsc.frequency.value = 180;
      lineFilter = ctx.createBiquadFilter();
      lineFilter.type = 'lowpass';
      lineFilter.frequency.value = 900;
      lineFilter.Q.value = 6;
      lineGain = ctx.createGain();
      lineGain.gain.value = 0;
      lineOsc.connect(lineFilter);
      lineFilter.connect(lineGain);
      lineGain.connect(master);
      lineGain.connect(wetGain);
      lineOsc.start();

      // 音乐垫：两个五度关系的低音
      padGain = ctx.createGain();
      padGain.gain.value = 0.0;
      padGain.connect(master);
      padGain.connect(wetGain);
      [110, 164.81, 220].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? 'triangle' : 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = i === 2 ? 0.12 : 0.3;
        o.connect(g);
        g.connect(padGain);
        o.start();
        padOsc.push({ o, g, base: f });
      });

      api.ready = true;
      setMute(api.muted);
    }

    function makeNoiseSource(seconds) {
      const len = ctx.sampleRate * seconds;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = last * 0.86 + w * 0.14; // 粉噪近似
        d[i] = last * 3.2;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      return src;
    }

    function setMute(m) {
      api.muted = m;
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.75, ctx.currentTime, 0.05);
    }

    const now = () => (ctx ? ctx.currentTime : 0);

    /** 通用打击式包络 */
    function blip(type, f0, f1, dur, vol, wet) {
      if (!ctx || api.muted) return;
      const t = now();
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      if (wet) g.connect(wetGain);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    function noiseBurst(dur, f, q, vol, sweepTo) {
      if (!ctx || api.muted) return;
      const t = now();
      const len = Math.ceil(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(f, t);
      if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
      bp.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(bp); bp.connect(g); g.connect(master); g.connect(wetGain);
      src.start(t);
    }

    /* ------------------------------------------------------------ 事件 */

    function footstep(power) {
      power = clamp(power == null ? 1 : power, 0.2, 1.6);
      noiseBurst(0.085, 900 + phaseTone * 260, 1.1, 0.09 * power, 320);
      blip('sine', 120, 58, 0.1, 0.06 * power, false);
    }
    function toeTap(second) {
      blip('triangle', second ? 1180 : 940, second ? 900 : 720, 0.07, 0.055, true);
    }
    function drawStart() {
      if (!lineGain || api.muted) return;
      lineGain.gain.setTargetAtTime(0.03, now(), 0.04);
      blip('sine', 300, 520, 0.14, 0.05, true);
    }
    /** tension 0..1，load 0..1.4 */
    function drawUpdate(tension, load) {
      if (!lineGain || !ctx) return;
      const f = lerp(120, 460, tension) * (1 + phaseTone * 0.12);
      lineOsc.frequency.setTargetAtTime(f, now(), 0.05);
      lineFilter.frequency.setTargetAtTime(lerp(500, 2600, tension), now(), 0.05);
      lineFilter.Q.setTargetAtTime(lerp(3, 14, clamp(load, 0, 1)), now(), 0.08);
      lineGain.gain.setTargetAtTime(api.muted ? 0 : lerp(0.018, 0.075, clamp(load, 0, 1.2)), now(), 0.06);
    }
    function drawEnd() {
      if (!lineGain) return;
      lineGain.gain.setTargetAtTime(0, now(), 0.06);
    }
    function commit(tension) {
      blip('triangle', lerp(220, 520, tension), lerp(160, 380, tension), 0.28, 0.11, true);
    }
    function pulse() { blip('sine', 260, 1400, 0.42, 0.09, true); }
    function sync(chain) {
      const base = 523.25 * Math.pow(1.0595, Math.min(chain, 8) * 2);
      blip('sine', base, base, 0.7, 0.1, true);
      blip('sine', base * 1.5, base * 1.5, 0.5, 0.045, true);
      blip('sine', base * 2, base * 2, 0.35, 0.03, true);
    }
    function snap() {
      noiseBurst(0.4, 2600, 0.7, 0.16, 180);
      blip('sawtooth', 320, 44, 0.5, 0.09, true);
    }
    function land(power) {
      noiseBurst(0.14, 420, 1.2, 0.1 * clamp(power, 0.3, 1.6), 140);
      blip('sine', 150, 52, 0.2, 0.09, false);
    }
    function stumble() { blip('square', 180, 120, 0.16, 0.05, false); }
    function rewind() {
      if (!ctx || api.muted) return;
      const t = now();
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(700, t + 0.85);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g); g.connect(master); g.connect(wetGain);
      o.start(t); o.stop(t + 0.95);
      noiseBurst(0.9, 1400, 0.4, 0.05, 5200);
    }
    function whoosh(v) { noiseBurst(0.3, 700, 0.5, 0.045 * clamp(v, 0.3, 1.5), 180); }
    function tick() { blip('square', 1600, 1600, 0.03, 0.02, false); }
    /** 终局和弦 */
    function chord() {
      if (!ctx || api.muted) return;
      [261.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => {
        setTimeout(() => blip('sine', f, f, 3.4, 0.05, true), i * 260);
      });
    }

    /** 相位切换：调整风声、垫层与音色偏移 */
    function setPhase(index, intensity) {
      phaseTone = index / 3;
      if (!ctx) return;
      const t = now();
      const roots = [110, 98, 123.47, 130.81];
      const root = roots[clamp(index, 0, 3)];
      padOsc.forEach((p, i) => {
        const mulS = [1, 1.5, 2];
        p.o.frequency.setTargetAtTime(root * mulS[i], t, 1.2);
      });
      padGain.gain.setTargetAtTime(api.muted ? 0 : 0.045 + intensity * 0.02, t, 1.5);
      windFilter.frequency.setTargetAtTime(lerp(320, 700, phaseTone), t, 1.0);
      windGain.gain.setTargetAtTime(api.muted ? 0 : lerp(0.05, 0.012, phaseTone), t, 1.5);
    }

    return api;
  }

  LL.createAudio = createAudio;
})(typeof window !== 'undefined' ? window : globalThis);
