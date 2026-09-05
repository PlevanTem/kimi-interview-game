/**
 * 《归航 · NOSTOS》天候试衣间。
 *
 * 调光是一件需要几十轮对比的事，而"改代码 → 构建 → 起服务 → 截图 → 看"
 * 一轮要一分半，一次还只能试一个值。这个工具把那个循环压到一次拖动。
 *
 * 三条设计约束：
 *
 * 1. **复用游戏本身的 Viewport 与 Stage**，不另写一套渲染。
 *    这里看到的就是玩家会看到的——同一个地形、同一批构件、同一条后期链、
 *    同一张阴影图。工具一旦有自己的一份渲染，它给出的判断就不作数了。
 *
 * 2. **给出数字，不只给出图。** 每个机位下面标出亮度分位、动态范围、
 *    平坦度、饱和与色相跨度。"暗部有没有锚"用眼睛判断会随显示器变，
 *    用 p2 判断不会。
 *
 * 3. **能把结果带走。** 调完点"导出"，直接得到可以粘回 palette.ts 的
 *    那一段 preset({...})，不用人肉抄十几个十六进制。
 */

import './styles.css';

import { ENV, type EnvPreset } from '../../src/content/palette';
import { Soundscape } from '../../src/engine/audio';
import { applyEnvToMaterials } from '../../src/engine/materials';
import { Viewport } from '../../src/engine/renderer';
import { actById } from '../../src/game/scenes';
import { Stage } from '../../src/game/stage';
import type { Act } from '../../src/game/scenes/types';
import type { TerrainParams } from '../../src/world/terrain';

// ─────────────────────────────────────────── 调这一幕

/** 试点幕。想换一幕就改这里的 id（'lotus' / 'cyclops' / …） */
const ACT_ID = 'lotus';

/**
 * 三个固定机位。
 *
 * 不是随便取的：调光要盯的是**玩家真的会站在哪儿**。
 * 换机位就改这张表；yaw 由"看向哪个点"算出来，不用手填角度。
 */
const SHOTS: Array<{ name: string; note: string; at: [number, number]; look: [number, number]; pitch?: number }> = [
  {
    name: '登岸',
    note: '第一印象。玩家还没动，整幕的气氛在这一帧里定下来',
    at: [2, 26],
    look: [0, 0],
  },
  {
    // 站在林子外面往里看，不是站在树冠底下。
    // 第一版机位放在 (17.5, -6.5)，正好落在 (21, -8) 那棵树的冠幅之内，
    // 整帧被一团树冠糊死——机位定完必须真的渲一遍看。
    name: '果树林',
    note: '中景。有遮挡、有投影，检验形体与暗部',
    at: [10, 4],
    look: [18, -12],
  },
  {
    name: '头盔台',
    note: '核心记忆那一帧。全幕最重要的一次注视',
    at: [-6, -16],
    look: [-6, -19],
    pitch: -0.22,
  },
];

/** 眼高，与 engine/controller.ts 一致 */
const EYE = 1.68;

// ─────────────────────────────────────────── 可调的参数

type NumKey =
  | 'sunAzimuth' | 'sunElevation' | 'sunIntensity' | 'ambientIntensity'
  | 'cloudiness' | 'fogDensity' | 'fogHeightFalloff' | 'fogSunAmount'
  | 'exposure' | 'saturation' | 'halation' | 'vignette' | 'grain'
  | 'waveHeight' | 'waveChop' | 'starIntensity';

type ColorKey =
  | 'sunColor' | 'skyAmbient' | 'groundAmbient' | 'horizonColor' | 'zenithColor'
  | 'fogColor' | 'fogSunColor' | 'shadowTint' | 'seaShallow' | 'seaDeep' | 'seaFoam' | 'halationTint';

/**
 * 改这些需要**重新装配整幕**：
 * 太阳角度决定阴影图（每幕只烘一次），地形三色是在 Terrain 构造时
 * 写进材质的。其余参数改完直接刷新 uniform，不用重载。
 */
const NEEDS_RELOAD = new Set<string>([
  'sunAzimuth', 'sunElevation', 'colorFlat', 'colorSteep', 'colorHigh',
]);

const NUMS: Array<{ key: NumKey; label: string; min: number; max: number; step: number }> = [
  { key: 'sunAzimuth', label: '太阳方位', min: -3.2, max: 3.2, step: 0.02 },
  { key: 'sunElevation', label: '太阳仰角', min: -0.2, max: 1.2, step: 0.005 },
  { key: 'sunIntensity', label: '直射强度', min: 0, max: 3, step: 0.02 },
  { key: 'ambientIntensity', label: '环境光', min: 0, max: 1.4, step: 0.01 },
  { key: 'cloudiness', label: '云量', min: 0, max: 1, step: 0.01 },
  { key: 'fogDensity', label: '雾密度', min: 0, max: 0.04, step: 0.0002 },
  { key: 'fogHeightFalloff', label: '雾高度衰减', min: 0.005, max: 0.12, step: 0.001 },
  { key: 'fogSunAmount', label: '雾被点亮', min: 0, max: 1.5, step: 0.01 },
  { key: 'exposure', label: '曝光', min: 0.4, max: 2, step: 0.01 },
  { key: 'saturation', label: '饱和度', min: 0, max: 1.6, step: 0.01 },
  { key: 'halation', label: '光晕', min: 0, max: 1.2, step: 0.01 },
  { key: 'vignette', label: '暗角', min: 0, max: 1, step: 0.01 },
  { key: 'grain', label: '颗粒', min: 0, max: 0.2, step: 0.002 },
  { key: 'waveHeight', label: '浪高', min: 0, max: 1.5, step: 0.01 },
  { key: 'waveChop', label: '浪陡', min: 0, max: 2, step: 0.01 },
  { key: 'starIntensity', label: '星光', min: 0, max: 1.5, step: 0.01 },
];

const COLORS: Array<{ key: ColorKey; label: string }> = [
  { key: 'sunColor', label: '日光' },
  { key: 'skyAmbient', label: '天顶环境' },
  { key: 'groundAmbient', label: '地面反弹' },
  { key: 'horizonColor', label: '地平线' },
  { key: 'zenithColor', label: '天顶' },
  { key: 'fogColor', label: '雾' },
  { key: 'fogSunColor', label: '雾·迎光' },
  { key: 'shadowTint', label: '影色' },
  { key: 'seaShallow', label: '浅海' },
  { key: 'seaDeep', label: '深海' },
  { key: 'seaFoam', label: '浪沫' },
  { key: 'halationTint', label: '光晕色' },
];

const TERRAIN_COLORS: Array<{ key: 'colorFlat' | 'colorSteep' | 'colorHigh'; label: string }> = [
  { key: 'colorFlat', label: '地形·平面' },
  { key: 'colorSteep', label: '地形·陡面' },
  { key: 'colorHigh', label: '地形·高处' },
];

// ─────────────────────────────────────────── 起手

const act = actById(ACT_ID);
if (!act) throw new Error(`没有这一幕：${ACT_ID}`);

const envName = act.def.env;
/** 出厂值。所有"改了多少"都相对它算，导出的也只有差异项 */
const BASE_ENV: EnvPreset = { ...ENV[envName] };
const BASE_TERRAIN: TerrainParams = { ...act.terrain };

const live: EnvPreset = { ...BASE_ENV };
const liveTerrain: TerrainParams = { ...BASE_TERRAIN };

const hex = (n: number): string => `#${(n >>> 0).toString(16).padStart(6, '0').slice(-6)}`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

const app = document.getElementById('app')!;

// ── 版头 ──
const head = el('header', 'bar');
head.append(
  el('h1', undefined, `天候试衣间 · ${act.def.title}`),
  el('span', 'sub', `${envName} — 拖动即渲染。三个机位是玩家真的会站的地方`),
);
const exportBtn = el('button', 'primary', '导出改动');
const resetBtn = el('button', undefined, '全部复位');
head.append(resetBtn, exportBtn);
app.append(head);

const body = el('div', 'body');
const panel = el('aside', 'panel');
const views = el('main', 'views');
body.append(panel, views);
app.append(body);

// ─────────────────────────────────────────── 渲染台
//
// 一个离屏 Viewport + 一个真的 Stage。Viewport 会把自己的 canvas 挂进
// 传进去的容器，所以给它一个隐藏的宿主，画完再把像素拷进每个机位的画布。

const host = el('div', 'stagehost');
app.append(host);
const viewport = new Viewport(host);
// Viewport.resize() 按 window 尺寸走，会把下面设的离屏尺寸冲掉。
// 这个工具的画布是固定的，所以把它接管掉。
viewport.resize = (): void => {};
const stage = new Stage();
const sound = new Soundscape();
sound.setMuted(true);

const SHOT_W = 640;
const SHOT_H = 360;
viewport.canvas.width = SHOT_W;
viewport.canvas.height = SHOT_H;
viewport.renderer.setPixelRatio(1);
viewport.renderer.setSize(SHOT_W, SHOT_H, false);
viewport.post.setSize(SHOT_W, SHOT_H, 1);
viewport.camera.aspect = SHOT_W / SHOT_H;
viewport.camera.updateProjectionMatrix();

interface ShotCell {
  canvas: HTMLCanvasElement;
  stats: HTMLElement;
}
const cells: ShotCell[] = [];

for (const shot of SHOTS) {
  const card = el('figure', 'shot');
  const cv = el('canvas');
  cv.width = SHOT_W;
  cv.height = SHOT_H;
  const cap = el('figcaption');
  cap.append(el('div', 'name', shot.name), el('div', 'note', shot.note));
  const stats = el('div', 'stats');
  cap.append(stats);
  card.append(cv, cap);
  views.append(card);
  cells.push({ canvas: cv, stats });
}

/** 把当前 live 参数写进真正的 ENV 表——Stage 与所有材质都从那里读 */
function pushEnv(): void {
  Object.assign(ENV[envName] as EnvPreset, live);
}

function loadStage(): void {
  pushEnv();
  const patched: Act = { ...act!, terrain: { ...liveTerrain } };
  stage.load(patched, viewport, sound);
}

/** 计算一帧的统计。判断"暗部有没有锚"靠这个，不靠显示器 */
function measure(cv: HTMLCanvasElement): {
  p2: number; p50: number; p98: number; range: number; flat: number; sat: number; hue: number | null;
} {
  const ctx = cv.getContext('2d')!;
  const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const lum: number[] = [];
  const sat: number[] = [];
  const hue: number[] = [];
  for (let i = 0; i < d.length; i += 4 * 7) {
    const r = d[i]! / 255;
    const g = d[i + 1]! / 255;
    const b = d[i + 2]! / 255;
    lum.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    sat.push(mx === 0 ? 0 : (mx - mn) / mx);
    if (mx - mn > 0.02) {
      let h: number;
      if (mx === r) h = ((g - b) / (mx - mn) + 6) % 6;
      else if (mx === g) h = (b - r) / (mx - mn) + 2;
      else h = (r - g) / (mx - mn) + 4;
      hue.push((h * 60) % 360);
    }
  }
  lum.sort((a, b) => a - b);
  sat.sort((a, b) => a - b);
  hue.sort((a, b) => a - b);
  const q = (arr: number[], f: number): number => arr[Math.floor(arr.length * f)] ?? 0;
  const med = q(lum, 0.5);
  return {
    p2: q(lum, 0.02),
    p50: med,
    p98: q(lum, 0.98),
    range: q(lum, 0.98) - q(lum, 0.02),
    flat: lum.filter((v) => Math.abs(v - med) < 0.08).length / lum.length,
    sat: q(sat, 0.5),
    hue: hue.length ? q(hue, 0.9) - q(hue, 0.1) : null,
  };
}

let elapsed = 0;

function renderAll(): void {
  pushEnv();
  // 天候改了要重新推给材质、天、海与后期
  const env = ENV[envName] as EnvPreset;
  stage.sky.applyEnv(env);
  stage.sea.applyEnv(env);
  viewport.applyEnv(env);
  // 材质的 uniform 是共享的，改完必须推一次，否则只有天海后期变了、石头没变
  applyEnvToMaterials(env);

  elapsed += 0.016;

  SHOTS.forEach((shot, i) => {
    const [px, pz] = shot.at;
    const [lx, lz] = shot.look;
    const ground = stage.terrain?.heightAt(px, pz) ?? 0;
    viewport.camera.position.set(px, ground + EYE, pz);
    // yaw = atan2(-dx, -dz) 时前向量 (-sin, -cos) 正好指向目标
    const yaw = Math.atan2(-(lx - px), -(lz - pz));
    viewport.camera.rotation.set(shot.pitch ?? 0, yaw, 0, 'YXZ');
    stage.update(0.016, elapsed, null, null, viewport.camera.position);
    viewport.render(stage.scene, elapsed);

    const cell = cells[i]!;
    const ctx = cell.canvas.getContext('2d')!;
    // 必须在同一个同步任务里拷走：WebGL 的绘制缓冲在任务结束后就没了
    ctx.drawImage(viewport.canvas, 0, 0, cell.canvas.width, cell.canvas.height);

    const m = measure(cell.canvas);
    cell.stats.innerHTML = '';
    const add = (label: string, value: string, warn = false): void => {
      const d = el('span', warn ? 'stat warn' : 'stat');
      d.append(el('b', undefined, value), el('i', undefined, label));
      cell.stats.append(d);
    };
    // p2 是这一版调光最该盯的数：画面里有没有黑
    add('黑位 p2', m.p2.toFixed(3), m.p2 > 0.3);
    add('中位', m.p50.toFixed(3));
    add('范围', m.range.toFixed(3), m.range < 0.3);
    add('平坦', m.flat.toFixed(3), m.flat > 0.5);
    add('饱和', m.sat.toFixed(3), m.sat > 0.45);
    add('色相跨度', m.hue === null ? '—' : `${Math.round(m.hue)}°`, m.hue !== null && m.hue < 15);
  });
}

let pending = 0;
function schedule(reload = false): void {
  window.clearTimeout(pending);
  pending = window.setTimeout(() => {
    if (reload) loadStage();
    renderAll();
  }, 40);
}

// ─────────────────────────────────────────── 控制面板

function section(title: string, hint?: string): HTMLElement {
  const s = el('section');
  s.append(el('h2', undefined, title));
  if (hint) s.append(el('p', 'hint', hint));
  panel.append(s);
  return s;
}

const numeric = section('天候 · 数值', '拖动即时生效；太阳角度会重新烘一次阴影，慢一点');
for (const spec of NUMS) {
  const row = el('label', 'row');
  const value = el('span', 'val', String(live[spec.key]));
  row.append(el('span', 'lab', spec.label), value);
  const input = el('input');
  input.type = 'range';
  input.min = String(spec.min);
  input.max = String(spec.max);
  input.step = String(spec.step);
  input.value = String(live[spec.key]);
  input.addEventListener('input', () => {
    (live[spec.key] as number) = Number(input.value);
    value.textContent = input.value;
    row.classList.toggle('changed', live[spec.key] !== BASE_ENV[spec.key]);
    schedule(NEEDS_RELOAD.has(spec.key));
  });
  row.append(input);
  numeric.append(row);
}

const colour = section('天候 · 颜色', '影色与地面反弹决定暗部是什么颜色，也决定暗部有多暗');
for (const spec of COLORS) {
  const row = el('label', 'row');
  row.append(el('span', 'lab', spec.label));
  const input = el('input');
  input.type = 'color';
  input.value = hex(live[spec.key] as number);
  const value = el('span', 'val', input.value);
  input.addEventListener('input', () => {
    (live[spec.key] as number) = Number.parseInt(input.value.slice(1), 16);
    value.textContent = input.value;
    row.classList.toggle('changed', live[spec.key] !== BASE_ENV[spec.key]);
    schedule(false);
  });
  row.append(value, input);
  colour.append(row);
}

const terr = section('地形 · 三色', '面积最大的一块颜色。改这里要重新装配整幕，会卡一下');
for (const spec of TERRAIN_COLORS) {
  const row = el('label', 'row');
  row.append(el('span', 'lab', spec.label));
  const input = el('input');
  input.type = 'color';
  const current = (liveTerrain[spec.key] ?? 0x808080) as number;
  input.value = hex(current);
  const value = el('span', 'val', input.value);
  input.addEventListener('input', () => {
    (liveTerrain[spec.key] as number) = Number.parseInt(input.value.slice(1), 16);
    value.textContent = input.value;
    row.classList.toggle('changed', liveTerrain[spec.key] !== BASE_TERRAIN[spec.key]);
    schedule(true);
  });
  row.append(value, input);
  terr.append(row);
}

// ─────────────────────────────────────────── 导出与复位

exportBtn.addEventListener('click', () => {
  const envDiff: string[] = [];
  for (const spec of NUMS) {
    if (live[spec.key] !== BASE_ENV[spec.key]) {
      envDiff.push(`    ${spec.key}: ${Number((live[spec.key] as number).toFixed(4))},`);
    }
  }
  for (const spec of COLORS) {
    if (live[spec.key] !== BASE_ENV[spec.key]) {
      envDiff.push(`    ${spec.key}: 0x${hex(live[spec.key] as number).slice(1)},`);
    }
  }
  const terrDiff: string[] = [];
  for (const spec of TERRAIN_COLORS) {
    if (liveTerrain[spec.key] !== BASE_TERRAIN[spec.key]) {
      terrDiff.push(`    ${spec.key}: 0x${hex(liveTerrain[spec.key] as number).slice(1)},`);
    }
  }

  const parts: string[] = [];
  if (envDiff.length) {
    parts.push(`// src/content/palette.ts → ENV.${envName}\n  ${envName}: preset({\n${envDiff.join('\n')}\n    // …其余保持原样\n  }),`);
  }
  if (terrDiff.length) {
    parts.push(`// src/game/scenes/${ACT_ID}.ts → terrain\n  terrain: {\n${terrDiff.join('\n')}\n    // …其余保持原样\n  },`);
  }
  const text = parts.length ? parts.join('\n\n') : '（没有任何改动）';

  const box = el('div', 'export');
  const pre = el('pre', undefined, text);
  const close = el('button', undefined, '关掉');
  const copy = el('button', 'primary', '复制');
  copy.addEventListener('click', () => {
    void navigator.clipboard?.writeText(text);
    copy.textContent = '已复制';
    window.setTimeout(() => (copy.textContent = '复制'), 1200);
  });
  close.addEventListener('click', () => box.remove());
  const bar = el('div', 'exportbar');
  bar.append(el('span', undefined, '把下面这段粘回源码即可。只列出改动过的项'), copy, close);
  box.append(bar, pre);
  app.append(box);
});

resetBtn.addEventListener('click', () => {
  Object.assign(live, BASE_ENV);
  Object.assign(liveTerrain, BASE_TERRAIN);
  panel.querySelectorAll('input').forEach((input) => {
    const row = input.closest('.row');
    row?.classList.remove('changed');
  });
  // 重建面板最省事，也保证滑块与色块回到出厂值
  window.location.reload();
});

// ─────────────────────────────────────────── 走起

loadStage();
renderAll();
