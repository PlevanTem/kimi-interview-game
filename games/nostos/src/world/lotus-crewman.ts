import * as THREE from 'three';
import { mergeSimple } from './props';
import type { NarrativePart } from './narrative-assets';

type Point = [number, number, number];
const v = (p: Point) => new THREE.Vector3(...p);
const oval = (at: Point, scale: Point, tilt = 0) => new THREE.SphereGeometry(1, 12, 8)
  .scale(...scale).rotateX(tilt).translate(...at);
function limb(a: Point, b: Point, ra: number, rb: number): THREE.BufferGeometry {
  const direction = v(b).sub(v(a));
  const g = new THREE.CylinderGeometry(rb, ra, direction.length(), 10, 2);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  return g.translate(...v(a).add(v(b)).multiplyScalar(0.5).toArray() as Point);
}
function cord(points: Point[], radius: number): THREE.BufferGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v)), 12, radius, 5, false);
}

/** Pleats are part of the garment shell, not detached decorative cylinders. */
function tunic(): THREE.BufferGeometry {
  // y, half width, half depth, forward lean. A kneeling hem spreads onto the knees.
  const rings = [[0.18, 0.38, 0.38, 0.04], [0.3, 0.45, 0.38, 0.08],
    [0.48, 0.31, 0.26, -0.08], [0.61, 0.23, 0.2, -0.07],
    [0.82, 0.25, 0.19, -0.04], [1.02, 0.31, 0.17, 0], [1.1, 0.1, 0.095, 0.035]];
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  const sides = 48;
  rings.forEach(([y, rx, rz, lean], row) => {
    for (let i = 0; i <= sides; i++) {
      const a = i / sides * Math.PI * 2;
      const fold = Math.cos(a * 12 + row * 0.18) * (row === 6 ? 0.002 : 0.017);
      positions.push(Math.sin(a) * (rx! + fold), y! + Math.sin(a * 3) * 0.009,
        Math.cos(a) * (rz! + fold) + lean!);
      uv.push(i / sides, y!);
      if (row && i < sides) {
        const n = row * (sides + 1) + i, p = n - sides - 1;
        indices.push(p, p + 1, n, n, p + 1, n + 1);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}

/** A grounded, slumped adult, +Z forward. Static sculpture; no billboard or new animation rig. */
export function lotusCrewman(_seed: number): NarrativePart[] {
  const skin: THREE.BufferGeometry[] = [], linen = [tunic()], dark: THREE.BufferGeometry[] = [];
  // Folded shins and bare feet remain visible below the gathered linen.
  for (const side of [-1, 1]) {
    linen.push(oval([side * 0.27, 0.20, 0.31], [0.205, 0.20, 0.27]));
    skin.push(limb([side * 0.29, 0.15, 0.12], [side * 0.22, 0.105, -0.45], 0.085, 0.055));
    skin.push(oval([side * 0.22, 0.075, -0.52], [0.075, 0.065, 0.16], -0.15));
  }
  skin.push(limb([0, 1.02, 0.025], [0, 1.23, 0.09], 0.08, 0.07));
  // Arms do not merge into the torso: one rests on the knee, the other offers a fruit.
  const arms: [Point, Point, Point][] = [
    [[-0.27, 1.005, 0.02], [-0.4, 0.72, 0.19], [-0.3, 0.45, 0.47]],
    [[0.27, 1.005, 0.02], [0.43, 0.74, 0.16], [0.24, 0.72, 0.5]],
  ];
  for (const [a, b, c] of arms) {
    const cuff = v(a).lerp(v(b), 0.27).toArray() as Point;
    linen.push(limb(a, cuff, 0.114, 0.10));
    skin.push(oval(a, [0.105, 0.115, 0.11]), limb(a, b, 0.095, 0.067), oval(b, [0.07, 0.075, 0.07]), limb(b, c, 0.069, 0.04));
    skin.push(oval(c, [0.065, 0.034, 0.087], c[0] < 0 ? 0.45 : -0.22));
    for (let i = 0; i < 4; i++) {
      const x = c[0] - 0.042 + i * 0.027;
      skin.push(limb([x, c[1], c[2] + 0.045], [x + 0.003, c[1] - 0.028, c[2] + 0.115 - Math.abs(i - 1.5) * 0.01], 0.013, 0.01));
    }
    skin.push(limb([c[0] - 0.056, c[1], c[2]], [c[0] - 0.083, c[1] - 0.02, c[2] + 0.05], 0.021, 0.014));
  }
  // Head parts share one nod transform: no floating face or disconnected ears.
  const face: THREE.BufferGeometry[] = [oval([0, 0, 0], [0.13, 0.176, 0.14]),
    oval([0, -0.087, 0.048], [0.101, 0.092, 0.103]),
    oval([0, 0.005, 0.137], [0.028, 0.054, 0.044]),
    oval([0, -0.028, 0.166], [0.032, 0.023, 0.035])];
  for (const side of [-1, 1]) {
    face.push(oval([side * 0.128, -0.01, 0], [0.025, 0.044, 0.027]));
    dark.push(cord([[side * 0.031, 0.014, 0.136], [side * 0.058, 0.007, 0.132], [side * 0.083, 0.014, 0.111]], 0.005));
    dark.push(cord([[side * 0.027, 0.04, 0.132], [side * 0.057, 0.05, 0.13], [side * 0.089, 0.041, 0.103]], 0.009));
  }
  const scalp = new THREE.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2);
  const scalpPoints = scalp.getAttribute('position');
  for (let i = 0; i < scalpPoints.count; i++) {
    const x = scalpPoints.getX(i), z = scalpPoints.getZ(i);
    const a = Math.atan2(x, z), t = Math.acos(Math.min(1, Math.max(-1, scalpPoints.getY(i)))) / (Math.PI / 2);
    const theta = t * (1.68 - Math.cos(a) * 0.42 + Math.sin(a * 5) * 0.035);
    scalpPoints.setXYZ(i, Math.sin(a) * Math.sin(theta) * 0.137,
      Math.cos(theta) * 0.183 + 0.012, Math.cos(a) * Math.sin(theta) * 0.145 - 0.012);
  }
  scalp.computeVertexNormals(); dark.push(scalp);
  // Close-cropped beard and moustache keep the weathered face readable in profile.
  dark.push(oval([0, -0.112, 0.056], [0.098, 0.071, 0.095]));
  for (const side of [-1, 1]) dark.push(oval([side * 0.033, -0.056, 0.14], [0.038, 0.015, 0.017]));
  const head = (g: THREE.BufferGeometry) => g.rotateX(0.26).rotateZ(-0.09).translate(0.015, 1.285, 0.115);
  skin.push(head(mergeSimple(face)));
  const hair = head(mergeSimple(dark));
  const belt = cord(Array.from({ length: 25 }, (_, i): Point => {
    const a = i / 24 * Math.PI * 2; return [Math.sin(a) * 0.242, 0.61 + Math.sin(a) * 0.01, Math.cos(a) * 0.211 - 0.07];
  }), 0.019);
  // Terracotta shoulder wrap: a continuous draped ribbon with a scalloped weave edge.
  const wrap = new THREE.PlaneGeometry(0.23, 0.63, 8, 16), p = wrap.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), t = (p.getY(i) + 0.315) / 0.63;
    p.setXYZ(i, -0.2 + t * 0.35 + u, 1.035 - t * 0.46,
      0.145 + Math.sin(t * Math.PI) * 0.12 + Math.cos(u * 90) * 0.012);
  }
  const wrapIndex = wrap.getIndex()!;
  for (let i = 0; i < wrapIndex.count; i += 3) {
    const a = wrapIndex.getX(i); wrapIndex.setX(i, wrapIndex.getX(i + 1)); wrapIndex.setX(i + 1, a);
  }
  wrap.computeVertexNormals();
  const fruit = oval([0.24, 0.80, 0.55], [0.066, 0.073, 0.068]);
  const stem = limb([0.24, 0.864, 0.55], [0.232, 0.89, 0.55], 0.008, 0.005);
  return [{ geometry: mergeSimple(skin), surface: 'ochreSkin' },
    { geometry: mergeSimple(linen), surface: 'weatheredLinen' },
    { geometry: mergeSimple([hair, belt, stem]), surface: 'burntWood' },
    { geometry: mergeSimple([wrap, fruit]), surface: 'terracotta' }];
}
