import * as THREE from 'three';
import { SURFACE, releaseFrescoMaterial } from '../../engine/materials';
import { createRng } from '../../engine/noise';
import { GeometryBatch } from '../../world/batch';
import type { Blocker } from '../../engine/controller';
import type { Terrain } from '../../world/terrain';

/**
 * 场景装配器。
 *
 * 每一幕的 dress() 只写"在哪儿放什么"，摆放、贴地、随机化、合批与碰撞
 * 全部由这里统一处理。同材质的构件会被烘进同一个 Mesh，
 * 所以一座岛上几百件断柱碎石，最终只有十来个 draw call。
 */

export type SurfaceName = keyof typeof SURFACE;

export interface PlaceOptions {
  x: number;
  z: number;
  /** 不填则自动贴地 */
  y?: number;
  /** 相对地面再抬高/下沉多少 */
  lift?: number;
  yaw?: number;
  /** 前后左右的倾倒，用来让废墟不那么站得住 */
  tiltX?: number;
  tiltZ?: number;
  scale?: number | [number, number, number];
  /** 挡住去路的半径；0 表示可以穿过去 */
  block?: number;
}

export class Dresser {
  readonly blockers: Blocker[] = [];
  private readonly batches = new Map<SurfaceName, GeometryBatch>();
  private readonly materials = new Map<SurfaceName, THREE.ShaderMaterial>();
  private readonly meshes: THREE.Mesh[] = [];
  /** 不进合批、但同样由本装配器持有的网格 */
  private readonly attached: THREE.Mesh[] = [];
  readonly rng: () => number;

  constructor(
    readonly scene: THREE.Scene,
    readonly terrain: Terrain,
    seed: number,
  ) {
    this.rng = createRng(seed);
  }

  /** 惰性创建材质：只有真正用到的表面才会生成纹理。 */
  material(name: SurfaceName): THREE.ShaderMaterial {
    let material = this.materials.get(name);
    if (!material) {
      material = SURFACE[name]();
      this.materials.set(name, material);
    }
    return material;
  }

  /** 放一件构件。几何会被消耗进批次，调用者不需要再持有它。 */
  place(geometry: THREE.BufferGeometry, surface: SurfaceName, options: PlaceOptions): void {
    const y = (options.y ?? this.terrain.heightAt(options.x, options.z)) + (options.lift ?? 0);

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler(options.tiltX ?? 0, options.yaw ?? 0, options.tiltZ ?? 0, 'YXZ');
    quaternion.setFromEuler(euler);

    const scale = options.scale ?? 1;
    const scaleVector =
      typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(...scale);

    matrix.compose(new THREE.Vector3(options.x, y, options.z), quaternion, scaleVector);

    let batch = this.batches.get(surface);
    if (!batch) {
      batch = new GeometryBatch();
      this.batches.set(surface, batch);
    }
    batch.add(geometry, matrix);
    geometry.dispose();

    if (options.block && options.block > 0) {
      this.blockers.push({ x: options.x, z: options.z, radius: options.block });
    }
  }

  /**
   * 在一个环带里随机撒东西。
   * 会自动跳过太陡、太靠水、以及离已有障碍太近的位置。
   */
  scatter(
    count: number,
    options: {
      innerRadius: number;
      outerRadius: number;
      /** 扇区限制（弧度），不填则整圈 */
      arc?: [number, number];
      minSpacing?: number;
      maxSlope?: number;
      minHeight?: number;
      make: (index: number, rng: () => number) => { geometry: THREE.BufferGeometry; surface: SurfaceName; place: Partial<PlaceOptions> };
    },
  ): void {
    const spacing = options.minSpacing ?? 2;
    const maxSlope = options.maxSlope ?? 0.75;
    const minHeight = options.minHeight ?? 0.5;
    const used: Array<{ x: number; z: number }> = [];

    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 30) {
      attempts += 1;
      const [a0, a1] = options.arc ?? [0, Math.PI * 2];
      const angle = a0 + this.rng() * (a1 - a0);
      const radius = options.innerRadius + this.rng() * (options.outerRadius - options.innerRadius);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      if (this.terrain.heightAt(x, z) < minHeight) continue;
      if (this.terrain.slopeAt(x, z) > maxSlope) continue;
      if (used.some((p) => Math.hypot(p.x - x, p.z - z) < spacing)) continue;

      const spec = options.make(placed, this.rng);
      this.place(spec.geometry, spec.surface, { x, z, ...spec.place });
      used.push({ x, z });
      placed += 1;
    }
  }

  /** 把所有批次烘成 Mesh 加进场景。dress() 结束后调用一次。 */
  commit(): { meshes: THREE.Mesh[]; vertexCount: number } {
    let vertexCount = 0;
    for (const [surface, batch] of this.batches) {
      const geometry = batch.build();
      if (!geometry) continue;
      vertexCount += batch.vertexCount;
      const mesh = new THREE.Mesh(geometry, this.material(surface));
      mesh.frustumCulled = true;
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
    this.batches.clear();
    return { meshes: this.meshes, vertexCount };
  }

  /**
   * 挂一件**不进合批**的网格。
   *
   * 合批会把几何按世界坐标烘在一起，材质走三平面投影——对一幅
   * 有确定上下左右的画来说那是错的，它需要自己的 UV。
   * 但它仍然必须由 Dresser 持有：换幕时 dispose() 得把它一起带走，
   * 否则这幅画会跟着玩家去下一座岛。全作只有喀耳刻地上那幅壁画用它。
   *
   * 收的是**工厂**而不是现成的网格，和 scatter 的 make 回调同形：
   * 这样单元测试可以把它整个跳过。壁画的贴图是 Canvas2D 画的，
   * 而 Node 里没有 DOM——收成品的话，光是跑一遍 dress() 就会炸。
   */
  attach(make: () => THREE.Mesh): void {
    const mesh = make();
    this.scene.add(mesh);
    this.attached.push(mesh);
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.meshes.length = 0;
    for (const mesh of this.attached) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      // 材质必须注销，不能只 dispose：createFrescoMaterial 把它登记在
      // 一张表里，applyEnvToMaterials 每次换天候都会往表里的每一个写
      // uniform——漏掉注销就是在往一个已释放的对象上写。
      const material = mesh.material;
      if (!Array.isArray(material)) releaseFrescoMaterial(material as THREE.ShaderMaterial);
    }
    this.attached.length = 0;
    for (const material of this.materials.values()) releaseFrescoMaterial(material);
    this.materials.clear();
  }
}
