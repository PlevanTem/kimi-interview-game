import * as THREE from 'three';
import { crushedShield } from './props';
import type { NarrativePart } from './narrative-assets';
import type { PlaceOptions } from '../game/scenes/dresser';

/** Fit the broad, thin relic to the local slope and lift only enough to clear the ground. */
export function shieldPlacement(terrain: { heightAt: (x: number, z: number) => number; mesh?: THREE.Mesh }): PlaceOptions {
  const x = -6, z = 2, step = 0.6;
  const groundRay = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  const ground = (px: number, pz: number): number => {
    const analytic = terrain.heightAt(px, pz);
    if (!terrain.mesh) return analytic;
    groundRay.ray.origin.set(px, 100, pz);
    return Math.max(analytic, groundRay.intersectObject(terrain.mesh)[0]?.point.y ?? analytic);
  };
  const normal = new THREE.Vector3(
    -(ground(x + step, z) - ground(x - step, z)) / (2 * step), 1,
    -(ground(x, z + step) - ground(x, z - step)) / (2 * step)).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.6));
  const rotation = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  const body = crushedShield(1.15, 640), p = body.getAttribute('position');
  let y = -Infinity;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i).applyQuaternion(q);
    y = Math.max(y, ground(x + v.x, z + v.z) - v.y);
  }
  body.dispose();
  return { x, z, y: y + 0.012, yaw: rotation.y, tiltX: rotation.x, tiltZ: rotation.z };
}

/** Original homeward-star emblem, matching the title navigation mark, not a historical coat of arms. */
export function engravedShield(seed = 640): NarrativePart[] {
  const radius = 1.15, body = crushedShield(radius, seed);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const surface = new THREE.Mesh(body, material);
  surface.updateMatrixWorld();
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  const positions: number[] = [];
  const contact = (x: number, z: number): number[] => {
    ray.ray.origin.set(x, 1, z);
    const hit = ray.intersectObject(surface)[0];
    if (!hit) throw new Error('Shield incision must remain on its bronze surface');
    return [x, hit.point.y + 0.0025, z];
  };
  // Narrow dark ribbons simulate the oxidised recess, not floating decorative tubes.
  const stroke = (a: number[], b: number[], width = 0.011) => {
    const dx = b[0]! - a[0]!, dz = b[1]! - a[1]!, length = Math.hypot(dx, dz);
    const nx = -dz / length * width, nz = dx / length * width;
    const steps = Math.max(2, Math.ceil(length / 0.024));
    for (let j = 0; j < steps; j++) {
      const p = (t: number, side: number) => contact(
        a[0]! + dx * t + nx * side, a[1]! + dz * t + nz * side);
      const a0 = p(j / steps, -1), a1 = p(j / steps, 1);
      const b0 = p((j + 1) / steps, -1), b1 = p((j + 1) / steps, 1);
      positions.push(...a0, ...a1, ...b1, ...a0, ...b1, ...b0);
    }
  };
  const star = [[0, -0.64], [0.105, -0.12], [0.5, 0], [0.105, 0.12],
    [0, 0.64], [-0.105, 0.12], [-0.5, 0], [-0.105, -0.12], [0, -0.64]];
  for (let i = 1; i < star.length; i++) stroke(star[i - 1]!, star[i]!);
  for (const r of [0.79, 0.87]) {
    for (let i = 0; i < 80; i++) {
      if (i >= 48 && i <= 54) continue; // Crushed edge interrupts the border, emblem survives.
      const a = i / 80 * Math.PI * 2, b = (i + 1) / 80 * Math.PI * 2;
      stroke([Math.cos(a) * r, Math.sin(a) * r], [Math.cos(b) * r, Math.sin(b) * r], 0.006);
    }
  }
  for (let i = 0; i < 24; i++) {
    if (i >= 14 && i <= 16) continue;
    const a = i * Math.PI / 12;
    stroke([Math.cos(a) * 0.91, Math.sin(a) * 0.91],
      [Math.cos(a) * 0.97, Math.sin(a) * 0.97], 0.008);
  }
  const incision = new THREE.BufferGeometry();
  incision.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  // Explicitly face the exposed surface upward.
  for (let i = 0; i < positions.length; i += 9) {
    const a = new THREE.Vector3(...positions.slice(i, i + 3) as [number, number, number]);
    const b = new THREE.Vector3(...positions.slice(i + 3, i + 6) as [number, number, number]);
    const c = new THREE.Vector3(...positions.slice(i + 6, i + 9) as [number, number, number]);
    if (b.sub(a).cross(c.sub(a)).y < 0) {
      const p = incision.getAttribute('position');
      p.setXYZ(i / 3 + 1, ...positions.slice(i + 6, i + 9) as [number, number, number]);
      p.setXYZ(i / 3 + 2, ...positions.slice(i + 3, i + 6) as [number, number, number]);
    }
  }
  incision.computeVertexNormals();
  material.dispose();
  return [{ geometry: body, surface: 'bronze' }, { geometry: incision, surface: 'burntWood' }];
}
