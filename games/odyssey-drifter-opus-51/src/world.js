/**
 * world.js — 程序化关卡：呼吸的城市断层、锚点与记忆物
 *
 * 关卡不是关卡数据表，而是一次生成函数。四个区各有自己的
 * 间距、落差、锚点密度与漂移强度，对应吸气 / 屏息 / 呼气 / 静止。
 * 分叉路线不需要图结构：两条路线同时存在，玩家的线落到哪里就走哪里。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const C = LL.core;
  const { clamp, lerp, sat, rgba, mix, TAU } = C;

  const DISTRICTS = [
    { id: 'rift',  spans: 5, gap: [230, 320], drop: [-70, 70],   anchors: [1, 2], orbit: 0.0,  drift: [4, 16],  rest: [2, 4] },
    { id: 'press', spans: 6, gap: [290, 415], drop: [-150, 130], anchors: [1, 3], orbit: 0.75, drift: [14, 40], rest: [2, 5] },
    { id: 'echo',  spans: 6, gap: [320, 470], drop: [-190, 170], anchors: [2, 3], orbit: 0.35, drift: [8, 28],  rest: [2, 5] },
    { id: 'dawn',  spans: 4, gap: [250, 360], drop: [-90, 60],   anchors: [1, 2], orbit: 0.1,  drift: [2, 7],   rest: [1, 3] },
  ];

  const MEMORIES = ['chair', 'door', 'lamp', 'bench', 'cradle', 'window'];

  function createWorld(seed) {
    const rng = C.makeRng(seed);
    const noise = C.makeNoise(seed + 91);
    const platforms = [];
    const anchors = [];
    let nextId = 0;
    let cursorX = 0, cursorY = 0, endlessLevel = 0;

    function addPlatform(o) {
      const p = Object.assign({
        id: nextId++, bx: 0, by: 0, w: 300, cx: 0, cy: 0,
        ax: 0, ay: 0, fx: 0.3, fy: 0.22, ph: rng() * TAU,
        district: 0, rest: false, memory: null, terminal: false, seedHash: rng() * 1000,
        alt: false, visited: false,
      }, o);
      platforms.push(p);
      return p;
    }

    function addAnchor(x, y, orbit) {
      const a = {
        bx: x, by: y, x, y, r: 5.5 + rng() * 2.5,
        orbit: orbit * (28 + rng() * 46), spd: 0.28 + rng() * 0.5, ph: rng() * TAU,
        taken: false, takenAt: 0, pulse: 0, district: 0,
      };
      anchors.push(a);
      return a;
    }

    /** 生成一个区；返回该区的 x 结束位置 */
    function buildDistrict(di, difficulty) {
      const D = DISTRICTS[di];
      const scale = 1 + difficulty * 0.16;
      for (let s = 0; s < D.spans; s++) {
        const gap = lerp(D.gap[0], D.gap[1], rng()) * scale;
        const drop = lerp(D.drop[0], D.drop[1], rng()) * scale;
        const isRest = (s + 1) % (D.rest[0] + Math.floor(rng() * (D.rest[1] - D.rest[0] + 1))) === 0 || s === D.spans - 1;

        // 锚点撒在断口之间
        const na = D.anchors[0] + Math.floor(rng() * (D.anchors[1] - D.anchors[0] + 1));
        for (let i = 0; i < na; i++) {
          const u = (i + 0.6 + rng() * 0.5) / (na + 0.4);
          const ax = cursorX + gap * u;
          const ay = cursorY + drop * u - lerp(50, 190, rng()) + (rng() < 0.32 ? 120 : 0);
          const an = addAnchor(ax, ay, D.orbit);
          an.district = di;
        }

        // 分叉：回声桥群提供「快而紧」与「慢而有记忆」两条合法路线。
        // 慢路必须完整落在断口内部（左右都留出空间），否则它会挡住主路，
        // 把「二选一」变成「唯一一条走不通的路」。
        if (D.id === 'echo' && s % 2 === 1 && gap >= 400) {
          const altW = clamp(gap * 0.44, 190, 270);
          const altX = cursorX + gap * 0.24;
          const alt = addPlatform({
            bx: altX, by: cursorY + drop * 0.5 + 160 + rng() * 70,
            w: altW, district: di, alt: true,
            memory: MEMORIES[Math.floor(rng() * MEMORIES.length)],
            ax: lerp(D.drift[0], D.drift[1], rng()) * 0.4, ay: lerp(D.drift[0], D.drift[1], rng()) * 0.6,
            fx: 0.12 + rng() * 0.2, fy: 0.16 + rng() * 0.24,
          });
          alt.hint = '慢路';
          // 一个锚点吊在慢路与主路之间，让回到主路是有解的
          addAnchor(altX + altW + gap * 0.12, alt.by - 150 - rng() * 60, D.orbit);
        }

        cursorX += gap;
        cursorY = clamp(cursorY + drop, -420, 380);
        const w = isRest ? 340 + rng() * 170 : 210 + rng() * 190;
        const p = addPlatform({
          bx: cursorX, by: cursorY, w, district: di, rest: isRest,
          ax: lerp(D.drift[0], D.drift[1], rng()),
          ay: lerp(D.drift[0], D.drift[1], rng()) * 1.35,
          fx: 0.1 + rng() * 0.3, fy: 0.14 + rng() * 0.32,
        });
        if (isRest && rng() < 0.72) p.memory = MEMORIES[Math.floor(rng() * MEMORIES.length)];
        cursorX += w;
      }
      return cursorX;
    }

    function build() {
      platforms.length = 0;
      anchors.length = 0;
      nextId = 0;
      cursorX = 0; cursorY = 0; endlessLevel = 0;
      // 起始平台：足够长，容纳前 30 秒教学
      addPlatform({ bx: -520, by: 0, w: 900, district: 0, rest: true, ax: 3, ay: 6, fx: 0.12, fy: 0.16 });
      cursorX = 380;
      for (let d = 0; d < DISTRICTS.length; d++) buildDistrict(d, 0);
      // 终台：静止、宽、无漂移
      cursorX += 300;
      const term = addPlatform({ bx: cursorX, by: cursorY - 40, w: 620, district: 3, rest: true, terminal: true, ax: 0, ay: 0 });
      term.memory = 'door';
      addAnchor(cursorX - 150, cursorY - 230, 0);
      return { platforms, anchors };
    }

    /** 通关后的无尽回响：继续追加断层 */
    function extend() {
      endlessLevel++;
      const last = platforms[platforms.length - 1];
      cursorX = last.bx + last.w + 240;
      cursorY = clamp(last.by, -300, 260);
      buildDistrict(2, endlessLevel);
      buildDistrict(1, endlessLevel);
      return endlessLevel;
    }

    /** 每帧更新呼吸位移 */
    function update(t, breathScale, motionScale) {
      const m = motionScale == null ? 1 : motionScale;
      for (const p of platforms) {
        p.cx = Math.sin(t * p.fx + p.ph) * p.ax * breathScale * m;
        p.cy = Math.sin(t * p.fy + p.ph * 1.7) * p.ay * breathScale * m;
      }
      for (const a of anchors) {
        a.x = a.bx + Math.cos(t * a.spd + a.ph) * a.orbit * m;
        a.y = a.by + Math.sin(t * a.spd * 1.31 + a.ph) * a.orbit * 0.62 * m;
        if (a.pulse > 0) a.pulse = Math.max(0, a.pulse - 0.03);
      }
    }

    const left = (p) => p.bx + p.cx;
    const right = (p) => p.bx + p.cx + p.w;
    const top = (p) => p.by + p.cy;

    /** 找到包含世界 x 且顶面在 y 附近的平台 */
    function platformAt(x, y, tol, exclude) {
      let best = null, bd = tol;
      for (const p of platforms) {
        if (p === exclude) continue;
        if (x < left(p) - 6 || x > right(p) + 6) continue;
        const d = Math.abs(top(p) - y);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }

    /** 距离给定点最近的可落脚表面点（用于终点吸附） */
    function nearestLanding(x, y, maxDist) {
      let best = null, bd = maxDist;
      for (const p of platforms) {
        const cx = clamp(x, left(p) + 8, right(p) - 8);
        const cy = top(p);
        const d = Math.hypot(cx - x, cy - y);
        if (d < bd) { bd = d; best = { x: cx, y: cy, platform: p }; }
      }
      return best;
    }

    function reset() {
      for (const a of anchors) { a.taken = false; a.pulse = 0; }
      for (const p of platforms) p.visited = false;
    }

    /* ------------------------------------------------------------ 绘制 */

    function jag(h, i) { return (noise.n1(i * 2.3 + h) * 0.5 + 0.5); }

    function drawPlatform(ctx, gctx, p, pal, t, zoom, opts) {
      const x = left(p), y = top(p), w = p.w;
      const body = mix(pal.near, '#000000', 0.35);
      const face = mix(pal.mid, '#000000', 0.45);

      // 底部的暗影让平台真的悬在空中，而不是贴在背景城市上。
      // 用径向渐变，四周都要软，否则会在夜空里留下一个硬边黑块。
      const cx0 = x + w / 2, cy0 = y + 46, rad = Math.max(w * 0.72, 150);
      const sh = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, rad);
      sh.addColorStop(0, 'rgba(0,0,0,0.55)');
      sh.addColorStop(0.55, 'rgba(0,0,0,0.24)');
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.translate(cx0, cy0);
      ctx.scale(1, 0.62);
      ctx.translate(-cx0, -cy0);
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.arc(cx0, cy0, rad, 0, TAU);
      ctx.fill();
      ctx.restore();

      // 主体 + 破碎的底缘
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + 26);
      const steps = Math.max(5, Math.floor(w / 34));
      for (let i = steps; i >= 0; i--) {
        const u = i / steps;
        const jx = x + u * w;
        const jy = y + 26 + jag(p.seedHash, i) * (54 + (p.terminal ? 20 : 0)) + Math.sin(u * 9 + p.seedHash) * 10;
        ctx.lineTo(jx, jy);
      }
      ctx.lineTo(x, y + 26);
      ctx.closePath();
      ctx.fill();

      // 侧立面窗格（把平台读成建筑顶，而不是抽象方块）
      if (opts.quality > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y + 6, w, 44);
        ctx.clip();
        ctx.fillStyle = face;
        ctx.fillRect(x, y + 6, w, 44);
        ctx.fillStyle = pal.windowLight;
        const cols = Math.max(2, Math.floor(w / 26));
        for (let i = 0; i < cols; i++) {
          const k = jag(p.seedHash + 5, i);
          if (k < 0.62) continue;
          ctx.globalAlpha = 0.06 + k * 0.16;
          ctx.fillRect(x + i * (w / cols) + 5, y + 14, w / cols - 12, 18);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // 悬垂钢筋
      ctx.strokeStyle = body;
      ctx.lineWidth = 1.7;
      for (let i = 0; i < 4; i++) {
        const k = jag(p.seedHash + 9, i);
        if (k < 0.45) continue;
        const rx = x + k * w;
        const sag = 30 + k * 70;
        ctx.beginPath();
        ctx.moveTo(rx, y + 40);
        ctx.quadraticCurveTo(rx + 6, y + 40 + sag, rx + 16 * (k - 0.5), y + 40 + sag * 1.5);
        ctx.stroke();
      }

      // 顶面：一道细的受光边，是「可承重」的唯一视觉承诺。
      // 下面压一道暗线，保证在亮天空下也分得出台面和背景。
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = Math.max(1, 2.2 * zoom);
      ctx.beginPath(); ctx.moveTo(x, y + 1.4); ctx.lineTo(x + w, y + 1.4); ctx.stroke();
      const edgeA = p.terminal ? 0.9 : 0.42;
      ctx.strokeStyle = rgba(pal.accent, edgeA);
      ctx.lineWidth = Math.max(1, 1.6 * zoom);
      ctx.beginPath(); ctx.moveTo(x, y - 0.5); ctx.lineTo(x + w, y - 0.5); ctx.stroke();
      if (gctx) {
        gctx.strokeStyle = rgba(pal.accent, p.terminal ? 0.5 : 0.16);
        gctx.lineWidth = 5 * zoom;
        gctx.beginPath(); gctx.moveTo(x, y); gctx.lineTo(x + w, y); gctx.stroke();
      }

      // 断口端点：光头所在，玩家从这里起手
      for (const ex of [x, x + w]) {
        ctx.fillStyle = rgba(pal.glow, 0.55);
        ctx.beginPath(); ctx.arc(ex, y, 2.2 * zoom, 0, TAU); ctx.fill();
      }

      if (p.memory) drawMemory(ctx, gctx, p, pal, t, zoom, opts);
    }

    /** 记忆物：只有停下来才看得清的人类痕迹 */
    function drawMemory(ctx, gctx, p, pal, t, zoom, opts) {
      const vis = p.memoryVis == null ? 0 : p.memoryVis;
      if (vis < 0.02) return;
      const x = left(p) + p.w * 0.72, y = top(p);
      ctx.save();
      ctx.globalAlpha = vis;
      ctx.strokeStyle = mix(pal.near, '#000000', 0.2);
      ctx.fillStyle = mix(pal.near, '#000000', 0.2);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      const K = p.memory;
      ctx.translate(x, y);
      if (K === 'chair') {
        ctx.beginPath();
        ctx.moveTo(-9, 0); ctx.lineTo(-9, -14); ctx.lineTo(9, -14); ctx.lineTo(9, 0);
        ctx.moveTo(-9, -14); ctx.lineTo(-11, -32); ctx.moveTo(-11, -26); ctx.lineTo(2, -24);
        ctx.stroke();
      } else if (K === 'door') {
        ctx.beginPath();
        ctx.moveTo(-14, 0); ctx.lineTo(-14, -40); ctx.lineTo(14, -40); ctx.lineTo(14, 0);
        ctx.stroke();
        ctx.globalAlpha = vis * 0.28;
        const g = ctx.createLinearGradient(0, -40, 0, 0);
        g.addColorStop(0, rgba(pal.glow, 0.6));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-13, -39, 26, 39);
      } else if (K === 'lamp') {
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, -44); ctx.quadraticCurveTo(0, -52, 12, -52);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(13, -50, 3.4, 0, TAU); ctx.fill();
        if (gctx) {
          gctx.globalAlpha = vis * 0.5;
          const lg = gctx.createRadialGradient(x + 13, y - 50, 0, x + 13, y - 50, 46);
          lg.addColorStop(0, rgba(pal.windowLight, 0.5));
          lg.addColorStop(1, 'rgba(0,0,0,0)');
          gctx.fillStyle = lg;
          gctx.beginPath(); gctx.arc(x + 13, y - 50, 46, 0, TAU); gctx.fill();
          gctx.globalAlpha = 1;
        }
      } else if (K === 'bench') {
        ctx.beginPath();
        ctx.moveTo(-20, -12); ctx.lineTo(20, -12);
        ctx.moveTo(-16, -12); ctx.lineTo(-16, 0); ctx.moveTo(16, -12); ctx.lineTo(16, 0);
        ctx.moveTo(-20, -20); ctx.lineTo(20, -20);
        ctx.stroke();
      } else if (K === 'cradle') {
        ctx.beginPath();
        ctx.moveTo(-14, -18); ctx.quadraticCurveTo(0, -2, 14, -18);
        ctx.moveTo(-14, -18); ctx.lineTo(-14, -30); ctx.moveTo(14, -18); ctx.lineTo(14, -30);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.rect(-16, -34, 32, 30);
        ctx.moveTo(0, -34); ctx.lineTo(0, -4); ctx.moveTo(-16, -19); ctx.lineTo(16, -19);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawAnchor(ctx, gctx, a, pal, t, zoom, near) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.9 + a.ph);
      const r = a.r * zoom;
      const active = a.taken;
      // 形状语言：未借 = 空心六角；已借 = 实心 + 外环（不依赖颜色）
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(t * 0.22 + a.ph);
      ctx.strokeStyle = rgba(pal.glow, active ? 0.9 : 0.42 + pulse * 0.24 + near * 0.3);
      ctx.lineWidth = Math.max(0.9, 1.5 * zoom);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * TAU;
        const px = Math.cos(ang) * r * 1.5, py = Math.sin(ang) * r * 1.5;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      if (active) {
        ctx.fillStyle = rgba(pal.glow, 0.75);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.66, 0, TAU); ctx.fill();
      }
      ctx.restore();
      if (gctx) {
        gctx.globalAlpha = active ? 0.75 : 0.28 + pulse * 0.16 + near * 0.4;
        const g = gctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, r * (active ? 8 : 5));
        g.addColorStop(0, rgba(pal.glow, 0.7));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        gctx.fillStyle = g;
        gctx.beginPath(); gctx.arc(a.x, a.y, r * (active ? 8 : 5), 0, TAU); gctx.fill();
        gctx.globalAlpha = 1;
      }
    }

    return {
      platforms, anchors, build, extend, update, reset,
      left, right, top, platformAt, nearestLanding,
      drawPlatform, drawAnchor, drawMemory, DISTRICTS,
      get endlessLevel() { return endlessLevel; },
      get endX() { return platforms.length ? right(platforms[platforms.length - 1]) : 0; },
    };
  }

  LL.createWorld = createWorld;
})(typeof window !== 'undefined' ? window : globalThis);
