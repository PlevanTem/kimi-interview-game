/** tests/shot.js — 把自动驾驶推进到指定区段并停在「正在驭线」的一帧，用于截图取证 */
(function (global) {
  'use strict';
  const DT = 1 / 120;
  global.shot = function shot(targetDistrict, sag) {
    const G = global.lightline;
    const step = (n) => { for (let i = 0; i < n; i++) G.update(DT); };
    const pt = (t, x, y, tg) => (tg || global).dispatchEvent(new PointerEvent(t, {
      clientX: x, clientY: y, button: 0, buttons: t === 'pointerup' ? 0 : 1,
      pointerId: 1, bubbles: true, cancelable: true, pointerType: 'mouse',
    }));
    const next = (ex) => {
      let b = null;
      for (const p of G.world.platforms) {
        if (G.world.left(p) > ex + 24 && (!b || G.world.left(p) < G.world.left(b))) b = p;
      }
      return b;
    };
    const span = (hold) => {
      let gd = 0;
      while (!G.sim.prep && gd++ < 5000) step(1);
      const su = G.sim.surf;
      if (!su || su.kind !== 'platform') { step(300); return false; }
      const from = su.p, ex = G.world.right(from), ey = G.world.top(from);
      const to = next(ex);
      if (!to) return 'end';
      const tx = G.world.left(to) + 42, ty = G.world.top(to);
      const s = (u) => G.toScreen(ex + (tx - ex) * u, ey + (ty - ey) * u
        + Math.sin(u * Math.PI) * (sag || 26 + (G.world.left(to) - ex) * 0.055));
      let q = s(0);
      pt('pointerdown', q.x, q.y, document.getElementById('c'));
      step(1);
      const n = hold ? 22 : 30;
      for (let i = 1; i <= n; i++) { q = s(i / 30); pt('pointermove', q.x, q.y); step(1); }
      if (hold) return true;                       // 停在拖动中
      let b = 0;
      while (b++ < 90 && !(G.sim.prep && Math.abs(G.g.t - G.sim.lastBeat) < 0.05)) step(1);
      pt('pointerup', q.x, q.y);
      step(2);
      let k = 0;
      while (k++ < 2600) {
        step(1);
        const c = G.sim.surf;
        if (c && c.kind === 'platform' && c.p !== from &&
            (G.sim.state === 'run' || G.sim.state === 'rest')) return true;
        if (G.g.mode === 'ending') return 'end';
      }
      return false;
    };
    G.start(); G.resume(); step(260);
    let guard = 0;
    while (G.g.district < targetDistrict && guard++ < 40) { if (span(false) === 'end') break; }
    span(true);
    G.render();
    return { district: G.g.district, dist: Math.round(G.g.stats.dist), mode: G.g.mode };
  };
})(typeof window !== 'undefined' ? window : globalThis);
