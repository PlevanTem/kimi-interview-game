import * as THREE from 'three';
import { mergeSimple, stoneBlock } from './props';
import type { NarrativePart } from './narrative-assets';
import type { SurfaceName } from '../game/scenes/dresser';

type Point = [number, number, number];
const v = (p: Point) => new THREE.Vector3(...p);
const oval = (p: Point, s: Point) => new THREE.SphereGeometry(1, 10, 7).scale(...s).translate(...p);
export function strand(points: Point[], radius: number, segments = 16): THREE.BufferGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v)), segments, radius, 5, false);
}
function bar(a: Point, b: Point, radius: number): THREE.BufferGeometry {
  const delta = v(b).sub(v(a));
  const g = new THREE.CylinderGeometry(radius * 0.9, radius, delta.length(), 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
  return g.translate(...v(a).add(v(b)).multiplyScalar(0.5).toArray() as Point);
}
function parts(groups: [SurfaceName, THREE.BufferGeometry[]][]): NarrativePart[] {
  return groups.filter(([, g]) => g.length).map(([surface, g]) => ({ surface, geometry: mergeSimple(g) }));
}
/** Continuous closed skirt shell; pleats change the surface, not the outline into rods. */
function dressShell(rings: Point[], depth = 0.65): THREE.BufferGeometry {
  const profile = rings.map(([y, width]) => new THREE.Vector2(width, y));
  const g = new THREE.LatheGeometry(profile, 40), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getX(i), p.getZ(i));
    const fold = 1 + Math.cos(a * 10 + p.getY(i) * 0.4) * 0.045;
    p.setXYZ(i, p.getX(i) * fold, p.getY(i), p.getZ(i) * depth * fold);
  }
  g.computeVertexNormals(); return g;
}
/** Named silhouettes: Circe's belted peplos / Calypso's long mantle / a young unburied sailor. */
export function lateCharacter(kind: 'circe' | 'calypso' | 'shade'): NarrativePart[] {
  const shade = kind === 'shade', calypso = kind === 'calypso';
  const skin: THREE.BufferGeometry[] = [], cloth: THREE.BufferGeometry[] = [], hair: THREE.BufferGeometry[] = [], trim: THREE.BufferGeometry[] = [];
  cloth.push(dressShell([[shade ? 0.57 : 0.09, shade ? 0.25 : 0.4, 0], [0.7, 0.27, 0], [1.04, 0.19, 0], [1.19, 0.26, 0], [1.43, 0.3, 0], [1.49, 0.09, 0]]));
  if (shade) for (const side of [-1,1]) skin.push(
    bar([side*.11,.1,.015],[side*.1,.72,0],.067),
    oval([side*.105,.45,.035],[.065,.07,.068]));
  skin.push(bar([0, 1.44, 0], [0, 1.6, 0], 0.075), oval([0, 1.72, 0.005], [0.126, 0.175, 0.13]),
    oval([0, 1.64, 0.06], [0.092, 0.075, 0.075]), oval([0, 1.707, 0.135], [0.025, 0.048, 0.04]));
  for (const side of [-1, 1]) {
    skin.push(oval([side * 0.126, 1.715, 0], [0.022, 0.036, 0.021]), oval([side * 0.13, 0.06, 0.1], [0.072, 0.055, 0.16]));
    const a: Point = [side * 0.28, 1.4, 0], b: Point = [side * 0.39, 1.13, 0.035];
    const c: Point = side < 0 ? [-0.3, calypso ? 1.02 : 0.95, 0.32] : [0.39, shade ? 1.06 : 1.23, 0.27];
    cloth.push(bar(a, [side * 0.32, 1.3, 0.015], 0.115));
    skin.push(bar(a, b, 0.073), oval(b, [0.065, 0.063, 0.065]), bar(b, c, 0.052), oval(c, [0.053, 0.032, 0.07]));
    for (let i = 0; i < 4; i++) skin.push(bar([c[0] - 0.032 + i * 0.022, c[1], c[2] + 0.045], [c[0] - 0.032 + i * 0.022, c[1] - 0.025, c[2] + 0.105], 0.009));
    skin.push(bar([c[0] - 0.045, c[1], c[2]], [c[0] - 0.07, c[1], c[2] + 0.055], 0.015));
    hair.push(strand([[side * 0.025, 1.745, 0.126], [side * 0.057, 1.75, 0.121], [side * 0.087, 1.741, 0.102]], 0.004, 5));
    hair.push(strand([[side * 0.024, 1.769, 0.127], [side * 0.061, 1.781, 0.119], [side * 0.086, 1.767, 0.1]], 0.005, 5));
  }
  hair.push(strand([[-0.029, 1.645, 0.136], [0, 1.638, 0.141], [0.029, 1.645, 0.136]], 0.004, 5));
  // Hair sits behind the face; a bun for Circe, loose braided mantle-length hair for Calypso.
  hair.push(new THREE.SphereGeometry(0.136, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.43).scale(1, 1.3, 1).translate(0, 1.725, 0.005));
  if (!shade) {
    hair.push(oval([0, 1.73, -0.123], calypso ? [0.115, 0.19, 0.068] : [0.1, 0.09, 0.085]));
    for (const side of [-1, 1]) hair.push(strand([[side * 0.115, 1.76, -0.045], [side * 0.135, 1.6, -0.055], [side * 0.1, calypso ? 1.29 : 1.5, -0.09]], 0.026, 12));
  }
  const waist = Array.from({ length: 21 }, (_, i): Point => { const a = i / 20 * Math.PI * 2; return [Math.sin(a) * 0.2, 1.045, Math.cos(a) * 0.136]; });
  trim.push(strand(waist, 0.017, 20));
  // Shoulder mantle is a folded surface with a lower hem, not a floating sash.
  cloth.push(dressShell([[calypso ? 0.68 : 1.15, 0.32, 0], [1.37, 0.32, 0], [1.46, 0.29, 0]], 0.7));
  for (const side of [-1, 1]) trim.push(oval([side * 0.23, 1.43, 0.11], [0.028, 0.026, 0.015]));
  if (shade) {
    // A dropped shoulder and a torn hem distinguish him from a goddess, without gore.
    cloth.forEach(g => g.rotateZ(-0.045));
    trim.push(strand([[-0.2, 1.43, 0.13], [-0.04, 1.13, 0.17], [0.18, 0.81, 0.18]], 0.028));
  }
  return parts([[shade ? 'ash' : 'figureSkin', skin], [shade ? 'weatheredLinen' : calypso ? 'figureLinen' : 'figureOchre', cloth],
    [shade ? 'darkRock' : 'burntWood', hair], [shade ? 'ash' : 'bronze', trim]]);
}

/** Warp-weighted loom: grounded feet, braced uprights, beam, textile, warp, weights, heddle. */
export function weightedLoom(seed: number): NarrativePart[] {
  const wood: THREE.BufferGeometry[] = [], threads: THREE.BufferGeometry[] = [], weights: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    wood.push(bar([s * 1.18, 0, 0.28], [s * 1.18, 2.82, -0.18], 0.105));
    wood.push(stoneBlock(0.26, 0.14, 1.4, seed + s, 0.03).translate(s * 1.18, 0.03, 0));
    wood.push(bar([s * 1.18, 0.14, -0.65], [s * 1.18, 1.55, 0.03], 0.065));
  }
  wood.push(bar([-1.34, 2.74, -0.15], [1.34, 2.74, -0.15], 0.105), bar([-1.24, 1.1, 0.17], [1.24, 1.1, 0.17], 0.052));
  const cloth = new THREE.PlaneGeometry(2.02, 1.1, 24, 8), p = cloth.getAttribute('position');
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.cos(p.getX(i) * 38) * 0.012);
  cloth.translate(0, 2.13, -0.02); cloth.computeVertexNormals();
  // Explicit back face: cloth must remain present when walking around the loom.
  const back = cloth.clone(); back.scale(-1, 1, 1);
  for (let i = 0; i < 28; i++) {
    const x = -0.98 + i * 1.96 / 27;
    threads.push(bar([x, 0.45, 0.2], [x, 2.69, -0.14], 0.009));
    if (i % 2 === 0) weights.push(new THREE.ConeGeometry(0.073, 0.17, 6).rotateZ(Math.PI).translate(x, 0.36, 0.2));
  }
  const border: THREE.BufferGeometry[] = [];
  for (const y of [1.64, 1.72, 2.54]) border.push(bar([-1, y, 0.015], [1, y, 0.015], 0.017));
  wood.push(bar([-0.65, 0.17, 0.5], [0.45, 0.17, 0.55], 0.025));
  return parts([['saltWood', wood], ['weatheredLinen', [cloth, back, ...threads]], ['terracotta', weights], ['burntWood', border]]);
}

export function unwornRobe(seed: number): NarrativePart[] {
  const cloth = dressShell([[0.25, 0.45, 0], [0.85, 0.33, 0], [1.38, 0.32, 0], [1.55, 0.43, 0], [1.63, 0.16, 0]], 0.32);
  const wood = [bar([-0.74, 0, 0], [-0.74, 2.25, 0], 0.065), bar([0.74, 0, 0], [0.74, 2.25, 0], 0.065), bar([-0.85, 2.21, 0], [0.85, 2.21, 0], 0.07)];
  cloth.translate(0, 0.45, 0.08);
  const cord = [strand([[-0.35, 2.04, 0.08], [-0.35, 2.23, 0], [-0.28, 2.05, 0.08]], 0.014), strand([[0.35, 2.04, 0.08], [0.35, 2.23, 0], [0.28, 2.05, 0.08]], 0.014)];
  wood.push(stoneBlock(2, 0.12, 0.65, seed).translate(0, 0, 0));
  return parts([['saltWood', wood], ['weatheredLinen', [cloth]], ['rope', cord]]);
}

export function vinePortal(seed: number): NarrativePart[] {
  const stone = [stoneBlock(0.65, 3.5, 0.8, seed).translate(-1.65, 0, 0), stoneBlock(0.65, 3.5, 0.8, seed + 1).translate(1.65, 0, 0), stoneBlock(4, 0.5, 1, seed + 2).translate(0, 3.5, 0)];
  const points: Point[] = [[-2.2, 0.12, 1.8], [-1.6, 0.16, 0.6], [-1.3, 0.65, 0.43], [-1.6, 1.5, 0.44], [-1.35, 2.4, 0.44], [-1.55, 3.42, 0.44], [-0.4, 3.67, 0.5], [0.7, 3.73, 0.5], [1.5, 3.65, 0.4], [1.87, 2.7, 0.2], [1.89, 1.4, -0.2], [2.2, 0.1, -1.8]];
  const vine = strand(points, 0.045, 72), leaves: THREE.BufferGeometry[] = [];
  const curve = new THREE.CatmullRomCurve3(points.map(v));
  for (let i = 1; i < 32; i++) {
    const at = curve.getPoint(i / 32);
    leaves.push(new THREE.OctahedronGeometry(1).scale(0.13, 0.23, 0.035).rotateZ(i % 2 ? 0.8 : -0.8).translate(at.x + (i % 2 ? 0.08 : -0.08), at.y, at.z + 0.07));
  }
  return parts([['weatheredMarble', stone], ['oliveWood', [vine]], ['olive', leaves]]);
}

/** Worked slab, incised stepped frame and oar relief; central name field intentionally erased. */
export function carvedBoundary(seed: number): NarrativePart[] {
  const stone = [stoneBlock(1.05, 1.95, 0.46, seed, 0), stoneBlock(1.24, 0.16, 0.66, seed + 1).translate(0, 1.95, 0), stoneBlock(1.35, 0.18, 0.75, seed + 2)];
  const cuts: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const z = s * 0.237;
    cuts.push(bar([-.42,.4,z],[-.42,1.76,z],.012),bar([-.42,1.76,z],[.42,1.76,z],.012),bar([.42,1.76,z],[.42,.4,z],.012));
    for (let i = 0; i < 7; i++) cuts.push(strand([[-0.36 + i * 0.11, 1.63, z], [-0.36 + i * 0.11, 1.7, z], [-0.3 + i * 0.11, 1.7, z]], 0.009, 4));
    cuts.push(bar([0, 0.35, z], [0, 0.8, z], 0.018), new THREE.BoxGeometry(0.11, 0.21, 0.012).translate(0, 0.31, z));
  }
  return parts([['ash', stone], ['darkRock', cuts]]);
}

export function braidedRope(seed: number): NarrativePart[] {
  void seed;
  const points: Point[] = Array.from({ length: 110 }, (_, i) => { const t = i / 109, a = t * Math.PI * 5.4, r = 0.67 - t * 0.38; return [Math.cos(a) * r, 0.14 + 0.015 * Math.sin(a * 2), Math.sin(a) * r]; });
  const rope = [strand(points, 0.069, 110)];
  rope.push(strand([[0.65, 0.14, 0], [0.91, 0.2, 0.23], [0.88, 0.22, 0.57], [0.57, 0.19, 0.5], [0.77, 0.14, 0.26], [1.13, 0.08, 0.8]], 0.07, 28));
  const seams: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 60; i++) { const p = points[Math.floor(i * 109 / 60)]!; seams.push(strand([[p[0] - 0.03, p[1] + 0.055, p[2] - 0.035], [p[0] + 0.035, p[1] + 0.059, p[2] + 0.025]], 0.009, 2)); }
  for (let i = 0; i < 7; i++) rope.push(strand([[1.1, 0.09, 0.77], [1.25 + i * 0.025, 0.08, 0.8 + i * 0.025], [1.34 + i * 0.025, 0.04, 0.87 + i * 0.05]], 0.01, 6));
  return parts([['rope', rope], ['burntWood', seams]]);
}

export function cedarStump(seed: number): NarrativePart[] {
  const body = new THREE.CylinderGeometry(0.31, 0.48, 0.52, 9, 2).translate(0, 0.26, 0);
  const top = new THREE.CylinderGeometry(0.302, 0.302, 0.012, 18).translate(0, 0.526, 0);
  const rings: THREE.BufferGeometry[] = [];
  for (const r of [0.09, 0.17, 0.24]) rings.push(new THREE.TorusGeometry(r, 0.007, 3, 20).rotateX(Math.PI / 2).translate(0.01, 0.535, 0));
  rings.push(strand([[0.04, 0.538, -0.04], [0.2, 0.538, -0.1], [0.29, 0.538, -0.18]], 0.012, 6));
  void seed; return parts([['oliveWood', [body]], ['saltWood', [top]], ['burntWood', rings]]);
}

/** Exactly twenty felled trees, including the axe rest (index 19), never a 21st pedestal. */
export { CEDAR_STUMPS } from './calypso-layout';

export function homeDetails(seed: number): NarrativePart[] {
  // Quiet planar ashlar and rafters do not need the dense erosion grid of hero stones.
  const block = (w:number,h:number,d:number,_seed:number,_wear?:number) => new THREE.BoxGeometry(w,h,d).translate(0,h/2,0);
  const stone: THREE.BufferGeometry[] = [], wood: THREE.BufferGeometry[] = [], clay: THREE.BufferGeometry[] = [];
  // Lower ashlar courses and upper plaster belong to one maintained home, not a ruin.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) stone.push(block(0.88, 0.42, 1.45, seed + i).translate(side * 6.63, 0.03, -4.4 + i * 1.45));
    for (let i = 0; i < 4; i++) stone.push(block(1.1, 0.42, 0.9, seed + i + 10).translate(side * (2.7 + i * 1.1), 0.03, 4.42));
    wood.push(block(0.18, 3.6, 0.2, seed).translate(side * 2.23, 0.1, 4.87));
    // A pair of open shutters frames the doorway without sealing the ending camera route.
    wood.push(block(0.18, 3.45, 1.5, seed + 22).translate(side * 2.35, 0.12, 3.8));
  }
  for (let i = 0; i < 10; i++) wood.push(block(14.7, 0.18, 0.15, seed + 30 + i).translate(0, 4.6, -5.5 + i * 1.22));
  for (let i = 0; i < 10; i++) for (const side of [-1, 1]) clay.push(block(0.55, 0.12, 1.04, seed + i, 0.015).translate(side * 7.1, 4.83, -5.2 + i * 1.16));
  // Roof-light curb around a real opening above the hearth; no modern chimney stack.
  for (const s of [-1, 1]) {
    stone.push(block(2.8, 0.4, 0.28, seed).translate(0, 4.78, s * 1.28));
    stone.push(block(0.28, 0.4, 2.8, seed).translate(s * 1.28, 4.78, 0));
  }
  wood.push(block(2.8, 0.12, 0.5, seed).translate(-4, 0.65, -3.8));
  for (const x of [-5, -3]) wood.push(block(0.15, 0.65, 0.4, seed).translate(x, 0, -3.8));
  return parts([['limestone', stone], ['saltWood', wood], ['terracotta', clay]]);
}
