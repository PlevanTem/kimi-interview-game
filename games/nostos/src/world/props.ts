import * as THREE from 'three';
import { createRng, fbm2, lerp } from '../engine/noise';

/**
 * 构件工厂。
 *
 * 全作没有一个外部模型文件。所有的柱、瓮、雕像、船肋、骨与树都是在这里
 * 用基本体 + 噪声侵蚀长出来的。工厂只产几何，材质由场景装配时决定，
 * 这样同一根柱子在忘食岸是暖白石灰岩，在独眼岬就是湿黑玄武岩。
 *
 * 约定：所有几何的原点在**底面中心**，+Y 向上，尺寸单位是米。
 */

/**
 * 焊接重合顶点后重新求法线。
 *
 * 二十面体、锥体这类几何是非索引的，直接 computeVertexNormals() 会得到
 * 逐面法线——石头于是变成一颗多面体豆子。焊接之后才是被水磨圆的卵石。
 */
export function weld(geometry: THREE.BufferGeometry, tolerance = 1e-3): THREE.BufferGeometry {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const map = new Map<string, number>();
  const positions: number[] = [];
  const index: number[] = [];
  const inv = 1 / tolerance;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const key = `${Math.round(x * inv)},${Math.round(y * inv)},${Math.round(z * inv)}`;
    let hit = map.get(key);
    if (hit === undefined) {
      hit = positions.length / 3;
      map.set(key, hit);
      positions.push(x, y, z);
    }
    index.push(hit);
  }
  const welded = new THREE.BufferGeometry();
  welded.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  welded.setIndex(index);
  welded.computeVertexNormals();
  geometry.dispose();
  return welded;
}

/** 沿法线做噪声侵蚀：石头因此不再是工业圆柱，而是被海风啃过的。 */
export function erode(geometry: THREE.BufferGeometry, amount: number, seed: number, frequency = 0.6): THREE.BufferGeometry {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute | null;
  if (!normal) geometry.computeVertexNormals();
  const n = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const nv = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    nv.fromBufferAttribute(n, i);
    // 两层噪声：大块的缺损 + 细密的麻面
    const coarse = fbm2(v.x * frequency + v.y * frequency * 0.7, v.z * frequency + v.y * frequency * 0.3, 3, seed) - 0.5;
    const fine = fbm2(v.x * frequency * 4.2, v.z * frequency * 4.2 + v.y * 2.1, 2, seed + 77) - 0.5;
    const d = coarse * amount + fine * amount * 0.22;
    v.addScaledVector(nv, d);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** 把某个高度以上打断：断柱、残墙、无头雕像都靠它。 */
export function breakAbove(geometry: THREE.BufferGeometry, y: number, jag: number, seed: number): THREE.BufferGeometry {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    if (v.y > y) {
      const bite = fbm2(v.x * 1.7, v.z * 1.7, 3, seed) - 0.35;
      position.setY(i, y + bite * jag);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** 多利安式凹槽柱身。凹槽是"这是希腊"的最短一句话。 */
export function flutedColumn(options: {
  height: number;
  radius: number;
  taper?: number;
  flutes?: number;
  fluteDepth?: number;
  seed?: number;
  /** 0 = 完整，1 = 只剩柱础 */
  broken?: number;
}): THREE.BufferGeometry {
  const { height, radius } = options;
  const taper = options.taper ?? 0.86;
  const flutes = options.flutes ?? 20;
  const depth = options.fluteDepth ?? 0.055;
  const seed = options.seed ?? 1;
  const broken = options.broken ?? 0;

  const geometry = new THREE.CylinderGeometry(radius * taper, radius, height, flutes * 3, 14, false);
  geometry.translate(0, height / 2, 0);

  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const r = Math.hypot(v.x, v.z);
    if (r > 1e-4) {
      const angle = Math.atan2(v.z, v.x);
      // 凹槽：sin 的绝对值给出一道道竖向的浅槽
      const flute = Math.abs(Math.sin(angle * flutes * 0.5));
      const scale = 1 - depth * (1 - flute);
      v.x *= scale;
      v.z *= scale;
      position.setXYZ(i, v.x, v.y, v.z);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  if (broken > 0) {
    breakAbove(geometry, height * (1 - broken), height * 0.12, seed);
  }
  erode(geometry, radius * 0.09, seed, 1.1);
  return geometry;
}

/** 多利安柱头：一块方形顶板压在一圈外扩的圆盘上。 */
export function doricCapital(radius: number, seed = 3): THREE.BufferGeometry {
  const echinus = new THREE.CylinderGeometry(radius * 1.32, radius * 0.96, radius * 0.42, 24, 2);
  echinus.translate(0, radius * 0.21, 0);
  const abacus = new THREE.BoxGeometry(radius * 2.9, radius * 0.34, radius * 2.9);
  abacus.translate(0, radius * 0.59, 0);
  const merged = mergeSimple([echinus, abacus]);
  erode(merged, radius * 0.07, seed, 1.4);
  return merged;
}

/** 倒在地上的柱鼓。断柱旁边总该有几块滚落的。 */
export function columnDrum(radius: number, height: number, seed = 5): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.02, height, 20, 3);
  geometry.translate(0, height / 2, 0);
  erode(geometry, radius * 0.11, seed, 1.3);
  return geometry;
}

/** 楣石 / 台基块。 */
export function stoneBlock(width: number, height: number, depth: number, seed = 7, wear = 0.06): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth, 4, 3, 4);
  geometry.translate(0, height / 2, 0);
  erode(geometry, Math.min(width, height, depth) * wear, seed, 0.9);
  return geometry;
}

/**
 * 风化的立像残躯。
 *
 * 没有头，没有手臂，衣褶被海风磨平了一半——这是玩家在每座岛上
 * 都会遇到的"人"，也是唯一不会说话的那种。
 */
export function statueTorso(scale: number, seed = 11): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [];
  // 从脚到肩的侧影：脚踝收、裙摆放、腰收、胸放、肩再收
  const pts: Array<[number, number]> = [
    [0.0, 0.0],
    [0.34, 0.0],
    [0.36, 0.12],
    [0.32, 0.5],
    [0.30, 1.05],
    [0.26, 1.35],
    [0.24, 1.5],
    [0.30, 1.72],
    [0.33, 1.9],
    [0.30, 2.02],
    [0.18, 2.1],
    [0.0, 2.12],
  ];
  for (const [r, y] of pts) profile.push(new THREE.Vector2(r * scale, y * scale));

  const geometry = new THREE.LatheGeometry(profile, 26);
  // 压扁成人体的椭圆截面，而不是一个瓶子
  geometry.scale(1, 1, 0.62);

  // 竖向衣褶
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const r = Math.hypot(v.x, v.z);
    if (r > 1e-4 && v.y < 1.62 * scale) {
      const angle = Math.atan2(v.z, v.x);
      const fold = Math.sin(angle * 11) * 0.028 * scale * Math.min(1, v.y / (0.5 * scale));
      const s = (r + fold) / r;
      position.setXYZ(i, v.x * s, v.y, v.z * s);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  // 断在肩线以上，并且啃掉一侧
  breakAbove(geometry, 1.72 * scale, 0.3 * scale, seed);
  erode(geometry, 0.035 * scale, seed + 5, 1.6);
  return geometry;
}

/** 双耳瓶。用旋转体画出真正的希腊器型侧影。 */
export function amphora(height: number, seed = 13): THREE.BufferGeometry {
  const s = height / 1.0;
  const pts: Array<[number, number]> = [
    [0.0, 0.0],
    [0.09, 0.0],
    [0.10, 0.04],
    [0.16, 0.12],
    [0.27, 0.32],
    [0.30, 0.48],
    [0.27, 0.63],
    [0.19, 0.76],
    [0.13, 0.84],
    [0.12, 0.92],
    [0.16, 0.98],
    [0.15, 1.0],
    [0.0, 1.0],
  ];
  const profile = pts.map(([r, y]) => new THREE.Vector2(r * s, y * s));
  const body = new THREE.LatheGeometry(profile, 22);

  // 两只耳：用极扁的环截一段
  const parts: THREE.BufferGeometry[] = [body];
  for (const side of [-1, 1]) {
    const handle = new THREE.TorusGeometry(0.1 * s, 0.022 * s, 6, 14, Math.PI * 1.15);
    handle.rotateY(Math.PI / 2);
    handle.rotateZ(side > 0 ? -Math.PI * 0.42 : Math.PI * 0.42 + Math.PI);
    handle.translate(side * 0.15 * s, 0.83 * s, 0);
    parts.push(handle);
  }
  const merged = mergeSimple(parts);
  erode(merged, 0.012 * s, seed, 2.4);
  return merged;
}

/** 大储物瓮（pithos）：半埋在地里的那种。 */
export function pithos(height: number, seed = 17): THREE.BufferGeometry {
  const s = height;
  const pts: Array<[number, number]> = [
    [0.0, 0.0],
    [0.22, 0.0],
    [0.36, 0.18],
    [0.44, 0.45],
    [0.42, 0.7],
    [0.33, 0.9],
    [0.30, 1.0],
    [0.27, 1.0],
    [0.30, 0.9],
    [0.0, 0.86],
  ];
  const profile = pts.map(([r, y]) => new THREE.Vector2(r * s, y * s));
  const geometry = new THREE.LatheGeometry(profile, 24);
  erode(geometry, 0.02 * s, seed, 1.8);
  return geometry;
}

/** 沉船的肋骨：一根向内弯的木条。整排排开就是一具船的骨架。 */
export function shipRib(length: number, bend: number, seed = 19): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(bend * 0.18, length * 0.35, 0),
    new THREE.Vector3(bend * 0.62, length * 0.72, 0),
    new THREE.Vector3(bend, length, 0),
  ]);
  const geometry = new THREE.TubeGeometry(curve, 14, length * 0.038, 6, false);
  erode(geometry, length * 0.012, seed, 2.2);
  return geometry;
}

/** 断桅 / 桨杆 / 长木。 */
export function pole(height: number, radius: number, seed = 23): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(radius * 0.82, radius, height, 9, 5);
  geometry.translate(0, height / 2, 0);
  breakAbove(geometry, height * 0.94, height * 0.06, seed);
  erode(geometry, radius * 0.28, seed, 3);
  return geometry;
}

/** 船板 / 甲板碎块。 */
export function plank(length: number, width: number, thickness: number, seed = 29): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(length, thickness, width, 6, 1, 2);
  erode(geometry, thickness * 0.5, seed, 1.5);
  return geometry;
}

/** 礁石 / 卵石。同一个函数靠种子长出全场所有石头。 */
export function boulder(radius: number, seed = 31, detail = 2): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const rng = createRng(seed);
  geometry.scale(0.8 + rng() * 0.6, 0.55 + rng() * 0.5, 0.8 + rng() * 0.6);
  const welded = weld(erode(geometry, radius * 0.3, seed, 1.1), radius * 0.004);
  welded.computeBoundingBox();
  const minY = welded.boundingBox?.min.y ?? 0;
  welded.translate(0, -minY, 0);
  return welded;
}

/** 橄榄树：歪的树干 + 几片压扁的树冠。伊萨卡的那棵是全作最后一个物件。 */
export function oliveTrunk(height: number, seed = 37): THREE.BufferGeometry {
  const rng = createRng(seed);
  const lean = (rng() - 0.5) * height * 0.35;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.2, height * 0.3, lean * 0.1),
    new THREE.Vector3(lean * 0.7, height * 0.65, lean * 0.35),
    new THREE.Vector3(lean, height, lean * 0.5),
  ]);
  const geometry = new THREE.TubeGeometry(curve, 16, height * 0.055, 10, false);
  // 老橄榄树的树干是拧的
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const twist = Math.sin(v.y * 3.1 + Math.atan2(v.z, v.x) * 3) * height * 0.012;
    position.setXYZ(i, v.x + twist, v.y, v.z + twist * 0.6);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  erode(geometry, height * 0.02, seed, 3.2);
  return geometry;
}

export function oliveCanopy(radius: number, seed = 41): THREE.BufferGeometry {
  const rng = createRng(seed);
  const parts: THREE.BufferGeometry[] = [];
  const count = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i += 1) {
    const r = radius * (0.55 + rng() * 0.5);
    const blob = new THREE.IcosahedronGeometry(r, 2);
    blob.scale(1, 0.74, 1);
    const smooth = weld(erode(blob, r * 0.16, seed + i * 13, 1.8), r * 0.004);
    smooth.translate((rng() - 0.5) * radius * 1.1, (rng() - 0.3) * radius * 0.5, (rng() - 0.5) * radius * 1.1);
    parts.push(smooth);
  }
  return mergeSimple(parts);
}

/**
 * 科林斯式头盔。
 *
 * 之前这里是一块涂成青铜色的石头——而它是忘食岸的**核心记忆物件**，
 * 玩家为它走完整座岛，最后看到一颗卵石。
 *
 * 科林斯盔的识别度全在轮廓上，所以按轮廓拼，不按细节堆：
 *   1. 一个前后略长的钟形盔体（旋转体，不是球——球会读成头，钟才读成盔）；
 *   2. 正面中线一条**鼻梁护片**垂下来，这是这顶盔最不可替代的一笔；
 *   3. 两侧颊片向前包，和鼻梁之间留出两道缝——那两道缝就是眼孔，
 *      在剪影里比真的挖两个洞更清楚；
 *   4. 顶上一道极低的**盔脊**，把钟形压出正反面之分。
 *
 * 全部不做纹样与铆钉：这部作品的造型语言是大块平涂加一条边线，
 * 一顶 35 厘米的盔上任何刻花在游戏里都只会变成噪点。
 */
export function corinthianHelmet(height = 0.36, seed = 89): THREE.BufferGeometry {
  const s = height;
  const parts: THREE.BufferGeometry[] = [];

  // ── 盔壳：只做头骨那一段，下缘敞口 ──
  // 第一版把盔壳一路做到地面，于是变成一个圆桶；科林斯盔的读法是
  // 上半个圆顶 + 下面三片分开的护片，中间那两道缝才是眼孔。
  // Lathe 的首点半径不为零，底面自然是开的——旁白说"里面积了一层沙"，
  // 本来就该看得见内部。
  const profile: THREE.Vector2[] = [];
  const pts: Array<[number, number]> = [
    [0.44, 0.40],
    [0.455, 0.55],
    [0.45, 0.70],
    [0.415, 0.83],
    [0.32, 0.93],
    [0.17, 0.985],
    [0.00, 1.00],
  ];
  for (const [r, y] of pts) profile.push(new THREE.Vector2(r * s, y * s));
  const skull = new THREE.LatheGeometry(profile, 24);
  skull.scale(1, 1, 1.14);
  parts.push(skull);

  // ── 盔脊：顶上一道薄脊，给圆顶定出前后 ──
  // 脊要短于圆顶的前后跨度，不然会像插了一块板子在头上戳出来
  const crest = new THREE.BoxGeometry(s * 0.07, s * 0.09, s * 0.66);
  crest.translate(0, s * 0.96, 0);
  parts.push(crest);

  // ── 鼻梁护片：正中一条窄板垂下来 ──
  const nose = new THREE.BoxGeometry(s * 0.11, s * 0.46, s * 0.07);
  nose.translate(0, s * 0.35, s * 0.47);
  parts.push(nose);

  // ── 颊片：左右各一片薄板，与鼻梁之间**留出缝**，那道缝就是眼孔 ──
  for (const side of [-1, 1]) {
    // 贴着盔壳挂下来：离远了就成了两块飘着的板
    const cheek = new THREE.BoxGeometry(s * 0.19, s * 0.48, s * 0.08, 2, 3, 1);
    cheek.translate(side * s * 0.27, s * 0.31, s * 0.3);
    cheek.rotateY(side * -0.3);
    parts.push(cheek);
  }

  // ── 颈后护片：向后下方张开的一片，挡住后颈 ──
  const neck = new THREE.BoxGeometry(s * 0.62, s * 0.34, s * 0.09, 3, 2, 1);
  neck.rotateX(-0.4);
  neck.translate(0, s * 0.36, -s * 0.5);
  parts.push(neck);

  const merged = mergeSimple(parts);
  // 侵蚀给得极轻：这一件的识别度全在棱与缝上，磨圆了就退回成一块石头。
  // 第一版给到 0.018 * s，正是那样丢掉的。
  erode(merged, s * 0.005, seed, 2.6);
  return merged;
}

/**
 * 被踩扁的青铜圆盾。
 *
 * 「一面青铜盾，被压成了一张饼。中央的纹章还在，是我们的。」
 * 所以形要读出三件事：圆、扁、以及**中央那个还在的盾脐**。
 * 之前这里是一块压扁的卵石，而且装配时 lift 给到 -0.6，
 * 整面盾沉在地下 45 厘米——玩家当然看不见。
 */
export function crushedShield(radius = 1.1, seed = 91): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 盘面：一张几乎没有厚度的碟，边缘微微翘起
  const dish: THREE.Vector2[] = [];
  const pts: Array<[number, number]> = [
    [0.00, 0.030],
    [0.55, 0.026],
    [0.86, 0.020],
    [0.96, 0.034],
    [1.00, 0.062],
    [0.99, 0.020],
    [0.90, 0.004],
    [0.00, 0.000],
  ];
  for (const [r, y] of pts) dish.push(new THREE.Vector2(r * radius, y * radius));
  parts.push(new THREE.LatheGeometry(dish, 30));

  // 盾脐：中央那块没被压平的凸起，纹章就在它上面
  const boss = new THREE.SphereGeometry(radius * 0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  boss.scale(1, 0.42, 1);
  boss.translate(0, radius * 0.03, 0);
  parts.push(boss);

  const merged = mergeSimple(parts);
  // 被踩扁的金属是皱的，不是磨圆的：高频、浅幅
  erode(merged, radius * 0.045, seed, 3.6);
  return merged;
}

/**
 * 卡在石缝里的一撮羊毛。
 *
 * 「羊毛卡在石缝里，一撮一撮，排得很整齐。」——它是奥德修斯把人绑在羊肚子
 * 底下拖出洞口留下的痕迹，所以形状必须是**被拽过的一绺**：扁、长、一头散。
 * 之前这里放的是小卵石，圆滚滚地浮在半空，读出来是蛋。
 *
 * 做法是压扁再高频侵蚀：低多边形下"蓬松"靠的是不规则的边缘轮廓，
 * 不是靠体积。配合 SURFACE.fleece 的纤维细节图，凑近了才有毛的质感。
 */
export function woolTuft(length = 0.3, seed = 93): THREE.BufferGeometry {
  const rng = createRng(seed);
  const strands: THREE.BufferGeometry[] = [];

  // 一撮毛不是一个团块，是**一束乱七八糟的细丝**。
  // 第一版做成了压扁的单体，侵蚀之后被 weld 磨平，读出来是一颗瓜子。
  // 低多边形下"蓬松"给不出体积，只能给在轮廓上：几根细丝各自岔开，
  // 边缘就碎了，那才像被拽下来的一绺。
  const count = 7 + Math.floor(rng() * 4);
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    // 短而胖：太长太直会读成一束针，羊毛是短纤维搅在一起的
    const long = length * (0.34 + rng() * 0.42);
    const strand = new THREE.IcosahedronGeometry(0.5, 1);
    strand.scale(length * (0.09 + rng() * 0.08), length * (0.08 + rng() * 0.08), long);
    // 每根各自扭一点、翘一点，散开的方向大体一致（被同一个方向拖过）
    strand.rotateX((rng() - 0.5) * 1.5);
    strand.rotateY((rng() - 0.5) * 1.4);
    strand.translate(
      (rng() - 0.5) * length * 0.4,
      length * (0.05 + t * 0.16) + (rng() - 0.5) * length * 0.1,
      (rng() - 0.5) * length * 0.35,
    );
    strands.push(strand);
  }

  const merged = mergeSimple(strands);
  // 不 weld：这里要的就是各面朝各面的碎边，焊平了又变回一块石头
  return merged;
}

/**
 * 沙地上的一个脚印。
 *
 * 压扁到几乎没有厚度的一枚椭圆，长轴是脚的方向。放置时刻意往下沉一点，
 * 只露出边缘那一圈——在三档色带的壁画材质下，它读出来就是沙面上一块
 * 颜色更深的凹痕，正好是湿沙里踩出来的样子。
 *
 * 不做脚趾、不做纹路：这部作品的造型语言是大块平涂加一条边线，
 * 一枚 26 厘米的东西上任何细节在游戏里都看不见，只会变成噪点。
 */
export function footprint(length = 0.27, seed = 83): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(0.5, 2);
  // x 是横向、z 是脚尖方向；y 压到几乎为零
  const height = length * 0.16;
  geometry.scale(length * 0.44, height, length);
  // 二十面体的原点在正中心，而本文件的约定是**原点在底面中心**。
  // 不抬这一下，放下去就有一半埋在地面以下——再叠上装配时的 lift，
  // 整枚脚印会整个沉进沙子里，游戏里什么都看不见。第一版就是这么丢的。
  geometry.translate(0, height * 0.5, 0);
  const eroded = erode(geometry, length * 0.06, seed, 3.4);
  return weld(eroded, length * 0.012);
}

/**
 * 玩家眼高，与 engine/controller.ts 的 EYE_HEIGHT 一致。
 * 树冠必须让开的就是这条线。
 */
const EYE_HEIGHT = 1.68;

/**
 * 树冠最低那片叶子离地的下限。
 *
 * 眼高之上再留约一米的抬头余量：站在树干边上平视要能看见远处的海，
 * 抬头才看见叶子的底面。低于这个值，玩家走到树下就是一头撞进一团黑——
 * 而忘食岸的「闻果子」线索恰恰就摆在一棵树的正下方，
 * 也就是说每一个玩家都必然走到那儿。
 */
export const CANOPY_CLEARANCE = EYE_HEIGHT + 0.92;

export interface OliveTree {
  trunk: THREE.BufferGeometry;
  canopy: THREE.BufferGeometry;
  /** 树冠该被抬到多高。已保证冠底不低于 CANOPY_CLEARANCE */
  canopyLift: number;
}

/**
 * 橄榄树 / 果树：树干加树冠的**整株**。
 *
 * 这个工厂存在的理由是：树在游戏里从来不是一件几何，而三座岛
 * （忘食岸、喀耳刻柱廊、伊萨卡）各自抄了一遍装配比例。抄出来的三份
 * 谁也不保证树冠让开人的头顶——实测忘食岸的冠底只有 1.48 米，
 * 比眼高还低 20 公分。
 *
 * 所以这里不靠算，靠**量**：把树冠的包围盒量出来，再决定抬多高。
 * 不管 seed 抽到什么形状、树多高，冠底不低于 CANOPY_CLEARANCE 都成立。
 */
export function oliveTree(height: number, seed = 37, canopyRatio = 0.66): OliveTree {
  const trunk = oliveTrunk(height, seed);
  const canopy = oliveCanopy(height * canopyRatio, seed + 1);
  canopy.computeBoundingBox();
  // 树冠几何以自己的中心为原点，最低点是个负数
  const bottom = canopy.boundingBox!.min.y;
  // 自然位置：树冠坐在树干顶上
  const natural = height * 1.02;
  // 但不能让最低那片叶子垂到眼前
  const required = CANOPY_CLEARANCE - bottom;
  return { trunk, canopy, canopyLift: Math.max(natural, required) };
}

/** 雪松 / 柏：卡吕普索岛上一列列的深色竖线。 */
export function cypress(height: number, seed = 43): THREE.BufferGeometry {
  const rng = createRng(seed);
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(height * 0.018, height * 0.035, height, 7, 3);
  trunk.translate(0, height / 2, 0);
  parts.push(trunk);
  const tiers = 5;
  for (let i = 0; i < tiers; i += 1) {
    const t = i / tiers;
    const r = height * lerp(0.13, 0.05, t) * (0.85 + rng() * 0.3);
    const h = height * 0.3;
    const cone = new THREE.ConeGeometry(r, h, 9, 2);
    cone.translate(0, height * (0.18 + t * 0.19) + h / 2, 0);
    erode(cone, r * 0.2, seed + i * 7, 2.6);
    parts.push(cone);
  }
  return mergeSimple(parts);
}

/** 火盆：三脚 + 浅碗。夜里与洞窟里唯一的暖色光源造型。 */
export function brazier(radius: number, height: number, seed = 47): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bowlProfile: Array<[number, number]> = [
    [0.0, 0.0],
    [0.5, 0.06],
    [0.9, 0.28],
    [1.0, 0.42],
    [0.94, 0.44],
    [0.86, 0.3],
    [0.42, 0.1],
    [0.0, 0.05],
  ];
  const bowl = new THREE.LatheGeometry(
    bowlProfile.map(([r, y]) => new THREE.Vector2(r * radius, y * radius + height)),
    20,
  );
  parts.push(bowl);
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = new THREE.CylinderGeometry(radius * 0.06, radius * 0.09, height, 6, 2);
    leg.translate(0, height / 2, 0);
    leg.rotateZ(Math.cos(angle) * 0.12);
    leg.rotateX(Math.sin(angle) * 0.12);
    leg.translate(Math.cos(angle) * radius * 0.55, 0, Math.sin(angle) * radius * 0.55);
    parts.push(leg);
  }
  const merged = mergeSimple(parts);
  erode(merged, radius * 0.03, seed, 3);
  return merged;
}

/** 石锚：中间一个孔的梯形石板。 */
export function stoneAnchor(size: number, seed = 53): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-size * 0.32, 0);
  shape.lineTo(size * 0.32, 0);
  shape.lineTo(size * 0.46, size);
  shape.lineTo(-size * 0.46, size);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, size * 0.72, size * 0.11, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: size * 0.16, bevelEnabled: false, curveSegments: 10 });
  geometry.translate(0, 0, -size * 0.08);
  erode(geometry, size * 0.025, seed, 2);
  return geometry;
}

/** 界石 / 赫尔墨斯柱：一根方柱，顶上原本有头，现在没有了。 */
export function boundaryStone(height: number, seed = 59): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(height * 0.22, height, height * 0.19, 3, 8, 3);
  geometry.translate(0, height / 2, 0);
  // 上窄下宽，像被立起来的碑
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const t = v.y / height;
    const s = lerp(1.12, 0.9, t);
    position.setXYZ(i, v.x * s, v.y, v.z * s);
  }
  position.needsUpdate = true;
  breakAbove(geometry, height * 0.88, height * 0.09, seed);
  erode(geometry, height * 0.02, seed, 1.6);
  return geometry;
}

/** 巨兽的肋骨：独眼岬上那些不属于人的尺度。 */
export function ribBone(length: number, seed = 61): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(length * 0.12, length * 0.36, length * 0.05),
    new THREE.Vector3(length * 0.34, length * 0.68, length * 0.02),
    new THREE.Vector3(length * 0.66, length * 0.86, -length * 0.04),
  ]);
  const geometry = new THREE.TubeGeometry(curve, 16, length * 0.045, 7, false);
  // 骨端粗、骨身细
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const center = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const t = Math.min(1, Math.max(0, v.y / (length * 0.86)));
    const bulge = 1 + Math.pow(Math.abs(t * 2 - 1), 3) * 0.7;
    curve.getPoint(t, center);
    v.sub(center).multiplyScalar(bulge).add(center);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  erode(geometry, length * 0.008, seed, 3.4);
  return geometry;
}

/** 垂挂的帆布 / 残破的织物：一张有下垂弧度的双面片。 */
export function sailCloth(width: number, height: number, sag: number, seed = 67): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, height, 14, 12);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const u = (v.x / width) * 2;
    const t = 0.5 - v.y / height;
    // 悬链线式下垂 + 横向褶皱
    const droop = (1 - u * u) * sag * t;
    const fold = Math.sin(u * 7.5 + t * 2.2) * sag * 0.16 * t;
    position.setXYZ(i, v.x, v.y - droop, fold);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  // 边缘撕裂
  const rng = createRng(seed);
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    if (Math.abs(v.x) > width * 0.44 || v.y < -height * 0.42) {
      position.setXYZ(i, v.x + (rng() - 0.5) * width * 0.08, v.y - rng() * height * 0.1, v.z);
    }
  }
  position.needsUpdate = true;
  return geometry;
}

/** 搁浅的小船：离岛时走向的那一条。 */
export function boatHull(length: number, seed = 71): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // 侧视轮廓：两头翘起的希腊小船
  shape.moveTo(-length * 0.5, length * 0.16);
  shape.quadraticCurveTo(-length * 0.32, -length * 0.06, 0, -length * 0.08);
  shape.quadraticCurveTo(length * 0.32, -length * 0.06, length * 0.5, length * 0.18);
  shape.lineTo(length * 0.44, length * 0.2);
  shape.quadraticCurveTo(length * 0.28, length * 0.02, 0, 0);
  shape.quadraticCurveTo(-length * 0.28, length * 0.02, -length * 0.44, length * 0.18);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: length * 0.26,
    bevelEnabled: true,
    bevelSize: length * 0.02,
    bevelThickness: length * 0.02,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geometry.translate(0, 0, -length * 0.13);
  // 船体是圆的，不是一块板
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const t = 1 - Math.min(1, Math.abs(v.x) / (length * 0.5));
    position.setXYZ(i, v.x, v.y, v.z * (0.45 + t * 0.75));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  erode(geometry, length * 0.006, seed, 2.6);
  return geometry;
}

export interface WreckedRaftGeometry {
  wood: THREE.BufferGeometry;
  rope: THREE.BufferGeometry;
}

/**
 * 序章英雄木筏：七块不齐的盐蚀木板、两根横梁与两道真实包扎。
 * 返回分材质几何，场景仍能分别合批，不需要额外 Mesh。
 */
export function wreckedRaft(seed = 97): WreckedRaftGeometry {
  const rng = createRng(seed);
  const woodParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i += 1) {
    const board = plank(4.5 + rng() * 0.85, 0.48 + rng() * 0.08, 0.12, seed + i);
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3((rng() - 0.5) * 0.24, (rng() - 0.5) * 0.08, (i - 3) * 0.58),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (rng() - 0.5) * 0.09, (rng() - 0.5) * 0.045)),
      new THREE.Vector3(1, 1, 1),
    );
    board.applyMatrix4(matrix);
    woodParts.push(board);
  }
  for (const x of [-1.28, 1.12]) {
    const beam = plank(4.25, 0.24, 0.16, seed + 20 + Math.round(x * 10));
    beam.rotateY(Math.PI / 2);
    beam.translate(x, -0.15, 0);
    woodParts.push(beam);
  }

  const ropeParts: THREE.BufferGeometry[] = [];
  for (const x of [-1.28, 1.12]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      points.push(new THREE.Vector3(x, 0.02 + Math.sin(a) * 0.23, Math.cos(a) * 2.12));
    }
    const loop = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 48, 0.045, 6, true);
    erode(loop, 0.008, seed + 40 + Math.round(x * 10), 4);
    ropeParts.push(loop);
  }
  const knotCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.12, 0.21, 2.04),
    new THREE.Vector3(1.22, 0.35, 2.16),
    new THREE.Vector3(1.06, 0.42, 2.22),
    new THREE.Vector3(0.97, 0.25, 2.13),
    new THREE.Vector3(1.18, 0.2, 2.03),
  ]);
  ropeParts.push(new THREE.TubeGeometry(knotCurve, 18, 0.085, 7, false));
  for (const offset of [-0.035, 0.045]) {
    const tail = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.14 + offset, 0.22, 2.08),
      new THREE.Vector3(1.35 + offset, 0.1, 2.36),
      new THREE.Vector3(1.62 + offset, 0.04, 2.52),
    ]);
    ropeParts.push(new THREE.TubeGeometry(tail, 12, 0.045, 6, false));
  }

  return { wood: mergeSimple(woodParts), rope: mergeSimple(ropeParts) };
}

export interface NamePlankGeometry {
  wood: THREE.BufferGeometry;
  inscription: THREE.BufferGeometry;
}

/** 半擦除的船名板；刻痕故意不组成可辨认姓名。 */
export function weatheredNamePlank(seed = 121): NamePlankGeometry {
  const wood = plank(2.75, 0.72, 0.15, seed);
  const cuts: THREE.BufferGeometry[] = [];
  const strokes = [
    [-0.72, -0.16, 0.42, 0.035],
    [-0.48, 0.04, 0.28, -0.32],
    [-0.08, -0.12, 0.5, 0.16],
    [0.38, 0.02, 0.36, -0.18],
    [0.73, -0.1, 0.22, 0.28],
  ] as const;
  for (const [x, z, length, yaw] of strokes) {
    const cut = new THREE.BoxGeometry(length, 0.018, 0.035);
    cut.rotateY(yaw);
    cut.translate(x, 0.084, z);
    cuts.push(cut);
  }
  return { wood, inscription: mergeSimple(cuts) };
}

/** 断桨：宽桨叶、细长柄与参差断口必须在远处也读得出来。 */
export function brokenOar(length = 3.25, seed = 131): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const shaftLength = length * 0.67;
  const shaft = new THREE.CylinderGeometry(length * 0.023, length * 0.03, shaftLength, 9, 5);
  shaft.rotateZ(Math.PI / 2);
  shaft.translate(length * 0.13, 0.04, 0);
  erode(shaft, length * 0.006, seed, 3.4);
  parts.push(shaft);

  const blade = new THREE.Shape();
  blade.moveTo(-length * 0.5, 0);
  blade.lineTo(-length * 0.43, length * 0.115);
  blade.lineTo(-length * 0.18, length * 0.075);
  blade.lineTo(-length * 0.08, length * 0.03);
  blade.lineTo(-length * 0.08, -length * 0.03);
  blade.lineTo(-length * 0.2, -length * 0.08);
  blade.lineTo(-length * 0.45, -length * 0.1);
  blade.closePath();
  const paddle = new THREE.ExtrudeGeometry(blade, {
    depth: length * 0.045,
    bevelEnabled: true,
    bevelSize: length * 0.008,
    bevelThickness: length * 0.006,
    bevelSegments: 1,
    curveSegments: 2,
  });
  paddle.translate(0, 0, -length * 0.0225);
  erode(paddle, length * 0.009, seed + 1, 2.3);
  parts.push(paddle);

  const splinter = new THREE.ConeGeometry(length * 0.035, length * 0.24, 5);
  splinter.rotateZ(-Math.PI / 2);
  splinter.translate(length * 0.49, length * 0.025, 0);
  parts.push(splinter);
  return mergeSimple(parts);
}

/** 几何合并的最小实现，只处理同属性的几何。 */
export function mergeSimple(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (const source of geometries) {
    const g = source.index ? source.toNonIndexed() : source;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const n = g.getAttribute('normal') as THREE.BufferAttribute;
    const uv = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
    for (let i = 0; i < p.count; i += 1) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    if (g !== source) g.dispose();
    source.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  // 不重算法线：各部件可能已经焊接过、拥有平滑法线，重算会把它们打回逐面
  return merged;
}
