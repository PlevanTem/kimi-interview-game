/**
 * palette.js — 设计令牌与四段呼吸相位的配色
 *
 * 美术纪律（三套形状语言 / 三种主材质）：
 *   形状：城市骨架（硬直角柱体）、余光曲线（连续手写笔迹）、角色轮廓（软实心剪影）
 *   材质：雾（大气渐变）、灰石（无高光的实色块）、发光（加法叠色）
 * 颜色只承担情绪与相位；玩法状态一律用形状 / 粗细 / 抖动 / 声音表达。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const { mix } = LL.core;

  /**
   * 每个相位一套色板。
   * skyTop/skyMid/skyLow：天空三段渐变
   * far/mid/near：城市三层剪影（越近越暗，形成大气透视）
   * accent：余光主调  glow：脉冲与高光  ember：空气中的浮尘
   */
  const PHASES = [
    {
      id: 'rift',
      name: '起风断层',
      breath: '吸气',
      motto: '城市还记得如何吸气。',
      skyTop: '#050912', skyMid: '#0a1628', skyLow: '#14304a',
      far: '#132b42', mid: '#0d1e30', near: '#060d17',
      accent: '#6fd7ff', glow: '#d5f4ff', ember: '#8fd8ff',
      windowLight: '#ffd9a8', fog: '#1d4463',
      breathAmp: 1.0, breathRate: 0.28, drift: 0.55, grain: 0.05,
    },
    {
      id: 'press',
      name: '悬压城区',
      breath: '屏息',
      motto: '屏住的那口气最沉。',
      skyTop: '#06040f', skyMid: '#150a26', skyLow: '#2c1240',
      far: '#2a1440', mid: '#180a29', near: '#080412',
      accent: '#c78bff', glow: '#ffd7f2', ember: '#ff8fd0',
      windowLight: '#ffb0d8', fog: '#3b1a55',
      breathAmp: 0.35, breathRate: 0.13, drift: 1.25, grain: 0.07,
    },
    {
      id: 'echo',
      name: '回声桥群',
      breath: '呼气',
      motto: '呼气比吸气长，所以回声更长。',
      skyTop: '#0d0710', skyMid: '#2a1018', skyLow: '#54202a',
      far: '#4a1f2a', mid: '#2a121a', near: '#0d0609',
      accent: '#ffab5c', glow: '#ffe7c2', ember: '#ff9d6b',
      windowLight: '#ffe0b0', fog: '#6b2c33',
      breathAmp: 1.35, breathRate: 0.2, drift: 0.9, grain: 0.06,
    },
    {
      id: 'dawn',
      name: '晨光终台',
      breath: '静止',
      motto: '最后一次黎明不需要被赶上。',
      skyTop: '#101828', skyMid: '#3a3a5c', skyLow: '#8c7a86',
      far: '#5c5570', mid: '#332f46', near: '#12111c',
      accent: '#ffeec4', glow: '#ffffff', ember: '#fff0cf',
      windowLight: '#fff4d6', fog: '#8f8298',
      breathAmp: 0.12, breathRate: 0.07, drift: 0.2, grain: 0.03,
    },
  ];

  /**
   * 破晓：只在终局使用的第五套色板。
   * 它不是一个区，而是四段呼吸走完之后世界终于呼出的那一口气。
   */
  const DAYBREAK = {
    id: 'daybreak', name: '黎明', breath: '呼出', motto: '',
    skyTop: '#33406b', skyMid: '#9a86a0', skyLow: '#ffd6a5',
    far: '#b3a3ae', mid: '#6e6685', near: '#1b1926',
    accent: '#fff2cf', glow: '#ffffff', ember: '#ffe7bc',
    windowLight: '#fff8e8', fog: '#d3bcb4',
    breathAmp: 0.06, breathRate: 0.05, drift: 0.1, grain: 0.02,
  };

  /** 高对比模式：压暗背景、提亮余光，不改变形状语言 */
  function applyContrast(p, on) {
    if (!on) return p;
    const q = Object.assign({}, p);
    q.skyTop = mix(p.skyTop, '#000000', 0.55);
    q.skyMid = mix(p.skyMid, '#000000', 0.55);
    q.skyLow = mix(p.skyLow, '#000000', 0.4);
    q.far = mix(p.far, '#000000', 0.45);
    q.mid = mix(p.mid, '#000000', 0.5);
    q.near = '#000000';
    q.accent = mix(p.accent, '#ffffff', 0.35);
    q.glow = '#ffffff';
    return q;
  }

  /** 在两套色板之间插值，用于相位过渡 */
  function blend(a, b, t) {
    const keys = ['skyTop', 'skyMid', 'skyLow', 'far', 'mid', 'near', 'accent', 'glow', 'ember', 'windowLight', 'fog'];
    const out = Object.assign({}, b);
    for (const k of keys) out[k] = mix(a[k], b[k], t);
    for (const k of ['breathAmp', 'breathRate', 'drift', 'grain']) out[k] = a[k] + (b[k] - a[k]) * t;
    out.id = t < 0.5 ? a.id : b.id;
    out.name = t < 0.5 ? a.name : b.name;
    out.breath = t < 0.5 ? a.breath : b.breath;
    return out;
  }

  /** 排版令牌 */
  const TYPE = {
    display: '"Songti SC","Source Han Serif SC","Noto Serif SC",Georgia,"STZhongsong",serif',
    ui: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",system-ui,sans-serif',
  };

  LL.palette = { PHASES, DAYBREAK, applyContrast, blend, TYPE };
})(typeof window !== 'undefined' ? window : globalThis);
