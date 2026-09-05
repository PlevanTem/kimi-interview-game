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
