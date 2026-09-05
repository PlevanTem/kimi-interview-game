/**
 * fx.js — 粒子、辉光合成与后期
 *
 * 辉光用半分辨率离屏画布 + 两次 'lighter' 放大合成，
 * 比逐帧模糊便宜，且在关闭特效时游戏状态依然完整可读。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const C = LL.core;
  const { clamp, lerp, sat, rgba, TAU } = C;

  function createFx(seed) {
    const rng = C.makeRng(seed ^ 0x51);
    const noise = C.makeNoise(seed + 7);
    const parts = [];
    const rings = [];
    const motes = [];
    let shakeAmp = 0, shakeT = 0;
    let flash = 0, flashColor = '#ffffff';

    let glow = null, gctx = null, glowScale = 0.5;

    function ensureGlow(W, H, dpr, quality) {
      glowScale = quality > 1 ? 0.5 : 0.34;
      const gw = Math.max(2, Math.round(W * glowScale));
      const gh = Math.max(2, Math.round(H * glowScale));
      if (!glow) {
        glow = document.createElement('canvas');
        gctx = glow.getContext('2d');
      }
      if (glow.width !== gw || glow.height !== gh) {
        glow.width = gw;
        glow.height = gh;
      }
      gctx.setTransform(glowScale, 0, 0, glowScale, 0, 0);
      gctx.clearRect(0, 0, W, H);
      return gctx;
    }

    function compositeGlow(ctx, W, H, strength) {
      if (!glow) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.72 * strength;
      ctx.drawImage(glow, 0, 0, W, H);
      ctx.globalAlpha = 0.5 * strength;
      ctx.drawImage(glow, -W * 0.012, -H * 0.012, W * 1.024, H * 1.024);
      ctx.globalAlpha = 0.28 * strength;
      ctx.drawImage(glow, -W * 0.035, -H * 0.035, W * 1.07, H * 1.07);
      ctx.restore();
    }

    /* ------------------------------------------------------------ 粒子 */

    function emit(type, x, y, o) {
      o = o || {};
      const n = o.count || 1;
      for (let i = 0; i < n; i++) {
        const ang = o.angle != null ? o.angle + (rng() - 0.5) * (o.spread || 0.6) : rng() * TAU;
        const spd = (o.speed || 60) * (0.5 + rng());
        parts.push({
          type, x: x + (rng() - 0.5) * (o.jitter || 0), y: y + (rng() - 0.5) * (o.jitter || 0),
          vx: Math.cos(ang) * spd + (o.vx || 0), vy: Math.sin(ang) * spd + (o.vy || 0),
          life: 0, max: (o.life || 0.8) * (0.7 + rng() * 0.6),
          r: (o.r || 2) * (0.6 + rng() * 0.8),
          g: o.gravity == null ? 40 : o.gravity,
          drag: o.drag == null ? 1.6 : o.drag,
          color: o.color || '#ffffff',
          glow: o.glow !== false,
          spin: (rng() - 0.5) * 6,
          rot: rng() * TAU,
        });
      }
      if (parts.length > 1400) parts.splice(0, parts.length - 1400);
    }

    function ring(x, y, r0, r1, dur, color, width) {
      rings.push({ x, y, r0, r1, t: 0, dur, color, width: width || 2 });
    }

    function shake(amount) { shakeAmp = Math.min(26, shakeAmp + amount); }
    function screenFlash(a, color) { flash = Math.max(flash, a); flashColor = color || '#ffffff'; }

    /** 环境浮尘：跟随相机的稀疏尘埃，给空间一个尺度参照 */
    function updateMotes(dt, cam, W, H, pal, quality) {
      const target = quality > 1 ? 110 : quality > 0 ? 60 : 0;
      while (motes.length < target) {
        motes.push({
          x: cam.x + (rng() - 0.5) * W * 1.6,
          y: cam.y + (rng() - 0.5) * H * 1.6,
          z: 0.35 + rng() * 0.9,
          r: 0.6 + rng() * 1.8,
          ph: rng() * TAU,
        });
      }
      while (motes.length > target) motes.pop();
      for (const m of motes) {
        m.x += (12 + m.z * 26) * dt * -1 + noise.fbm(m.ph + cam.t * 0.2, 2) * 12 * dt;
        m.y += Math.sin(cam.t * 0.6 + m.ph) * 9 * dt;
        const dx = m.x - cam.x, dy = m.y - cam.y;
        if (dx < -W * 0.9) m.x = cam.x + W * 0.9;
        if (dx > W * 0.9) m.x = cam.x - W * 0.9;
        if (dy < -H * 0.9) m.y = cam.y + H * 0.9;
        if (dy > H * 0.9) m.y = cam.y - H * 0.9;
      }
    }

    function update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy = p.vy * k + p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].t += dt;
        if (rings[i].t >= rings[i].dur) rings.splice(i, 1);
      }
      shakeAmp = Math.max(0, shakeAmp - dt * 42);
      shakeT += dt * 42;
      flash = Math.max(0, flash - dt * 2.6);
    }

    function shakeOffset(reduceMotion) {
      if (reduceMotion || shakeAmp < 0.05) return { x: 0, y: 0 };
      return {
        x: Math.sin(shakeT * 1.7) * shakeAmp * 0.7,
        y: Math.cos(shakeT * 2.3) * shakeAmp * 0.5,
      };
    }

    /** 世界空间粒子绘制；tf 是 world->screen 变换函数 */
    function drawParticles(ctx, gctx2, tf, zoom) {
      for (const p of parts) {
        const u = p.life / p.max;
        const a = p.type === 'shard' ? 1 - u : Math.sin((1 - u) * Math.PI * 0.5);
        const s = tf(p.x, p.y);
        const r = p.r * zoom * (p.type === 'spark' ? 1 - u * 0.5 : 1);
        const target = p.glow && gctx2 ? gctx2 : ctx;
        target.globalAlpha = a * 0.9;
        target.fillStyle = p.color;
        if (p.type === 'shard') {
          target.save();
          target.translate(s.x, s.y);
          target.rotate(p.rot);
          target.fillRect(-r * 2.4, -r * 0.4, r * 4.8, r * 0.8);
          target.restore();
        } else {
          target.beginPath();
          target.arc(s.x, s.y, Math.max(0.4, r), 0, TAU);
          target.fill();
        }
        if (p.glow && gctx2 && p.type !== 'shard') {
          ctx.globalAlpha = a * 0.5;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, Math.max(0.3, r * 0.55), 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (gctx2) gctx2.globalAlpha = 1;
    }

    function drawRings(ctx, gctx2, tf, zoom) {
      const target = gctx2 || ctx;
      for (const r of rings) {
        const u = sat(r.t / r.dur);
        const rad = lerp(r.r0, r.r1, C.ease.outCubic(u)) * zoom;
        const s = tf(r.x, r.y);
        target.globalAlpha = (1 - u) * 0.85;
        target.strokeStyle = r.color;
        target.lineWidth = r.width * zoom * (1 - u * 0.6);
        target.beginPath();
        target.arc(s.x, s.y, rad, 0, TAU);
        target.stroke();
      }
      target.globalAlpha = 1;
    }

    function drawMotes(ctx, tf, zoom, pal, t) {
      ctx.save();
      for (const m of motes) {
        const s = tf(m.x, m.y);
        const a = (0.1 + 0.22 * m.z) * (0.5 + 0.5 * Math.sin(t * 1.4 + m.ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = pal.ember;
        ctx.beginPath();
        ctx.arc(s.x, s.y, m.r * m.z * zoom, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    /** 后期：暗角 + 颗粒 + 闪白 */
    let grainCanvas = null, grainCtx = null, grainSeed = 0;
    function post(ctx, W, H, pal, opts) {
      if (flash > 0.004) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba(flashColor, flash * 0.5);
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      // 暗角
      const vg = ctx.createRadialGradient(W * 0.5, H * 0.52, Math.min(W, H) * 0.28, W * 0.5, H * 0.52, Math.max(W, H) * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,' + (opts.contrast ? 0.72 : 0.55) + ')');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      if (opts.grain && pal.grain > 0.001) {
        if (!grainCanvas) {
          grainCanvas = document.createElement('canvas');
          grainCanvas.width = 128; grainCanvas.height = 128;
          grainCtx = grainCanvas.getContext('2d');
        }
        if ((grainSeed++ & 1) === 0) {
          const img = grainCtx.createImageData(128, 128);
          const d = img.data;
          for (let i = 0; i < d.length; i += 4) {
            const v = 128 + (Math.random() - 0.5) * 190;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 255;
          }
          grainCtx.putImageData(img, 0, 0);
        }
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = pal.grain;
        const p = ctx.createPattern(grainCanvas, 'repeat');
        ctx.fillStyle = p;
        ctx.translate((Math.random() * 128) | 0, (Math.random() * 128) | 0);
        ctx.fillRect(-128, -128, W + 256, H + 256);
        ctx.restore();
      }
    }

    function clear() { parts.length = 0; rings.length = 0; shakeAmp = 0; flash = 0; }

    return {
      emit, ring, shake, screenFlash, update, updateMotes, shakeOffset,
      drawParticles, drawRings, drawMotes, post, ensureGlow, compositeGlow, clear,
      get count() { return parts.length; },
    };
  }

  LL.createFx = createFx;
})(typeof window !== 'undefined' ? window : globalThis);
