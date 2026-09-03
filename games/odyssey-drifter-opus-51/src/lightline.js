/**
 * lightline.js — 余光：唯一主动作「驭线」的材料
 *
 * 一次输入 = 按住（抓住光头）→ 移动（塑形 + 自动借锚）→ 松开（提交 + 脉冲）。
 * 三个耦合维度：
 *   线形是空间（穿过哪些锚点决定路径）
 *   张力是运动（chord/arc 决定阿迦在线上的加速与承载）
 *   松开是节拍（是否落在阿迦的释放窗口里决定同步）
 *
 * 承载规则是确定性的、可解释的，没有隐藏吸附与隐藏容错：
 *   capacity = BASE + 借锚数 * ANCHOR + 同步奖励
 *   load     = arc / capacity * (0.55 + tension * 0.75)
 *   load > 1 -> 起毛并在固定比例处断裂（断裂位置在提交时就已可见）
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const C = LL.core;
  const { clamp, sat, lerp, rgba, mix, TAU } = C;
  const R = LL.rules;

  const K = {
    GRAB_RADIUS: 170,     // 光头抓取半径
    MIN_LENGTH: 46,
    SAMPLE_MIN: 4.5,      // 原始采样最小间距
    RESAMPLE: 74,
    ANCHOR_SNAP: 52,
    LAND_SNAP: 84,
    BUDGET_MAX: 1580,
    BUDGET_REGEN: 128,
    STRAIN_WARN: 0.84,     // 与 rules.RULES.WARN 保持一致
    DECAY_TIME: 2.6,
  };

  function createLightlines(seed) {
    const noise = C.makeNoise(seed + 17);
    const lines = [];
    const ghosts = [];
    let budget = K.BUDGET_MAX;

    const draft = {
      active: false, raw: [], length: 0, origin: null, valid: false,
      arc: 0, chord: 0, tension: 1, load: 0, capacity: 0, anchors: [], startedAt: 0,
    };

    /* ------------------------------------------------------------ 草稿 */

    function beginDraft(x, y, origins, time) {
      draft.active = true;
      draft.raw.length = 0;
      draft.anchors.length = 0;
      draft.length = 0;
      draft.startedAt = time;
      let best = null, bestD = K.GRAB_RADIUS;
      for (const o of origins) {
        const d = Math.hypot(o.x - x, o.y - y);
        if (d < bestD) { bestD = d; best = o; }
      }
      draft.origin = best;
      draft.valid = !!best;
      const sx = best ? best.x : x, sy = best ? best.y : y;
      draft.raw.push({ x: sx, y: sy });
      if (best && bestD > 2) draft.raw.push({ x, y });
      recompute();
      return draft.valid;
    }

    function extendDraft(x, y, anchors) {
      if (!draft.active) return;
      const last = draft.raw[draft.raw.length - 1];
      const d = Math.hypot(x - last.x, y - last.y);
      if (d < K.SAMPLE_MIN) return;
      if (draft.length + d > budget) {  // 光量耗尽：线不再延长
        return;
      }
      draft.raw.push({ x, y });
      draft.length += d;
      // 自动借锚：靠近即被记录，并给出轻微吸引（可见、可解释）
      for (const an of anchors) {
        if (an.taken) continue;
        const dd = Math.hypot(an.x - x, an.y - y);
        if (dd < K.ANCHOR_SNAP && draft.anchors.indexOf(an) < 0) {
          draft.anchors.push(an);
          an.pulse = 1;
        }
      }
      recompute();
    }

    function recompute() {
      const raw = draft.raw;
      if (raw.length < 2) { draft.arc = 0; draft.chord = 0; draft.tension = 1; draft.load = 0; return; }
      draft.arc = C.polyLength(raw);
      draft.chord = Math.hypot(raw[raw.length - 1].x - raw[0].x, raw[raw.length - 1].y - raw[0].y);
      draft.tension = R.tension(draft.arc, draft.chord);
      draft.capacity = R.capacity(draft.anchors.length, false);
      draft.load = R.load(draft.arc, draft.tension, draft.capacity);
    }

    function cancelDraft(refund) {
      if (!draft.active) return;
      draft.active = false;
      if (refund) budget = Math.min(K.BUDGET_MAX, budget + draft.length * 0.72);
      draft.raw.length = 0;
      draft.anchors.length = 0;
      draft.length = 0;
    }

    /**
     * 提交曲线。landing 由 game 提供（平台表面吸附结果，可为 null）。
     * 返回 line 或 null（非法）。
     */
    function commit(time, opts) {
      if (!draft.active) return null;
      const raw = draft.raw.slice();
      const len = draft.length;
      draft.active = false;
      const usedAnchors = draft.anchors.slice();
      draft.raw.length = 0;
      draft.anchors.length = 0;
      draft.length = 0;

      if (!draft.valid || raw.length < 2 || C.polyLength(raw) < K.MIN_LENGTH) {
        budget = Math.min(K.BUDGET_MAX, budget + len * 0.72);
        return null;
      }
      budget = Math.max(0, budget - len);

      // 落点吸附：只吸附终点到已存在的合法承重面，不改变中间形状
      if (opts.landing) {
        raw[raw.length - 1] = { x: opts.landing.x, y: opts.landing.y };
      }
      let pts = C.resample(raw, K.RESAMPLE);
      // 借锚：把最近的采样点拉到锚点上，形成真实的几何约束
      for (const an of usedAnchors) {
        let bi = -1, bd = 1e9;
        for (let i = 2; i < pts.length - 2; i++) {
          const d = C.dist2(pts[i].x, pts[i].y, an.x, an.y);
          if (d < bd) { bd = d; bi = i; }
        }
        if (bi > 0) {
          for (let i = -3; i <= 3; i++) {
            const j = bi + i;
            if (j < 1 || j > pts.length - 2) continue;
            const w = (1 - Math.abs(i) / 4) * 0.85;
            pts[j].x = lerp(pts[j].x, an.x, w);
            pts[j].y = lerp(pts[j].y, an.y, w);
          }
          an.taken = true;
          an.takenAt = time;
        }
      }
      pts = C.smoothPoly(pts, 2);
      const arc = C.polyLength(pts);
      const chord = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
      const tension = R.tension(arc, chord);
      const capacity = R.capacity(usedAnchors.length, !!opts.sync);
      const load = R.load(arc, tension, capacity);

      const line = {
        pts,
        track: C.makeTrack(pts),
        arc, chord, tension, capacity, load,
        anchors: usedAnchors,
        sync: !!opts.sync,
        createdAt: time,
        life: 1,
        decaying: false,
        used: false,
        ridden: 0,
        broken: false,
        breakAt: R.breakAt(load),
        pulse: 0,
        pulseOn: true,
        strainSeed: (Math.random() * 1000) | 0,
        band: opts.band || 0,
      };
      lines.push(line);
      if (lines.length > 14) retire(lines.shift());
      return line;
    }

    function retire(line) {
      if (!line || line.pts.length < 2) return;
      ghosts.push({ pts: line.pts, a: 1, tension: line.tension });
      if (ghosts.length > 46) ghosts.shift();
    }

    function breakLine(line, atFrac) {
      if (line.broken) return;
      line.broken = true;
      line.brokenFrac = atFrac;
      line.decaying = true;
    }

    function update(dt, agaLine) {
      if (!draft.active) budget = Math.min(K.BUDGET_MAX, budget + K.BUDGET_REGEN * dt);
      for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i];
        if (l.pulseOn) {
          l.pulse += dt * 2.3;
          if (l.pulse > 1.35) l.pulseOn = false;
        }
        if (l.decaying) {
          l.life -= dt / (l.broken ? 0.9 : K.DECAY_TIME);
          if (l.life <= 0) { retire(l); lines.splice(i, 1); }
        } else if (l.used && l !== agaLine) {
          l.decaying = true;
        }
      }
      for (let i = ghosts.length - 1; i >= 0; i--) {
        ghosts[i].a -= dt * 0.02;
        if (ghosts[i].a <= 0.06) ghosts[i].a = 0.06; // 永久留下极淡的痕
      }
    }

    function clear() {
      lines.length = 0;
      draft.active = false;
      draft.raw.length = 0;
      draft.anchors.length = 0;
      budget = K.BUDGET_MAX;
    }

    /* ------------------------------------------------------------ 绘制 */

    /** 应变抖动：load 越高抖得越明显（形状冗余，不依赖颜色） */
    function strainOffset(l, i, t) {
      const s = Math.max(0, l.load - 0.55) * 2.1;
      if (s <= 0.01) return 0;
      return noise.n1(i * 0.7 + t * (7 + s * 12) + l.strainSeed) * s * 2.4;
    }

    function strokePoly(ctx, pts, w, color, alpha, offsetFn, t, clipFrac) {
      const n = pts.length;
      const upto = clipFrac == null ? n : Math.max(2, Math.floor(n * clipFrac));
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < upto; i++) {
        const p = pts[i];
        let ox = 0, oy = 0;
        if (offsetFn) {
          const o = offsetFn(i);
          const pa = pts[Math.max(0, i - 1)], pb = pts[Math.min(n - 1, i + 1)];
          const dx = pb.x - pa.x, dy = pb.y - pa.y;
          const len = Math.hypot(dx, dy) || 1;
          ox = -dy / len * o; oy = dx / len * o;
        }
        if (i === 0) ctx.moveTo(p.x + ox, p.y + oy);
        else ctx.lineTo(p.x + ox, p.y + oy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /** 已提交的线 */
    function drawLine(ctx, gctx, l, pal, t, zoom, opts) {
      const alive = l.life;
      const clipFrac = l.broken ? l.brokenFrac : null;
      const off = (i) => strainOffset(l, i, t);
      const hot = mix(pal.glow, '#ffffff', 0.5);
      const w = lerp(5.2, 2.4, l.tension) * zoom;

      // 暗轮廓：在破晓这种亮背景下，纯发光线会糊进天空
      strokePoly(ctx, l.pts, w * 2.9, '#000000', 0.26 * alive, off, t, clipFrac);
      if (gctx) {
        strokePoly(gctx, l.pts, w * 3.4, pal.accent, 0.30 * alive, off, t, clipFrac);
        strokePoly(gctx, l.pts, w * 1.5, pal.glow, 0.55 * alive, off, t, clipFrac);
      }
      strokePoly(ctx, l.pts, w * 2.6, pal.accent, 0.16 * alive, off, t, clipFrac);
      strokePoly(ctx, l.pts, w * 1.15, mix(pal.accent, hot, 0.55), 0.62 * alive, off, t, clipFrac);
      strokePoly(ctx, l.pts, Math.max(0.9, w * 0.42), hot, 0.95 * alive, off, t, clipFrac);

      // 起毛：过载区段长出短纤维，并标出断裂位置
      if (l.load > K.STRAIN_WARN && !l.broken) {
        const n = l.pts.length;
        const center = Math.floor(n * R.breakAt(Math.max(l.load, 1.01)));
        ctx.save();
        ctx.strokeStyle = rgba(pal.glow, 0.5 * alive);
        ctx.lineWidth = Math.max(0.7, 1.1 * zoom);
        for (let i = Math.max(1, center - 9); i < Math.min(n - 1, center + 9); i++) {
          const p = l.pts[i];
          const pa = l.pts[i - 1], pb = l.pts[i + 1];
          const dx = pb.x - pa.x, dy = pb.y - pa.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const amp = (5 + Math.abs(noise.n1(i * 3.1 + t * 22)) * 9) * zoom * sat(l.load - K.STRAIN_WARN) * 3;
          const s = i % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + nx * amp * s, p.y + ny * amp * s);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 松开脉冲：沿线传播的一段高亮
      if (l.pulse < 1.35 && l.pulseOn) {
        const u = sat(l.pulse);
        const n = l.pts.length;
        const head = u * (n - 1);
        const target = gctx || ctx;
        target.save();
        target.lineCap = 'round';
        for (let i = Math.max(0, Math.floor(head) - 9); i <= Math.min(n - 2, Math.floor(head) + 2); i++) {
          const d = Math.abs(i - head);
          const a = Math.exp(-d * d * 0.09) * (1 - u * 0.35);
          target.globalAlpha = a * (l.sync ? 1 : 0.7);
          target.strokeStyle = l.sync ? '#ffffff' : pal.glow;
          target.lineWidth = (3 + a * 9) * zoom;
          target.beginPath();
          target.moveTo(l.pts[i].x, l.pts[i].y);
          target.lineTo(l.pts[i + 1].x, l.pts[i + 1].y);
          target.stroke();
        }
        target.globalAlpha = 1;
        target.restore();
      }
    }

    /** 记忆残痕：走过的路永久留下极淡的形 */
    function drawGhosts(ctx, pal, zoom) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const g of ghosts) {
        ctx.strokeStyle = rgba(pal.accent, 0.055 * g.a + 0.02);
        ctx.lineWidth = 1.15 * zoom;
        ctx.beginPath();
        for (let i = 0; i < g.pts.length; i++) {
          const p = g.pts[i];
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    /** 正在拖动的草稿 */
    function drawDraft(ctx, gctx, pal, t, zoom) {
      if (!draft.active || draft.raw.length < 2) return;
      const pts = draft.raw;
      const bad = !draft.valid;
      const over = draft.load > 1;
      const w = lerp(4.6, 2.0, draft.tension) * zoom;
      const off = (i) => {
        const s = Math.max(0, draft.load - 0.55) * 2.4;
        return s <= 0.01 ? 0 : noise.n1(i * 0.8 + t * (9 + s * 14)) * s * 2.6;
      };
      if (bad) {
        ctx.save();
        ctx.setLineDash([5 * zoom, 7 * zoom]);
        strokePoly(ctx, pts, 1.6 * zoom, pal.fog, 0.55, null, t);
        ctx.restore();
        return;
      }
      strokePoly(ctx, pts, w * 2.6, '#000000', 0.24, off, t);
      if (gctx) {
        strokePoly(gctx, pts, w * 3.0, pal.accent, 0.22, off, t);
        strokePoly(gctx, pts, w * 1.3, pal.glow, 0.42, off, t);
      }
      strokePoly(ctx, pts, w * 2.2, pal.accent, 0.13, off, t);
      strokePoly(ctx, pts, w * 1.0, mix(pal.accent, '#ffffff', 0.5), 0.55, off, t);
      strokePoly(ctx, pts, Math.max(0.8, w * 0.38), '#ffffff', 0.9, off, t);

      if (over) {  // 过载预警：断裂位置在松开前就已可见
        const n = pts.length;
        const idx = Math.floor(n * R.breakAt(draft.load));
        const p = pts[Math.max(1, Math.min(n - 2, idx))];
        ctx.save();
        ctx.strokeStyle = rgba(pal.glow, 0.75);
        ctx.lineWidth = 1.4 * zoom;
        const r = (9 + Math.sin(t * 16) * 2.5) * zoom;
        ctx.beginPath(); ctx.moveTo(p.x - r, p.y - r); ctx.lineTo(p.x + r, p.y + r);
        ctx.moveTo(p.x + r, p.y - r); ctx.lineTo(p.x - r, p.y + r);
        ctx.stroke();
        ctx.restore();
      }
    }

    return {
      K, lines, ghosts, draft,
      get budget() { return budget; },
      set budget(v) { budget = clamp(v, 0, K.BUDGET_MAX); },
      beginDraft, extendDraft, cancelDraft, commit, update, clear,
      breakLine, drawLine, drawGhosts, drawDraft, retire,
    };
  }

  LL.createLightlines = createLightlines;
})(typeof window !== 'undefined' ? window : globalThis);
