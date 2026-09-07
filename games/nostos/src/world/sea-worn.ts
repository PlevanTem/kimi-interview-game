import * as THREE from 'three';
import { createRng } from '../engine/noise';
import { mergeSimple } from './props';

/** Authored cutting planes: broad faces carry form; only the bevels carry erosion. */
export function cutStone(width: number, height: number, depth: number, seed = 7, wear = 0.06): THREE.BufferGeometry {
  const rng = createRng(seed);
  const b = Math.min(width, height, depth) * (0.12 + wear * 0.2);
  const shape = new THREE.Shape();
  const w = width / 2, d = depth / 2;
  const contour = [[-w + b, -d], [w - b * 2, -d], [w, -d + b], [w, d - b * 2],
    [w - b, d], [-w + b * 2, d], [-w, d - b], [-w, -d + b * 2]];
  contour.forEach(([x, z], i) => i ? shape.lineTo(x!, z!) : shape.moveTo(x!, z!));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, height - b * 2),
    bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1, steps: 1 });
  g.rotateX(-Math.PI / 2).translate(0, b, 0);
  const p = g.getAttribute('position');
  const lean = (rng() - 0.5) * 0.12, slope = (rng() - 0.5) * 0.08;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = y / height;
    p.setXYZ(i, p.getX(i) + t * lean * height, y + t * p.getX(i) * slope, p.getZ(i));
  }
  g.computeVertexNormals(); return g;
}

/** Three mineral silhouettes share a clipped base and a single erosion shoulder. */
export function seaRock(radius: number, seed = 31, _detail = 0): THREE.BufferGeometry {
  void _detail; // Compatible with legacy rock placement; family controls silhouette, not subdivision.
  const rng = createRng(seed), family = seed % 3;
  const g = new THREE.IcosahedronGeometry(radius, 0);
  const p = g.getAttribute('position');
  const sx = 0.95 + rng() * 0.65, sy = family === 0 ? 0.46 : family === 1 ? 0.85 : 0.65;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const top = Math.min(y, radius * (0.56 + x / radius * 0.16));
    p.setXYZ(i, x * sx + y * 0.13, Math.max(-radius * 0.42, top) * sy, z * (0.8 + sx * 0.2));
  }
  g.computeVertexNormals(); g.computeBoundingBox();
  g.translate(0, -g.boundingBox!.min.y, 0); return g;
}

/** Hollow, bevelled pottery; inner wall is modelled down to the foot. */
export function saltPithos(height: number, seed = 17): THREE.BufferGeometry {
  const points = [[0, 0], [0.22, 0], [0.31, 0.1], [0.44, 0.4], [0.43, 0.63],
    [0.32, 0.87], [0.3, 0.94], [0.32, 0.96], [0.32, 1], [0.26, 1],
    [0.26, 0.94], [0.27, 0.86], [0.38, 0.62], [0.39, 0.41], [0.26, 0.14], [0, 0.08]];
  const body = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r! * height, y! * height)), 14);
  const p = body.getAttribute('position');
  const uv = body.getAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    // Lathe profile includes an inner return; give it the blank atlas margin.
    uv.setY(i, i % points.length <= 8 ? p.getY(i) / height : 0);
  }
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getX(i), p.getZ(i)), y = p.getY(i);
    // One lip chip and a broad asymmetric shoulder, not all-over vertex noise.
    const chip = Math.max(0, Math.cos(a - seed) - 0.9) * height * 0.65;
    p.setY(i, y - (y > height * 0.93 ? chip : 0));
  }
  const parts: THREE.BufferGeometry[] = [body];
  for (const y of [0.23, 0.69]) {
    const r = y < 0.5 ? 0.37 : 0.4;
    const rib = new THREE.TorusGeometry(height * r, height * 0.012, 4, 14)
      .rotateX(Math.PI / 2).translate(0, y * height, 0);
    const ribUv = rib.getAttribute('uv');
    for (let i = 0; i < ribUv.count; i++) ribUv.setY(i, 0);
    parts.push(rib);
  }
  const merged = mergeSimple(parts); merged.computeVertexNormals(); return merged;
}

/** Sparse lance-shaped coastal leaves. No billboard, alpha texture or grass carpet. */
export function coastalLeaves(scale: number, seed: number): THREE.BufferGeometry {
  const rng = createRng(seed), parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.IcosahedronGeometry(1, 0);
    leaf.scale(0.035 * scale, (0.24 + rng() * 0.22) * scale, 0.012 * scale);
    leaf.translate(0, 0.22 * scale, 0);
    leaf.rotateZ((i - 2) * 0.27).rotateY(i * 2.4 + rng());
    parts.push(leaf);
  }
  return mergeSimple(parts);
}

/** Wide splintered boards: taper, torn end and shallow camber survive a distant view. */
export function carvedBoard(length: number, width: number, thickness: number, seed: number): THREE.BufferGeometry {
  const rng = createRng(seed), h = length / 2, w = width / 2;
  const s = new THREE.Shape();
  s.moveTo(-h, -w * 0.65); s.lineTo(-h + length * 0.045, -w);
  s.lineTo(h * 0.7, -w * 0.78); s.lineTo(h, -w * 0.48);
  s.lineTo(h - length * 0.07, -w * 0.08); s.lineTo(h - length * 0.02, w * 0.24);
  s.lineTo(h - length * 0.13, w * 0.8); s.lineTo(-h * 0.72, w);
  s.lineTo(-h + length * 0.03, w * 0.32); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: true,
    bevelSize: thickness * 0.16, bevelThickness: thickness * 0.16, bevelSegments: 1, steps: 1 });
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute('position'), twist = (rng() - 0.5) * 0.045;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + p.getX(i) * p.getZ(i) * twist);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2.5 + 0.5, p.getZ(i) / 0.7 + 0.5);
  g.computeVertexNormals(); return g;
}

/** Open clinker hull: two tapered sides, exposed ribs, one broken gunwale. */
export function coastalBoat(length: number, seed = 71): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const sections = 10;
  for (const side of [-1, 1]) {
    for (let strake = 0; strake < 3; strake++) {
      const pos: number[] = [];
      const at = (i: number, edge: number): number[] => {
        const t = i / sections, x = (t - 0.5) * length;
        const belly = Math.pow(Math.sin(t * Math.PI), 0.7);
        const h = (strake + edge) / 3;
        return [x, length * (0.13 * Math.pow(Math.abs(t * 2 - 1), 2) + h * 0.095),
          side * length * (0.018 + belly * (0.06 + h * 0.065))];
      };
      for (let i = 0; i < sections; i++) {
        if (side === 1 && strake === 2 && i === 7) continue;
        const a = at(i, 0), b = at(i + 1, 0), c = at(i + 1, 0.94), d = at(i, 0.94);
        pos.push(...a, ...b, ...c, ...a, ...c, ...d, ...c, ...b, ...a, ...d, ...c, ...a);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const uv: number[] = [];
      for (let v = 0; v < pos.length; v += 3) uv.push(pos[v]! / 2.5 + 0.5, pos[v + 1]! / 0.7);
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals(); parts.push(g);
    }
  }
  parts.push(carvedBoard(length * 0.81, length * 0.1, 0.07, seed));
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * length * 0.14, width = length * (0.15 - Math.abs(i - 2) * 0.022);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, length * 0.078, -width),
      new THREE.Vector3(x, 0.055, 0), new THREE.Vector3(x, length * 0.078, width)]);
    parts.push(new THREE.TubeGeometry(curve, 6, 0.035, 4));
  }
  return mergeSimple(parts);
}

export function mineralColumn(options: { height: number; radius: number; seed?: number; broken?: number }): THREE.BufferGeometry {
  const { height, radius } = options, seed = options.seed ?? 1;
  const h = height * (1 - (options.broken ?? 0));
  const g = new THREE.CylinderGeometry(radius * 0.86, radius, h, 24, 3).translate(0, h / 2, 0);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(x, z);
    const flute = 1 - (Math.cos(a * 12) + 1) * 0.025;
    p.setXYZ(i, x * flute, y + (y > h * 0.99 ? Math.sin(a * 3 + seed) * radius * 0.19 : 0), z * flute);
  }
  const flat = g.toNonIndexed(); g.dispose(); flat.computeVertexNormals(); return flat;
}

export function mineralDrum(radius: number, height: number, seed = 5): THREE.BufferGeometry {
  return mineralColumn({ radius, height, seed });
}

/** Stable lookup for scene-authored secondary assets; registered alongside hero assets. */
export const COASTAL_ASSETS = {
  'game.nostos.environment.sea_rock': seaRock,
  'game.nostos.prop.cut_stone': cutStone,
  'game.nostos.prop.salt_pithos': saltPithos,
  'game.nostos.environment.coastal_leaves': coastalLeaves,
  'game.nostos.prop.carved_board': carvedBoard,
  'game.nostos.prop.coastal_boat': coastalBoat,
  'game.nostos.prop.mineral_column': mineralColumn,
  'game.nostos.prop.mineral_drum': mineralDrum,
} as const;
