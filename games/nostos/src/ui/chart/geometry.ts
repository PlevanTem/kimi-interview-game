import * as THREE from 'three';
import { clamp, fbm2, smoothstep } from '../../engine/noise';
import { terrainHeight } from '../../world/terrain';
import type { ChartCarve, ChartIsland } from './atlas';

/**
 * 一枚章的几何。
 *
 * 「章」= 从世界上**挖下来的一块地**：顶面是那座岛真实的地形与海岸线，
 * 侧面是一圈带凿痕的石料立面，底面平。它不是一张地图上的图钉，
 * 也不是一片剪影——它有厚度，光打上去有真的阴影，转一点角度能看见侧壁。
 *
 * 三条尺度规矩（全部写在这里，不散落在别处）：
 *
 * 1. **地形一比一**：顶面每一个顶点都由 `terrainHeight()` 求值，
 *    和玩家脚下踩的是同一个函数。海岸线是高度过零的地方自然形成的，
 *    所以每一枚章的岸线都不一样——不是八个圆盘。
 * 2. **竖向夸张 1.8×**：亡者之岸的起伏只有 1.1 米，一比一缩到章上是
 *    一片死平的白盘。地貌图向来做竖向夸张，这里把倍数写死并公开。
 * 3. **平面尺寸半归一化**：真实半径 26–44 米，若等比缩，序章那块沙洲
 *    只有独眼岬的 59%，八枚排开会散。用 (R/40)^0.55 压一压，
 *    大小差别还读得出来，但每一枚都还能看清。
 */

/** 竖向夸张倍数。改这一个值就能整体调节浮雕的"高低对比"。 */
export const RELIEF_EXAGGERATION = 1.8;

/** 一枚章在图版上的基准半径（图版单位）。 */
export const PLINTH_RADIUS = 0.46;

/** 石料立面的高度（图版单位）。 */
export const PLINTH_WALL = 0.2;

/** 顶面采样密度：径向环数 × 周向扇数。 */
const RINGS = 30;
const SECTORS = 72;

/** 顶面一直采到水线之外，好让海岸线由高度过零自然切出来。 */
const OVERSAMPLE = 1.16;

export interface Relief {
  geometry: THREE.BufferGeometry;
  /** 该岛在图版上的水平缩放：世界米 → 图版单位 */
  scale: number;
  /** 章的外缘半径（图版单位） */
  radius: number;
}

/** 世界米 → 图版单位。地形与地标共用，两边不能各算各的。 */
export function chartScale(island: ChartIsland): number {
  const worldRadius = island.terrain.radius;
  const plan = PLINTH_RADIUS * Math.pow(worldRadius / 40, 0.55);
  return plan / (worldRadius * OVERSAMPLE);
}

/** 水道：从高度里减掉一条软槽。目前只有塞壬水道用。 */
function carveAt(carve: ChartCarve | undefined, x: number, z: number): number {
  if (!carve) return 0;
  // 把点转到水道的局部坐标，只看它离中线多远
  const c = Math.cos(-carve.angle);
  const s = Math.sin(-carve.angle);
  const across = x * s + z * c;
  const w = 1 - smoothstep(carve.halfWidth * 0.35, carve.halfWidth, Math.abs(across));
  return carve.depth * w;
}

/**
 * 顶面的颜色。
 *
 * 刻意照抄 `materials.ts` 里壁画着色器那几行：同样的 0.62 / 0.86 陡面阈值，
 * 同样的 heightStart / heightEnd 高地阈值，同样的三色。章上的岛因此和
 * 玩家眼里的岛是同一个色相——只是没有三平面细节图和后期分级。
 */
function surfaceColor(
  island: ChartIsland,
  height: number,
  normalY: number,
  jitter: number,
  out: THREE.Color,
): void {
  const p = island.terrain;
  const water = p.waterLevel ?? 0;

  if (height <= water) {
    // 水：浅海色按深度压向深海色。章上的水只是一圈说明岸线在哪儿的薄面，
    // 不做波浪——一枚章上如果还有海浪，它就不是一枚章了。
    const depth = clamp((water - height) / 6, 0, 1);
    out.setHex(island.weather.sea);
    out.lerp(new THREE.Color(p.colorSteep), depth * 0.55);
    out.multiplyScalar(0.78);
    return;
  }

  out.setHex(p.colorFlat);
  const steep = clamp(1 - smoothstep(0.62, 0.86, normalY) + jitter * 0.35, 0, 1);
  out.lerp(new THREE.Color(p.colorSteep), steep);
  const high = smoothstep(p.heightStart ?? 3.5, p.heightEnd ?? 11, height + jitter * 2);
  out.lerp(new THREE.Color(p.colorHigh), high);
}

/** 石料立面的颜色：一层比顶面暗的素石，带竖向凿痕。 */
function wallColor(island: ChartIsland, streak: number, out: THREE.Color): void {
  out.setHex(island.terrain.colorSteep);
  out.multiplyScalar(0.52 + streak * 0.26);
}

/**
 * 生成一枚章。
 *
 * 用**极坐标**而不是方格网：章的外缘要正好是一个圆（石料是被圆凿切下来的），
 * 方格网切出来的圆边会有锯齿，而且四个角上白白浪费掉近一半的顶点。
 */
export function buildRelief(island: ChartIsland): Relief {
  const p = island.terrain;
  const scale = chartScale(island);
  const worldOuter = p.radius * OVERSAMPLE;
  const radius = worldOuter * scale;
  const water = p.waterLevel ?? 0;

  const positions: number[] = [];
  const colors: number[] = [];

  // 先把整张顶面的高度采下来，边上多留一圈用来求法线
  const heights: number[][] = [];
  for (let i = 0; i <= RINGS; i += 1) {
    const row: number[] = [];
    const r = (i / RINGS) * worldOuter;
    for (let j = 0; j < SECTORS; j += 1) {
      const a = (j / SECTORS) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      row.push(terrainHeight(p, x, z) - carveAt(island.carve, x, z));
    }
    heights.push(row);
  }

  const at = (i: number, j: number): number => heights[clamp(i, 0, RINGS)]![(j + SECTORS) % SECTORS]!;
  const pos = (i: number, j: number): THREE.Vector3 => {
    const r = (i / RINGS) * worldOuter;
    const a = (j / SECTORS) * Math.PI * 2;
    // 水位以下压平成一个面：章上的"海"是一块薄板，不是一个碗
    const h = Math.max(at(i, j), water);
    return new THREE.Vector3(
      Math.cos(a) * r * scale,
      h * scale * RELIEF_EXAGGERATION,
      Math.sin(a) * r * scale,
    );
  };

  const color = new THREE.Color();
  const pushVertex = (i: number, j: number, normal: THREE.Vector3): void => {
    const v = pos(i, j);
    positions.push(v.x, v.y, v.z);
    const r = (i / RINGS) * worldOuter;
    const a = (j / SECTORS) * Math.PI * 2;
    const jitter = fbm2(Math.cos(a) * r * 0.09, Math.sin(a) * r * 0.09, 3, p.seed + 17) - 0.5;
    surfaceColor(island, at(i, j), normal.y, jitter, color);
    colors.push(color.r, color.g, color.b);
  };

  // 顶面：一圈一圈铺三角。第 0 环是圆心，退化成扇形。
  const faceNormal = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): THREE.Vector3 =>
    new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();

  for (let i = 0; i < RINGS; i += 1) {
    for (let j = 0; j < SECTORS; j += 1) {
      const j2 = (j + 1) % SECTORS;
      const a = pos(i, j);
      const b = pos(i + 1, j);
      const c = pos(i + 1, j2);
      const d = pos(i, j2);
      const n1 = faceNormal(a, b, c);
      pushVertex(i, j, n1);
      pushVertex(i + 1, j, n1);
      pushVertex(i + 1, j2, n1);
      const n2 = faceNormal(a, c, d);
      pushVertex(i, j, n2);
      pushVertex(i + 1, j2, n2);
      pushVertex(i, j2, n2);
    }
  }

  // 侧壁：外缘一圈垂直落下去。凿痕用一条低频噪声让每一竖条深浅不同。
  const wallTop = (j: number): THREE.Vector3 => pos(RINGS, j);
  const bottom = -PLINTH_WALL;
  const wc = new THREE.Color();
  for (let j = 0; j < SECTORS; j += 1) {
    const j2 = (j + 1) % SECTORS;
    const t1 = wallTop(j);
    const t2 = wallTop(j2);
    const b1 = new THREE.Vector3(t1.x, bottom, t1.z);
    const b2 = new THREE.Vector3(t2.x, bottom, t2.z);
    const streak = fbm2(j * 0.42, 0, 2, p.seed + 733);
    wallColor(island, streak, wc);
    for (const [x, y, z] of [
      [t1.x, t1.y, t1.z],
      [b1.x, b1.y, b1.z],
      [b2.x, b2.y, b2.z],
      [t1.x, t1.y, t1.z],
      [b2.x, b2.y, b2.z],
      [t2.x, t2.y, t2.z],
    ] as const) {
      positions.push(x, y, z);
      colors.push(wc.r, wc.g, wc.b);
    }
  }

  // 底面：一块素板。玩家几乎看不见它，但没有它章就是个空壳，
  // 从低机位掠过时会看穿进去。
  wallColor(island, 0.1, wc);
  for (let j = 0; j < SECTORS; j += 1) {
    const j2 = (j + 1) % SECTORS;
    const t1 = wallTop(j);
    const t2 = wallTop(j2);
    for (const [x, z] of [
      [0, 0],
      [t2.x, t2.z],
      [t1.x, t1.z],
    ] as const) {
      positions.push(x, bottom, z);
      colors.push(wc.r * 0.8, wc.g * 0.8, wc.b * 0.8);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { geometry, scale, radius };
}

/**
 * 未刻的石料。
 *
 * 没走到的幕，章上**什么也不刻**：只有那圈石料立面和一个粗坯顶面，
 * 没有地形、没有地标、没有名字。`ART_BIBLE` 说未到的一律不揭示，
 * 而"一块还没动过凿子的石头"比八个 `？？？` 说得更清楚——
 * 它不是缺了什么，它是还没有发生。
 */
export function buildBlank(island: ChartIsland): Relief {
  const scale = chartScale(island);
  const radius = island.terrain.radius * OVERSAMPLE * scale;
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();

  const rough = (a: number): number =>
    (fbm2(Math.cos(a) * 2.1, Math.sin(a) * 2.1, 3, island.terrain.seed + 55) - 0.5) * 0.06;
  const top = (j: number): THREE.Vector3 => {
    const a = (j / SECTORS) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, 0.035 + rough(a), Math.sin(a) * radius);
  };

  const push = (v: THREE.Vector3, shade: number): void => {
    positions.push(v.x, v.y, v.z);
    color.setHex(island.terrain.colorSteep).multiplyScalar(shade);
    colors.push(color.r, color.g, color.b);
  };

  const centre = new THREE.Vector3(0, 0.075, 0);
  for (let j = 0; j < SECTORS; j += 1) {
    const j2 = (j + 1) % SECTORS;
    const t1 = top(j);
    const t2 = top(j2);
    // 粗坯顶面
    push(centre, 0.62);
    push(t1, 0.56);
    push(t2, 0.56);
    // 立面
    const b1 = new THREE.Vector3(t1.x, -PLINTH_WALL, t1.z);
    const b2 = new THREE.Vector3(t2.x, -PLINTH_WALL, t2.z);
    const streak = fbm2(j * 0.42, 0, 2, island.terrain.seed + 733);
    const shade = 0.34 + streak * 0.2;
    push(t1, shade);
    push(b1, shade);
    push(b2, shade);
    push(t1, shade);
    push(b2, shade);
    push(t2, shade);
    // 底面
    push(new THREE.Vector3(0, -PLINTH_WALL, 0), 0.26);
    push(b2, 0.26);
    push(b1, 0.26);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { geometry, scale, radius };
}
