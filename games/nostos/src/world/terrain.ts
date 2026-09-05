import * as THREE from 'three';
import { createFrescoMaterial, releaseFrescoMaterial } from '../engine/materials';
import { clamp, fbm2, lerp, ridge2, smoothstep } from '../engine/noise';
import type { GroundSampler } from '../engine/controller';

/**
 * 孤岛地形。
 *
 * 每一幕都是一座**独立的小岛**，不是无缝世界的一块。地形自带边界：
 * 越靠外噪声振幅越小、地面越低，最后沉进水里——玩家走不出去，
 * 不是因为有墙，而是因为再走就是海。这是本作唯一的边界机制。
 *
 * 同一个高度函数同时驱动网格与行走检测，脚下的地和眼里的地永远是同一块。
 */

export interface Plateau {
  x: number;
  z: number;
  radius: number;
  height: number;
}

export interface Basin {
  x: number;
  z: number;
  radius: number;
  depth: number;
}

export interface TerrainParams {
  seed: number;
  /** 地形网格边长，通常 200；可行走区被岛半径限制在中间一小块 */
  size?: number;
  segments?: number;
  /** 岛半径：走到这里就该看见岸了 */
  radius: number;
  /** 起伏幅度 */
  amplitude: number;
  /** 噪声频率，越大地貌越碎 */
  frequency?: number;
  /** 中央隆起高度 */
  dome?: number;
  /** 海蚀层理强度：独眼岬与塞壬水道用得重 */
  ridge?: number;
  /** 水位，通常 0 */
  waterLevel?: number;
  /** 平地 / 陡坡 / 高处三种颜色 */
  colorFlat: number;
  colorSteep: number;
  colorHigh: number;
  /** 地面细节图 */
  detail?: 'stone' | 'sand';
  heightStart?: number;
  heightEnd?: number;
  /** 仅需要潮湿海岸层的场景启用。 */
  shoreWetWidth?: number;
  shoreWetColor?: number;
  shoreWetStrength?: number;
  /** 需要平整的地方（神殿、祭坛、村口） */
  plateaus?: Plateau[];
  /** 需要下陷的地方（洞窟前的谷、干涸的泉） */
  basins?: Basin[];
}

export class Terrain implements GroundSampler {
  readonly mesh: THREE.Mesh;
  readonly params: Required<Pick<TerrainParams, 'radius' | 'waterLevel'>> & TerrainParams;
  private readonly material: THREE.ShaderMaterial;

  constructor(params: TerrainParams) {
    this.params = {
      size: 240,
      segments: 200,
      frequency: 0.045,
      dome: 3,
      ridge: 0,
      waterLevel: 0,
      detail: 'stone',
      ...params,
    } as Terrain['params'];

    const { size, segments } = this.params as Required<TerrainParams>;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      position.setY(i, this.heightAt(x, z));
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    this.material = createFrescoMaterial({
      color: this.params.colorFlat,
      colorSteep: this.params.colorSteep,
      colorHigh: this.params.colorHigh,
      slopeBlend: 1,
      heightStart: this.params.heightStart ?? 3.5,
      heightEnd: this.params.heightEnd ?? 11,
      detail: this.params.detail,
      detailScale: this.params.detail === 'sand' ? 0.13 : 0.1,
      detailStrength: 0.92,
      roughBreakup: 0.32,
      rimStrength: 0.35,
      shoreWetRadius: this.params.radius,
      shoreWetWidth: this.params.shoreWetWidth,
      shoreWetColor: this.params.shoreWetColor,
      shoreWetStrength: this.params.shoreWetStrength,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  /** 世界坐标处的地面高度。网格与碰撞共用这一个函数。 */
  heightAt(x: number, z: number): number {
    const p = this.params as Required<TerrainParams>;
    const dist = Math.hypot(x, z);
    const t = dist / p.radius;

    // 岛形：t = 1 处正好是水线，所以 radius 就是"走到这里该看见岸了"的半径。
    // 指数 0.62 让内陆是缓坡、岸边收得快——地中海小岛的剖面就是这样。
    const inside = clamp(1 - t, 0, 1);
    let h = p.dome * Math.pow(inside, 0.62);

    // 越靠岸噪声越弱，沙滩才是平的
    const rough = smoothstep(1.0, 0.55, t);
    h += (fbm2(x * p.frequency, z * p.frequency, 4, p.seed) - 0.5) * 2 * p.amplitude * rough;
    if (p.ridge > 0) {
      h += (ridge2(x * p.frequency * 0.8, z * p.frequency * 0.8, 4, p.seed + 991) - 0.4) * p.ridge * rough;
    }

    // 岛外一路沉到水下，海雾会在这之前就吃掉视线
    h -= 8 * smoothstep(1.0, 1.3, t);

    for (const plateau of p.plateaus ?? []) {
      const d = Math.hypot(x - plateau.x, z - plateau.z);
      const w = smoothstep(plateau.radius, plateau.radius * 0.55, d);
      h = lerp(h, plateau.height, w);
    }
    for (const basin of p.basins ?? []) {
      const d = Math.hypot(x - basin.x, z - basin.z);
      const w = smoothstep(basin.radius, basin.radius * 0.3, d);
      h -= basin.depth * w;
    }
    return h;
  }

  /** 能不能站在这。水面以下与太陡的地方不行。 */
  walkable(x: number, z: number): boolean {
    const p = this.params as Required<TerrainParams>;
    const h = this.heightAt(x, z);
    if (h < p.waterLevel + 0.35) return false;
    // 坡度检查：超过约 48° 就爬不上去，逼玩家沿着地形走而不是直线穿越
    const d = 0.6;
    const dx = this.heightAt(x + d, z) - this.heightAt(x - d, z);
    const dz = this.heightAt(x, z + d) - this.heightAt(x, z - d);
    const slope = Math.hypot(dx, dz) / (2 * d);
    return slope < 1.12;
  }

  /** 从中心向外找到水线所在的半径，供海面的岸边白沫使用。 */
  shorelineRadius(): number {
    const p = this.params as Required<TerrainParams>;
    let lo = 0;
    let hi = p.radius * 1.3;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) * 0.5;
      // 采样一圈取平均，海岸线不是正圆
      let above = 0;
      const samples = 12;
      for (let s = 0; s < samples; s += 1) {
        const a = (s / samples) * Math.PI * 2;
        if (this.heightAt(Math.cos(a) * mid, Math.sin(a) * mid) > p.waterLevel) above += 1;
      }
      if (above > samples * 0.5) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /** 找一个离目标点最近的可站立位置，用于安全放置玩家与 NPC。 */
  settle(x: number, z: number): { x: number; z: number; y: number } {
    if (this.walkable(x, z)) return { x, z, y: this.heightAt(x, z) };
    for (let r = 1; r <= 12; r += 1) {
      for (let s = 0; s < 12; s += 1) {
        const a = (s / 12) * Math.PI * 2;
        const nx = x + Math.cos(a) * r;
        const nz = z + Math.sin(a) * r;
        if (this.walkable(nx, nz)) return { x: nx, z: nz, y: this.heightAt(nx, nz) };
      }
    }
    return { x, z, y: this.heightAt(x, z) };
  }

  /** 坡度 0–1，散布时用来避免把柱子插在悬崖上。 */
  slopeAt(x: number, z: number): number {
    const d = 0.8;
    const dx = this.heightAt(x + d, z) - this.heightAt(x - d, z);
    const dz = this.heightAt(x, z + d) - this.heightAt(x, z - d);
    return clamp(Math.hypot(dx, dz) / (2 * d), 0, 4);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    releaseFrescoMaterial(this.material);
  }
}
