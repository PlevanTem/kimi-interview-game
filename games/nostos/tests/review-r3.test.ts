import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { abandonedVessels } from '../src/world/narrative-assets';
import { lotusCrewman } from '../src/world/lotus-crewman';
import { engravedShield, shieldPlacement } from '../src/world/engraved-shield';
import { ACTS } from '../src/game/scenes';
import { Terrain } from '../src/world/terrain';

describe('人工反馈 r3', () => {
  it('陶器的两个完整器身有真实间距，多seed不相交', () => {
    for (const seed of [17, 91, 520, 1701, 3208]) {
      const parts = abandonedVessels(seed);
      parts.forEach(p => p.geometry.computeBoundingBox());
      const big = parts[0]!.geometry.boundingBox!, small = parts[1]!.geometry.boundingBox!;
      expect(big.intersectsBox(small)).toBe(false);
      expect(small.min.x - big.max.x).toBeCloseTo(0.24, 5);
      parts.forEach(p => p.geometry.dispose());
    }
  });
  it('人物保持成人跪姿、细节层次及20k顶点预算', () => {
    const parts = lotusCrewman(1701), bounds = new THREE.Box3();
    let count = 0;
    for (const p of parts) {
      p.geometry.computeBoundingBox(); bounds.union(p.geometry.boundingBox!);
      count += p.geometry.getAttribute('position').count;
    }
    expect(count).toBeGreaterThan(7000);
    expect(count).toBeLessThan(20000);
    expect(bounds.max.y).toBeGreaterThan(1.4);
    expect(bounds.max.y).toBeLessThan(1.6);
    parts.forEach(p => p.geometry.dispose());
  });
  it('盾章紧贴被压皱的盾面，不是悬空或埋入', () => {
    const parts = engravedShield(640), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const body = new THREE.Mesh(parts[0]!.geometry, material); body.updateMatrixWorld();
    const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
    const p = parts[1]!.geometry.getAttribute('position');
    expect(p.count).toBeGreaterThan(1000);
    for (let i = 0; i < p.count; i += 19) {
      ray.ray.origin.set(p.getX(i), 1, p.getZ(i));
      const hit = ray.intersectObject(body)[0]!;
      expect(hit).toBeDefined();
      expect(p.getY(i) - hit.point.y).toBeCloseTo(0.0025, 4);
    }
    parts.forEach(p => p.geometry.dispose()); material.dispose();
  });
  it('坡面上的盾牌整体不穿地，最低点接触间隙受控', () => {
    const terrain = Object.assign(Object.create(Terrain.prototype) as Terrain, {
      params: { frequency: 0.045, dome: 3, ridge: 0, waterLevel: 0, ...ACTS[2]!.terrain },
    }), parts = engravedShield(640);
    const p = parts[0]!.geometry.getAttribute('position');
    const placement = shieldPlacement(terrain);
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(placement.x, placement.y!, placement.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(placement.tiltX, placement.yaw, placement.tiltZ, 'YXZ')), new THREE.Vector3(1, 1, 1));
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(matrix);
      const delta = v.y - terrain.heightAt(v.x, v.z); min = Math.min(min, delta); max = Math.max(max, delta);
    }
    console.log('shield terrain clearance', { min, max });
    parts.forEach(p => p.geometry.dispose());
    expect(min).toBeCloseTo(0.012, 4);
    expect(max).toBeLessThan(0.2);
  });
});
