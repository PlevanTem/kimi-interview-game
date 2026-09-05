/**
 * backdrop.js — 全程序化城市与天空
 *
 * 没有一张位图。天空、极光、星、五层城市剪影、深渊雾与前景遮挡
 * 全部由确定性哈希 + 噪声在运行时生成，因此城市无限长且每次一致。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const C = LL.core;
  const { clamp, lerp, sat, rgba, mix, TAU } = C;

  /** 与 i 相关的确定性伪随机，避免为无限城市保存数组 */
  function hash(i, salt) {
    let h = Math.imul(i ^ (salt * 0x9e3779b9), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  const LAYERS = [
    // depth 越小越远；city 层用 horizon 定位地平线，heightScale 控制体量
    { depth: 0.055, key: 'far',  span: 190, hMin: 120, hMax: 430, horizon: 0.30, alpha: 0.42, win: 0.030, salt: 11 },
    { depth: 0.115, key: 'far',  span: 155, hMin: 150, hMax: 520, horizon: 0.38, alpha: 0.62, win: 0.038, salt: 29 },
    { depth: 0.235, key: 'mid',  span: 230, hMin: 190, hMax: 640, horizon: 0.50, alpha: 0.85, win: 0.046, salt: 47 },
    { depth: 0.44,  key: 'mid',  span: 320, hMin: 240, hMax: 760, horizon: 0.66, alpha: 1.0,  win: 0.050, salt: 73 },
    { depth: 0.72,  key: 'near', span: 460, hMin: 320, hMax: 980, horizon: 0.86, alpha: 1.0,  win: 0.026, salt: 101 },
  ];

  function createBackdrop(seed) {
    const noise = C.makeNoise(seed);
    const starSalt = 917;

    /** 天空：三段垂直渐变 + 地平线辉光 */
    function sky(ctx, W, H, pal, cam) {
      const shift = clamp(cam.y * 0.06, -H * 0.25, H * 0.25);
      const g = ctx.createLinearGradient(0, -shift, 0, H - shift);
      g.addColorStop(0, pal.skyTop);
      g.addColorStop(0.46, pal.skyMid);
      g.addColorStop(0.82, pal.skyLow);
      g.addColorStop(1, mix(pal.skyLow, pal.near, 0.75));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // 地平线辉光（黎明方向永远在右侧 = 阿迦追逐的方向）
      const gy = H * 0.62 - shift;
      const rg = ctx.createRadialGradient(W * 0.9, gy, 0, W * 0.9, gy, H * 1.1);
      rg.addColorStop(0, rgba(pal.accent, 0.16));
      rg.addColorStop(0.4, rgba(pal.accent, 0.05));
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }

    function stars(ctx, W, H, pal, cam, t, quality) {
      const n = quality < 1 ? 90 : 170;
      const ox = -cam.x * 0.015;
      const oy = -cam.y * 0.03;
      ctx.save();
      for (let i = 0; i < n; i++) {
        const sx = ((hash(i, starSalt) * 4200 + ox) % 4200 + 4200) % 4200 - 200;
        if (sx < -20 || sx > W + 20) continue;
        const sy = hash(i, starSalt + 1) * H * 0.7 + oy * (0.4 + hash(i, starSalt + 5) * 0.6);
        if (sy < -10 || sy > H) continue;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.7 + hash(i, starSalt + 2) * 1.7) + i));
        const r = 0.6 + hash(i, starSalt + 3) * 1.5;
        ctx.globalAlpha = tw * 0.75;
        ctx.fillStyle = i % 7 === 0 ? pal.accent : '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    /** 极光带：叠加混合的正弦缎带，代表城市未完成的那口气 */
    function aurora(ctx, W, H, pal, cam, t, intensity) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bands = 3;
      for (let b = 0; b < bands; b++) {
        const yBase = H * (0.16 + b * 0.11) - cam.y * 0.02;
        const amp = 26 + b * 18;
        const spd = 0.09 + b * 0.045;
        const alpha = (0.055 - b * 0.012) * intensity;
        const grad = ctx.createLinearGradient(0, yBase - amp * 2, 0, yBase + amp * 2.4);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, rgba(b === 1 ? pal.glow : pal.accent, alpha));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        const step = 44;
        ctx.moveTo(-40, yBase);
        for (let x = -40; x <= W + 40; x += step) {
          const u = (x - cam.x * 0.03) * 0.0016;
          const y = yBase + noise.fbm(u * 3 + t * spd + b * 9, 3) * amp + Math.sin(u * 5 + t * spd * 2) * amp * 0.4;
          ctx.lineTo(x, y);
        }
        for (let x = W + 40; x >= -40; x -= step) {
          const u = (x - cam.x * 0.03) * 0.0016;
          const y = yBase + noise.fbm(u * 3 + t * spd + b * 9, 3) * amp + Math.sin(u * 5 + t * spd * 2) * amp * 0.4;
          ctx.lineTo(x, y + 44 + b * 26);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    /** 单层城市：确定性生成塔楼、退台、天线与窗格 */
    function cityLayer(ctx, W, H, pal, cam, t, L, breath, quality) {
      const ox = -cam.x * L.depth;
      const oy = -cam.y * L.depth * 0.55;
      const baseY = H * L.horizon + oy;
      // 大气透视：越远越靠近天空色，越近越沉进黑
      const color = mix(pal[L.key], L.depth < 0.5 ? pal.skyMid : '#000000',
        L.depth < 0.5 ? (1 - L.depth * 2) * 0.42 : (L.depth - 0.5) * 0.55);
      const i0 = Math.floor((-ox - 400) / L.span);
      const i1 = Math.ceil((-ox + W + 400) / L.span);
      ctx.save();
      ctx.globalAlpha = L.alpha;

      for (let i = i0; i <= i1; i++) {
        const r0 = hash(i, L.salt);
        const r1 = hash(i, L.salt + 1);
        const r2 = hash(i, L.salt + 2);
        const r3 = hash(i, L.salt + 3);
        if (r3 < 0.1) continue; // 断层：城市有缺口
        const x = i * L.span + ox + r1 * L.span * 0.28;
        const w = L.span * (0.42 + r0 * 0.5);
        // 呼吸：整座城市在缓慢升沉，越远越轻
        const bob = noise.fbm(i * 0.31 + t * 0.13, 2) * 26 * breath * (0.35 + L.depth);
        const h = lerp(L.hMin, L.hMax, r2 * r2) * (0.85 + breath * 0.15);
        const y = baseY - h + bob;

        ctx.fillStyle = mix(color, r1 > 0.5 ? pal.skyMid : '#000000', Math.abs(r1 - 0.5) * 0.22);
        ctx.beginPath();
        // 主体 + 退台
        if (r0 > 0.62) {
          const step1 = h * (0.42 + r1 * 0.2);
          const inset = w * (0.12 + r2 * 0.16);
          ctx.rect(x, y + step1, w, h - step1);
          ctx.rect(x + inset, y, w - inset * 2, step1 + 2);
        } else {
          ctx.rect(x, y, w, h + 800);
        }
        ctx.fill();

        // 天线 / 塔尖
        if (r3 > 0.82 && L.depth > 0.1) {
          const ax = x + w * (0.3 + r0 * 0.4);
          ctx.fillRect(ax - 1.2, y - 30 - r2 * 70, 2.4, 34 + r2 * 70);
          if (r1 > 0.5) {
            ctx.globalAlpha = L.alpha * (0.5 + 0.5 * Math.sin(t * 2 + i));
            ctx.fillStyle = pal.accent;
            ctx.beginPath();
            ctx.arc(ax, y - 30 - r2 * 70, 1.9, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = L.alpha;
            ctx.fillStyle = mix(color, '#000000', 0.1);
          }
        }

        // 窗格：只有少数楼层还亮着，窗光是点缀而不是纹理
        if (quality > 0 && L.win > 0.005) {
          const cw = 10 + L.depth * 18;
          const rh = 15 + L.depth * 24;
          const cols = Math.max(1, Math.floor(w / cw));
          const rows = Math.max(2, Math.floor(h / rh));
          const colW = w / cols;
          const ww = Math.max(1, Math.min(3.2, cw * 0.22));
          const wh = Math.max(1, Math.min(3.6, rh * 0.2));
          ctx.fillStyle = pal.windowLight;
          for (let ry = 0; ry < rows; ry++) {
            if (hash(i * 131 + ry, L.salt + 3) > 0.15) continue;   // 熄灭的楼层
            for (let cx = 0; cx < cols; cx++) {
              const k = hash(i * 991 + cx * 37 + ry * 7, L.salt + 7);
              if (k > L.win * 5) continue;
              ctx.globalAlpha = L.alpha * (0.04 + k * 2.2) * (0.24 + L.depth * 0.5);
              ctx.fillRect(x + cx * colW + cw * 0.34, y + ry * rh + rh * 0.34, ww, wh);
            }
          }
          ctx.globalAlpha = L.alpha;
        }
      }

      // 层间雾：制造大气透视
      const fogY = baseY - 40;
      const fg = ctx.createLinearGradient(0, fogY - 220, 0, fogY + 120);
      fg.addColorStop(0, 'rgba(0,0,0,0)');
      fg.addColorStop(1, rgba(pal.fog, 0.22 * (1 - L.depth)));
      ctx.globalAlpha = 1;
      ctx.fillStyle = fg;
      ctx.fillRect(0, fogY - 220, W, 340);
      ctx.restore();
    }

    /** 光柱：从黎明方向斜切下来的体积光，给空旷的天空一个方向 */
    function shafts(ctx, W, H, pal, cam, t, intensity) {
      if (intensity <= 0.01) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ox = W * 0.88 - cam.x * 0.02;
      const oy = -H * 0.35 - cam.y * 0.02;
      for (let i = 0; i < 5; i++) {
        const a = -1.02 + i * 0.085 + Math.sin(t * 0.11 + i * 2.1) * 0.022;
        const wdt = (42 + i * 26) * (0.8 + 0.2 * Math.sin(t * 0.31 + i));
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(a);
        const gd = ctx.createLinearGradient(0, 0, 0, H * 2.1);
        gd.addColorStop(0, rgba(pal.glow, 0.05 * intensity));
        gd.addColorStop(0.42, rgba(pal.accent, 0.026 * intensity));
        gd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gd;
        ctx.beginPath();
        ctx.moveTo(-wdt * 0.25, 0);
        ctx.lineTo(wdt * 0.25, 0);
        ctx.lineTo(wdt * 1.5, H * 2.1);
        ctx.lineTo(-wdt * 1.5, H * 2.1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    /** 深渊：平台之下没有地面，只有缓慢流动的雾与余光沉积 */
    function abyss(ctx, W, H, pal, cam, t, worldToScreenY) {
      const top = worldToScreenY(240);
      if (top > H) return;
      ctx.save();
      const g = ctx.createLinearGradient(0, top, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.18, rgba(mix(pal.near, '#000000', 0.4), 0.55));
      g.addColorStop(0.5, rgba('#000000', 0.86));
      g.addColorStop(1, '#000000');
      ctx.fillStyle = g;
      ctx.fillRect(0, Math.max(0, top), W, H - Math.max(0, top));

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const ph = i * 1.7;
        const y = top + 60 + i * 88 + Math.sin(t * 0.22 + ph) * 26;
        if (y > H + 60) continue;
        const x = -cam.x * (0.3 + i * 0.06) + Math.sin(t * 0.13 + ph) * 120;
        const w = 620 + i * 180;
        const gg = ctx.createLinearGradient(0, y - 40, 0, y + 40);
        gg.addColorStop(0, 'rgba(0,0,0,0)');
        gg.addColorStop(0.5, rgba(pal.accent, 0.028));
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(((x % w) + w) % w - w, y - 40, W + w * 2, 80);
      }
      ctx.restore();
    }

    /** 前景：模糊的缆线与断梁，只负责景深与构图 */
    function foreground(ctx, W, H, pal, cam, t, quality) {
      if (quality < 1) return;
      const canBlur = typeof ctx.filter === 'string';
      ctx.save();
      if (canBlur) ctx.filter = 'blur(16px)';
      ctx.fillStyle = 'rgba(0,0,0,0.58)';
      ctx.strokeStyle = 'rgba(0,0,0,0.62)';
      const d = 1.75;
      const ox = -cam.x * d;
      const oy = -cam.y * d * 0.35;
      const span = 1400;
      const i0 = Math.floor((-ox - span) / span);
      const i1 = Math.ceil((-ox + W + span) / span);
      for (let i = i0; i <= i1; i++) {
        const r0 = hash(i, 211), r1 = hash(i, 212), r2 = hash(i, 213);
        if (r0 < 0.58) continue;
        const x = i * span + ox + r1 * span * 0.5;
        // 悬垂缆线
        ctx.lineWidth = 5 + r2 * 9;
        ctx.beginPath();
        const y0 = -40 + oy;
        ctx.moveTo(x - 400, y0);
        ctx.quadraticCurveTo(x, y0 + 150 + r0 * 220 + Math.sin(t * 0.5 + i) * 12, x + 420, y0 + r2 * 60);
        ctx.stroke();
        // 断梁
        if (r2 > 0.78) {
          const bx = x + 180, by = H + oy * 0.2 - 30 - r1 * 90;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate((r0 - 0.5) * 0.7);
          ctx.fillRect(-190, 0, 380, 46 + r1 * 40);
          ctx.restore();
        }
      }
      ctx.restore();
    }

    return { sky, stars, aurora, shafts, cityLayer, abyss, foreground, LAYERS, noise, hash };
  }

  LL.createBackdrop = createBackdrop;
})(typeof window !== 'undefined' ? window : globalThis);
