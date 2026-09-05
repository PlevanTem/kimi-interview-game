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
import { fleeceTexture, frescoTexture, meanderTexture, muralTexture, sandTexture, weatheringTexture } from '../../src/engine/textures';
import { ACTS } from '../../src/game/scenes';
import { holdFor } from '../../src/game/types';
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

/** 玩家眼高，来自 engine/controller.ts。植物的"冠底离地"要跟它比 */
const EYE_HEIGHT = 1.68;

/**
 * 一件待渲染的零件。
 *
 * 之所以要支持"多零件"，是因为这部作品里不少东西在游戏里从来不单独出现：
 * 橄榄树永远是树干 + 树冠两件套，藤蔓是二十几段茎加叶簇。
 * 只画零件的话，审阅者看到的是一根棍和一个球，而不是一棵树。
 */
interface Part {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** 相对整株的位置 */
  at?: [number, number, number];
  /** 绕 Y 轴自转 */
  yaw?: number;
  /** 前后倾倒 */
  tiltX?: number;
  scale?: number;
}

interface ShootOptions {
  /**
   * 镜头仰角系数，默认 0.38（略高于水平的四分之三视角）。
   * 高瘦的东西（树、柏、柱）要调低：从高处看树，树冠会把树干整个盖住，
   * 而玩家在游戏里是站在地上抬头看的。
   */
  elevation?: number;
}

/**
 * 把一组零件装配起来、摆正、取景、渲染，结果拷进目标画布。
 * 返回装配后的真实包围盒（**未平移前**的世界尺寸），
 * 好让卡片能标出这件东西到底多大——审阅体量时这比看图可靠。
 */
function shootParts(
  parts: Part[],
  into: HTMLCanvasElement,
  options: ShootOptions = {},
): { size: THREE.Vector3; liftedMinY: number } {
  const group = new THREE.Group();
  // 被抬起来的那些零件（树冠、叶簇）单独量一次最低点。
  // 量整组是没有意义的：树干的底就在 y=0，整组的最小值永远是 0。
  let liftedMinY = Infinity;
  const probe = new THREE.Box3();
  for (const part of parts) {
    const mesh = new THREE.Mesh(part.geometry, part.material);
    const [x, y, z] = part.at ?? [0, 0, 0];
    mesh.position.set(x, y, z);
    if (part.yaw) mesh.rotation.y = part.yaw;
    if (part.tiltX) mesh.rotation.x = part.tiltX;
    if (part.scale) mesh.scale.setScalar(part.scale);
    group.add(mesh);
    if (y > 0) {
      mesh.updateMatrixWorld(true);
      probe.setFromObject(mesh);
      if (probe.min.y < liftedMinY) liftedMinY = probe.min.y;
    }
  }
  scene.add(group);

  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  // 把整株挪到原点，镜头就不用为每件东西单独算构图
  group.position.set(-center.x, -center.y, -center.z);

  // 按包围盒的实际投影取景，而不是按包围球半径。
  // 用半径会让细长件（桅杆、柱子）在画面里缩成一根火柴——
  // 球把它最长的那一维当成了各个方向的尺寸。
  const tan = Math.tan((camera.fov * Math.PI) / 360);
  const half = Math.max(size.x, size.z) * 0.5;
  const distV = (size.y * 0.5) / tan;
  const distH = half / (tan * camera.aspect);
  const dist = Math.max(distV, distH, 0.6) * 1.18;
  // 略高于水平的四分之三视角：看得到顶面的转折，又不至于变成俯视图
  const ey = options.elevation ?? 0.38;
  camera.position.set(dist * 0.55, dist * ey, dist * 0.74);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  tickMaterials(1.5, camera.position);
  renderer.render(scene, camera);

  const g = into.getContext('2d')!;
  g.drawImage(renderer.domElement, 0, 0, into.width, into.height);

  scene.remove(group);
  return { size, liftedMinY };
}

/** 单件的简写 */
function shoot(geometry: THREE.BufferGeometry, material: THREE.Material, into: HTMLCanvasElement): void {
  shootParts([{ geometry, material }], into);
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
  [6, '程序纹理'],
  [propNames.length, '构件几何'],
  [5, '植物'],
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
  ['plant', '植物'],
  ['terrain', '地形'],
  ['audio', '音景'],
  ['text', '剧本与交互'],
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
    count: 6,
    blurb:
      '六张 Canvas2D 生成的贴图。前五张可平铺；壁画那张不平铺——它是一幅画，有确定的上下左右。前三张作为壁画材质的三平面细节图使用' +
      '（石 / 沙 / 壁画），回纹用在地面与檐口的装饰带上。',
    source: 'src/engine/textures.ts',
  });
  const grid = el('div', 'grid g-tile');
  const list: Array<[string, () => THREE.Texture, string]> = [
    ['风化 weathering', weatheringTexture, '石面风化，默认细节图'],
    ['沙 sand', sandTexture, '沙地与灰泥'],
    ['壁画 fresco', frescoTexture, '有笔触的上色墙面'],
    ['回纹 meander', meanderTexture, '希腊回纹装饰带'],
    ['羊毛 fleece', fleeceTexture, '有方向的纤维，独眼岬石缝里的那几撮毛用它'],
    ['壁画 mural', muralTexture, '喀耳刻柱廊地上那幅：一排人弯着腰，越往后越不像人。剥了大半'],
  ];
  for (const [name, make, note] of list) {
    const c = card();
    const src = make().image as HTMLCanvasElement;
    // 按贴图自己的比例预览：壁画是 1024×512，硬塞进正方形会把人挤扁，
    // 而"人被挤扁"恰好是这张图最不该产生的误会
    const cv = previewCanvas(260, Math.round((260 * src.height) / src.width));
    const g = cv.getContext('2d')!;
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
    footprint: {
      make: () => P.footprint(0.27),
      call: 'footprint(0.27)',
      note: '沙地上的一枚脚印。忘食岸那一行由 46 枚铺成，只有去程没有回程',
    },
    corinthianHelmet: {
      make: () => P.corinthianHelmet(0.38),
      call: 'corinthianHelmet(0.38)',
      note: '科林斯盔：钟形盔体 + 鼻梁护片 + 两侧颊片，缝就是眼孔。忘食岸的核心记忆物件',
    },
    crushedShield: {
      make: () => P.crushedShield(1.15),
      call: 'crushedShield(1.15)',
      note: '被踩扁的青铜圆盾，中央盾脐还在——「中央的纹章还在，是我们的」',
    },
    woolTuft: {
      make: () => P.woolTuft(0.3),
      call: 'woolTuft(0.3)',
      note: '卡在石缝里的一撮羊毛。扁、长、一头散，配 SURFACE.fleece 的纤维图',
    },
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

// ─────────────────────────────────────────── 七、植物

/**
 * 植物在这部作品里**从来不是一件几何**。
 *
 * 橄榄树是树干 + 树冠两件套，喀耳刻的藤是二十几段茎加叶簇。
 * 所以它们不能只出现在"构件几何"那一节里——那里画的是零件，
 * 看到的是一根棍和一个球。这一节按各幕装配代码里的真实比例把它们拼起来，
 * 参数与 game/scenes/*.ts 中的写法一致。
 */
{
  const s = section({
    id: 'plant',
    title: '七、植物',
    count: 5,
    blurb:
      '全作只有三种植物，但它们在场景里都是**装配出来的**，不是单件几何：' +
      '橄榄树永远是树干加树冠两件套，藤是二十几段茎接起来再挂叶簇。' +
      '下面直接调用游戏的整株工厂 oliveTree() 装配，不在这里复刻比例，' +
      '所以这里看到的就是走到树下时看到的那棵树。' +
      '「冠底离地」是这株树最低那片叶子的高度，由工厂量出树冠包围盒后保证——' +
      '它必须高过眼高 1.68 米，否则玩家走到树下就是一头撞进一团黑。',
    source: 'src/world/props.ts → oliveTree() / cypress()',
  });

  const drift = SURFACE.driftwood();
  const olive = SURFACE.olive();

  // 直接用游戏的整株工厂，不在这里复刻装配比例。
  // 之前这里抄了一份 height * 1.02 的算法——那就是第四份抄写，
  // 而"资产库不能有自己的一份真相"正是这个工具存在的理由。
  const tree = (h: number, seed: number): Part[] => {
    const t = P.oliveTree(h, seed);
    return [
      { geometry: t.trunk, material: drift },
      { geometry: t.canopy, material: olive, at: [0, t.canopyLift, 0] },
    ];
  };

  // 喀耳刻的藤：茎一小段一小段接起来，比一根长管更像自然爬出来的。
  // 叶团块必须小——藤是一条线，不是一串球。
  const creeper = (): Part[] => {
    const parts: Part[] = [];
    let seed = 1;
    const rng = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 22; i += 1) {
      const t = i / 21;
      const x = -Math.sin(t * 3.4) * 2.4;
      const z = -t * 8.5;
      const lift = 0.05 + Math.max(0, Math.sin(t * 2.6)) * 1.1;
      parts.push({
        geometry: P.pole(0.55, 0.035, 1020 + i),
        material: drift,
        at: [x, lift, z],
        tiltX: 1.1 + Math.sin(t * 5) * 0.35,
        yaw: t * 3.4,
      });
      if (i % 2 === 0) {
        parts.push({
          geometry: P.oliveCanopy(0.2 + rng() * 0.1, 1060 + i),
          material: olive,
          at: [x + (rng() - 0.5) * 0.5, lift + 0.18, z + (rng() - 0.5) * 0.5],
        });
      }
    }
    return parts;
  };

  const plants: Array<{ name: string; note: string; call: string; parts: Part[]; elevation?: number }> = [
    {
      name: '果树（忘食岸）',
      note: '低矮、伸手就够得到，光从叶缝里切下来。全幕六棵，高 3.6–4.6 米',
      call: 'oliveTree(4.4, 340)',
      parts: tree(4.4, 340),
    },
    {
      name: '橄榄树（喀耳刻柱廊外）',
      note: '把柱廊框起来的四棵，树冠比忘食岸略大一点',
      call: 'oliveTree(4.2, 1040)',
      parts: tree(4.2, 1040),
    },
    {
      name: '老橄榄树（伊萨卡）',
      note: '终幕院子里那三棵，最高的一棵 5.2 米——他离开时它就在那儿',
      call: 'oliveTree(5.2, 2460)',
      parts: tree(5.2, 2460),
    },
    {
      name: '柏树（卡吕普索之岛）',
      note: '全作唯一的单件植物，不需要装配。永昼里一排排的深色竖线',
      call: 'cypress(5)',
      parts: [{ geometry: P.cypress(5, 1950), material: olive }],
    },
    {
      name: '爬藤（喀耳刻的柱廊）',
      note: '22 段茎 + 11 簇叶，爬进来又爬回去。它是一条线，不是一串球',
      call: 'pole(0.55, 0.035) × 22 + oliveCanopy(0.2–0.3) × 11',
      parts: creeper(),
    },
  ];

  const grid = el('div', 'grid g-tile');
  for (const plant of plants) {
    const c = card();
    const cv = previewCanvas(300, 300);
    const cap = el('figcaption');
    cap.append(
      el('div', 'name', plant.name),
      el('div', 'note', plant.note),
      el('div', 'id', plant.call),
    );
    c.append(cv, cap);
    grid.append(c);
    // 树用接近人眼的低机位：从高处看，树冠会把树干整个盖住，
    // 而玩家在游戏里是站在地上抬头看的
    const { size, liftedMinY } = shootParts(plant.parts, cv, { elevation: plant.elevation ?? 0.12 });
    // 标出真实体量，以及树冠最低的那片叶子离地多高。
    // 后者要跟眼高 1.68 米比：低于它，玩家走到树下就是一头撞进叶子里，
    // 而不是抬头看见叶子的底面。红色 = 低于眼高。
    const dims = el('div', 'note');
    dims.innerHTML =
      `宽 ${size.x.toFixed(1)} × 高 ${size.y.toFixed(1)} m` +
      (Number.isFinite(liftedMinY) && size.y > 2
        ? `　·　冠底离地 <b style="color:${liftedMinY < EYE_HEIGHT ? '#a6402c' : '#6e8c7a'}">` +
          `${liftedMinY.toFixed(2)} m</b>（眼高 ${EYE_HEIGHT}）`
        : '');
    cap.append(dims);
  }
  s.append(grid);
  main.append(s);
}

// ─────────────────────────────────────────── 八、地形

{
  const s = section({
    id: 'terrain',
    title: '八、地形',
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

// ─────────────────────────────────────────── 九、音景

{
  const s = section({
    id: 'audio',
    title: '九、音景 AUDIO',
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

// ─────────────────────────────────────────── 十、剧本与交互

/**
 * 这一节是整部作品的**剧本统筹台**：八幕的每一个交互点、它的全部台词、
 * 它跟别的东西的关联、以及碰了它之后世界会发生什么，都在这里一次看完。
 *
 * 之所以不只是"把台词列出来"：台词单独看是读不懂的。
 * 「你已经看了很多次了」这句喀耳刻的台词，只有知道它挂在"织机"上、
 * 而织机就在核心记忆物件旁边三米、并且玩家此刻已经读过"藤爬了一个来回要一年"
 * 之后，才知道它在说什么。所以说明、关联、影响必须和台词摆在一起。
 */
{
  const KIND: Record<string, { label: string; color: string; effect: string }> = {
    clue: {
      label: '线索',
      color: '#cbb89a',
      effect: '读一两句旁白。不进任何清单，不改变任何状态，跳过它照样能走完全程。',
    },
    talk: {
      label: '对话',
      color: '#6e8c7a',
      effect: '一段线性短对话，说完就结束。同样不改变状态。',
    },
    memory: {
      label: '核心记忆',
      color: '#e0a94e',
      effect: '触发本幕的回忆幻象，并且**解锁岸边的离岛点**。这是本幕唯一的必经交互。',
    },
    depart: {
      label: '离岛',
      color: '#a6402c',
      effect: '硬切进入下一幕。必须先看完本幕核心记忆才会亮起。',
    },
  };

  const s = section({
    id: 'text',
    title: '十、剧本与交互',
    count: ACTS.reduce((n, a) => n + a.def.interactables.length, 0),
    blurb:
      '全作的台词、交互点与它们之间的关系。环境叙事是这部作品的绝对核心，' +
      '所以剧本本身就是最大的一件素材——但台词单独列出来是读不懂的：' +
      '它挂在哪件东西上、离核心记忆多远、碰了之后世界会发生什么，缺一样都读不出意思。' +
      '下面每一幕都按「元数据 → 交互点（含影响与关联）→ 幻象逐拍时间轴」展开。',
    source: 'src/content/script.ts（台词）+ src/game/scenes/*.ts（交互点与关联）',
  });

  // ── 玩法边界：四种交互，各自的影响 ──
  const legend = el('div', 'legend');
  legend.append(el('div', 'sectionlabel', '四种交互，以及碰了它们会发生什么'));
  for (const meta of Object.values(KIND)) {
    const row = el('div', 'legend-row');
    const badge = el('span', 'badge');
    badge.textContent = meta.label;
    badge.style.color = meta.color;
    badge.style.borderColor = meta.color;
    row.append(badge, el('span', 'legend-text', meta.effect.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')));
    legend.append(row);
  }
  legend.append(
    el(
      'p',
      'note',
      '全作只有这四种，不会有第五种——这条边界由 tests/scenes.test.ts 写死。' +
        '进度只记两件事：走到第几幕、碰过哪些东西；没有数值、没有分支权重、没有结局解算。',
    ),
  );
  s.append(legend);

  // ── 全局一览表 ──
  const overview = el('div', 'overview');
  overview.append(el('div', 'sectionlabel', '八幕一览'));
  const head = el('div', 'orow ohead');
  for (const h of ['幕', '岛', '天候', '音景', '核心记忆', 'NPC', '线索', '幻象']) {
    head.append(el('span', undefined, h));
  }
  overview.append(head);
  for (const { def } of ACTS) {
    const npc = def.interactables.find((i) => i.kind === 'talk');
    const clues = def.interactables.filter((i) => i.kind === 'clue').length;
    const row = el('div', 'orow');
    row.append(
      el('span', undefined, def.act === 0 ? '序' : String(def.act)),
      el('span', undefined, def.title),
      el('span', 'mono', def.env),
      el('span', 'mono', def.audio),
      el('span', undefined, MEMORY_LABELS[def.id] ?? '—'),
      el('span', undefined, npc?.speaker ?? '—'),
      el('span', 'mono', String(clues)),
      el('span', 'mono', `${def.vision.duration}s`),
    );
    overview.append(row);
  }
  s.append(overview);

  // ── 开场引导 ──
  const intro = el('details', 'act');
  const introSum = el('summary');
  introSum.append(
    el('span', undefined, '开场引导'),
    el('span', 'k', `${TEXT.intro.lines.length} 句 · 黑场 · 仅首次开始`),
  );
  const introBody = el('div', 'body');
  introBody.append(
    el(
      'p',
      'note',
      '全作唯一一次直接对玩家说话。说完就再也不解释——之后所有信息都由环境自己给出。' +
        '从存档继续时不出现。',
    ),
  );
  const introLines = el('div', 'lines');
  for (const line of TEXT.intro.lines) introLines.append(el('p', undefined, line));
  introBody.append(introLines);
  intro.append(introSum, introBody);
  s.append(intro);

  // ── 逐幕 ──
  for (const act of ACTS) {
    const def = act.def;
    const memory = def.interactables.find((i) => i.id === def.memoryId);
    const d = el('details', 'act');
    const sum = el('summary');
    sum.append(
      el('span', undefined, `${def.act === 0 ? '序章' : `第 ${def.act} 幕`} · ${def.title}`),
      el('span', 'k', `${def.interactables.length} 处交互 · ${MEMORY_LABELS[def.id] ?? ''}`),
    );

    const body = el('div', 'body');

    // 元数据条
    const meta = el('div', 'scriptmeta');
    for (const [k, v] of [
      ['副题', def.subtitle],
      ['天候', def.env],
      ['音景', def.audio],
      ['地形 seed', String(act.terrain.seed)],
      ['岛半径', `${act.terrain.radius} m`],
      ['出生点', `x ${def.spawn.x} · z ${def.spawn.z}`],
      ['登岸横摇', `${def.arrival.seconds}s`],
    ] as const) {
      const cell = el('div');
      cell.append(el('dt', undefined, k), el('dd', undefined, v));
      meta.append(cell);
    }
    body.append(meta);
    body.append(el('p', 'tone', def.tone));

    // 交互点
    body.append(el('div', 'sectionlabel', '交互点'));
    for (const item of def.interactables) {
      const meta2 = KIND[item.kind]!;
      const row = el('div', 'irow');

      const headRow = el('div', 'ihead');
      const badge = el('span', 'badge');
      badge.textContent = meta2.label;
      badge.style.color = meta2.color;
      badge.style.borderColor = meta2.color;
      headRow.append(badge, el('span', 'iprompt', item.prompt), el('span', 'id', item.id));
      row.append(headRow);

      const facts: string[] = [
        `x ${item.x} · z ${item.z}${item.y !== undefined ? ` · 视线高 ${item.y}` : ''}`,
        `触发半径 ${item.radius ?? 2.4} m`,
      ];
      if (memory && item.id !== def.memoryId) {
        const dist = Math.hypot(item.x - memory.x, item.z - memory.z);
        facts.push(`距核心记忆 ${dist.toFixed(1)} m`);
      }
      if (item.speaker) facts.push(`说话人 ${item.speaker}`);
      if (item.motif) facts.push(`剪影母题 ${item.motif}`);
      row.append(el('div', 'ifacts', facts.join('　·　')));

      // 影响与关联——这是"看得懂"的关键，不能只列台词
      const effect = el('div', 'ieffect');
      if (item.kind === 'memory') {
        effect.innerHTML =
          '<b>影响</b>：触发幻象 <code>' +
          def.vision.id +
          '</code>（' +
          def.vision.duration +
          's），并解锁本幕离岛点。<br><b>关联</b>：本幕 <code>memoryId</code> 指向它；幻象舞台就摆在它前方 ' +
          Math.hypot(def.vision.stage.x - item.x, def.vision.stage.z - item.z).toFixed(1) +
          ' m 处，构图才对得上。';
      } else if (item.kind === 'depart') {
        effect.innerHTML =
          '<b>影响</b>：1.8 秒推向过曝白，硬切下一幕。<br><b>关联</b>：' +
          (item.requiresMemory
            ? `<code>requiresMemory</code> — 必须先触碰「${MEMORY_LABELS[def.id] ?? def.memoryId}」，它才会亮起微光。`
            : '无前置。');
      } else {
        effect.innerHTML = `<b>影响</b>：${meta2.effect}`;
      }
      row.append(effect);

      if (item.lines.length > 0) {
        const lines = el('div', 'lines');
        for (const line of item.lines) lines.append(el('p', undefined, line));
        row.append(lines);
      } else {
        row.append(el('p', 'note', '（无台词——离岛点不说话，走过去就是结束）'));
      }
      body.append(row);
    }

    // 幻象时间轴
    body.append(el('div', 'sectionlabel', `回忆幻象　${def.vision.id}　${def.vision.duration}s`));
    body.append(
      el(
        'p',
        'note',
        `舞台中心 x ${def.vision.stage.x} · z ${def.vision.stage.z}。` +
          '幻象里世界褪成壁画双色，遮幅收窄到 2.39:1，黑绘剪影随旁白一层层浮现。' +
          '玩家全程仍可自由转头，镜头只是被轻轻推向该看的方向；`空格` 随时可跳过。',
      ),
    );
    const timeline = el('div', 'timeline');
    for (const beat of def.vision.beats) {
      const b = el('div', 'beat');
      b.append(el('span', 'at', `${beat.at.toFixed(1)}s`));
      const bodyCell = el('div', 'bcell');
      if (beat.line) bodyCell.append(el('p', 'bline', beat.line));
      const tags: string[] = [];
      if (beat.motif) {
        tags.push(
          `剪影 ${beat.motif.kind}　size ${beat.motif.size}` +
            (beat.motif.ink === 'shadow' ? '　影色' : '') +
            (beat.motif.crumbleAt ? `　${beat.motif.crumbleAt}s 崩解` : ''),
        );
      }
      if (beat.camera) {
        const c = beat.camera;
        tags.push(
          '镜头 ' +
            [
              c.yaw !== undefined ? `yaw ${c.yaw}` : '',
              c.pitch !== undefined ? `pitch ${c.pitch}` : '',
              c.fov !== undefined ? `fov ${c.fov}` : '',
            ]
              .filter(Boolean)
              .join(' · '),
        );
      }
      if (beat.exposure !== undefined) tags.push(`曝光 ×${beat.exposure}`);
      if (tags.length) bodyCell.append(el('div', 'btags', tags.join('　|　')));
      b.append(bodyCell);
      timeline.append(b);
    }
    body.append(timeline);

    d.append(sum, body);
    s.append(d);
  }

  // ── 终幕收束 ──
  const outro = el('details', 'act');
  const outroSum = el('summary');
  outroSum.append(el('span', undefined, '终幕收束'), el('span', 'k', '八段记忆全部苏醒之后'));
  const outroBody = el('div', 'body');
  outroBody.append(
    el(
      'p',
      'note',
      '八段记忆是必经的——每一幕不看完核心记忆就上不了船，所以"全部解锁"等同于"走完全程"。' +
        '终幕把八幕的岛名与记忆物件排成一列还给玩家，再压上全作唯一一次把账算清的那句话。',
    ),
  );
  const outroLines = el('div', 'lines');
  outroLines.append(el('div', 'h', '字卡'));
  outroLines.append(el('p', undefined, TEXT.ithaca.epitaph));
  outroLines.append(el('p', undefined, TEXT.ithaca.epitaphSub));
  outroLines.append(el('div', 'h', '收束'));
  for (const line of TEXT.ithaca.epilogue) outroLines.append(el('p', undefined, line || '　'));
  outroBody.append(outroLines);
  outro.append(outroSum, outroBody);
  s.append(outro);

  // ── 体量统计 ──
  let lineCount = 0;
  let charCount = 0;
  let seconds = 0;
  const eat = (arr: readonly string[]): void => {
    for (const l of arr) {
      if (!l) continue;
      lineCount += 1;
      charCount += l.length;
      seconds += holdFor(l);
    }
  };
  eat(TEXT.intro.lines);
  eat(TEXT.ithaca.epilogue);
  for (const { def } of ACTS) {
    for (const item of def.interactables) eat(item.lines);
    eat(def.vision.beats.map((b) => b.line ?? '').filter(Boolean));
  }
  const stat = el('p', 'note');
  stat.style.marginTop = '22px';
  stat.innerHTML =
    `全作共 <b>${lineCount}</b> 句台词、<b>${charCount}</b> 字，` +
    `按 <code>holdFor()</code> 估算朗读时长约 <b>${Math.round(seconds / 60)}</b> 分钟。` +
    '（一整周目约 50–70 分钟，其余时间是走路与看。）';
  s.append(stat);

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
