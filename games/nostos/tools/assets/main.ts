/**
 * 《归航 · NOSTOS》资产库。
 *
 * 这个游戏一个二进制素材文件都没有——几何、纹理、剪影、音色全部是
 * 运行时由代码生成的。所以"资产库"不能是一份截图或手抄的清单：
 * 那种东西第一次调参就过期了，而且过期的时候不会有人发现。
 *
 * 这里的做法是**直接 import 游戏本身的生成器**，当场把每一件素材画出来。
 * 于是这一页永远等于当前代码的真实产出：改了 palette.ts，重新生成这一页，
 * 色卡就跟着变；改不动的地方，这一页也画不出来。
 *
 * 用法：`npm run assets:nostos` → docs/asset-library.html（单文件，可直接双击打开）
 */
import * as THREE from 'three';
import './styles.css';

import { ENV, PIGMENT, VISION_GRADE, type EnvName } from '../../src/content/palette';
import { MEMORY_LABELS, TEXT } from '../../src/content/script';
import { AUDIO, Soundscape } from '../../src/engine/audio';
import { SURFACE, applyEnvToMaterials, tickMaterials } from '../../src/engine/materials';
import { frescoTexture, meanderTexture, sandTexture, weatheringTexture } from '../../src/engine/textures';
import { ACTS } from '../../src/game/scenes';
import { MOTIF_KINDS, motifTexture, type MotifKind } from '../../src/world/silhouette';
import * as P from '../../src/world/props';
import { Terrain } from '../../src/world/terrain';

// ─────────────────────────────────────────── 小工具

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

const app = document.getElementById('app')!;

interface SectionSpec {
  id: string;
  title: string;
  count: number;
  blurb: string;
  /** 改这一节的素材要动哪个文件——同步回游戏的唯一入口 */
  source: string;
}

function section(spec: SectionSpec): HTMLElement {
  const s = el('section');
  s.id = spec.id;
  s.append(
    el('h2', undefined, `${spec.title}<span class="count">${spec.count} 项</span>`),
    el('p', 'blurb', spec.blurb),
    el('p', 'source', `编辑入口 &nbsp;<b>${spec.source}</b>`),
  );
  return s;
}

function card(): HTMLElement {
  return el('figure', 'card');
}

// ─────────────────────────────────────────── 共享的离屏渲染器
//
// 20 个构件 + 14 种材质如果各开一个 WebGL 上下文，会直接撞上浏览器
// 每页 ~16 个上下文的上限。所以只开一个，画完拷进各自的 2D 画布。

const RW = 420;
const RH = 340;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(RW, RH, false);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0x0d0a09, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, RW / RH, 0.1, 200);

// 看板光统一用「伊萨卡转晴」：它的环境光偏冷（天青）而太阳偏暖，
// 冷暖分立才能把壁画材质的三档色带分开，形体和风化最容易看清楚。
// 试过蜜金黄昏——暖光配暖影，整页糊成一片橘色，什么都判断不了。
const KEY_LIGHT = ENV.ithacaClearing;
applyEnvToMaterials(KEY_LIGHT);

/** 把一个几何体摆正、取景、渲染，结果拷进目标画布 */
function shoot(geometry: THREE.BufferGeometry, material: THREE.Material, into: HTMLCanvasElement): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const mesh = new THREE.Mesh(geometry, material);
  // 把物体挪到原点，镜头就不用为每件东西单独算构图
  mesh.position.set(-center.x, -center.y, -center.z);
  scene.add(mesh);

  // 按包围盒的实际投影取景，而不是按包围球半径。
  // 用半径会让细长件（桅杆、柱子）在画面里缩成一根火柴——
  // 球把它最长的那一维当成了各个方向的尺寸。
  const tan = Math.tan((camera.fov * Math.PI) / 360);
  const half = Math.max(size.x, size.z) * 0.5;
  const distV = (size.y * 0.5) / tan;
  const distH = half / (tan * camera.aspect);
  const dist = Math.max(distV, distH, 0.6) * 1.18;
  // 略高于水平的四分之三视角：看得到顶面的转折，又不至于变成俯视图
  camera.position.set(dist * 0.55, dist * 0.38, dist * 0.74);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  tickMaterials(1.5, camera.position);
  renderer.render(scene, camera);

  const g = into.getContext('2d')!;
  g.drawImage(renderer.domElement, 0, 0, into.width, into.height);

  scene.remove(mesh);
}

/** 一块预览画布，按设备像素比出图 */
function previewCanvas(w = RW, h = RH): HTMLCanvasElement {
  const c = el('canvas', 'preview');
  const dpr = Math.min(2, window.devicePixelRatio);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  c.style.aspectRatio = `${w} / ${h}`;
  return c;
}

// ─────────────────────────────────────────── 版头

const totalActs = ACTS.length;
const propNames = Object.keys(PROPS_SPEC());
const tallies: Array<[number, string]> = [
  [Object.keys(PIGMENT).length, '颜料'],
  [Object.keys(SURFACE).length, '表面材质'],
  [Object.keys(ENV).length, '天候预设'],
  [MOTIF_KINDS.length, '黑绘母题'],
  [4, '程序纹理'],
  [propNames.length, '构件几何'],
  [Object.keys(AUDIO).length, '音景'],
  [totalActs, '幕 / 地形'],
  [0, '二进制文件'],
];

const head = el('div', 'masthead');
head.append(
  el('h1', undefined, '归航 · NOSTOS &nbsp;资产库'),
  el('div', 'latin', 'Asset Library · generated from source'),
  el(
    'p',
    undefined,
    '这一页里的每一件素材都是**当场由游戏代码生成的**，不是截图、不是复刻。' +
      '页面直接 import <code>src/</code> 下的生成器并把结果画出来，' +
      '所以它永远等于当前代码的真实产出——改了参数重新生成，这里立刻跟着变。',
  ),
  el(
    'p',
    undefined,
    '每一节都标了<b>编辑入口</b>：那是这类素材在代码里的唯一出处。' +
      '要精调就改那个文件，然后重新跑一次 <code>npm run assets:nostos</code> 复核，' +
      '游戏与这一页会同时更新——它们读的是同一份源。',
  ),
);
const tally = el('div', 'tally');
for (const [n, label] of tallies) {
  const d = el('div');
  d.append(el('b', undefined, String(n)), el('span', undefined, label));
  tally.append(d);
}
head.append(tally);
app.append(head);

// 目录
const TOC: Array<[string, string]> = [
  ['pigment', '颜料'],
  ['surface', '表面材质'],
  ['env', '天候预设'],
  ['motif', '黑绘母题'],
  ['texture', '程序纹理'],
  ['props', '构件几何'],
  ['terrain', '地形'],
  ['audio', '音景'],
  ['text', '文本'],
];
const toc = el('nav', 'toc');
for (const [id, label] of TOC) {
  const link = el('a', undefined, label);
  link.href = `#${id}`;
  toc.append(link);
}
app.append(toc);

const main = el('main');
app.append(main);

// ─────────────────────────────────────────── 一、颜料

{
  const s = section({
    id: 'pigment',
    title: '一、颜料 PIGMENT',
    count: Object.keys(PIGMENT).length,
    blurb:
      '全作的色彩根。场景不允许自己硬编码十六进制色值，一切颜色都从这里取。' +
      '命名沿用颜料而不是用途（"赭红"而不是"警告色"），方便对照真实的古希腊壁画色系。',
    source: 'src/content/palette.ts → PIGMENT',
  });
  const grid = el('div', 'grid g-swatch');
  const notes: Record<string, string> = {
    bone: '石灰底、被晒白的骨与石',
    plaster: '未上色的墙体、沙',
    terracotta: '红绘陶、干涸的颜料、锈',
    ochre: '麦秆、麻绳、被夕阳照亮的石面',
    blackFigure: '剪影、阴影里的石缝、烧焦的木',
    aegean: '中景海水、青铜的冷面',
    deepSea: '远景海水、洞窟深处',
    storm: '风暴天空、湿透的石头',
    duskGold: '黄昏太阳、火盆、被点亮的雾',
    verdigris: '氧化青铜、苔、橄榄叶背面',
    ash: '亡者之岸的一切',
    indigo: '黎明前的天与水',
  };
  for (const [name, value] of Object.entries(PIGMENT)) {
    const c = card();
    const chip = el('span', 'chip');
    chip.style.background = hex(value);
    const cap = el('figcaption');
    cap.append(
      el('div', 'name', name),
      el('div', 'hex', hex(value).toUpperCase()),
      el('div', 'note', notes[name] ?? ''),
    );
    c.append(chip, cap);
    grid.append(c);
  }
  s.append(grid);
  main.append(s);
}

// ─────────────────────────────────────────── 二、表面材质

{
  const s = section({
    id: 'surface',
    title: '二、表面材质 SURFACE',
    count: Object.keys(SURFACE).length,
    blurb:
      '壁画材质的十四种预设。全作只有这一种表面模型：光照被量化成三档（影 / 中间调 / 亮面），' +
      '影里带一层从地面反弹上来的暖色，加逆光轮廓与三平面风化。下面每一颗都是用真实材质渲染的，' +
      '打光统一用"伊萨卡转晴"——冷环境光配暖太阳，三档色带分得最开。',
    source: 'src/engine/materials.ts → SURFACE / createFrescoMaterial',
  });
  const grid = el('div', 'grid g-tile');
  const ball = new THREE.SphereGeometry(1, 64, 48);
  for (const [name, make] of Object.entries(SURFACE)) {
    const c = card();
    const cv = previewCanvas(300, 240);
    const cap = el('figcaption');
    cap.append(el('div', 'name', name), el('div', 'id', `SURFACE.${name}()`));
    c.append(cv, cap);
    grid.append(c);
    const material = make();
    shoot(ball, material, cv);
  }
  s.append(grid);
  main.append(s);
}

// ─────────────────────────────────────────── 三、天候预设

{
  const usedBy = new Map<string, string[]>();
  for (const { def } of ACTS) {
    const list = usedBy.get(def.env) ?? [];
    list.push(`${def.act === 0 ? '序' : def.act} · ${def.title}`);
    usedBy.set(def.env, list);
  }

  const s = section({
    id: 'env',
    title: '三、天候预设 ENV',
    count: Object.keys(ENV).length,
    blurb:
      '一幕一套。幕与幕之间改变的是光、雾、海与分级，而不是换一套颜色——' +
      '整部作品共用同一色系，靠天候拉开情绪。八幕的节奏是刻意排的：' +
      '靛蓝 → 蜜金 → 雷暴 → 琥珀 → 无光 → 铅灰 → 永昼 → 转晴，最暗的一幕压在正中间。',
    source: 'src/content/palette.ts → ENV',
  });

  const grid = el('div', 'grid g-wide');
  const colorKeys = [
    ['sunColor', '日'],
    ['skyAmbient', '天'],
    ['groundAmbient', '地'],
    ['horizonColor', '平'],
    ['zenithColor', '顶'],
    ['fogColor', '雾'],
    ['fogSunColor', '雾日'],
    ['shadowTint', '影'],
    ['seaShallow', '浅'],
    ['seaDeep', '深'],
    ['seaFoam', '沫'],
    ['halationTint', '晕'],
  ] as const;
  const numKeys = [
    'sunElevation', 'sunIntensity', 'ambientIntensity', 'cloudiness',
    'starIntensity', 'fogDensity', 'waveHeight', 'waveChop',
    'exposure', 'saturation', 'halation', 'vignette', 'grain',
  ] as const;

  for (const [name, preset] of Object.entries(ENV) as Array<[EnvName, (typeof ENV)[EnvName]]>) {
    const box = el('div', 'env');
    const header = el('header');
    header.append(
      el('div', 'name', name),
      el('div', 'used', (usedBy.get(name) ?? ['（未使用）']).join('、')),
    );
    const ramp = el('div', 'ramp');
    for (const [key, label] of colorKeys) {
      const i = el('i');
      i.style.background = hex(preset[key] as number);
      i.append(el('span', undefined, label));
      ramp.append(i);
    }
    const params = el('dl', 'params');
    for (const key of numKeys) {
      const v = preset[key] as number;
      const row = el('div');
      row.append(el('dt', undefined, key), el('dd', undefined, String(Number(v.toFixed(4)))));
      params.append(row);
    }
    box.append(header, ramp, params);
    grid.append(box);
  }
  s.append(grid);

  // 幻象分级
  const vg = el('div');
  vg.style.marginTop = '26px';
  vg.append(el('h2', undefined, '幻象分级 <span class="count">VISION_GRADE</span>'));
  vg.append(
    el(
      'p',
      'blurb',
      '回忆幻象里世界褪成壁画双色，遮幅从 2.00 收窄到 2.39。这三色不随天候改变——' +
        '记忆没有天气。',
    ),
  );
  const vgrid = el('div', 'grid g-swatch');
  for (const key of ['ground', 'figure', 'shadow'] as const) {
    const c = card();
    const chip = el('span', 'chip');
    chip.style.background = hex(VISION_GRADE[key]);
    const cap = el('figcaption');
    cap.append(el('div', 'name', key), el('div', 'hex', hex(VISION_GRADE[key]).toUpperCase()));
    c.append(chip, cap);
    vgrid.append(c);
  }
  vg.append(vgrid);
  s.append(vg);
  main.append(s);
}

// ─────────────────────────────────────────── 四、黑绘母题

{
  const s = section({
    id: 'motif',
    title: '四、黑绘母题 MOTIF',
    count: MOTIF_KINDS.length,
    blurb:
      '十六片黑绘陶剪影，512×512，全部用 Canvas2D 画出来。它们既是回忆幻象里的人物，' +
      '也是世界里四位活人的样子——叙述者已经无法把任何人看成完整的人了，' +
      '活人和记忆里的人在他眼里长得一样。这同时让"没有骨骼动画"从技术限制变成风格：' +
      '黑绘陶上的人本来就是不动的。',
    source: 'src/world/silhouette.ts → PAINTERS',
  });
  const notes: Partial<Record<MotifKind, string>> = {
    galley: '长桨船', rower: '划桨的人', standing: '站立的人', reaching: '伸手的人',
    bound: '被缚在桅上的人', kneeling: '跪坐的人', eye: '巨大的独眼', hand: '巨大的手',
    siren: '鸟身女妖', loom: '织机', flock: '羊群', shades: '亡者的行列',
    wreath: '花环', threshold: '门槛', wave: '波浪回纹', flame: '火',
  };
  const grid = el('div', 'grid g-tile');
  for (const kind of MOTIF_KINDS) {
    const c = card();
    const cv = previewCanvas(260, 260);
    const g = cv.getContext('2d')!;
    // 母题是白底黑形的 alpha 图；铺一层壁画底再画，才是它在游戏里的样子
    g.fillStyle = '#cbb89a';
    g.fillRect(0, 0, cv.width, cv.height);
    const source = motifTexture(kind).image as HTMLCanvasElement;
    g.drawImage(source, 0, 0, cv.width, cv.height);
    const cap = el('figcaption');
    cap.append(
      el('div', 'name', notes[kind] ?? kind),
      el('div', 'id', kind),
    );
    c.append(cv, cap);
    grid.append(c);
  }
  s.append(grid);
  main.append(s);
}

// ─────────────────────────────────────────── 五、程序纹理

{
  const s = section({
    id: 'texture',
    title: '五、程序纹理',
    count: 4,
    blurb:
      '四张 Canvas2D 生成的贴图，全部可平铺。前三张作为壁画材质的三平面细节图使用' +
      '（石 / 沙 / 壁画），回纹用在地面与檐口的装饰带上。',
    source: 'src/engine/textures.ts',
  });
  const grid = el('div', 'grid g-tile');
  const list: Array<[string, () => THREE.Texture, string]> = [
    ['风化 weathering', weatheringTexture, '石面风化，默认细节图'],
    ['沙 sand', sandTexture, '沙地与灰泥'],
    ['壁画 fresco', frescoTexture, '有笔触的上色墙面'],
    ['回纹 meander', meanderTexture, '希腊回纹装饰带'],
  ];
  for (const [name, make, note] of list) {
    const c = card();
    const cv = previewCanvas(260, 260);
    const g = cv.getContext('2d')!;
    const src = make().image as HTMLCanvasElement;
    g.drawImage(src, 0, 0, cv.width, cv.height);
    const cap = el('figcaption');
    cap.append(el('div', 'name', name), el('div', 'note', note), el('div', 'id', `${src.width}×${src.height}`));
    c.append(cv, cap);
    grid.append(c);
  }
  s.append(grid);
  main.append(s);
}

// ─────────────────────────────────────────── 六、构件几何

/** 每个构件用一组有代表性的参数实例化；括号里就是调用签名 */
function PROPS_SPEC(): Record<string, { make: () => THREE.BufferGeometry; call: string; note: string }> {
  return {
    flutedColumn: {
      make: () => P.flutedColumn({ height: 5, radius: 0.42 }),
      call: 'flutedColumn({ height: 5, radius: 0.42 })',
      note: '带凹槽的多立克柱身，broken 控制残缺',
    },
    brokenColumn: {
      make: () => P.flutedColumn({ height: 5, radius: 0.42, broken: 0.55 }),
      call: 'flutedColumn({ …, broken: 0.55 })',
      note: '同一支柱子被折断之后',
    },
    doricCapital: { make: () => P.doricCapital(0.5), call: 'doricCapital(0.5)', note: '多立克柱头' },
    columnDrum: { make: () => P.columnDrum(0.5, 0.7), call: 'columnDrum(0.5, 0.7)', note: '滚落的柱鼓' },
    stoneBlock: { make: () => P.stoneBlock(1.6, 0.7, 0.9), call: 'stoneBlock(1.6, .7, .9)', note: '砌块与台基' },
    statueTorso: { make: () => P.statueTorso(1), call: 'statueTorso(1)', note: '残缺的躯干像' },
    amphora: { make: () => P.amphora(1.1), call: 'amphora(1.1)', note: '双耳瓶' },
    pithos: { make: () => P.pithos(1.4), call: 'pithos(1.4)', note: '储物大瓮' },
    shipRib: { make: () => P.shipRib(3.2, 0.55), call: 'shipRib(3.2, .55)', note: '沉船的肋骨' },
    boatHull: { make: () => P.boatHull(6), call: 'boatHull(6)', note: '船体，离岛点用' },
    pole: { make: () => P.pole(4, 0.09), call: 'pole(4, .09)', note: '桅杆与木桩' },
    plank: { make: () => P.plank(2.4, 0.34, 0.07), call: 'plank(2.4, .34, .07)', note: '船板' },
    sailCloth: { make: () => P.sailCloth(2.6, 2, 0.5), call: 'sailCloth(2.6, 2, .5)', note: '垂坠的帆布' },
    boulder: { make: () => P.boulder(1.1), call: 'boulder(1.1)', note: '海蚀圆石' },
    oliveTrunk: { make: () => P.oliveTrunk(2.6), call: 'oliveTrunk(2.6)', note: '橄榄树干' },
    oliveCanopy: { make: () => P.oliveCanopy(1.8), call: 'oliveCanopy(1.8)', note: '橄榄树冠' },
    cypress: { make: () => P.cypress(5), call: 'cypress(5)', note: '柏树' },
    brazier: { make: () => P.brazier(0.5, 0.9), call: 'brazier(.5, .9)', note: '火盆' },
    stoneAnchor: { make: () => P.stoneAnchor(0.6), call: 'stoneAnchor(.6)', note: '石锚' },
    boundaryStone: { make: () => P.boundaryStone(1.1), call: 'boundaryStone(1.1)', note: '界石' },
    ribBone: { make: () => P.ribBone(1.4), call: 'ribBone(1.4)', note: '肋骨' },
  };
}

{
  const spec = PROPS_SPEC();
  const s = section({
    id: 'props',
    title: '六、构件几何',
    count: Object.keys(spec).length,
    blurb:
      '全部由基本体 + 噪声侵蚀程序化生成，没有一个模型文件。每个工厂都吃一个 seed：' +
      '同一个 seed 永远长出同一块石头，所以截图可复现。下面用真实材质渲染，' +
      '打光同样是"伊萨卡转晴"。',
    source: 'src/world/props.ts',
  });
  const grid = el('div', 'grid g-tile');
  const stone = SURFACE.limestone();
  for (const [name, item] of Object.entries(spec)) {
    const c = card();
    const cv = previewCanvas(300, 240);
    const cap = el('figcaption');
    cap.append(
      el('div', 'name', name),
      el('div', 'note', item.note),
      el('div', 'id', item.call),
    );
    c.append(cv, cap);
    grid.append(c);
    try {
      shoot(item.make(), stone, cv);
    } catch (error) {
      cap.append(el('div', 'note', `渲染失败：${String(error)}`));
    }
  }
  s.append(grid);
  main.append(s);
}

// ─────────────────────────────────────────── 七、地形

{
  const s = section({
    id: 'terrain',
    title: '七、地形',
    count: ACTS.length,
    blurb:
      '八座岛，八个互不相同的种子——它们不能长得一样。下图是每座岛的真实高程：' +
      '直接采样 Terrain.heightAt() 画出来的俯视图，亮=高，暗=低，' +
      '青色那条是水线（走到这里就该看见岸了）。红点是出生点。',
    source: 'src/game/scenes/*.ts → terrain，实现在 src/world/terrain.ts',
  });
  const grid = el('div', 'grid g-tile');
  for (const act of ACTS) {
    const terrain = new Terrain(act.terrain);
    const R = act.terrain.radius;
    const c = card();
    const N = 260;
    const cv = previewCanvas(N, N);
    const g = cv.getContext('2d')!;
    const S = cv.width;
    const img = g.createImageData(S, S);

    // 陆地与水下必须**各自**归一化。
    // 合成一个范围的话，岛外的深水（可以到 -8 米）会把整个值域拉长，
    // 陆地那点起伏被压进最亮的一小段里——八座岛就全画成了一样的白饼。
    let landHi = 0;
    let waterLo = 0;
    const h: number[] = new Array(S * S);
    for (let y = 0; y < S; y += 1) {
      for (let x = 0; x < S; x += 1) {
        const wx = ((x / S) * 2 - 1) * R * 1.25;
        const wz = ((y / S) * 2 - 1) * R * 1.25;
        const v = terrain.heightAt(wx, wz);
        h[y * S + x] = v;
        if (v > landHi) landHi = v;
        if (v < waterLo) waterLo = v;
      }
    }
    for (let i = 0; i < S * S; i += 1) {
      const v = h[i]!;
      const o = i * 4;
      if (v <= 0) {
        // 水下：越深越暗的青
        const t = 1 - v / Math.min(-1e-6, waterLo);
        img.data[o] = 16 + t * 26;
        img.data[o + 1] = 44 + t * 62;
        img.data[o + 2] = 62 + t * 74;
      } else {
        // 陆地：从岸边的暗到峰顶的骨白，整段值域都给它
        const t = v / Math.max(1e-6, landHi);
        const s8 = 45 + t * 205;
        img.data[o] = s8;
        img.data[o + 1] = s8 * 0.94;
        img.data[o + 2] = s8 * 0.8;
      }
      img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);

    // 出生点
    const sx = ((act.def.spawn.x / (R * 1.25)) * 0.5 + 0.5) * S;
    const sz = ((act.def.spawn.z / (R * 1.25)) * 0.5 + 0.5) * S;
    g.fillStyle = '#a6402c';
    g.beginPath();
    g.arc(sx, sz, Math.max(3, S * 0.012), 0, Math.PI * 2);
    g.fill();

    const cap = el('figcaption');
    const p = act.terrain;
    cap.append(
      el('div', 'name', `${act.def.act === 0 ? '序章' : `第 ${act.def.act} 幕`} · ${act.def.title}`),
      el('div', 'note', act.def.tone),
      el(
        'div',
        'id',
        `seed ${p.seed} · radius ${p.radius} · 交互点 ${act.def.interactables.length}`,
      ),
    );
    c.append(cv, cap);
    grid.append(c);
  }
  s.append(grid);
  main.append(s);
}

// ─────────────────────────────────────────── 八、音景

{
  const s = section({
    id: 'audio',
    title: '八、音景 AUDIO',
    count: Object.keys(AUDIO).length,
    blurb:
      '零个音频文件。风、浪、低频嗡鸣、混响、竖琴、脚步全部由 WebAudio 现场合成——' +
      '风是粉噪过带通，混响是程序生成的脉冲响应。每个预设只有五个参数。' +
      '点"试听"会用真实的 Soundscape 播十秒（浏览器要求先有一次点击才允许出声）。',
    source: 'src/engine/audio.ts → AUDIO / Soundscape',
  });
  const grid = el('div', 'grid g-tile');
  const usedBy = new Map<string, string[]>();
  for (const { def } of ACTS) {
    const list = usedBy.get(def.audio) ?? [];
    list.push(def.title);
    usedBy.set(def.audio, list);
  }

  let live: Soundscape | null = null;
  let liveTimer = 0;

  for (const [name, profile] of Object.entries(AUDIO)) {
    const c = card();
    const meta = el('div', 'meta');
    meta.append(
      el('div', 'name', name),
      el('div', 'note', (usedBy.get(name) ?? ['（未使用）']).join('、')),
    );
    for (const [key, max] of [['wind', 1], ['surf', 1], ['drone', 1], ['space', 1]] as const) {
      const row = el('div', 'note');
      row.textContent = `${key} ${profile[key].toFixed(2)}`;
      const bar = el('div', 'bar');
      const fill = el('i');
      fill.style.width = `${(profile[key] / max) * 100}%`;
      bar.append(fill);
      row.append(bar);
      meta.append(row);
    }
    meta.append(el('div', 'id', `windTone ${profile.windTone} Hz`));

    const btn = el('button', 'play', '试听 10 秒');
    btn.addEventListener('click', () => {
      window.clearTimeout(liveTimer);
      live?.dispose();
      live = new Soundscape();
      live.resume();
      // 0.4 秒淡入，别让审阅者被一记全音量的浪拍到
      live.applyProfile(profile, 0.4);
      liveTimer = window.setTimeout(() => {
        live?.dispose();
        live = null;
      }, 10_000);
    });
    meta.append(btn);
    c.append(meta);
    grid.append(c);
  }
  s.append(grid);
  main.append(s);
}

// ─────────────────────────────────────────── 九、文本

{
  const s = section({
    id: 'text',
    title: '九、文本',
    count: ACTS.length + 2,
    blurb:
      '全部叙事文案。环境叙事是这部作品的绝对核心，所以文本本身就是最大的一件素材。' +
      '下面按幕展开：线索旁白、NPC 对话、回忆幻象的逐拍旁白，加上开场引导与终幕收束。',
    source: 'src/content/script.ts → TEXT',
  });

  const intro = el('details', 'act');
  const introSum = el('summary');
  introSum.append(el('span', undefined, '开场引导'), el('span', 'k', `${TEXT.intro.lines.length} 句`));
  const introBody = el('div', 'body');
  const introLines = el('div', 'lines');
  for (const line of TEXT.intro.lines) introLines.append(el('p', undefined, line));
  introBody.append(introLines);
  intro.append(introSum, introBody);
  s.append(intro);

  for (const { def } of ACTS) {
    const d = el('details', 'act');
    const sum = el('summary');
    sum.append(
      el('span', undefined, `${def.act === 0 ? '序章' : `第 ${def.act} 幕`} · ${def.title}`),
      el('span', 'k', `${MEMORY_LABELS[def.id] ?? ''} · ${def.interactables.length} 处交互`),
    );
    const body = el('div', 'body');
    body.append(el('p', 'note', `${def.subtitle} — ${def.tone}`));

    const lines = el('div', 'lines');
    for (const item of def.interactables) {
      if (item.lines.length === 0) continue;
      const label = item.speaker ? `${item.kind} · ${item.speaker}` : `${item.kind} · ${item.prompt}`;
      lines.append(el('div', 'h', `${label}　[${item.id}]`));
      for (const line of item.lines) lines.append(el('p', undefined, line));
    }
    lines.append(el('div', 'h', `回忆幻象　[${def.vision.id}] · ${def.vision.duration}s`));
    for (const beat of def.vision.beats) {
      if (beat.line) lines.append(el('p', undefined, `${beat.at.toFixed(1)}s　${beat.line}`));
    }
    body.append(lines);
    d.append(sum, body);
    s.append(d);
  }

  const outro = el('details', 'act');
  const outroSum = el('summary');
  outroSum.append(el('span', undefined, '终幕收束'), el('span', 'k', '八段记忆全部苏醒之后'));
  const outroBody = el('div', 'body');
  const outroLines = el('div', 'lines');
  outroLines.append(el('div', 'h', '字卡'));
  outroLines.append(el('p', undefined, TEXT.ithaca.epitaph));
  outroLines.append(el('p', undefined, TEXT.ithaca.epitaphSub));
  outroLines.append(el('div', 'h', '收束'));
  for (const line of TEXT.ithaca.epilogue) outroLines.append(el('p', undefined, line || '　'));
  outroBody.append(outroLines);
  outro.append(outroSum, outroBody);
  s.append(outro);

  main.append(s);
}

// ─────────────────────────────────────────── 页脚

const foot = el('footer');
foot.innerHTML =
  `生成于 ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC　·　` +
  '由 <code>games/nostos/tools/assets/</code> 直接读取 <code>src/</code> 渲染，' +
  '重新生成：<code>npm run assets:nostos</code>　·　' +
  '这一页不参与游戏构建，只是审阅用的镜子。';
app.append(foot);

renderer.dispose();
