import * as THREE from 'three';

/**
 * 几何合批。
 *
 * 场景里同一种材质的断柱、碎石、船肋会有几十上百件；逐件一个 Mesh 会把
 * draw call 打满。这里把它们烘成一个 BufferGeometry，全场保持在两百多个
 * draw call 以内，同时仍然按材质分组，方便调色。
 */
export class GeometryBatch {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];
  private count = 0;

  get isEmpty(): boolean {
    return this.count === 0;
  }

  /** 把一件几何按变换烘进批次。传入的几何不会被修改。 */
  add(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4): void {
    const source = geometry.index ? geometry.toNonIndexed() : geometry;
    const position = source.getAttribute('position') as THREE.BufferAttribute;
    const normal = source.getAttribute('normal') as THREE.BufferAttribute | undefined;
    const uv = source.getAttribute('uv') as THREE.BufferAttribute | undefined;

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();

    for (let i = 0; i < position.count; i += 1) {
      v.fromBufferAttribute(position, i).applyMatrix4(matrix);
      this.positions.push(v.x, v.y, v.z);

      if (normal) {
        n.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize();
        this.normals.push(n.x, n.y, n.z);
      } else {
        this.normals.push(0, 1, 0);
      }

      if (uv) this.uvs.push(uv.getX(i), uv.getY(i));
      else this.uvs.push(0, 0);
    }
    this.count += position.count;

    if (source !== geometry) source.dispose();
  }

  /** 产出合并后的几何；批次为空时返回 null。 */
  build(): THREE.BufferGeometry | null {
    if (this.count === 0) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.computeBoundingSphere();
    return geometry;
  }

  /** 顶点数，用于性能预算断言。 */
  get vertexCount(): number {
    return this.count;
  }
}
