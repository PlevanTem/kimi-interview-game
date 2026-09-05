/**
 * core.js — 数学、随机、噪声、曲线与颜色基元
 * 全部为纯函数，可在 Node 下单元测试（见 tests/core.test.mjs）。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});

  /* ---------------------------------------------------------------- math */

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const invLerp = (a, b, v) => (v - a) / (b - a || 1);
  const remap = (v, a, b, c, d) => lerp(c, d, sat(invLerp(a, b, v)));
  const smoothstep = (t) => {
    t = sat(t);
    return t * t * (3 - 2 * t);
  };
  const smootherstep = (t) => {
    t = sat(t);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  /** 帧率无关的指数逼近 */
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  const dist2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  const angleLerp = (a, b, t) => {
    let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
    return a + d * t;
  };

  const ease = {
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    outBack: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
    outElastic: (t) =>
      t === 0 || t === 1 ? t : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * 2.09) + 1,
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  };

  /* -------------------------------------------------------------- random */

  /** mulberry32：小而稳定的确定性随机源 */
  function makeRng(seed) {
    let a = seed >>> 0 || 1;
    const rng = function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.range = (lo, hi) => lo + rng() * (hi - lo);
    rng.int = (lo, hi) => Math.floor(lo + rng() * (hi - lo + 1));
    rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
    rng.sign = () => (rng() < 0.5 ? -1 : 1);
    rng.chance = (p) => rng() < p;
    return rng;
  }

  /** 1D 值噪声：用于风、呼吸、抖动等连续扰动 */
  function makeNoise(seed) {
    const rng = makeRng(seed);
    const table = new Float32Array(512);
    for (let i = 0; i < 512; i++) table[i] = rng() * 2 - 1;
    const n1 = (x) => {
      const i = Math.floor(x);
      const f = x - i;
      const a = table[i & 511];
      const b = table[(i + 1) & 511];
      return lerp(a, b, smootherstep(f));
    };
    const fbm = (x, oct = 3, gain = 0.5) => {
      let s = 0,
        amp = 1,
        norm = 0,
        fr = 1;
      for (let i = 0; i < oct; i++) {
        s += n1(x * fr + i * 31.7) * amp;
        norm += amp;
        amp *= gain;
        fr *= 2.03;
      }
      return s / norm;
    };
    return { n1, fbm };
  }

  /* --------------------------------------------------------------- color */

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const v = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const rgbCache = new Map();
  function rgb(hex) {
    let c = rgbCache.get(hex);
    if (!c) {
      c = hexToRgb(hex);
      rgbCache.set(hex, c);
    }
    return c;
  }
  /** hex + alpha -> css rgba() */
  function rgba(hex, a) {
    const c = rgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  /** 线性插值两个 hex，返回 hex */
  function mix(hexA, hexB, t) {
    const a = rgb(hexA),
      b = rgb(hexB);
    const r = Math.round(lerp(a[0], b[0], t));
    const g = Math.round(lerp(a[1], b[1], t));
    const bl = Math.round(lerp(a[2], b[2], t));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  /* --------------------------------------------------------------- curve */

  /** 折线总弧长 */
  function polyLength(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return s;
  }

  /** 等弧长重采样为 n 个点 */
  function resample(pts, n) {
    if (pts.length < 2) return pts.slice();
    const total = polyLength(pts);
    if (total <= 1e-6) return [{ x: pts[0].x, y: pts[0].y }];
    const step = total / (n - 1);
    const out = [{ x: pts[0].x, y: pts[0].y }];
    let acc = 0,
      i = 1,
      prev = pts[0];
    while (out.length < n && i < pts.length) {
      const seg = Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y);
      if (acc + seg >= step - 1e-9 && seg > 1e-9) {
        const t = (step - acc) / seg;
        const nx = prev.x + (pts[i].x - prev.x) * t;
        const ny = prev.y + (pts[i].y - prev.y) * t;
        out.push({ x: nx, y: ny });
        prev = { x: nx, y: ny };
        acc = 0;
      } else {
        acc += seg;
        prev = pts[i];
        i++;
      }
    }
    while (out.length < n) out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
    return out;
  }

  /** 保端点的滑动平均平滑 */
  function smoothPoly(pts, passes) {
    let cur = pts;
    for (let p = 0; p < passes; p++) {
      const next = [cur[0]];
      for (let i = 1; i < cur.length - 1; i++) {
        next.push({
          x: (cur[i - 1].x + cur[i].x * 2 + cur[i + 1].x) * 0.25,
          y: (cur[i - 1].y + cur[i].y * 2 + cur[i + 1].y) * 0.25,
        });
      }
      next.push(cur[cur.length - 1]);
      cur = next;
    }
    return cur;
  }

  /**
   * Track：把折线包装成可按弧长采样的轨道。
   * at(s) -> {x, y, tx, ty}（tx/ty 为单位切向）
   */
  function makeTrack(pts) {
    const cum = new Float64Array(pts.length);
    for (let i = 1; i < pts.length; i++) {
      cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    const total = cum[pts.length - 1] || 0;
    const out = { x: 0, y: 0, tx: 1, ty: 0 };
    return {
      pts,
      cum,
      total,
      at(s) {
        s = clamp(s, 0, total);
        let lo = 0,
          hi = pts.length - 1;
        while (lo + 1 < hi) {
          const mid = (lo + hi) >> 1;
          if (cum[mid] <= s) lo = mid;
          else hi = mid;
        }
        const seg = cum[hi] - cum[lo] || 1;
        const t = (s - cum[lo]) / seg;
        out.x = lerp(pts[lo].x, pts[hi].x, t);
        out.y = lerp(pts[lo].y, pts[hi].y, t);
        const dx = pts[hi].x - pts[lo].x,
          dy = pts[hi].y - pts[lo].y;
        const l = Math.hypot(dx, dy) || 1;
        out.tx = dx / l;
        out.ty = dy / l;
        return out;
      },
    };
  }

  /** 点到线段最近距离的平方，并返回参数 t */
  function segClosest(px, py, ax, ay, bx, by) {
    const dx = bx - ax,
      dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 1e-9 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = sat(t);
    const cx = ax + dx * t,
      cy = ay + dy * t;
    return { t, x: cx, y: cy, d2: (px - cx) * (px - cx) + (py - cy) * (py - cy) };
  }

  LL.core = {
    TAU, clamp, sat, lerp, invLerp, remap, smoothstep, smootherstep, damp,
    dist, dist2, angleLerp, ease, makeRng, makeNoise,
    rgb, rgba, mix, polyLength, resample, smoothPoly, makeTrack, segClosest,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = LL.core;
})(typeof window !== 'undefined' ? window : globalThis);
