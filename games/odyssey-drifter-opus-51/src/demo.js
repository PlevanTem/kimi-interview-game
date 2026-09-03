/**
 * demo.js — 实机演示教程
 *
 * 它不是一段录像，也不是另一套简化规则：演示用的是和真人完全相同的
 * pressAt / moveTo / releaseAt 三个入口，跑在真实关卡、真实承重规则、
 * 真实回溯之上。所以你在演示里看到的判定，就是你自己上手时的判定。
 *
 * 任何时候点一下（或按空格）就接管，演示立刻退出，光量与进度都保留。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const C = LL.core;
  const { clamp, sat, lerp, damp, rgba, TAU, ease } = C;

  /**
   * 每一步教一件事，并且必须在真实断口上当场做出来。
   * sag  : 相对断口宽度的垂度，决定张力（0 = 笔直 = 最紧）
   * aim  : plain 走中线 / anchor 绕经锚点 / far 故意跨到更远的平台
   * sync : 是否等脚步拍再松手
   */
  const STEPS = [
    { id: 'grab', title: '第一步 · 抓住光头',
      body: '断口上一直在脉冲的亮点就是光头。按住它，线从那里长出来。',
      sag: 0.20, aim: 'plain', sync: false },
    { id: 'shape', title: '第二步 · 拖出线形',
      body: '弧度越大越松，越直越紧。屏幕下方会告诉你现在是松、稳，还是紧。',
      sag: 0.34, aim: 'plain', sync: false },
    { id: 'beat', title: '第三步 · 随他的脚步松开',
      body: '他起跳前会用脚尖点两下，环收缩到闭合的那一拍松手，就是同步。',
      sag: 0.22, aim: 'plain', sync: true },
    { id: 'anchor', title: '借锚',
      body: '线扫过锚点会自动借到它。每借一个，这条线能承的弧长就多 420。',
      sag: 0.24, aim: 'anchor', sync: true },
    { id: 'overload', title: '过载会断',
      body: '这条我故意画得又长又紧。起毛的地方，就是它会断的地方——在松手之前就画出来了。',
      sag: 0.10, aim: 'far', sync: false, forceOverload: true },
    { id: 'handover', title: '交给你',
      body: '刚才那一下就是失败的全部代价：时间和光线一起被收回，他退回到还跑得动的地方，重来。现在他又要到断口了——接下来是你的线。',
      sag: 0, aim: null, sync: false },
  ];

  function createDemo(host) {
    const d = {
      active: false, step: 0, phase: 'idle', phaseT: 0,
      cur: { x: 0, y: 0 }, target: { x: 0, y: 0 }, down: false,
      plan: null, planT: 0, trail: [], banner: 0, endedReason: '', lastLine: null,
    };

    const world = host.world, lines = host.lines, sim = host.sim, g = host.g;

    function nextPlatform(afterX, skip) {
      const found = [];
      for (const p of world.platforms) {
        if (world.left(p) > afterX + 24) found.push(p);
      }
      found.sort((a, b) => world.left(a) - world.left(b));
      return found[skip || 0] || null;
    }

    /** 挑一个位于断口上方、可以顺路借到的锚点 */
    function anchorBetween(x0, x1) {
      let best = null, bd = 1e9;
      for (const a of world.anchors) {
        if (a.taken) continue;
        if (a.x < x0 + 30 || a.x > x1 - 30) continue;
        const mid = (x0 + x1) / 2;
        const dd = Math.abs(a.x - mid);
        if (dd < bd) { bd = dd; best = a; }
      }
      return best;
    }

    /** 把一步的意图变成一条世界坐标里的参数曲线 u -> {x,y} */
    function makePlan(spec) {
      const su = sim.surf;
      if (!su || su.kind !== 'platform') return null;
      const from = su.p;
      const ex = world.right(from), ey = world.top(from);
      const to = nextPlatform(ex, spec.aim === 'far' ? 1 : 0);
      if (!to) return null;
      const tx = world.left(to) + 46, ty = world.top(to);
      const gap = Math.hypot(tx - ex, ty - ey);

      let cx, cy;
      if (spec.aim === 'anchor') {
        const a = anchorBetween(ex, world.left(to));
        if (a) { cx = 2 * a.x - 0.5 * ex - 0.5 * tx; cy = 2 * a.y - 0.5 * ey - 0.5 * ty; }
      }
      if (cx == null) {
        cx = (ex + tx) / 2;
        cy = (ey + ty) / 2 + gap * spec.sag;
      }
      const fn = (u) => ({
        x: (1 - u) * (1 - u) * ex + 2 * (1 - u) * u * cx + u * u * tx,
        y: (1 - u) * (1 - u) * ey + 2 * (1 - u) * u * cy + u * u * ty,
      });
      fn.start = { x: ex, y: ey };
      fn.end = { x: tx, y: ty };
      fn.fromPlatform = from;
      return fn;
    }

    function say(spec) {
      host.ui.setDemoCaption(
        d.step + 1, STEPS.length, spec ? spec.title : '', spec ? spec.body : '');
    }

    function start() {
      d.active = true;
      d.step = 0;
      d.phase = 'seek';
      d.phaseT = 0;
      d.plan = null;
      d.down = false;
      d.lastLine = null;
      d.trail.length = 0;
      d.banner = 4.5;
      d.endedReason = '';
      d.cur.x = sim.x; d.cur.y = sim.y - 60;
      say(STEPS[0]);
      host.ui.setDemoVisible(true);
    }

    function stop(reason) {
      if (!d.active) return;
      d.active = false;
      d.down = false;
      d.endedReason = reason || '';
      lines.cancelDraft(true);
      host.ui.setDemoVisible(false);
    }

    function handOver(reason) {
      if (!d.active) return;
      stop(reason);
      host.hint('演示结束，控制权在你手上。', 3);
    }

    /** 演示指针不用 DOM 事件，直接走真人那三个入口 */
    function press() {
      d.down = host.pressAt(d.cur.x, d.cur.y);
      return d.down;
    }
    function drag(p) { d.cur.x = p.x; d.cur.y = p.y; host.moveTo(p.x, p.y); }
    function release() { d.down = false; d.lastLine = host.releaseAt(); return d.lastLine; }

    function advance() {
      d.step++;
      d.phase = 'seek';
      d.phaseT = 0;
      d.plan = null;
      if (d.step >= STEPS.length - 1) {          // 最后一条只说话，不再代打
        say(STEPS[STEPS.length - 1]);
        d.phase = 'farewell';
        d.phaseT = 0;
        return;
      }
      say(STEPS[d.step]);
    }

    function update(dt) {
      if (!d.active) return;
      d.phaseT += dt;
      d.banner = Math.max(0, d.banner - dt);
      const spec = STEPS[Math.min(d.step, STEPS.length - 1)];

      // 指针拖尾
      d.trail.push({ x: d.cur.x, y: d.cur.y, a: 1 });
      if (d.trail.length > 26) d.trail.shift();
      for (const t of d.trail) t.a -= dt * 2.4;

      switch (d.phase) {
        case 'seek': {
          // 等他跑到预读窗口，同时把指针滑到光头上
          const su = sim.surf;
          if (su && su.kind === 'platform') {
            const hx = world.right(su.p), hy = world.top(su.p);
            d.cur.x = damp(d.cur.x, hx, 4.5, dt);
            d.cur.y = damp(d.cur.y, hy, 4.5, dt);
          }
          if (sim.prep && su && su.kind === 'platform') {
            const plan = makePlan(spec);
            if (!plan) { handOver('无可演示的断口'); return; }
            d.plan = plan;
            d.cur.x = plan.start.x; d.cur.y = plan.start.y;
            if (!press()) { handOver('起手失败'); return; }
            d.phase = 'drag';
            d.phaseT = 0;
          } else if (d.phaseT > 26) {
            handOver('演示超时');
          }
          break;
        }
        case 'drag': {
          const dur = 1.05;
          const u = sat(d.phaseT / dur);
          drag(d.plan(ease.inOutCubic(u)));
          if (u >= 1) {
            // 过载那一课必须真的过载。长直线顺路会借到锚点，容量一涨就断不了，
            // 所以这里按实际读数继续往外拉，直到 load 真的越过 1。
            d.phase = spec.forceOverload && lines.draft.load < 1.14 ? 'stretch'
              : (spec.sync ? 'listen' : 'settle');
            d.phaseT = 0;
          }
          break;
        }
        case 'stretch': {
          const e = d.plan.end, s0 = d.plan.start;
          const dx = e.x - s0.x, dy = e.y - s0.y;
          const len = Math.hypot(dx, dy) || 1;
          const k = d.phaseT * 300;                    // 沿原方向继续拉长
          drag({ x: e.x + dx / len * k, y: e.y + dy / len * k + k * 0.12 });
          if (lines.draft.load >= 1.14 || d.phaseT > 2.4 || lines.budget < 90) {
            d.phase = 'settle';
            d.phaseT = 0;
          }
          break;
        }
        case 'listen': {
          // 等脚步拍；窗口是 ±145ms，这里瞄准中心
          if (sim.prep && Math.abs(g.t - sim.lastBeat) < host.SYNC_WINDOW * 0.45) {
            release();
            d.phase = 'travel';
            d.phaseT = 0;
          } else if (d.phaseT > 3.2) {
            release();
            d.phase = 'travel';
            d.phaseT = 0;
          }
          break;
        }
        case 'settle': {
          if (d.phaseT > 0.32) { release(); d.phase = 'travel'; d.phaseT = 0; }
          break;
        }
        case 'travel': {
          const su = sim.surf;
          const landed = su && su.kind === 'platform' && su.p !== d.plan.fromPlatform
            && (sim.state === 'run' || sim.state === 'rest');
          // 线断了就不再等他"走到对岸"——他走不过去了，接下来要看的是回溯
          if ((d.lastLine && d.lastLine.broken) || g.mode === 'rewind') {
            d.phase = 'watch';
            d.phaseT = 0;
          } else if (landed || d.phaseT > 16) {
            advance();
          }
          break;
        }
        case 'watch': {   // 看完断裂与回溯，等他重新站稳再继续
          const safe = g.mode === 'play' && (sim.state === 'run' || sim.state === 'rest');
          if ((safe && d.phaseT > 1.6) || d.phaseT > 12) advance();
          break;
        }
        case 'farewell': {
          if (d.phaseT > 5.5) handOver('演示走完');
          break;
        }
      }
    }

    /** 幽灵指针：让玩家看见"手"在哪、什么时候按下、什么时候松开 */
    function draw(ctx, pal, zoom, toScreen) {
      if (!d.active) return;
      const s = toScreen(d.cur.x, d.cur.y);
      ctx.save();
      // 拖尾
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(pal.glow, 0.22);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      let started = false;
      for (const t of d.trail) {
        if (t.a <= 0) continue;
        const q = toScreen(t.x, t.y);
        if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();

      // 指针本体：按下时实心，松开时空心
      const pulse = 0.5 + 0.5 * Math.sin(g.t * 5.5);
      ctx.strokeStyle = rgba('#ffffff', d.down ? 0.95 : 0.5);
      ctx.lineWidth = d.down ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, d.down ? 9 : 13 + pulse * 3, 0, TAU);
      ctx.stroke();
      if (d.down) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath(); ctx.arc(s.x, s.y, 3.4, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, TAU); ctx.fill();
      }
      // 松开的那一瞬间放一个环，强调"这一下就是松手"
      if (d.phase === 'travel' && d.phaseT < 0.45) {
        ctx.globalAlpha = 1 - d.phaseT / 0.45;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, 10 + d.phaseT * 120, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    d.start = start;
    d.stop = stop;
    d.handOver = handOver;
    d.update = update;
    d.draw = draw;
    d.STEPS = STEPS;
    return d;
  }

  LL.createDemo = createDemo;
})(typeof window !== 'undefined' ? window : globalThis);
