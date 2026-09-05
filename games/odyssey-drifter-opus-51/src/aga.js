/**
 * aga.js — NPC 阿迦：程序化骨骼、跑动周期、布料与身体提示
 *
 * 五类身体提示全部由几何代理表达（不依赖成品动画）：
 *   1 空间目标：头胸朝向下一个落点或锚点
 *   2 过紧：后仰 + 张臂支撑
 *   3 过松：前倾 + 单臂前伸
 *   4 释放窗口：脚尖两拍 + 压低重心
 *   5 失衡：张臂摆动 + 躯干旋转 + 碎步
 * 每一类都同时有几何运动与声音/形状冗余，静音与色盲下都成立。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const C = LL.core;
  const { clamp, sat, lerp, damp, rgba, mix, TAU, ease } = C;

  const L1 = 17, L2 = 17;   // 大腿 / 小腿
  const A1 = 13, A2 = 12;   // 上臂 / 前臂
  const HIP_Y = -34, CHEST_Y = -53, HEAD_Y = -65, HEAD_R = 6.4;

  /** 两骨 IK：返回中间关节位置 */
  function ik(ax, ay, bx, by, l1, l2, bend) {
    let dx = bx - ax, dy = by - ay;
    let d = Math.hypot(dx, dy) || 1e-4;
    const ux = dx / d, uy = dy / d;
    d = Math.min(d, l1 + l2 - 0.01);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const mx = ax + ux * a, my = ay + uy * a;
    return { jx: mx - uy * h * bend, jy: my + ux * h * bend, ex: ax + ux * d, ey: ay + uy * d };
  }

  function createAga(seed) {
    const noise = C.makeNoise(seed + 3);

    const a = {
      // 世界状态由 game 驱动
      x: 0, y: 0, angle: 0, speed: 0, facing: 1,
      state: 'idle',
      gait: 0,            // 0..1 单步相位
      stride: 15,
      // 姿态参数（全部平滑逼近）
      lean: 0, crouch: 0, armSpread: 0, reach: 0, flail: 0,
      lookX: 1, lookY: 0, lookAmt: 0,
      bodyRot: 0, breath: 0,
      lampLight: 0.06,     // 旧灯：从不发光开始
      toeTap: 0, toeTapN: 0,
      // 布料
      coat: [], coatInit: false,
      // 内部
      t: 0, footPrev: 0, lastStepAt: -1, blink: 0, blinkTimer: 2,
      contactY: 0,
    };

    const target = {
      lean: 0, crouch: 0, armSpread: 0, reach: 0, flail: 0,
      lookX: 1, lookY: 0, lookAmt: 0, bodyRot: 0,
    };

    function initCoat() {
      a.coat = [];
      for (let i = 0; i < 7; i++) a.coat.push({ x: a.x, y: a.y + CHEST_Y, px: a.x, py: a.y + CHEST_Y });
      a.coatInit = true;
    }

    /** 每帧由 game 设置意图；这里只做平滑与自动化细节 */
    function setTells(t) {
      if (t.lean != null) target.lean = t.lean;
      if (t.crouch != null) target.crouch = t.crouch;
      if (t.armSpread != null) target.armSpread = t.armSpread;
      if (t.reach != null) target.reach = t.reach;
      if (t.flail != null) target.flail = t.flail;
      if (t.lookAmt != null) target.lookAmt = t.lookAmt;
      if (t.lookX != null) { target.lookX = t.lookX; target.lookY = t.lookY || 0; }
    }

    /** 触发脚尖两拍暗号 */
    function tapToes() { a.toeTap = 1; a.toeTapN = 0; }

    function update(dt, env) {
      a.t += dt;
      if (!a.coatInit) initCoat();

      // ---- 步态：速度驱动的步频，是全局节拍来源
      const running = a.state === 'run' || a.state === 'ride' || a.state === 'stagger';
      const cadence = running ? clamp(0.5 + a.speed / 210, 0.55, 3.1) : (a.state === 'rest' ? 0.34 : 0);
      const prev = a.gait;
      a.gait = (a.gait + cadence * dt) % 1;
      a.stride = lerp(9, 22, sat(a.speed / 320));

      // 落脚事件（两只脚各一次）
      let stepped = 0;
      if (running) {
        if (prev < 0.5 && a.gait >= 0.5) stepped = 1;
        else if (prev > a.gait) stepped = 2;
      }

      // ---- 呼吸 / 眨眼
      a.breath = Math.sin(a.t * (running ? 3.4 : 1.15)) * 0.5 + 0.5;
      a.blinkTimer -= dt;
      if (a.blinkTimer <= 0) { a.blink = 0.16; a.blinkTimer = 1.8 + noise.n1(a.t) * 2.5 + 1.5; }
      a.blink = Math.max(0, a.blink - dt);

      // ---- 脚尖两拍：1 -> 两次短促点地后归零
      if (a.toeTap > 0) {
        a.toeTap = Math.max(0, a.toeTap - dt / 0.62);
        const seg = a.toeTap > 0.5 ? 0 : 1;
        if (seg !== a.toeTapN) { a.toeTapN = seg; if (env && env.onToeTap) env.onToeTap(seg); }
      }

      // ---- 姿态平滑
      const k = 9;
      a.lean = damp(a.lean, target.lean, k, dt);
      a.crouch = damp(a.crouch, target.crouch, k * 1.2, dt);
      a.armSpread = damp(a.armSpread, target.armSpread, k, dt);
      a.reach = damp(a.reach, target.reach, k, dt);
      a.flail = damp(a.flail, target.flail, k * 1.4, dt);
      a.lookAmt = damp(a.lookAmt, target.lookAmt, 6, dt);
      a.lookX = damp(a.lookX, target.lookX, 6, dt);
      a.lookY = damp(a.lookY, target.lookY, 6, dt);
      a.bodyRot = damp(a.bodyRot, target.bodyRot, 7, dt);

      // ---- 布料（Verlet）
      const neckX = a.x - a.facing * 3, neckY = a.y + CHEST_Y - 4;
      const wind = noise.fbm(a.t * 1.1, 3) * 26 - a.speed * 0.55 * a.facing;
      const cp = a.coat;
      cp[0].x = neckX; cp[0].y = neckY;
      for (let i = 1; i < cp.length; i++) {
        const p = cp[i];
        const vx = (p.x - p.px) * 0.93, vy = (p.y - p.py) * 0.93;
        p.px = p.x; p.py = p.y;
        p.x += vx + (wind * (0.5 + i * 0.16)) * dt;
        p.y += vy + 210 * dt * dt * 60 * 0.016;
      }
      for (let it = 0; it < 3; it++) {
        for (let i = 1; i < cp.length; i++) {
          const p0 = cp[i - 1], p1 = cp[i];
          const dx = p1.x - p0.x, dy = p1.y - p0.y;
          const d = Math.hypot(dx, dy) || 1e-4;
          const rest = 6.2;
          const diff = (d - rest) / d * 0.5;
          const ox = dx * diff, oy = dy * diff;
          if (i > 1) { p0.x += ox; p0.y += oy; }
          p1.x -= ox; p1.y -= oy;
        }
      }
      return stepped;
    }

    /* --------------------------------------------------------- 绘制 */

    /** 计算当前姿态的骨骼点（局部坐标，(0,0) = 接触点，y 向上为负） */
    function pose() {
      const running = a.state === 'run' || a.state === 'ride' || a.state === 'stagger';
      const p = a.gait * TAU;
      const air = a.state === 'leap' || a.state === 'fall';
      const crouch = a.crouch * 7;
      const bob = running ? -Math.abs(Math.sin(p)) * 2.6 : Math.sin(a.t * 1.2) * 0.7;
      const hipX = a.lean * 5 + a.bodyRot * 2;
      const hipY = HIP_Y + bob + crouch;
      const torsoLean = a.lean * 0.32 + (running ? 0.12 : 0.02) - a.crouch * 0.12;
      const chestX = hipX + Math.sin(torsoLean) * (CHEST_Y - HIP_Y) * -1 * a.facing * -1;
      const chestY = hipY + Math.cos(torsoLean) * (CHEST_Y - HIP_Y);
      const headBase = { x: chestX + Math.sin(torsoLean) * 12 * a.facing, y: chestY - 12 };
      const headX = headBase.x + a.lookX * a.lookAmt * 3.2;
      const headY = headBase.y + a.lookY * a.lookAmt * 2.4;

      // 脚：站立相沿地面后移，摆动相走弧线
      function foot(ph) {
        const s = a.stride;
        if (air) {
          const tuck = a.state === 'fall' ? 1 : sat(1 - a.crouch);
          return { x: hipX + Math.cos(ph) * s * 0.45 * a.facing, y: -6 - Math.sin(ph) * 5 - tuck * 4 };
        }
        if (!running) {
          const t = a.toeTap > 0 ? Math.max(0, Math.sin(a.toeTap * Math.PI * 4)) : 0;
          const side = ph < Math.PI ? 1 : -1;
          return { x: hipX + side * 4.5 * a.facing, y: -t * 3.2 * (side > 0 ? 1 : 0) };
        }
        const u = ((ph / TAU) % 1 + 1) % 1;
        if (u < 0.55) {  // 支撑相
          const k = u / 0.55;
          return { x: (s * 0.5 - s * k) * a.facing + hipX * 0.4, y: 0 };
        }
        const k = (u - 0.55) / 0.45;  // 摆动相
        return {
          x: (-s * 0.5 + s * k) * a.facing + hipX * 0.4,
          y: -Math.sin(k * Math.PI) * (7 + a.speed * 0.02),
        };
      }
      const fA = foot(p), fB = foot(p + Math.PI);
      const legA = ik(hipX, hipY, fA.x, fA.y, L1, L2, a.facing);
      const legB = ik(hipX, hipY, fB.x, fB.y, L1, L2, a.facing);

      // 手：反向摆动 + 张臂 / 前伸 / 失衡
      const spread = a.armSpread, reach = a.reach, flail = a.flail;
      function hand(ph, sign) {
        const sw = running ? Math.cos(ph) * (7 + a.speed * 0.028) : Math.sin(a.t * 1.1 + sign) * 2;
        let hx = chestX - sw * a.facing * 0.9 + reach * 15 * a.facing * (sign > 0 ? 1 : 0.15);
        let hy = chestY + 15 - Math.abs(sw) * 0.25 - reach * 6;
        hx += spread * 17 * sign * a.facing * (sign > 0 ? 1 : -1) * 0.6 + spread * 8 * sign;
        hy -= spread * 12 + flail * 16 * (0.6 + 0.4 * Math.sin(a.t * 17 + sign * 2));
        hx += flail * 15 * sign * Math.sin(a.t * 13 + sign);
        return { x: hx, y: hy };
      }
      const hA = hand(p, 1), hB = hand(p + Math.PI, -1);
      const shX = chestX, shY = chestY + 1;
      const armA = ik(shX, shY, hA.x, hA.y, A1, A2, -a.facing);
      const armB = ik(shX, shY, hB.x, hB.y, A1, A2, -a.facing);

      return { hipX, hipY, chestX, chestY, headX, headY, fA, fB, legA, legB, hA, hB, armA, armB, shX, shY, torsoLean };
    }

    /** 锥形骨骼：用两段不同粗细的圆头线段近似 */
    function bone(ctx, x0, y0, x1, y1, w0, w1) {
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      ctx.lineCap = 'round';
      ctx.lineWidth = w0;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(mx, my); ctx.stroke();
      ctx.lineWidth = w1;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(x1, y1); ctx.stroke();
    }

    /**
     * 绘制。ctx = 主画布（已平移到角色接触点、缩放、旋转）
     * gctx = 辉光缓冲（同一变换）
     */
    function draw(ctx, gctx, pal, opts) {
      const P = pose();
      const inkTop = opts.contrast ? '#000000' : mix(pal.near, '#000000', 0.55);
      const ink = opts.contrast ? '#000000' : mix('#05070c', pal.near, 0.35);
      const rim = pal.accent;
      const rimAmt = opts.rim == null ? 0.8 : opts.rim;

      // 辉光缓冲这一遍只画会发光的东西。角色是剪影，绝不能进辉光缓冲，
      // 否则加法合成会在他周围糊出一圈暗晕。
      if (opts.glowOnly) {
        if (a.state !== 'leap' && a.state !== 'fall') {
          ctx.globalAlpha = 0.5;
          const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
          cg.addColorStop(0, rgba(pal.glow, 0.55));
          cg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.ellipse(0, 0, 26, 8, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        }
        const glx = P.hB.x + a.facing * 1.5, gly = P.hB.y + 5.5;
        const la = a.lampLight * (0.75 + 0.25 * Math.sin(a.t * 3.1));
        if (la > 0.02) {
          ctx.globalAlpha = la;
          const lg = ctx.createRadialGradient(glx, gly, 0, glx, gly, 34 + la * 40);
          lg.addColorStop(0, rgba(pal.windowLight, 0.95));
          lg.addColorStop(0.35, rgba(pal.accent, 0.32));
          lg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = lg;
          ctx.beginPath(); ctx.arc(glx, gly, 34 + la * 40, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        }
        return P;
      }

      // 接触辉光（角色与承重面的关系）
      if (a.state !== 'leap' && a.state !== 'fall' && gctx) {
        gctx.globalAlpha = 0.5;
        const cg = gctx.createRadialGradient(0, 0, 0, 0, 0, 26);
        cg.addColorStop(0, rgba(pal.glow, 0.55));
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        gctx.fillStyle = cg;
        gctx.beginPath(); gctx.ellipse(0, 0, 26, 8, 0, 0, TAU); gctx.fill();
        gctx.globalAlpha = 1;
      }

      // ---- 外衣（先画，作为身后的形）
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(P.chestX, P.chestY - 2);
      const cp = a.coat;
      for (let i = 1; i < cp.length; i++) {
        const lx = cp[i].x - a.x, ly = cp[i].y - a.y;
        ctx.lineTo(lx, ly);
      }
      for (let i = cp.length - 1; i >= 1; i--) {
        const lx = cp[i].x - a.x, ly = cp[i].y - a.y;
        const w = (1 - i / cp.length) * 7 + 1.5;
        ctx.lineTo(lx + w * 0.4, ly + w);
      }
      ctx.closePath();
      ctx.fill();

      // ---- 远侧肢体（更暗，制造体积）
      ctx.strokeStyle = mix(ink, pal.fog, 0.28);
      bone(ctx, P.hipX, P.hipY, P.legB.jx, P.legB.jy, 6.2, 5.2);
      bone(ctx, P.legB.jx, P.legB.jy, P.fB.x, P.fB.y, 5.0, 3.4);
      bone(ctx, P.shX, P.shY, P.armB.jx, P.armB.jy, 5.0, 4.2);
      bone(ctx, P.armB.jx, P.armB.jy, P.hB.x, P.hB.y, 4.0, 3.0);
      ctx.beginPath(); ctx.arc(P.fB.x, P.fB.y - 1.6, 2.6, 0, TAU); ctx.fill();

      // ---- 躯干
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(P.hipX - 6.5, P.hipY);
      ctx.quadraticCurveTo(P.chestX - 8.5, (P.hipY + P.chestY) / 2, P.chestX - 7, P.chestY);
      ctx.quadraticCurveTo(P.chestX, P.chestY - 5, P.chestX + 7, P.chestY);
      ctx.quadraticCurveTo(P.chestX + 8.5, (P.hipY + P.chestY) / 2, P.hipX + 6.5, P.hipY);
      ctx.quadraticCurveTo(P.hipX, P.hipY + 4, P.hipX - 6.5, P.hipY);
      ctx.closePath();
      ctx.fill();

      // ---- 近侧肢体
      bone(ctx, P.hipX, P.hipY, P.legA.jx, P.legA.jy, 6.6, 5.4);
      bone(ctx, P.legA.jx, P.legA.jy, P.fA.x, P.fA.y, 5.2, 3.6);
      ctx.beginPath(); ctx.arc(P.fA.x, P.fA.y - 1.6, 2.8, 0, TAU); ctx.fill();

      // ---- 头（含围巾与视线方向）
      const hr = HEAD_R;
      ctx.beginPath();
      ctx.ellipse(P.headX, P.headY, hr * 0.92, hr, a.lookY * 0.2, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 4.6;
      ctx.beginPath(); ctx.moveTo(P.chestX, P.chestY - 2); ctx.lineTo(P.headX, P.headY + hr * 0.7); ctx.stroke();
      // 兜帽边缘：一道朝向视线的缺口，让朝向可读
      ctx.save();
      ctx.beginPath();
      ctx.arc(P.headX, P.headY, hr + 1.6, 0, TAU);
      ctx.fillStyle = ink;
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(P.headX + a.lookX * hr * 0.85 * a.facing * (a.facing > 0 ? 1 : 1), P.headY + a.lookY * hr * 0.6 + 1, hr * 0.72, 0, TAU);
      ctx.fill();
      ctx.restore();

      // ---- 近侧手臂（画在头之后，形成前后关系）
      ctx.strokeStyle = ink;
      bone(ctx, P.shX, P.shY, P.armA.jx, P.armA.jy, 5.2, 4.4);
      bone(ctx, P.armA.jx, P.armA.jy, P.hA.x, P.hA.y, 4.2, 3.2);

      // ---- 旧灯
      const lx = P.hB.x + a.facing * 1.5, ly = P.hB.y + 5.5;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(P.hB.x, P.hB.y); ctx.lineTo(lx, ly - 3.5); ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(lx - 3.4, ly - 3.4); ctx.lineTo(lx + 3.4, ly - 3.4);
      ctx.lineTo(lx + 2.6, ly + 3.6); ctx.lineTo(lx - 2.6, ly + 3.6);
      ctx.closePath(); ctx.fill();
      const lampA = a.lampLight * (0.75 + 0.25 * Math.sin(a.t * 3.1));
      // 灯的大光晕只属于辉光缓冲（glowOnly 那一遍）。
      // 在主画布上重复画一次会把剪影冲成一团白。
      if (lampA > 0.02) {
        ctx.fillStyle = rgba(pal.windowLight, 0.85 * lampA + 0.15);
        ctx.beginPath(); ctx.arc(lx, ly, 1.9, 0, TAU); ctx.fill();
      }

      // ---- 边缘光：余光从前方打来，让剪影不糊成一团
      if (rimAmt > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgba(rim, 0.5 * rimAmt);
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        const dx = a.facing * 1.7, dy = -1.1;
        ctx.beginPath();
        ctx.moveTo(P.hipX + dx, P.hipY + dy);
        ctx.quadraticCurveTo(P.chestX + 8 + dx, (P.hipY + P.chestY) / 2 + dy, P.chestX + 6.5 + dx, P.chestY + dy);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(P.headX + dx * 0.6, P.headY + dy * 0.6, hr + 1.2, -1.9, 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(P.legA.jx + dx, P.legA.jy + dy); ctx.lineTo(P.fA.x + dx, P.fA.y + dy);
        ctx.stroke();
        ctx.restore();
      }
      return P;
    }

    return {
      s: a, update, draw, pose, setTells, tapToes,
      reset() {
        a.gait = 0; a.lean = 0; a.crouch = 0; a.armSpread = 0; a.reach = 0;
        a.flail = 0; a.toeTap = 0; a.coatInit = false;
        target.lean = 0; target.crouch = 0; target.armSpread = 0; target.reach = 0; target.flail = 0;
      },
    };
  }

  LL.createAga = createAga;
})(typeof window !== 'undefined' ? window : globalThis);
