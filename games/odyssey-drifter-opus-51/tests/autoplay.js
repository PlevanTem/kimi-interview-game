/**
 * tests/autoplay.js — 浏览器内自动驾驶，用于产出「整条路线可完成」的证据。
 *
 * 它不替代人工试玩，只回答一个工程问题：
 * 在确定性种子下，驭线 → 承重 → 落点 → 停息 的链路是否每一跨都成立。
 * 通过 lightline.update(dt) 直接推进模拟，因此在后台标签页也能跑完。
 */
(function (global) {
  'use strict';

  function pointer(type, x, y, target) {
    (target || global).dispatchEvent(new PointerEvent(type, {
      clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 1, bubbles: true, cancelable: true, pointerType: 'mouse',
    }));
  }

  function autoplay(opts) {
    opts = opts || {};
    const G = global.lightline;
    const canvas = document.getElementById('c');
    const DT = 1 / 120;
    const maxSpans = opts.maxSpans || 40;
    const report = { spans: [], ok: false, reason: '' };
    const step = (n) => { for (let i = 0; i < n; i++) G.update(DT); };

    G.start();
    G.resume();
    step(260);

    function nextPlatform(afterX) {
      let best = null;
      for (const p of G.world.platforms) {
        if (G.world.left(p) > afterX + 24) {
          if (!best || G.world.left(p) < G.world.left(best)) best = p;
        }
      }
      return best;
    }

    for (let n = 0; n < maxSpans; n++) {
      // 1) 跑到预读窗口
      let guard = 0;
      while (!G.sim.prep && guard++ < 4000) {
        step(1);
        if (G.g.mode === 'ending') break;
      }
      if (G.g.mode === 'ending') { report.ok = true; report.reason = 'reached-ending'; break; }
      if (G.sim.state === 'still') { step(600); continue; }
      const su = G.sim.surf;
      if (!su || su.kind !== 'platform') { step(240); continue; }

      const from = su.p;
      const ex = G.world.right(from), ey = G.world.top(from);
      const to = nextPlatform(ex);
      if (!to) {
        // 已经在终台：不再输入，等他自己停下来
        for (let k = 0; k < 2000 && G.g.mode !== 'ending'; k++) step(1);
        report.ok = G.g.mode === 'ending';
        report.reason = report.ok ? 'reached-ending' : 'no-next-platform';
        break;
      }
      const gap = G.world.left(to) - ex;

      // 2) 驭线：垂度随断口宽度增加，保证 load 不过 1
      const wx0 = ex, wy0 = ey;
      const wx1 = G.world.left(to) + 42, wy1 = G.world.top(to);
      const sag = 26 + gap * 0.055;
      const at = (u) => G.toScreen(wx0 + (wx1 - wx0) * u,
        wy0 + (wy1 - wy0) * u + Math.sin(u * Math.PI) * sag);
      let s = at(0);
      pointer('pointerdown', s.x, s.y, canvas);
      step(2);
      for (let i = 1; i <= 30; i++) {
        s = at(i / 30);          // 每帧重新投影：相机在移动，玩家跟的是世界不是屏幕
        pointer('pointermove', s.x, s.y);
        step(1);
      }
      const s1 = at(1);
      const arcAfterDraw = Math.round(G.lines.draft.arc);
      // 3) 等一个脚步拍再松手
      let beat = 0;
      while (beat++ < 90 && !(G.sim.prep && Math.abs(G.g.t - G.sim.lastBeat) < 0.05)) step(1);
      const draft = {
        arcAfterDraw,
        arc: Math.round(G.lines.draft.arc),
        valid: G.lines.draft.valid,
        tension: +G.lines.draft.tension.toFixed(2),
        load: +G.lines.draft.load.toFixed(2),
        anchors: G.lines.draft.anchors.length,
      };
      pointer('pointerup', s1.x, s1.y);
      step(2);

      // 4) 等待落点
      let landed = null, fell = 0, k = 0;
      while (k++ < 2600) {
        step(1);
        if (G.g.mode === 'rewind') fell++;
        if (G.g.mode === 'ending') break;
        const s = G.sim.surf;
        if (s && s.kind === 'platform' && s.p !== from &&
            (G.sim.state === 'run' || G.sim.state === 'rest')) { landed = s.p.id; break; }
      }
      report.spans.push({
        n, district: G.g.district, gap: Math.round(gap), draft,
        sync: G.g.stats.chain, landed, rewinds: fell > 0 ? 1 : 0,
        dist: Math.round(G.g.stats.dist),
      });
      if (G.g.mode === 'ending') { report.ok = true; report.reason = 'reached-ending'; break; }
      if (landed == null) { report.reason = 'stuck-at-span-' + n; break; }
    }

    report.stats = JSON.parse(JSON.stringify(G.g.stats));
    report.mode = G.g.mode;
    report.spanCount = report.spans.length;
    report.stuckSpans = report.spans.filter((s) => s.landed == null).length;
    report.rewinds = report.spans.reduce((a, s) => a + s.rewinds, 0);
    return report;
  }

  global.autoplay = autoplay;
})(typeof window !== 'undefined' ? window : globalThis);
