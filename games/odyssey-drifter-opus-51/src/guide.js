/**
 * guide.js — 玩法说明
 *
 * 每一条规则都配一个实时跑的微演示，而不是一张静态插图：
 * 用的是和游戏同一套形状语言与同一份色板，所以说明里长什么样，
 * 场上就长什么样。面板隐藏时不占用任何帧时间。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const C = LL.core;
  const { clamp, sat, lerp, rgba, mix, TAU, ease } = C;

  const W = 268, H = 142;

  /* ------------------------------------------------------- 绘制小工具 */

  /** 一条余光：暗轮廓 + 光晕 + 亮芯，和 lightline.js 的层次一致 */
  function beam(ctx, pts, pal, alpha, width, upto) {
    const n = upto == null ? pts.length : Math.max(2, Math.floor(pts.length * upto));
    const pass = [
      ['#000000', 0.3 * alpha, width * 2.6],
      [pal.accent, 0.18 * alpha, width * 2.2],
      [mix(pal.accent, '#ffffff', 0.55), 0.7 * alpha, width * 1.1],
      ['#ffffff', 0.95 * alpha, Math.max(0.9, width * 0.4)],
    ];
    for (const [col, a, w] of pass) {
      ctx.strokeStyle = col;
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = pts[i];
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function quad(ax, ay, bx, by, cx, cy, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      out.push({
        x: (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * bx + u * u * cx,
        y: (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * by + u * u * cy,
      });
    }
    return out;
  }

  /** 一小段平台：和场上一样是"顶面一道受光边 + 破碎底缘" */
  function ledge(ctx, x, y, w, pal) {
    ctx.fillStyle = mix(pal.near, '#000000', 0.2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - 3, y + 9);
    ctx.lineTo(x + w * 0.62, y + 13);
    ctx.lineTo(x + w * 0.3, y + 8);
    ctx.lineTo(x + 2, y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(pal.accent, 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y - 0.5); ctx.lineTo(x + w, y - 0.5); ctx.stroke();
  }

  /** 极简的阿迦代理：只要能读出"有个人在跑"就够了 */
  function runner(ctx, x, y, phase, pal, scale) {
    const s = scale || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    const sw = Math.sin(phase) * 4.2;
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(0, -14); ctx.lineTo(0, -6);
      ctx.moveTo(0, -6); ctx.lineTo(sw, 0);
      ctx.moveTo(0, -6); ctx.lineTo(-sw, 0);
      ctx.moveTo(0, -12); ctx.lineTo(-sw * 0.8, -8);
      ctx.moveTo(0, -12); ctx.lineTo(sw * 0.8, -8);
      ctx.stroke();
    };
    // 余光打在他身上形成的边缘光：没有它，深色剪影在深色卡片上读不出来
    ctx.strokeStyle = rgba(pal.glow, 0.42);
    ctx.lineWidth = 5.4;
    body();
    ctx.fillStyle = rgba(pal.glow, 0.42);
    ctx.beginPath(); ctx.arc(0, -17.5, 4.5, 0, TAU); ctx.fill();
    const ink = mix(pal.near, '#000000', 0.35);
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 2.6;
    body();
    ctx.beginPath(); ctx.arc(0, -17.5, 3.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function pointer(ctx, x, y, down) {
    ctx.strokeStyle = down ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)';
    ctx.lineWidth = down ? 2 : 1.3;
    ctx.beginPath(); ctx.arc(x, y, down ? 7 : 10, 0, TAU); ctx.stroke();
    ctx.fillStyle = down ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(x, y, down ? 2.8 : 1.8, 0, TAU); ctx.fill();
  }

  function label(ctx, str, x, y, size, color, align) {
    ctx.font = '400 ' + size + 'px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function hexagon(ctx, x, y, r, pal, on) {
    ctx.strokeStyle = rgba(pal.glow, on ? 0.95 : 0.45);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    if (on) {
      ctx.fillStyle = rgba(pal.glow, 0.8);
      ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, TAU); ctx.fill();
    }
  }

  /* ------------------------------------------------------------ 微演示 */

  const CARDS = [
    {
      id: 'action',
      title: '一个动作',
      body: '按住光头 → 移动塑形 → 松开。锚定、张弛、脉冲都从这一次连续动作里长出来，没有第二个技能键。',
      loop: 4.4,
      draw(ctx, t, pal) {
        const ax = 34, ay = 96, cx = 234, cy = 74;
        ledge(ctx, 8, ay, 40, pal);
        ledge(ctx, 224, cy, 40, pal);
        const pts = quad(ax, ay, 134, 128, cx, cy, 40);
        // 0.0–0.5 移到光头 / 0.5–2.1 拖动 / 2.1 松开 / 之后脉冲与通过
        const draggingU = sat((t - 0.5) / 1.6);
        const down = t > 0.5 && t < 2.1;
        if (t < 2.1) {
          if (draggingU > 0.02) beam(ctx, pts, pal, 0.75, 2.4, draggingU);
        } else {
          beam(ctx, pts, pal, 1, 2.6);
          const pu = sat((t - 2.1) / 0.9);
          const head = Math.floor(pu * (pts.length - 1));
          for (let i = Math.max(0, head - 6); i <= head; i++) {
            ctx.globalAlpha = 1 - (head - i) / 7;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[Math.min(i + 1, pts.length - 1)].x, pts[Math.min(i + 1, pts.length - 1)].y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        // 光头脉冲
        if (t < 0.6) {
          ctx.strokeStyle = rgba(pal.glow, 0.5 * (1 - t / 0.6));
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(ax, ay, 4 + t * 22, 0, TAU); ctx.stroke();
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ax, ay, 2.6, 0, TAU); ctx.fill();

        // 跑者
        if (t > 2.5) {
          const ru = sat((t - 2.5) / 1.5);
          const p = pts[Math.floor(ru * (pts.length - 1))];
          runner(ctx, p.x, p.y, t * 14, pal, 0.85);
        } else {
          runner(ctx, 26, ay, t * 6, pal, 0.85);
        }
        // 指针
        const pp = t < 0.5
          ? { x: lerp(120, ax, ease.inOutCubic(t / 0.5)), y: lerp(40, ay, ease.inOutCubic(t / 0.5)) }
          : (t < 2.1 ? pts[Math.floor(draggingU * (pts.length - 1))] : pts[pts.length - 1]);
        pointer(ctx, pp.x, pp.y, down);
        if (t >= 2.1 && t < 2.5) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (1 - (t - 2.1) / 0.4) + ')';
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(pp.x, pp.y, 8 + (t - 2.1) * 90, 0, TAU); ctx.stroke();
        }
        label(ctx, t < 0.5 ? '移到光头' : t < 2.1 ? '按住 · 移动' : '松开', 134, 18, 11,
          'rgba(255,255,255,0.72)', 'center');
      },
    },
    {
      id: 'tension',
      title: '张力是运动',
      body: '张力 = 弦长 ÷ 弧长。松线吸收落势、安全但慢；紧线把下坡换成速度，却承得更少。绕得越远，线越松。',
      loop: 3.2,
      draw(ctx, t, pal) {
        const rows = [
          { y: 34, sag: 46, name: '松', speed: 0.55 },
          { y: 76, sag: 22, name: '稳', speed: 0.85 },
          { y: 118, sag: 3, name: '紧', speed: 1.35 },
        ];
        for (const r of rows) {
          const pts = quad(58, r.y, 150, r.y + r.sag, 246, r.y, 34);
          beam(ctx, pts, pal, 0.9, 2.1);
          const u = sat(((t * r.speed) % 3.2) / 2.2);
          const p = pts[Math.floor(u * (pts.length - 1))];
          if (u < 1) runner(ctx, p.x, p.y, t * 16 * r.speed, pal, 0.62);
          label(ctx, r.name, 44, r.y + 4, 12, 'rgba(255,255,255,0.8)', 'right');
        }
        label(ctx, '同样的两端，不同的走法', 152, 12, 10, 'rgba(255,255,255,0.4)', 'center');
      },
    },
    {
      id: 'anchor',
      title: '借锚',
      body: '线扫过锚点会自动借到它，并被真正拉到锚点上——几何约束是真的。每借一个，这条线能承的弧长 +420。',
      loop: 4.0,
      draw(ctx, t, pal) {
        const ax = 30, ay = 104, ex = 240, ey = 62;
        ledge(ctx, 6, ay, 36, pal);
        ledge(ctx, 232, ey, 34, pal);
        const anchor = { x: 140, y: 44 };
        const on = t > 1.5;
        const cx = on ? 2 * anchor.x - 0.5 * ax - 0.5 * ex : 135;
        const cy = on ? 2 * anchor.y - 0.5 * ay - 0.5 * ey : 128;
        const pts = quad(ax, ay, cx, cy, ex, ey, 40);
        const u = t < 1.5 ? sat(t / 1.4) : 1;
        beam(ctx, pts, pal, 0.95, 2.4, u);
        hexagon(ctx, anchor.x, anchor.y, 7, pal, on);
        if (on && t < 2.1) {
          ctx.strokeStyle = rgba(pal.glow, 1 - (t - 1.5) / 0.6);
          ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 8 + (t - 1.5) * 60, 0, TAU); ctx.stroke();
        }
        // 承载条
        const cap = on ? 1420 : 1000;
        const bw = 132;
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(76, 132); ctx.lineTo(76 + bw, 132); ctx.stroke();
        ctx.strokeStyle = rgba(pal.glow, 0.9);
        ctx.beginPath();
        ctx.moveTo(76, 132);
        ctx.lineTo(76 + bw * (cap / 1420), 132);
        ctx.stroke();
        label(ctx, '承载 ' + cap, 68, 132, 10, 'rgba(255,255,255,0.66)', 'right');
        if (on) label(ctx, '+420', 76 + bw + 6, 132, 10, rgba(pal.glow, 0.9), 'left');
      },
    },
    {
      id: 'overload',
      title: '过载会断',
      body: '负载 = 弧长 ÷ 承载 ×（0.55 + 张力×0.75）。超过 1 的线会起毛，断裂位置在你松手之前就已经画出来了。',
      loop: 4.6,
      draw(ctx, t, pal) {
        const ax = 22, ay = 62, ex = 250, ey = 74;
        ledge(ctx, 4, ay, 30, pal);
        const pts = quad(ax, ay, 136, 84, ex, ey, 48);
        const breakIdx = Math.floor(pts.length * 0.62);
        const snapped = t > 2.9;
        beam(ctx, pts, pal, snapped ? 0.85 : 1, 2.2, snapped ? 0.62 : 1);
        // 起毛
        if (t > 0.8) {
          const a = sat((t - 0.8) / 0.6) * (snapped ? 0.3 : 1);
          ctx.strokeStyle = rgba(pal.glow, 0.55 * a);
          ctx.lineWidth = 1;
          for (let i = breakIdx - 8; i < breakIdx + 8; i++) {
            const p = pts[i]; if (!p) continue;
            const s = i % 2 ? 1 : -1;
            const amp = (4 + Math.abs(Math.sin(i * 2.7 + t * 26)) * 7) * a;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x, p.y + amp * s);
            ctx.stroke();
          }
          if (!snapped) {
            const bp = pts[breakIdx];
            const r = 6 + Math.sin(t * 15) * 1.6;
            ctx.strokeStyle = rgba(pal.glow, 0.85);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bp.x - r, bp.y - r); ctx.lineTo(bp.x + r, bp.y + r);
            ctx.moveTo(bp.x + r, bp.y - r); ctx.lineTo(bp.x - r, bp.y + r);
            ctx.stroke();
          }
        }
        // 跑者：断裂后带着速度变成抛射体
        const ru = sat(t / 2.9) * 0.62;
        if (!snapped) {
          const p = pts[Math.floor(ru * (pts.length - 1))];
          runner(ctx, p.x, p.y, t * 18, pal, 0.72);
        } else {
          const k = t - 2.9;
          const bp = pts[breakIdx];
          runner(ctx, bp.x + k * 96, bp.y + k * k * 190 - k * 24, t * 18, pal, 0.72);
          for (let i = 0; i < 6; i++) {
            const a = 1 - k / 1.2;
            if (a <= 0) break;
            ctx.globalAlpha = a * 0.7;
            ctx.strokeStyle = pal.glow;
            ctx.lineWidth = 1.4;
            const ang = i * 1.05 + t;
            ctx.beginPath();
            ctx.moveTo(bp.x + Math.cos(ang) * k * 70, bp.y + Math.sin(ang) * k * 60 + k * k * 120);
            ctx.lineTo(bp.x + Math.cos(ang) * (k * 70 + 7), bp.y + Math.sin(ang) * (k * 60 + 6) + k * k * 120);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        label(ctx, snapped ? '断在起毛的地方' : '负载 1.24 · 已起毛', 134, 16, 11,
          'rgba(255,255,255,0.75)', 'center');
      },
    },
    {
      id: 'beat',
      title: '随他的脚步松开',
      body: '他起跳前用脚尖点两下，环开始收缩。在环闭合的那一拍 ±145ms 内松手 = 同步：线更结实，他更快，链条 +1。',
      loop: 2.6,
      draw(ctx, t, pal) {
        const cx = 134, cy = 84;
        ledge(ctx, 40, cy, 188, pal);
        const beat = t % 1.3;
        const hit = beat < 0.16;
        runner(ctx, cx, cy, t * 12, pal, 1.05);
        // 收缩环
        const u = sat(beat / 1.3);
        const r = lerp(44, 13, ease.outCubic(u));
        ctx.save();
        ctx.strokeStyle = hit ? 'rgba(255,255,255,0.95)' : rgba(pal.glow, 0.45);
        ctx.lineWidth = hit ? 2.4 : 1.3;
        if (!hit) ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(cx, cy - 20, r, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy - 20, 13, 0, TAU); ctx.stroke();
        ctx.restore();
        // 脚尖两拍
        for (let i = 0; i < 2; i++) {
          const tt = 0.42 + i * 0.22;
          const on = beat > tt && beat < tt + 0.14;
          ctx.fillStyle = on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.22)';
          ctx.fillRect(cx - 16 + i * 10, cy + 6, 5, 2.4);
        }
        if (hit) {
          ctx.fillStyle = 'rgba(255,255,255,' + (1 - beat / 0.16) * 0.9 + ')';
          label(ctx, '同步', cx + 56, cy - 20, 13,
            'rgba(255,255,255,' + (1 - beat / 0.16) * 0.95 + ')', 'left');
        }
        label(ctx, '脚尖两拍 → 窗口开了', 134, 16, 10, 'rgba(255,255,255,0.42)', 'center');
      },
    },
    {
      id: 'rewind',
      title: '失败会把时间收回',
      body: '坠落不是读档黑屏。最近 10 秒的模拟被倒放，并且一定退回到还留有助跑余量的位置——不会把你丢回断口边缘。',
      loop: 5.0,
      draw(ctx, t, pal) {
        const ay = 76;
        ledge(ctx, 16, ay, 122, pal);
        ledge(ctx, 214, ay - 6, 46, pal);
        const safeX = 52;
        // 助跑余量标记
        ctx.strokeStyle = rgba(pal.accent, 0.5);
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(safeX, ay + 16); ctx.lineTo(138, ay + 16);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(safeX, ay + 12); ctx.lineTo(safeX, ay + 20);
        ctx.moveTo(138, ay + 12); ctx.lineTo(138, ay + 20);
        ctx.stroke();
        label(ctx, '助跑余量', 95, ay + 30, 9.5, rgba(pal.accent, 0.7), 'center');

        // 0–1.8 跑出边缘并坠落 / 1.8–3.2 倒放 / 3.2–5 回到安全点重新起跑
        let x, y, ghost = 0;
        if (t < 1.8) {
          const u = t / 1.8;
          x = lerp(safeX, 186, u);
          y = x > 138 ? ay + Math.pow((x - 138) / 48, 2) * 62 : ay;
        } else if (t < 3.2) {
          const u = (t - 1.8) / 1.4;
          const back = 1 - ease.inOutCubic(u);
          x = lerp(safeX, 186, back);
          y = x > 138 ? ay + Math.pow((x - 138) / 48, 2) * 62 : ay;
          ghost = 1;
        } else {
          const u = (t - 3.2) / 1.8;
          x = lerp(safeX, 100, u);
          y = ay;
        }
        if (ghost) {
          for (let i = 1; i <= 5; i++) {
            ctx.globalAlpha = 0.14 * (1 - i / 6);
            ctx.fillStyle = mix(pal.near, '#000000', 0.2);
            const gx = x + i * 12;
            const gy = gx > 138 ? ay + Math.pow((gx - 138) / 48, 2) * 62 : ay;
            ctx.beginPath(); ctx.ellipse(gx, gy - 10, 4, 12, 0, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        runner(ctx, x, y, t * (ghost ? -14 : 14), pal, 0.9);
        label(ctx, t < 1.8 ? '坠落' : t < 3.2 ? '倒放最近 10 秒' : '回到还跑得动的地方',
          134, 16, 11, 'rgba(255,255,255,0.72)', 'center');
      },
    },
  ];

  /* ------------------------------------------------------------- 面板 */

  function createGuide(container, getPal) {
    const canvases = [];
    let running = false, raf = 0, t0 = 0;

    container.innerHTML = CARDS.map((c) =>
      '<div class="gcard"><canvas data-id="' + c.id + '"></canvas>' +
      '<b>' + c.title + '</b><p>' + c.body + '</p></div>').join('');

    for (const card of CARDS) {
      const cv = container.querySelector('canvas[data-id="' + card.id + '"]');
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.aspectRatio = W + ' / ' + H;
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvases.push({ card, ctx });
    }

    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!t0) t0 = now;
      const elapsed = (now - t0) / 1000;
      const pal = getPal();
      for (const { card, ctx } of canvases) {
        ctx.clearRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, mix(pal.skyTop, pal.skyMid, 0.75));
        g.addColorStop(0.62, mix(pal.skyMid, pal.skyLow, 0.35));
        g.addColorStop(1, mix(pal.skyLow, pal.near, 0.55));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        card.draw(ctx, elapsed % card.loop, pal);
        ctx.restore();
      }
    }

    return {
      show() { if (running) return; running = true; t0 = 0; raf = requestAnimationFrame(frame); },
      hide() { running = false; cancelAnimationFrame(raf); },
    };
  }

  LL.createGuide = createGuide;
  LL.GUIDE_CARDS = CARDS;
})(typeof window !== 'undefined' ? window : globalThis);
