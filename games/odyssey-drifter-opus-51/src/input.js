/**
 * input.js — 归一化输入
 *
 * 一个主动作只有三件事：按下 / 移动 / 松开。
 * 无障碍等价模式（toggleMode）把“按住”换成“点两次”，判定与风险完全相同。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});

  function createInput(canvas, opts) {
    const state = {
      x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
      down: false, inside: false,
      idle: 0,           // 无输入秒数
      toggleMode: false, // 无障碍点击切换
      lastDownAt: 0, lastUpAt: 0,
      pointerType: 'mouse',
      keys: Object.create(null),
    };
    const handlers = { down: [], up: [], move: [], key: [], cancel: [] };
    const on = (name, fn) => handlers[name].push(fn);
    const emit = (name, a) => { for (const fn of handlers[name]) fn(a); };

    // 直接用 CSS 像素坐标；渲染层使用同一坐标系（DPR 只作用于 ctx 变换）
    function local(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function press(e) {
      if (e.button != null && e.button !== 0) {
        if (e.button === 2) emit('cancel');
        return;
      }
      const p = local(e);
      state.x = p.x; state.y = p.y; state.px = p.x; state.py = p.y;
      state.pointerType = e.pointerType || 'mouse';
      state.idle = 0;
      state.lastDownAt = performance.now();
      if (state.toggleMode) {
        if (state.down) { state.down = false; state.lastUpAt = performance.now(); emit('up', p); }
        else { state.down = true; emit('down', p); }
      } else {
        state.down = true;
        emit('down', p);
      }
      if (canvas.setPointerCapture && e.pointerId != null) {
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }

    function move(e) {
      const p = local(e);
      state.vx = p.x - state.x; state.vy = p.y - state.y;
      state.x = p.x; state.y = p.y;
      state.inside = true;
      state.idle = 0;
      emit('move', p);
    }

    function release(e) {
      if (state.toggleMode) return;      // 切换模式只在 press 中处理
      if (e && e.button != null && e.button !== 0) return;
      if (!state.down) return;
      state.down = false;
      state.lastUpAt = performance.now();
      emit('up', { x: state.x, y: state.y });
    }

    canvas.addEventListener('pointerdown', press);
    global.addEventListener('pointermove', move, { passive: true });
    global.addEventListener('pointerup', release);
    global.addEventListener('pointercancel', () => { if (state.down && !state.toggleMode) release(); });
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); emit('cancel'); });
    canvas.addEventListener('pointerleave', () => { state.inside = false; });
    canvas.addEventListener('pointerenter', () => { state.inside = true; });

    global.addEventListener('keydown', (e) => {
      state.keys[e.code] = true;
      state.idle = 0;
      if (['Space', 'KeyR', 'Escape', 'KeyM', 'KeyH', 'KeyT', 'KeyC', 'Enter'].includes(e.code)) e.preventDefault();
      emit('key', e.code);
      // 键盘等价：空格 = 按住 / 松开
      if (e.code === 'Space' && !e.repeat) {
        if (state.down) { state.down = false; emit('up', { x: state.x, y: state.y }); }
        else { state.down = true; emit('down', { x: state.x, y: state.y }); }
      }
    });
    global.addEventListener('keyup', (e) => { state.keys[e.code] = false; });
    global.addEventListener('blur', () => {
      state.keys = Object.create(null);
      if (state.down) { state.down = false; emit('cancel'); }
      if (opts && opts.onBlur) opts.onBlur();
    });

    state.update = (dt) => { state.idle += dt; };
    state.on = on;
    state.forceRelease = () => {
      if (state.down) { state.down = false; emit('cancel'); }
    };
    return state;
  }

  LL.createInput = createInput;
})(typeof window !== 'undefined' ? window : globalThis);
