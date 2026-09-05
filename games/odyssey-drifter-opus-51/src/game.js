/**
 * game.js — 状态机、模拟、导演与 HUD
 *
 * 一次跨越的节奏（25–45 秒循环）：
 *   预读 → 驭线 → 同行调势 → 松开放势 → 落点停息
 * 高压连续时间不超过 15 秒；每次跨越后必然有一段不需要精准输入的时间。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const C = LL.core;
  const { clamp, sat, lerp, damp, rgba, mix, TAU, ease } = C;
  const PAL = LL.palette;

  const P = {
    BASE_SPEED: 172,
    REST_SPEED: 0,
    MIN_SPEED: 44,
    MAX_SPEED: 430,
    SLOPE_ACC: 470,
    SETTLE: 1.05,
    PLATFORM_SETTLE: 2.4,   // 平台上更快回到基准速度，节奏才可预期
    LAND_SPEED_CAP: 248,
    GRAVITY: 1020,
    CHAIN_SNAP: 58,
    LAND_TOL: 15,
    STAGGER: 0.34,
    PREP_LEAD: 2.2,        // 提前多少秒进入预读
    SYNC_WINDOW: 0.145,    // 与脚步拍的容差
    REST_DUR: 4.4,
    FALL_MARGIN: 900,
    TUTOR_PROTECT: 1,      // 教程首次错拍不坠落
  };

  const BEATS = [
    null,
    ['他回头看了一眼那条线。', '「刚才那下……是你拉住我的。」'],
    ['「我不能停。」', '说完他才发现，自己已经停了。'],
    ['他用脚尖点了两下。', '这一次，是点给你看的。'],
    ['「这盏灯早就不亮了。」', '「我还是背着它。」'],
    ['他绕开了更快的那条路。', ''],
    ['城市吸了一口气——', '然后忘了呼出来。'],
    ['他不再回头确认线还在不在。', ''],
  ];

  function createGame(canvas, ui) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const seed = 20260903;

    const world = LL.createWorld(seed);
    const lines = LL.createLightlines(seed);
    const fx = LL.createFx(seed);
    const backdrop = LL.createBackdrop(seed);
    const aga = LL.createAga(seed);
    const rew = LL.createRewind();
    const audio = LL.createAudio();
    const input = LL.createInput(canvas, { onBlur: () => { if (g.mode === 'play' && !api.devMode) pause(true); } });

    const g = {
      mode: 'title', t: 0, real: 0, W: 0, H: 0, dpr: 1,
      cam: { x: 0, y: 0, zoom: 1, tz: 1, t: 0 },
      pal: PAL.PHASES[0], palFrom: PAL.PHASES[0], palTo: PAL.PHASES[0], palMix: 1,
      district: 0,
      settings: { reduceMotion: false, contrast: false, toggleMode: false, mute: false, quality: 2 },
      stats: { dist: 0, syncs: 0, chain: 0, best: 0, anchors: 0, stumbles: 0, spans: 0, time: 0 },
      endless: false,
    };

    const sim = {
      surf: null, s: 0, speed: 0, x: 0, y: 0, vx: 0, vy: 0,
      state: 'run', staggerT: 0, restT: 0, restIndex: 0, protect: P.TUTOR_PROTECT,
      lastBeat: -9, prep: false, prepT: 0, tapped: false,
      lastLine: null, lastRestPlatform: null,
      stillT: 0, endT: 0, dialog: null, dialogT: 0,
      failNode: -999, failCount: 0,
    };

    let demo = null;   // 实机演示；在下面所有输入函数都就绪后创建
    const tut = { idleGhost: 0, shownText: false, firstDraw: false, firstCommit: false, firstSync: false, hint: '', hintT: 0 };
    let rewindPlay = null;
    let fps = 60;

    /* ------------------------------------------------------ 坐标变换 */

    function toScreen(wx, wy) {
      const z = g.cam.zoom;
      return { x: (wx - g.cam.x) * z + g.W / 2, y: (wy - g.cam.y) * z + g.H / 2 };
    }
    function toWorld(px, py) {
      const z = g.cam.zoom;
      return { x: (px - g.W / 2) / z + g.cam.x, y: (py - g.H / 2) / z + g.cam.y };
    }

    /* ------------------------------------------------------ 表面抽象 */

    function surfLen(s) { return s.kind === 'platform' ? s.p.w : s.l.track.total; }
    const SP = { x: 0, y: 0, tx: 1, ty: 0 };
    function surfPoint(su, s) {
      if (su.kind === 'platform') {
        SP.x = world.left(su.p) + clamp(s, 0, su.p.w);
        SP.y = world.top(su.p);
        SP.tx = 1; SP.ty = 0;
        return SP;
      }
      const q = su.l.track.at(s);
      SP.x = q.x; SP.y = q.y; SP.tx = q.tx; SP.ty = q.ty;
      return SP;
    }

    /**
     * 从某点寻找可以承接的下一段（线优先，其次平台）。
     * 必须排除正在离开的这一段，否则站在自己平台的断口上会被判成「还有路」。
     */
    function findContinuation(x, y, exclude, excludeP) {
      let best = null, bd = P.CHAIN_SNAP;
      for (const l of lines.lines) {
        if (l === exclude || l.broken || l.decaying) continue;
        const a = l.pts[0], b = l.pts[l.pts.length - 1];
        const da = Math.hypot(a.x - x, a.y - y);
        if (da < bd) { bd = da; best = { kind: 'line', l, s: 0 }; }
        const db = Math.hypot(b.x - x, b.y - y);
        if (db < bd && l.used) { bd = db; best = { kind: 'line', l, s: l.track.total }; }
      }
      if (best) return best;
      const p = world.platformAt(x, y, P.LAND_TOL + 8, excludeP);
      if (p) return { kind: 'platform', p, s: clamp(x - world.left(p), 0, p.w) };
      return null;
    }

    function attach(cont, speed) {
      sim.surf = { kind: cont.kind, p: cont.p, l: cont.l };
      sim.s = cont.s;
      // 落地吸收：平台是读取世界的地方，不是冲刺跑道。
      // 没有这一步，短平台在高速落地后只剩不到半秒反应时间。
      sim.speed = cont.kind === 'platform'
        ? clamp(speed, 90, P.LAND_SPEED_CAP)
        : clamp(speed, 90, P.MAX_SPEED);
      sim.state = cont.kind === 'line' ? 'ride' : 'run';
      if (cont.kind === 'line') {
        cont.l.used = true;
        sim.lastLine = cont.l;
        if (cont.l.sync) sim.speed *= 1.18;
      } else if (cont.p) {
        cont.p.visited = true;
      }
      const pt = surfPoint(sim.surf, sim.s);
      sim.x = pt.x; sim.y = pt.y;
    }

    /* ---------------------------------------------------------- 生命周期 */

    function resetRun(keepStats) {
      world.build();
      world.reset();
      lines.clear();
      fx.clear();
      rew.clear();
      aga.reset();
      const start = world.platforms[0];
      start.rested = true;   // 起始平台的停息由开场演出承担，不再触发对白
      sim.surf = { kind: 'platform', p: start };
      sim.s = 120;
      sim.speed = 0;
      sim.state = 'rest';
      sim.restT = 1.6;
      sim.restIndex = 0;
      sim.protect = P.TUTOR_PROTECT;
      sim.prep = false; sim.tapped = false; sim.dialog = null;
      sim.lastLine = null; sim.stillT = 0; sim.endT = 0;
      sim.failNode = -999; sim.failCount = 0;
      const pt = surfPoint(sim.surf, sim.s);
      sim.x = pt.x; sim.y = pt.y;
      aga.s.x = sim.x; aga.s.y = sim.y; aga.s.lampLight = 0.06;
      g.cam.x = sim.x + 120; g.cam.y = sim.y - 60; g.cam.zoom = 1;
      g.t = 0;
      g.district = 0;
      g.palFrom = g.palTo = PAL.PHASES[0];
      g.palMix = 1;
      g.endless = false;
      if (!keepStats) g.stats = { dist: 0, syncs: 0, chain: 0, best: 0, anchors: 0, stumbles: 0, spans: 0, time: 0 };
      tut.shownText = false; tut.firstDraw = false; tut.firstCommit = false; tut.firstSync = false;
      tut.hint = ''; tut.hintT = 0;
      audio.setPhase(0, 0.4);
    }

    function start() {
      audio.unlock();
      resetRun(false);
      g.mode = 'play';
      ui.setScreen('none');
    }

    function pause(force) {
      if (g.mode === 'play' || force) {
        if (g.mode !== 'play') return;
        g.mode = 'pause';
        input.forceRelease();
        lines.cancelDraft(true);
        ui.setScreen('pause');
      } else if (g.mode === 'pause') {
        g.mode = 'play';
        ui.setScreen('none');
      }
    }

    /* --------------------------------------------------------- 输入绑定 */

    /* 真人输入与实机演示走同一条路径，保证演示里看到的判定就是真的判定 */

    function pressAt(wx, wy) {
      if (g.mode !== 'play') return false;
      if (sim.state === 'still') {          // 终局：任何输入都会让他重新起跑
        sim.stillT = 0;
        tut.hint = '他又动了。松手，让他停下来。';
        tut.hintT = 3;
        fx.shake(4);
        audio.stumble();
        return false;
      }
      const ok = lines.beginDraft(wx, wy, originList(), g.t);
      audio.drawStart();
      tut.firstDraw = true;
      if (!ok) { tut.hint = '从发亮的光头起手。'; tut.hintT = 2.4; }
      return ok;
    }

    function moveTo(wx, wy) {
      if (g.mode !== 'play' || !lines.draft.active) return;
      lines.extendDraft(wx, wy, world.anchors);
    }

    function releaseAt() {
      if (g.mode !== 'play' || !lines.draft.active) return null;
      return commitLine();
    }

    input.on('down', () => {
      if (g.mode === 'title') { start(); return; }
      if (g.mode === 'ending' || g.mode === 'over') return;
      if (g.mode !== 'play') return;
      if (demo && demo.active) { demo.handOver('玩家接管'); return; }   // 演示中真人一碰就交还控制权
      const w = toWorld(input.x, input.y);
      pressAt(w.x, w.y);
    });

    input.on('move', () => {
      if (g.mode !== 'play' || !lines.draft.active) return;
      const w = toWorld(input.x, input.y);
      moveTo(w.x, w.y);
    });

    input.on('up', () => { releaseAt(); });

    input.on('cancel', () => { lines.cancelDraft(true); audio.drawEnd(); });

    input.on('key', (code) => {
      if (demo && demo.active && (code === 'Space' || code === 'Enter')) { demo.handOver('玩家接管'); return; }
      if (code === 'Escape') { if (g.mode === 'play' || g.mode === 'pause') pause(); }
      else if (code === 'KeyR') { if (g.mode !== 'title') { audio.unlock(); resetRun(false); g.mode = 'play'; ui.setScreen('none'); } }
      else if (code === 'KeyM') { g.settings.mute = !g.settings.mute; audio.setMute(g.settings.mute); ui.syncSettings(g.settings); }
      else if (code === 'KeyH') { g.settings.contrast = !g.settings.contrast; ui.syncSettings(g.settings); }
      else if (code === 'KeyT') { g.settings.toggleMode = !g.settings.toggleMode; input.toggleMode = g.settings.toggleMode; ui.syncSettings(g.settings); }
      else if (code === 'KeyC') { g.settings.reduceMotion = !g.settings.reduceMotion; ui.syncSettings(g.settings); }
      else if (code === 'Enter') { if (g.mode === 'title') start(); }
    });

    /** 可以起手的「光头」列表 */
    const origins = [];
    function originList() {
      origins.length = 0;
      origins.push({ x: sim.x, y: sim.y - 22, kind: 'aga' });
      if (sim.surf && sim.surf.kind === 'platform') {
        origins.push({ x: world.right(sim.surf.p), y: world.top(sim.surf.p), kind: 'edge' });
      }
      for (const l of lines.lines) {
        if (l.broken || l.decaying) continue;
        const b = l.pts[l.pts.length - 1];
        origins.push({ x: b.x, y: b.y, kind: 'tip' });
      }
      return origins;
    }

    function hint(text, dur) { tut.hint = text; tut.hintT = dur == null ? 3 : dur; }

    function commitLine() {
      const d = lines.draft;
      const end = d.raw[d.raw.length - 1];
      const landing = end ? world.nearestLanding(end.x, end.y, lines.K.LAND_SNAP) : null;
      const sync = sim.prep && Math.abs(g.t - sim.lastBeat) < P.SYNC_WINDOW;
      const anchorsUsed = d.anchors.length;
      const line = lines.commit(g.t, { landing, sync });
      audio.drawEnd();
      if (!line) {
        audio.stumble();
        tut.hint = '这条线没有连上任何承重点。';
        tut.hintT = 2.2;
        return null;
      }
      tut.firstCommit = true;
      audio.commit(line.tension);
      audio.pulse();
      g.stats.anchors += anchorsUsed;
      const p0 = line.pts[0];
      fx.emit('spark', p0.x, p0.y, { count: 12, speed: 90, life: 0.5, r: 1.7, color: g.pal.glow, gravity: 10 });
      fx.ring(p0.x, p0.y, 6, 46, 0.5, g.pal.accent, 2);
      if (sync) {
        g.stats.syncs++;
        g.stats.chain++;
        g.stats.best = Math.max(g.stats.best, g.stats.chain);
        tut.firstSync = true;
        audio.sync(g.stats.chain);
        fx.screenFlash(0.34, g.pal.glow);
        fx.ring(sim.x, sim.y - 26, 10, 120, 0.7, '#ffffff', 2.5);
        fx.emit('spark', sim.x, sim.y - 22, { count: 22, speed: 150, life: 0.7, r: 2.1, color: '#ffffff', gravity: -20 });
        if (!g.settings.reduceMotion) fx.shake(3.5);
      } else if (sim.prep) {
        g.stats.chain = 0;
      }
      if (line.load > 1) { tut.hint = '这条线已经起毛了。借一个锚点，或者放松一点。'; tut.hintT = 3.2; }
      return line;
    }

    /* ------------------------------------------------------------ 模拟 */

    function step(dt) {
      const before = sim.state;
      sim.prep = false;

      if (sim.state === 'rest') {
        sim.speed = damp(sim.speed, 0, 6, dt);
        sim.s += sim.speed * dt;
        sim.restT -= dt;
        if (sim.restT <= 0) {
          sim.state = 'run';
          sim.speed = 40;
          if (sim.lastRestPlatform && sim.lastRestPlatform.terminal) sim.state = 'still';
        }
      } else if (sim.state === 'still') {
        sim.speed = damp(sim.speed, 0, 8, dt);
        sim.stillT += dt;
        if (sim.stillT >= 4.0) finish();
      } else if (sim.state === 'leap' || sim.state === 'fall') {
        ballistic(dt);
      } else if (sim.state === 'stagger') {
        sim.staggerT -= dt;
        const cont = findContinuation(sim.x, sim.y, sim.surf.l, sim.surf.p);
        if (cont && (cont.kind === 'line')) { attach(cont, Math.max(sim.speed, 120)); audio.land(0.6); }
        else if (sim.staggerT <= 0) {
          sim.state = 'leap';
          sim.vx = Math.max(70, sim.speed * 0.72);
          sim.vy = -30;
          audio.whoosh(0.7);
        }
      } else {
        onSurface(dt);
      }

      // 位置同步给角色
      if (sim.state !== 'leap' && sim.state !== 'fall' && sim.surf) {
        const pt = surfPoint(sim.surf, sim.s);
        sim.x = pt.x; sim.y = pt.y;
        aga.s.angle = Math.atan2(pt.ty, pt.tx);
      } else {
        aga.s.angle = damp(aga.s.angle, clamp(Math.atan2(sim.vy, Math.max(40, sim.vx)) * 0.5, -0.6, 0.6), 6, dt);
      }
      aga.s.x = sim.x; aga.s.y = sim.y;
      aga.s.speed = sim.speed;
      aga.s.state = sim.state;

      if (sim.y > worldFloor() && sim.state !== 'fall') triggerFall('坠落');
      if (before !== sim.state && sim.state === 'run') g.stats.spans++;
    }

    function worldFloor() {
      let m = -1e9;
      for (const p of world.platforms) m = Math.max(m, world.top(p));
      return m + P.FALL_MARGIN;
    }

    function onSurface(dt) {
      const su = sim.surf;
      const len = surfLen(su);
      const pt = surfPoint(su, sim.s);
      const slope = pt.ty;

      // 斜率是唯一的加速来源：下坡换速度，上坡换时间
      const drive = su.kind === 'line' ? 0.75 : 1;
      const settle = su.kind === 'line' ? P.SETTLE : P.PLATFORM_SETTLE;
      sim.speed += (slope * P.SLOPE_ACC - (sim.speed - P.BASE_SPEED * drive) * settle) * dt;
      sim.speed = clamp(sim.speed, P.MIN_SPEED, P.MAX_SPEED);
      sim.s += sim.speed * dt;

      // 过载的线在既定比例处断裂
      if (su.kind === 'line' && su.l.load > 1 && !su.l.broken) {
        if (su.l.breakAt !== Infinity && sim.s / (su.l.track.total || 1) >= su.l.breakAt) {
          lines.breakLine(su.l, su.l.breakAt);
          audio.snap();
          fx.shake(9);
          fx.screenFlash(0.2, g.pal.glow);
          const bp = su.l.track.at(su.l.breakAt * su.l.track.total);
          fx.emit('shard', bp.x, bp.y, { count: 16, speed: 220, life: 0.9, r: 1.6, color: g.pal.glow, gravity: 300, glow: false });
          sim.state = 'leap';
          sim.vx = pt.tx * sim.speed;
          sim.vy = pt.ty * sim.speed;
          sim.surf = { kind: 'none' };
          tut.hint = '线断在起毛的地方。';
          tut.hintT = 2.6;
          return;
        }
      }

      if (sim.s >= len) {
        const over = sim.s - len;
        const end = surfPoint(su, len);
        const cont = findContinuation(end.x, end.y, su.kind === 'line' ? su.l : null, su.kind === 'platform' ? su.p : null);
        if (cont) {
          if (su.kind === 'line') su.l.used = true;
          attach(cont, sim.speed);
          sim.s += over;
          audio.land(sim.speed / 220);
          fx.emit('spark', end.x, end.y, { count: 5, speed: 60, life: 0.35, r: 1.3, color: g.pal.glow });
          return;
        }
        if (su.kind === 'platform') {
          sim.s = len;
          sim.state = 'stagger';
          sim.staggerT = P.STAGGER;
          audio.stumble();
          return;
        }
        // 线的末端：按切向抛射，这就是「弹射」
        su.l.used = true;
        sim.state = 'leap';
        sim.vx = end.tx * sim.speed;
        sim.vy = end.ty * sim.speed - 40;
        sim.surf = { kind: 'none' };
        audio.whoosh(sim.speed / 200);
        return;
      }

      // 停息点
      if (su.kind === 'platform' && su.p.rest && !su.p.rested && sim.s > su.p.w * 0.45) {
        su.p.rested = true;
        sim.state = 'rest';
        sim.restT = su.p.terminal ? 2.0 : P.REST_DUR;
        sim.restIndex++;
        sim.lastRestPlatform = su.p;
        lines.budget = lines.K.BUDGET_MAX;
        aga.s.lampLight = Math.min(1, aga.s.lampLight + 0.13);
        const b = BEATS[Math.min(sim.restIndex, BEATS.length - 1)];
        if (b) { sim.dialog = b; sim.dialogT = 5.2; }
        audio.setPhase(g.district, 0.5);
      }
    }

    function ballistic(dt) {
      const steps = 5;
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const px = sim.x, py = sim.y;
        sim.vy += P.GRAVITY * h;
        sim.x += sim.vx * h;
        sim.y += sim.vy * h;
        if (sim.state === 'fall') continue;
        // 线：足够近就抓住（同时也是「主动自救」的表现）
        let hit = null, hd = 17;
        for (const l of lines.lines) {
          if (l.broken || l.decaying) continue;
          const n = l.pts.length;
          const limit = l.broken ? Math.floor(n * l.brokenFrac) : n;
          for (let k = 0; k < limit; k++) {
            const q = l.pts[k];
            const d = Math.hypot(q.x - sim.x, q.y - sim.y);
            if (d < hd) { hd = d; hit = { kind: 'line', l, s: l.track.cum[k] }; }
          }
        }
        if (hit) {
          const q = hit.l.track.at(hit.s);
          const v = Math.hypot(sim.vx, sim.vy);
          const proj = sim.vx * q.tx + sim.vy * q.ty;
          attach(hit, Math.max(100, Math.abs(proj) * 0.92 + v * 0.08));
          audio.land(0.9);
          fx.emit('spark', sim.x, sim.y, { count: 8, speed: 90, life: 0.4, r: 1.5, color: g.pal.glow });
          if (!g.settings.reduceMotion) fx.shake(2.5);
          return;
        }
        // 平台顶面
        if (sim.vy > 0) {
          for (const p of world.platforms) {
            const ty = world.top(p);
            if (py <= ty + 1 && sim.y >= ty && sim.x >= world.left(p) - 4 && sim.x <= world.right(p) + 4) {
              attach({ kind: 'platform', p, s: clamp(sim.x - world.left(p), 0, p.w) }, Math.max(110, sim.vx));
              audio.land(clamp(sim.vy / 320, 0.4, 1.5));
              fx.emit('spark', sim.x, ty, { count: 9, speed: 70, life: 0.45, r: 1.4, color: g.pal.ember, gravity: 120 });
              if (!g.settings.reduceMotion) fx.shake(clamp(sim.vy / 90, 0, 6));
              return;
            }
          }
        }
      }
    }

    /* ------------------------------------------------------------ 回溯 */

    function triggerFall(reason) {
      if (g.mode === 'rewind' || sim.state === 'fall') return;
      if (sim.protect > 0) {
        sim.protect--;
        const p = world.platformAt(sim.x, sim.y, 4000) || world.platforms[0];
        // 教程保护：城市替你接住一次
        attach({ kind: 'platform', p, s: clamp(sim.x - world.left(p), 20, p.w - 20) }, 130);
        tut.hint = '这一次城市接住了他。下一次不会。';
        tut.hintT = 3.4;
        fx.screenFlash(0.25, g.pal.accent);
        return;
      }
      sim.state = 'fall';
      g.stats.stumbles++;
      g.stats.chain = 0;
      // 同一断口连续三次失稳 -> 退回上一处停息台，而不是继续原地重复
      const node = Math.round(sim.x / 260);
      if (node === sim.failNode) sim.failCount++; else { sim.failNode = node; sim.failCount = 1; }
      audio.rewind();
      if (sim.failCount >= 3) {
        sim.failCount = 0;
        const back = lastRestBefore(sim.x);
        for (let i = lines.lines.length - 1; i >= 0; i--) lines.lines.splice(i, 1);
        attach({ kind: 'platform', p: back, s: Math.min(60, back.w * 0.2) }, 0);
        sim.state = 'rest';
        sim.restT = 1.6;
        lines.budget = lines.K.BUDGET_MAX;
        rew.clear();
        tut.hint = '连续三次失稳。退回上一处停息台，同一座城市，重来一次。';
        tut.hintT = 4.2;
        fx.screenFlash(0.3, g.pal.accent);
        return;
      }
      const found = rew.findSafe(g.t);
      if (!found) {  // 没有合法快照：不猜位置，直接重开本段
        tut.hint = '没有合法快照，重开本段。';
        tut.hintT = 3;
        const p = world.platforms[0];
        attach({ kind: 'platform', p, s: 100 }, 0);
        sim.state = 'rest'; sim.restT = 1.2;
        return;
      }
      rewindPlay = { frames: rew.tail(found.index), u: 1, dur: 0.85, target: found.snap, index: found.index, reason };
      g.mode = 'rewind';
    }

    /** 找到 x 之前最近的一处停息平台（起始平台永远合格） */
    function lastRestBefore(x) {
      let best = world.platforms[0];
      for (const p of world.platforms) {
        if (world.left(p) <= x && p.rest && !p.terminal) best = p;
      }
      return best;
    }

    function applySnapshot(s) {
      sim.state = s.state;
      sim.speed = s.speed;
      sim.x = s.x; sim.y = s.y;
      sim.vx = s.vx; sim.vy = s.vy;
      sim.s = s.s;
      sim.staggerT = 0;
      sim.restT = 0;
      sim.surf = s.surfKind === 'platform'
        ? { kind: 'platform', p: world.platforms[s.surfId] }
        : (s.surfKind === 'line' && lines.lines.indexOf(s.surfRef) >= 0
          ? { kind: 'line', l: s.surfRef }
          : { kind: 'platform', p: world.platforms[s.fallbackId] });
      if (sim.surf.kind === 'platform' && !sim.surf.p) sim.surf = { kind: 'platform', p: world.platforms[0] };
      lines.budget = s.budget;
      // 收回失败的线
      for (let i = lines.lines.length - 1; i >= 0; i--) {
        if (s.lineSet.indexOf(lines.lines[i]) < 0) lines.lines.splice(i, 1);
        else { lines.lines[i].broken = false; lines.lines[i].decaying = false; lines.lines[i].life = 1; }
      }
      // 被收回的线所借的锚点必须一并释放，否则锚点会永久失效
      for (const an of world.anchors) an.taken = false;
      for (const l of lines.lines) for (const an of l.anchors) an.taken = true;
      aga.s.x = sim.x; aga.s.y = sim.y;
      g.t = s.t;
    }

    function snapshot() {
      const su = sim.surf || { kind: 'none' };
      const grounded = (sim.state === 'run' || sim.state === 'rest') && su.kind === 'platform';
      return {
        t: g.t, state: sim.state, speed: sim.speed, x: sim.x, y: sim.y,
        vx: sim.vx, vy: sim.vy, s: sim.s,
        surfKind: su.kind, surfId: su.p ? world.platforms.indexOf(su.p) : -1,
        surfRef: su.l || null, fallbackId: 0,
        budget: lines.budget,
        lineSet: lines.lines.slice(),
        safe: grounded && sim.s > 6 && sim.s < su.p.w - 6,
        runway: grounded ? (su.p.w - sim.s) / Math.max(60, sim.speed) : 0,
      };
    }

    /* ---------------------------------------------------------- 导演层 */

    function directorUpdate(dt) {
      // 区段与相位
      const cur = sim.surf && sim.surf.kind === 'platform' ? sim.surf.p
        : world.platformAt(sim.x, sim.y + 400, 1e9) || null;
      let d = g.district;
      let nearest = null, nd = 1e9;
      for (const p of world.platforms) {
        const dx = Math.abs(world.left(p) + p.w / 2 - sim.x);
        if (dx < nd) { nd = dx; nearest = p; }
      }
      if (nearest) d = nearest.district;
      if (d !== g.district) {
        g.palFrom = currentPalette();
        g.palTo = PAL.PHASES[clamp(d, 0, 3)];
        g.palMix = 0;
        g.district = d;
        audio.setPhase(d, 0.5);
        ui.announce(PAL.PHASES[d].name, PAL.PHASES[d].breath, PAL.PHASES[d].motto);
      }
      g.palMix = Math.min(1, g.palMix + dt / 2.6);

      // 预读与节拍
      if ((sim.state === 'run' || sim.state === 'ride') && sim.surf) {
        const len = surfLen(sim.surf);
        const remain = len - sim.s;
        const tte = remain / Math.max(30, sim.speed);
        const end = surfPoint(sim.surf, len);
        const cont = findContinuation(end.x, end.y, sim.surf.l, sim.surf.p);
        if (!cont && tte < P.PREP_LEAD) {
          sim.prep = true;
          sim.prepT = tte;
          if (!sim.tapped && tte < 1.15) { aga.tapToes(); sim.tapped = true; }
        } else {
          sim.tapped = false;
        }
      }

      // 记忆物只在停息时显影
      for (const p of world.platforms) {
        if (!p.memory) continue;
        const near = Math.abs(sim.x - (world.left(p) + p.w * 0.6)) < 380 && (sim.state === 'rest' || sim.state === 'still');
        p.memoryVis = damp(p.memoryVis || 0, near ? 1 : (Math.abs(sim.x - world.left(p)) < 700 ? 0.18 : 0), 2.2, dt);
      }

      // 身体提示
      const tells = { lean: 0, crouch: 0, armSpread: 0, reach: 0, flail: 0, lookAmt: 0.4, lookX: 1, lookY: 0 };
      const dr = lines.draft;
      if (dr.active && dr.valid) {
        if (dr.tension > 0.93) { tells.lean = -0.8; tells.armSpread = 1; }
        else if (dr.tension < 0.72) { tells.lean = 0.6; tells.reach = 1; }
        else { tells.lean = 0.15; }
        const e = dr.raw[dr.raw.length - 1];
        if (e) {
          const dx = e.x - sim.x, dy = e.y - sim.y + 30;
          const l = Math.hypot(dx, dy) || 1;
          tells.lookX = dx / l; tells.lookY = dy / l; tells.lookAmt = 1;
        }
      } else {
        // 看向下一个锚点或断口
        let target = null, bd = 1400;
        for (const a of world.anchors) {
          if (a.x < sim.x - 40) continue;
          const d2 = Math.hypot(a.x - sim.x, a.y - sim.y);
          if (d2 < bd) { bd = d2; target = a; }
        }
        if (target) {
          const dx = target.x - sim.x, dy = target.y - sim.y + 30;
          const l = Math.hypot(dx, dy) || 1;
          tells.lookX = dx / l; tells.lookY = dy / l; tells.lookAmt = sim.prep ? 1 : 0.55;
        }
      }
      if (sim.prep) {
        const beatDist = Math.abs(g.t - sim.lastBeat);
        tells.crouch = sat(1 - beatDist / 0.34);
      }
      if (sim.state === 'stagger' || sim.state === 'fall') { tells.flail = 1; tells.lean = -0.4; }
      if (sim.state === 'rest' || sim.state === 'still') { tells.lookAmt = 0.5; tells.lookX = -0.6; tells.lookY = -0.2; }
      aga.setTells(tells);

      // 教程提示
      if (!tut.firstDraw && g.t > 6 && sim.state !== 'rest') tut.idleGhost = Math.min(1, tut.idleGhost + dt);
      else tut.idleGhost = Math.max(0, tut.idleGhost - dt * 2);
      if (!tut.shownText && input.idle > 12 && !tut.firstDraw) {
        tut.shownText = true;
        tut.hint = '按住光头，拖出一条线，随他的脚步松开。';
        tut.hintT = 6;
      }
      if (tut.hintT > 0) tut.hintT -= dt;
      if (sim.dialogT > 0) sim.dialogT -= dt;
    }

    function finish() {
      g.mode = 'ending';
      sim.endT = 0;
      aga.s.lampLight = 1;
      // 天亮：世界终于把那口气呼出来
      g.palFrom = currentPalette();
      g.palTo = PAL.DAYBREAK;
      g.palMix = 0;
      audio.chord();
      fx.screenFlash(0.55, '#ffffff');
      for (const gh of lines.ghosts) gh.a = 1;
      ui.showEnding(g.stats, false);
    }

    function currentPalette() {
      const p = g.palMix >= 1 ? g.palTo : PAL.blend(g.palFrom, g.palTo, ease.inOutCubic(g.palMix));
      return PAL.applyContrast(p, g.settings.contrast);
    }

    /* ------------------------------------------------------------ 主循环 */

    function update(dt) {
      g.real += dt;
      input.update(dt);
      fps = lerp(fps, 1 / Math.max(dt, 1e-4), 0.05);

      if (g.mode === 'rewind') {
        rewindPlay.u -= dt / rewindPlay.dur;
        if (rewindPlay.u <= 0) {
          applySnapshot(rewindPlay.target);
          rew.truncate(rewindPlay.index);
          rewindPlay = null;
          g.mode = 'play';
          fx.screenFlash(0.2, g.pal.accent);
        }
        world.update(g.t, g.pal.breathAmp, g.settings.reduceMotion ? 0.35 : 1);
        updateCamera(dt, true);
        fx.update(dt);
        return;
      }

      if (g.mode === 'title') {
        g.t += dt;
        world.update(g.t, 0.8, 1);
        aga.s.x = 0; aga.s.y = 0; aga.s.state = 'idle'; aga.s.speed = 0;
        aga.update(dt, {});
        fx.update(dt);
        updateCamera(dt, true);
        return;
      }

      if (g.mode === 'ending') {
        sim.endT += dt;
        g.t += dt * 0.4;
        g.palMix = Math.min(1, g.palMix + dt / 5.5);
        g.pal = currentPalette();
        world.update(g.t, 0.15, g.settings.reduceMotion ? 0.3 : 1);
        aga.s.state = 'idle';
        aga.update(dt, {});
        if (sim.endT < 6 && Math.random() < dt * 14) {
          fx.emit('mote', sim.x + (Math.random() - 0.5) * 700, sim.y - Math.random() * 420,
            { count: 1, speed: 12, life: 3.4, r: 1.7, color: g.pal.ember, gravity: -8 });
        }
        fx.update(dt);
        updateCamera(dt, false);
        return;
      }

      if (g.mode !== 'play') { fx.update(dt); return; }

      g.t += dt;
      g.stats.time += dt;
      world.update(g.t, g.pal.breathAmp, g.settings.reduceMotion ? 0.35 : 1);
      step(dt);

      const stepped = aga.update(dt, {
        onToeTap: (n) => audio.toeTap(n === 1),
      });
      if (stepped) {
        sim.lastBeat = g.t;
        audio.footstep(clamp(sim.speed / 200, 0.35, 1.4));
        if (sim.state === 'run' || sim.state === 'ride') {
          fx.emit('mote', sim.x - 6, sim.y - 2, { count: 2, speed: 26, life: 0.55, r: 1.1, color: g.pal.ember, gravity: -12 });
        }
      }

      if (lines.draft.active) {
        audio.drawUpdate(lines.draft.tension, lines.draft.load);
      }
      lines.update(dt, sim.surf && sim.surf.l);
      fx.update(dt);
      rew.capture(dt, snapshot());
      directorUpdate(dt);
      if (demo && demo.active) demo.update(dt);
      g.stats.dist = Math.max(g.stats.dist, (sim.x + 520) / 100);
      g.pal = currentPalette();
      updateCamera(dt, false);

      // 无尽回响：接近尽头时继续生成
      if (g.endless && sim.x > world.endX - 2600) world.extend();
    }

    function updateCamera(dt, soft) {
      const drawing = lines.draft.active;
      const w = drawing ? toWorld(input.x, input.y) : null;
      let tx = sim.x + clamp(sim.speed * 0.62, 40, 210);
      let ty = sim.y - 66;
      // 标题：把阿迦框到右下三分之一，给标题文字留出干净的空间
      if (g.mode === 'title') { tx = -g.W * 0.24 / g.cam.zoom; ty = -g.H * 0.38 / g.cam.zoom; }
      if (w) { tx = lerp(tx, (tx + w.x) / 2, 0.55); ty = lerp(ty, (ty + w.y) / 2, 0.5); }
      // 断口越大，视野越开
      let gapAhead = 0;
      if (sim.surf && sim.surf.kind === 'platform' && sim.surf.p) {
        const rx = world.right(sim.surf.p);
        let nx = rx + 900;
        for (const p of world.platforms) {
          const lx = world.left(p);
          if (lx > rx + 20 && lx < nx) nx = lx;
        }
        gapAhead = clamp(nx - rx, 0, 900);
      }
      let z = 1.02 - sim.speed / 2400 - gapAhead / 5200;
      if (sim.state === 'rest' || sim.state === 'still') z = 1.16;
      if (g.mode === 'ending') z = lerp(1.16, 0.7, sat(sim.endT / 9));
      if (g.mode === 'title') z = 1.25;
      const smallSide = Math.min(g.W / 1280, g.H / 720);
      z *= clamp(smallSide, 0.62, 1.35);
      g.cam.tz = clamp(z, 0.42, 1.6);
      const k = soft ? 2.4 : (sim.state === 'rest' ? 2.2 : 4.6);
      g.cam.x = damp(g.cam.x, tx, k, dt);
      g.cam.y = damp(g.cam.y, ty, k * 0.8, dt);
      g.cam.zoom = damp(g.cam.zoom, g.cam.tz, 2.0, dt);
      g.cam.t = g.t;
    }

    /* -------------------------------------------------------------- 渲染 */

    function render() {
      const W = g.W, H = g.H;
      const pal = g.pal;
      const q = g.settings.quality;
      const gctx = q > 0 ? fx.ensureGlow(W, H, g.dpr, q) : null;

      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      backdrop.sky(ctx, W, H, pal, g.cam);
      backdrop.stars(ctx, W, H, pal, g.cam, g.t, q);
      if (q > 0) {
        backdrop.aurora(ctx, W, H, pal, g.cam, g.t, g.settings.contrast ? 0.5 : 1);
        backdrop.shafts(ctx, W, H, pal, g.cam, g.t, g.settings.contrast ? 0.35 : 1);
      }
      for (const L of backdrop.LAYERS) backdrop.cityLayer(ctx, W, H, pal, g.cam, g.t, L, pal.breathAmp, q);
      backdrop.abyss(ctx, W, H, pal, g.cam, g.t, (wy) => toScreen(0, wy).y);

      const sh = fx.shakeOffset(g.settings.reduceMotion);
      const z = g.cam.zoom;
      ctx.save();
      ctx.translate(W / 2 + sh.x, H / 2 + sh.y);
      ctx.scale(z, z);
      ctx.translate(-g.cam.x, -g.cam.y);
      if (gctx) {
        gctx.save();
        gctx.translate(W / 2 + sh.x, H / 2 + sh.y);
        gctx.scale(z, z);
        gctx.translate(-g.cam.x, -g.cam.y);
      }

      lines.drawGhosts(ctx, pal, z);

      const vx0 = g.cam.x - W / 2 / z - 200, vx1 = g.cam.x + W / 2 / z + 200;
      for (const p of world.platforms) {
        if (world.right(p) < vx0 || world.left(p) > vx1) continue;
        world.drawPlatform(ctx, gctx, p, pal, g.t, z, { quality: q });
      }

      const pw = lines.draft.active ? toWorld(input.x, input.y) : { x: sim.x, y: sim.y };
      for (const a of world.anchors) {
        if (a.x < vx0 || a.x > vx1) continue;
        const near = sat(1 - Math.hypot(a.x - pw.x, a.y - pw.y) / 180);
        world.drawAnchor(ctx, gctx, a, pal, g.t, z, near);
      }

      for (const l of lines.lines) lines.drawLine(ctx, gctx, l, pal, g.t, z, {});
      lines.drawDraft(ctx, gctx, pal, g.t, z);

      if (q > 0) fx.drawMotes(ctx, (x, y) => ({ x, y }), 1, pal, g.t);
      drawLightHead(ctx, gctx, pal, z);
      drawBeatRing(ctx, gctx, pal, z);

      // 阿迦
      if (g.mode !== 'rewind') {
        drawAga(ctx, gctx, pal, z);
      } else {
        drawRewindTrail(ctx, gctx, pal, z);
      }

      fx.drawParticles(ctx, gctx, (x, y) => ({ x, y }), 1);
      fx.drawRings(ctx, gctx, (x, y) => ({ x, y }), 1);

      if (gctx) gctx.restore();
      ctx.restore();

      if (gctx) fx.compositeGlow(ctx, W, H, g.settings.contrast ? 0.7 : 1);
      backdrop.foreground(ctx, W, H, pal, g.cam, g.t, q);
      fx.post(ctx, W, H, pal, { grain: q > 0 && !g.settings.reduceMotion, contrast: g.settings.contrast });

      if (demo && demo.active) demo.draw(ctx, pal, g.cam.zoom, toScreen);
      if (g.mode === 'play' || g.mode === 'rewind') drawHud(ctx, W, H, pal);
      if (g.mode === 'ending') drawEndingScene(ctx, W, H, pal);
      if (g.mode === 'title') drawTitleScene(ctx, W, H, pal);
    }

    function drawAga(ctx2, gctx2, pal, z) {
      const s = aga.s;
      const rim = clamp(0.6 + (sim.surf && sim.surf.kind === 'line' ? 0.6 : 0.25) + (lines.draft.active ? 0.3 : 0), 0, 1.5);
      const scale = 1.14;
      for (const target of gctx2 ? [ctx2, gctx2] : [ctx2]) {
        target.save();
        target.translate(s.x, s.y);
        target.rotate(clamp(s.angle, -0.9, 0.9));
        target.scale(scale, scale);
        if (target === gctx2) {
          // 辉光缓冲这一遍只画接触辉光与灯光
          aga.draw(target, null, pal, { contrast: g.settings.contrast, rim: 0, glowOnly: true });
        } else {
          // 主画布这一遍只画剪影与边缘光，不再碰辉光缓冲
          aga.draw(target, null, pal, { contrast: g.settings.contrast, rim });
        }
        target.restore();
      }
    }

    /** 活动光头：教玩家「从这里起手」的唯一视觉承诺 */
    function drawLightHead(ctx2, gctx2, pal, z) {
      if (g.mode !== 'play' || lines.draft.active) return;
      const list = originList();
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        const primary = o.kind === 'edge' || (list.length === 1);
        const pulse = 0.5 + 0.5 * Math.sin(g.t * 3.4 - i);
        const r = (primary ? 5.5 : 3.4) * (0.85 + pulse * 0.3) * z;
        const target = gctx2 || ctx2;
        target.globalAlpha = primary ? 0.85 : 0.4;
        const gr = target.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 7);
        gr.addColorStop(0, rgba(pal.glow, 0.85));
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        target.fillStyle = gr;
        target.beginPath(); target.arc(o.x, o.y, r * 7, 0, TAU); target.fill();
        target.globalAlpha = 1;
        ctx2.fillStyle = rgba('#ffffff', primary ? 0.95 : 0.5);
        ctx2.beginPath(); ctx2.arc(o.x, o.y, r * 0.55, 0, TAU); ctx2.fill();
        if (primary) {
          ctx2.strokeStyle = rgba(pal.glow, 0.35 * (1 - pulse));
          ctx2.lineWidth = 1.4 * z;
          ctx2.beginPath(); ctx2.arc(o.x, o.y, r + pulse * 16 * z, 0, TAU); ctx2.stroke();
        }
      }
    }

    /** 释放窗口：围绕阿迦收缩的环，在脚步拍上闭合（形状信息，不依赖颜色） */
    function drawBeatRing(ctx2, gctx2, pal, z) {
      if (!sim.prep || g.mode !== 'play') return;
      const since = g.t - sim.lastBeat;
      const period = 0.5;
      const u = sat(since / period);
      const r = lerp(58, 17, ease.outCubic(u)) * z;
      const hit = since < P.SYNC_WINDOW;
      ctx2.save();
      ctx2.strokeStyle = rgba(hit ? '#ffffff' : pal.glow, hit ? 0.95 : 0.42);
      ctx2.lineWidth = (hit ? 2.6 : 1.5) * z;
      ctx2.setLineDash(hit ? [] : [4 * z, 5 * z]);
      ctx2.beginPath();
      ctx2.arc(sim.x, sim.y - 30, r, 0, TAU);
      ctx2.stroke();
      // 内圈标出窗口本身的大小
      ctx2.setLineDash([]);
      ctx2.globalAlpha = 0.5;
      ctx2.lineWidth = 1 * z;
      ctx2.beginPath();
      ctx2.arc(sim.x, sim.y - 30, 17 * z, 0, TAU);
      ctx2.stroke();
      ctx2.restore();
    }

    function drawRewindTrail(ctx2, gctx2, pal, z) {
      if (!rewindPlay) return;
      const fr = rewindPlay.frames;
      const idx = clamp(Math.floor(rewindPlay.u * (fr.length - 1)), 0, fr.length - 1);
      for (let i = fr.length - 1; i >= idx; i--) {
        const f = fr[i];
        const a = 0.1 + 0.5 * (1 - (i - idx) / Math.max(1, fr.length - idx));
        ctx2.globalAlpha = a * 0.5;
        ctx2.fillStyle = mix(pal.near, '#000000', 0.3);
        ctx2.beginPath();
        ctx2.ellipse(f.x, f.y - 32, 7, 30, 0, 0, TAU);
        ctx2.fill();
      }
      ctx2.globalAlpha = 1;
      const f = fr[idx];
      aga.s.x = f.x; aga.s.y = f.y;
      ctx2.save();
      ctx2.translate(f.x, f.y);
      aga.draw(ctx2, null, pal, { contrast: g.settings.contrast, rim: 0.3 });
      ctx2.restore();
    }

    /* ------------------------------------------------------------- HUD */

    function text(ctx2, str, x, y, size, color, align, font, weight, spacing) {
      ctx2.save();
      ctx2.font = (weight || '400') + ' ' + size + 'px ' + (font || PAL.TYPE.ui);
      ctx2.textAlign = align || 'left';
      ctx2.textBaseline = 'alphabetic';
      ctx2.fillStyle = color;
      if (spacing) {
        const chars = String(str).split('');
        let total = 0;
        for (const c of chars) total += ctx2.measureText(c).width + spacing;
        total -= spacing;
        let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
        ctx2.textAlign = 'left';
        for (const c of chars) {
          ctx2.fillText(c, cx, y);
          cx += ctx2.measureText(c).width + spacing;
        }
      } else {
        ctx2.fillText(str, x, y);
      }
      ctx2.restore();
    }

    function drawHud(ctx2, W, H, pal) {
      const pad = Math.round(Math.min(W, H) * 0.045);
      // 演示面板占着屏幕底部，画布上的读数整体上移，避免叠字
      const lift = demo && demo.active ? 118 : 0;
      const ink = 'rgba(255,255,255,0.86)';
      const dim = 'rgba(255,255,255,0.42)';

      // 左上：区名 + 呼吸标记
      const ph = PAL.PHASES[clamp(g.district, 0, 3)];
      const breathe = 0.5 + 0.5 * Math.sin(g.t * ph.breathRate * TAU);
      ctx2.save();
      ctx2.strokeStyle = rgba(pal.accent, 0.55);
      ctx2.lineWidth = 1.2;
      ctx2.beginPath();
      ctx2.arc(pad + 8, pad + 6, 6 + breathe * 7, 0, TAU);
      ctx2.stroke();
      ctx2.fillStyle = rgba(pal.glow, 0.5 + breathe * 0.4);
      ctx2.beginPath();
      ctx2.arc(pad + 8, pad + 6, 2.4, 0, TAU);
      ctx2.fill();
      ctx2.restore();
      text(ctx2, ph.name, pad + 26, pad + 4, 15, ink, 'left', PAL.TYPE.display, '400', 3);
      text(ctx2, ph.breath, pad + 26, pad + 22, 10.5, dim, 'left', PAL.TYPE.ui, '400', 4);

      // 右上：距离 / 同步链
      text(ctx2, Math.floor(g.stats.dist) + ' m', W - pad, pad + 6, 17, ink, 'right', PAL.TYPE.display, '400', 1);
      if (g.stats.chain > 0) {
        text(ctx2, '同步 ×' + g.stats.chain, W - pad, pad + 26, 11.5, rgba(pal.glow, 0.9), 'right', PAL.TYPE.ui, '400', 2);
      } else if (g.stats.syncs > 0) {
        text(ctx2, '同步 ' + g.stats.syncs, W - pad, pad + 26, 11.5, dim, 'right', PAL.TYPE.ui, '400', 2);
      }

      // 光量：跟随指针的弧
      if (input.inside && g.mode === 'play') {
        const bx = input.x, by = input.y;
        const u = lines.budget / lines.K.BUDGET_MAX;
        ctx2.save();
        ctx2.lineCap = 'round';
        ctx2.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx2.lineWidth = 2.2;
        ctx2.beginPath(); ctx2.arc(bx, by, 19, -Math.PI * 0.5, Math.PI * 1.5); ctx2.stroke();
        ctx2.strokeStyle = rgba(u < 0.22 ? pal.glow : pal.accent, u < 0.22 ? 0.95 : 0.65);
        ctx2.lineWidth = 2.6;
        ctx2.beginPath(); ctx2.arc(bx, by, 19, -Math.PI * 0.5, -Math.PI * 0.5 + TAU * u); ctx2.stroke();
        // 中心点：抓取有效时实心
        const wpt = toWorld(bx, by);
        let grabbable = false;
        for (const o of originList()) if (Math.hypot(o.x - wpt.x, o.y - wpt.y) < lines.K.GRAB_RADIUS) grabbable = true;
        ctx2.fillStyle = grabbable ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.28)';
        ctx2.beginPath(); ctx2.arc(bx, by, grabbable ? 3 : 1.8, 0, TAU); ctx2.fill();
        ctx2.restore();
      }

      // 张力读数：只在拖动时出现，且以形状为主
      if (lines.draft.active && lines.draft.valid) {
        const d = lines.draft;
        const bx = W / 2, by = H - pad - 34 - lift;
        const label = LL.rules.tensionLabel(d.tension);
        const over = d.load > 1;
        ctx2.save();
        ctx2.globalAlpha = 0.9;
        // 张力条：长度 = tension，锯齿 = load
        const bw = 168;
        ctx2.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx2.lineWidth = 1;
        ctx2.beginPath(); ctx2.moveTo(bx - bw / 2, by); ctx2.lineTo(bx + bw / 2, by); ctx2.stroke();
        ctx2.strokeStyle = rgba(pal.glow, 0.9);
        ctx2.lineWidth = 2.4;
        ctx2.beginPath();
        const seg = 26;
        for (let i = 0; i <= seg; i++) {
          const u = i / seg;
          const x = bx - bw / 2 + bw * u * d.tension;
          const amp = Math.max(0, d.load - 0.6) * 8;
          const y = by + Math.sin(u * 22 + g.real * 22) * amp;
          if (i === 0) ctx2.moveTo(x, y); else ctx2.lineTo(x, y);
        }
        ctx2.stroke();
        text(ctx2, label, bx - bw / 2 - 16, by + 5, 13, 'rgba(255,255,255,0.75)', 'right', PAL.TYPE.display);
        text(ctx2, over ? '过载' : (d.anchors.length ? '借锚 ×' + d.anchors.length : ''), bx + bw / 2 + 16, by + 5, 11.5,
          over ? rgba(pal.glow, 0.95) : 'rgba(255,255,255,0.55)', 'left', PAL.TYPE.ui, '400', 2);
        ctx2.restore();
      }

      // 手势幽灵（长时间无输入）
      if (tut.idleGhost > 0.05 && !tut.firstDraw && !(demo && demo.active)) {
        const a = tut.idleGhost * 0.55;
        const u = (g.real * 0.45) % 1;
        const s0 = toScreen(sim.x + 40, sim.y - 20);
        const s1 = toScreen(sim.x + 320, sim.y - 150);
        ctx2.save();
        ctx2.globalAlpha = a;
        ctx2.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx2.lineWidth = 1.6;
        ctx2.setLineDash([4, 6]);
        ctx2.beginPath();
        ctx2.moveTo(s0.x, s0.y);
        ctx2.quadraticCurveTo((s0.x + s1.x) / 2, s0.y - 90, s1.x, s1.y);
        ctx2.stroke();
        ctx2.setLineDash([]);
        const t2 = ease.inOutCubic(u);
        const mx = lerp(lerp(s0.x, (s0.x + s1.x) / 2, t2), lerp((s0.x + s1.x) / 2, s1.x, t2), t2);
        const my = lerp(lerp(s0.y, s0.y - 90, t2), lerp(s0.y - 90, s1.y, t2), t2);
        ctx2.fillStyle = 'rgba(255,255,255,0.85)';
        ctx2.beginPath(); ctx2.arc(mx, my, 5, 0, TAU); ctx2.fill();
        ctx2.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx2.beginPath(); ctx2.arc(mx, my, 5 + (1 - u) * 10, 0, TAU); ctx2.stroke();
        ctx2.restore();
      }

      // 对白 / 提示
      if (sim.dialog && sim.dialogT > 0) {
        const a = sat(sim.dialogT / 0.8) * sat((5.2 - sim.dialogT) / 0.5);
        ctx2.globalAlpha = a;
        text(ctx2, sim.dialog[0], W / 2, H - pad - 78 - lift, 17, 'rgba(255,255,255,0.9)', 'center', PAL.TYPE.display, '400', 2);
        if (sim.dialog[1]) text(ctx2, sim.dialog[1], W / 2, H - pad - 52 - lift, 17, 'rgba(255,255,255,0.72)', 'center', PAL.TYPE.display, '400', 2);
        ctx2.globalAlpha = 1;
      } else if (tut.hintT > 0) {
        ctx2.globalAlpha = sat(tut.hintT / 0.6);
        text(ctx2, tut.hint, W / 2, H - pad - 62 - lift, 13, 'rgba(255,255,255,0.66)', 'center', PAL.TYPE.ui, '400', 2);
        ctx2.globalAlpha = 1;
      }

      // 终局：不要输入
      if (sim.state === 'still') {
        const left = Math.max(0, 4.0 - sim.stillT);
        ctx2.save();
        ctx2.globalAlpha = 0.85;
        text(ctx2, '不要输入', W / 2, H - pad - 100, 15, 'rgba(255,255,255,0.8)', 'center', PAL.TYPE.display, '400', 6);
        const bw = 150;
        ctx2.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx2.lineWidth = 1.5;
        ctx2.beginPath(); ctx2.moveTo(W / 2 - bw / 2, H - pad - 84); ctx2.lineTo(W / 2 + bw / 2, H - pad - 84); ctx2.stroke();
        ctx2.strokeStyle = rgba(pal.glow, 0.9);
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        ctx2.moveTo(W / 2 - bw / 2, H - pad - 84);
        ctx2.lineTo(W / 2 - bw / 2 + bw * (1 - left / 4), H - pad - 84);
        ctx2.stroke();
        ctx2.restore();
      }

      if (g.mode === 'rewind') {
        ctx2.save();
        ctx2.globalAlpha = 0.75;
        text(ctx2, '回溯', W / 2, H * 0.5 - 10, 14, 'rgba(255,255,255,0.7)', 'center', PAL.TYPE.display, '400', 8);
        text(ctx2, rewindPlay ? rewindPlay.reason + ' · 时间与光线一并收回' : '', W / 2, H * 0.5 + 14, 11, 'rgba(255,255,255,0.42)', 'center', PAL.TYPE.ui, '400', 2);
        ctx2.restore();
      }
    }

    /** 终局：留下的灯与所有走过的线一起亮起来 */
    function drawEndingScene(ctx2, W, H, pal) {
      const u = sat(sim.endT / 5.5);
      ctx2.save();
      ctx2.globalCompositeOperation = 'lighter';
      ctx2.globalAlpha = ease.inOutCubic(u) * 0.34;
      const gd = ctx2.createLinearGradient(W, H * 0.2, 0, H);
      gd.addColorStop(0, rgba(pal.skyLow, 0.9));
      gd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx2.fillStyle = gd;
      ctx2.fillRect(0, 0, W, H);
      ctx2.restore();
      if (sim.endT > 1.2 && sim.endT < 6.2) {
        ctx2.globalAlpha = sat((sim.endT - 1.2) / 1.6) * sat((6.2 - sim.endT) / 1.0) * 0.8;
        text(ctx2, '留下光', W / 2, H * 0.5, 18, 'rgba(255,255,255,0.9)', 'center', PAL.TYPE.display, '400', 10);
        ctx2.globalAlpha = 1;
      }
    }

    function drawTitleScene(ctx2, W, H, pal) {
      // 标题由 DOM 承担；这里只画一层压暗与地平线
      const gd = ctx2.createLinearGradient(0, 0, 0, H);
      gd.addColorStop(0, 'rgba(0,0,0,0.35)');
      gd.addColorStop(0.55, 'rgba(0,0,0,0.1)');
      gd.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx2.fillStyle = gd;
      ctx2.fillRect(0, 0, W, H);
    }

    /* ------------------------------------------------------------- 外部 */

    function resize(W, H, dpr) {
      g.W = W; g.H = H; g.dpr = dpr;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
    }

    const api = {
      g, sim, world, lines, fx, aga, audio, input,
      update, render, resize, start,
      pause: () => pause(),
      resume: () => { if (g.mode === 'pause') { g.mode = 'play'; ui.setScreen('none'); } },
      restart: () => { audio.unlock(); resetRun(false); g.mode = 'play'; ui.setScreen('none'); },
      startDemo: () => {
        audio.unlock();
        resetRun(false);
        g.mode = 'play';
        ui.setScreen('none');
        tut.firstDraw = true;      // 演示本身就是示范，不再叠加手势幽灵
        demo.start();
      },
      stopDemo: () => { if (demo) demo.handOver('玩家结束演示'); },
      get demoActive() { return !!(demo && demo.active); },
      endless: () => {
        audio.unlock();
        resetRun(false);
        g.endless = true;
        world.extend();
        g.mode = 'play';
        ui.setScreen('none');
        tut.hint = '无尽回响：城市不再有终点。';
        tut.hintT = 4;
      },
      applySettings(s) {
        Object.assign(g.settings, s);
        input.toggleMode = g.settings.toggleMode;
        audio.setMute(g.settings.mute);
      },
      get palette() { return g.pal; },
    };
    api.toScreen = toScreen;
    api.toWorld = toWorld;
    demo = LL.createDemo({
      world, lines, sim, g, ui, hint,
      pressAt, moveTo, releaseAt,
      SYNC_WINDOW: P.SYNC_WINDOW,
    });
    api.demo = demo;
    resetRun(false);
    g.mode = 'title';
    return api;
  }

  LL.createGame = createGame;
})(typeof window !== 'undefined' ? window : globalThis);
