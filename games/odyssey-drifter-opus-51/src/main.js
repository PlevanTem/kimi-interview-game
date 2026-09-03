/**
 * main.js — 启动、DOM 界面绑定与主循环
 */
(function (global) {
  'use strict';
  const LL = global.LL;
  const $ = (id) => document.getElementById(id);

  const canvas = $('c');
  const screens = { title: $('title'), pause: $('pause'), ending: $('ending') };
  const guideEl = $('guide');
  const demoHud = $('demoHud');
  const announceEl = $('announce');
  const hintEl = $('hint');

  const settings = {
    reduceMotion: false, contrast: false, toggleMode: false, mute: false, quality: 2,
  };
  try {
    const saved = JSON.parse(localStorage.getItem('lightline.settings') || '{}');
    Object.assign(settings, saved);
  } catch (_) { /* 隐私模式下忽略 */ }

  const OPTIONS = [
    { key: 'toggleMode', label: '点击切换模式', hint: '第一次点击开始，第二次点击释放' },
    { key: 'reduceMotion', label: '减少动态', hint: '关闭镜头晃动与颗粒' },
    { key: 'contrast', label: '高对比', hint: '压暗背景，提亮余光' },
    { key: 'mute', label: '静音', hint: '全部状态都有视觉冗余' },
  ];

  let game = null;

  function renderOpts(container) {
    container.innerHTML = '';
    for (const o of OPTIONS) {
      const el = document.createElement('div');
      el.className = 'opt' + (settings[o.key] ? ' on' : '');
      el.textContent = o.label;
      el.title = o.hint;
      el.dataset.key = o.key;
      el.addEventListener('click', () => {
        settings[o.key] = !settings[o.key];
        applySettings();
      });
      container.appendChild(el);
    }
  }

  function applySettings() {
    if (game) game.applySettings(settings);
    renderOpts($('opts1'));
    renderOpts($('opts2'));
    try { localStorage.setItem('lightline.settings', JSON.stringify(settings)); } catch (_) {}
  }

  let announceTimer = 0;
  let guide = null;
  let screenBeforeGuide = 'none';

  const ui = {
    setScreen(name) {
      for (const k of Object.keys(screens)) screens[k].classList.toggle('on', k === name);
      hintEl.textContent = '';
    },
    setDemoVisible(on) { demoHud.classList.toggle('on', !!on); },
    setDemoCaption(step, total, title, body) {
      $('demoTitle').textContent = title || '';
      $('demoBody').textContent = body || '';
      $('demoStep').textContent = title ? step + ' / ' + total : '';
    },
    syncSettings(s) {
      Object.assign(settings, s);
      renderOpts($('opts1'));
      renderOpts($('opts2'));
      try { localStorage.setItem('lightline.settings', JSON.stringify(settings)); } catch (_) {}
    },
    announce(name, breath, motto) {
      announceEl.querySelector('.n').textContent = name;
      announceEl.querySelector('.b').textContent = breath;
      announceEl.querySelector('.m').textContent = motto || '';
      announceEl.classList.add('on');
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => announceEl.classList.remove('on'), 3400);
    },
    showEnding(stats, endless) {
      const cards = [
        ['距离', Math.floor(stats.dist) + ' m'],
        ['同步', String(stats.syncs)],
        ['最长同步链', '×' + stats.best],
        ['借锚', String(stats.anchors)],
        ['回溯', String(stats.stumbles)],
        ['用时', fmtTime(stats.time)],
      ];
      $('endStats').innerHTML = cards
        .map((c) => '<div class="stat"><b>' + c[1] + '</b><span>' + c[0] + '</span></div>')
        .join('');
      $('endTitle').textContent = stats.stumbles === 0 ? '一次也没有掉下去' : '留下光';
      setTimeout(() => ui.setScreen('ending'), 5200);
    },
  };

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return m + ':' + String(ss).padStart(2, '0');
  }

  /* ------------------------------------------------------------ 启动 */

  game = LL.createGame(canvas, ui);
  global.lightline = game;   // 供自动化测试与调试读取真实状态
  game.applySettings(settings);
  applySettings();

  /* ---- 玩法说明 ---- */

  function openGuide() {
    if (!guide) guide = LL.createGuide($('cards'), () => game.palette);
    screenBeforeGuide = ['title', 'pause', 'ending'].find((k) => screens[k].classList.contains('on')) || 'none';
    if (game.g.mode === 'play') game.pause();
    ui.setScreen('none');
    guideEl.classList.add('on');
    guide.show();
  }
  function closeGuide() {
    guideEl.classList.remove('on');
    if (guide) guide.hide();
    ui.setScreen(screenBeforeGuide === 'none' ? 'pause' : screenBeforeGuide);
  }

  $('btnGuide').addEventListener('click', openGuide);
  $('btnGuide2').addEventListener('click', openGuide);
  $('btnGuideClose').addEventListener('click', closeGuide);
  $('btnDemo').addEventListener('click', () => game.startDemo());
  $('btnDemoStop').addEventListener('click', () => game.stopDemo());
  global.addEventListener('keydown', (e) => {
    if (!guideEl.classList.contains('on')) return;
    if (e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); closeGuide(); }
  }, true);

  $('btnStart').addEventListener('click', () => game.start());
  $('btnResume').addEventListener('click', () => game.resume());
  $('btnRestart').addEventListener('click', () => game.restart());
  $('btnQuit').addEventListener('click', () => { game.g.mode = 'title'; ui.setScreen('title'); });
  $('btnAgain').addEventListener('click', () => game.restart());
  $('btnEndless').addEventListener('click', () => game.endless());

  function resize() {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    game.resize(global.innerWidth, global.innerHeight, dpr);
  }
  global.addEventListener('resize', resize);
  resize();

  // ?dev=1 关闭自动暂停，便于自动化测试在后台标签页里驱动模拟
  const DEV = /(?:\?|&)dev=1(?:&|$)/.test(location.search);
  if (!DEV) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.g.mode === 'play') game.pause();
    });
  } else {
    game.devMode = true;
  }

  let last = performance.now();
  let accum = 0;
  const FIXED = 1 / 120;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;           // 失焦后不要一次性推进模拟
    accum += dt;
    let guard = 0;
    while (accum >= FIXED && guard++ < 24) {
      game.update(FIXED);
      accum -= FIXED;
    }
    game.render();
  }
  requestAnimationFrame(frame);
})(typeof window !== 'undefined' ? window : globalThis);
