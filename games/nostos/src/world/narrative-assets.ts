import * as THREE from 'three';
import { createRng, fbm2 } from '../engine/noise';
import { boulder, brokenOar, corinthianHelmet, erode, mergeSimple, plank } from './props';
import type { Dresser, PlaceOptions, SurfaceName } from '../game/scenes/dresser';

/** Authored metres, +Y up, ground-centred pivot. Static parts share the game's material batches. */
export interface NarrativePart { geometry: THREE.BufferGeometry; surface: SurfaceName }
const part = (geometry: THREE.BufferGeometry, surface: SurfaceName): NarrativePart => ({ geometry, surface });
const tube = (points: number[][], radius: number, segments = 10) => new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), segments, radius, 6, false,
);

/** Open branching crown: individual leaf sprays, never an opaque sphere at eye level. */
function orchardTree(seed: number): NarrativePart[] {
  const rng = createRng(seed);
  const wood: THREE.BufferGeometry[] = [tube([[0, 0, 0], [-0.16, 1.1, 0.08], [0.18, 2.5, 0], [0, 3.8, 0.1]], 0.21)];
  const leaves: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI * 2 / 8 + rng() * 0.4;
    const r = 1.5 + rng() * 0.85;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 3.3 + rng() * 1.35;
    wood.push(tube([[0, 1.8 + i * 0.13, 0], [x * 0.52, y - 0.45, z * 0.52], [x, y, z]], 0.07, 8));
    // Compact lobed sprays + separate lanceolate leaves preserve holes and branch readability.
    for (let j = 0; j < 22; j++) {
      const q = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 1.03;
      const leaf = new THREE.IcosahedronGeometry(1, 0);
      leaf.scale(0.37 + rng() * 0.22, 0.055 + rng() * 0.06, 0.13);
      leaf.rotateY(q); leaf.rotateZ((rng() - 0.5) * 0.7);
      leaf.translate(x + Math.cos(q) * d, y + (rng() - 0.5) * 0.65, z + Math.sin(q) * d);
      leaves.push(leaf);
    }
  }
  // A drooping fruit-bearing branch places the narrative detail within reaching height.
  const branch = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.1, 0), new THREE.Vector3(-0.9, 2.0, 0.45), new THREE.Vector3(-1.45, 1.75, 0.65),
  ]);
  wood.push(new THREE.TubeGeometry(branch, 12, 0.055, 6, false));
  const fruit: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const anchor = branch.getPoint(0.46 + i * 0.08);
    const x = anchor.x, y = anchor.y - 0.2 - (i % 2) * 0.06, z = anchor.z + (i % 2) * 0.09;
    wood.push(tube([[anchor.x, anchor.y, anchor.z], [x, y + 0.1, z]], 0.014, 2));
    const f = new THREE.IcosahedronGeometry(0.12, 1);
    f.scale(0.8, 1.15, 0.8); f.translate(x, y, z); fruit.push(f);
  }
  // Buttress roots ground the tree without placing a solid pedestal under it.
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    wood.push(tube([[0, 0.48, 0], [Math.cos(a) * 0.35, 0.13, Math.sin(a) * 0.35], [Math.cos(a) * 0.75, 0.025, Math.sin(a) * 0.75]], 0.065));
  }
  return [part(mergeSimple(wood), 'oliveWood'), part(mergeSimple(leaves), 'olive'), part(mergeSimple(fruit), 'terracotta')];
}

/** Hollow overturned pottery with a broken rim, distinct lip and sherds. No capped mouth. */
function abandonedVessels(seed: number): NarrativePart[] {
  const profile = [[0.1, 0], [0.25, 0.1], [0.5, 0.5], [0.44, 0.92], [0.2, 1.15], [0.23, 1.36],
    [0.18, 1.36], [0.15, 1.16], [0.39, 0.92], [0.45, 0.5], [0.18, 0.1], [0.1, 0]];
  const clay: THREE.BufferGeometry[] = [];
  const vessel = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 28);
  erode(vessel, 0.025, seed, 2);
  vessel.rotateZ(1.7); vessel.rotateY(-0.4); vessel.translate(0.55, 0.5, 0); clay.push(vessel);
  for (const side of [-1, 1]) {
    const handle = new THREE.TorusGeometry(0.2, 0.035, 6, 14, Math.PI * 1.4);
    handle.rotateY(Math.PI / 2); handle.translate(side * 0.22, 1.07, 0);
    handle.rotateZ(1.7); handle.rotateY(-0.4); handle.translate(0.55, 0.5, 0); clay.push(handle);
  }
  for (let i = 0; i < 6; i++) {
    const shard = new THREE.SphereGeometry(0.36, 6, 3, 0, 0.8, 0.8, 0.7);
    shard.rotateX(1.5); shard.rotateY(i); shard.translate(-0.6 + i * 0.27, 0.13, 0.8 + Math.sin(i) * 0.3); clay.push(shard);
  }
  return [part(mergeSimple(clay), 'terracotta')];
}

function coldHearth(seed: number): NarrativePart[] {
  const rng = createRng(seed);
  const stones: THREE.BufferGeometry[] = [], embers: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2;
    stones.push(boulder(0.26 + rng() * 0.1, seed + i).scale(1.3, 0.65, 1).translate(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25));
  }
  for (let i = 0; i < 6; i++) embers.push(plank(1.1 + rng() * 0.5, 0.14, 0.1, seed + i).rotateY(i * 1.12).translate((rng() - 0.5) * 0.6, 0.1, (rng() - 0.5) * 0.6));
  const ash = new THREE.CylinderGeometry(1.02, 0.95, 0.045, 22).translate(0, 0.03, 0);
  return [part(mergeSimple(stones), 'darkRock'), part(mergeSimple(embers), 'charredWood'), part(ash, 'ash')];
}

function abandonedHelmet(seed: number): NarrativePart[] {
  const helmet = corinthianHelmet(0.52, seed).rotateZ(1.65).rotateY(-0.3).translate(0.24, 0.27, 0);
  const straps = [tube([[-0.2, 0.15, 0], [-0.4, 0.07, 0.3], [-0.76, 0.04, 0.5]], 0.023, 9),
    tube([[0.18, 0.18, 0], [0.43, 0.08, 0.24], [0.6, 0.04, 0.15]], 0.023, 9)];
  return [part(helmet, 'bronze'), part(mergeSimple(straps), 'saltWood')];
}

/** Layered angular rock, broad ledges and offsets, not a scaled smooth pebble. */
export function stratifiedRock(width: number, height: number, depth: number, seed: number): THREE.BufferGeometry {
  // One continuous shell: separate stacked caps caused hairline light leaks / bucket rims.
  const courses = Math.max(3, Math.ceil(height / 1.4));
  const g = new THREE.CylinderGeometry(0.88, 1, height, 9, courses * 3);
  g.translate(0, height / 2, 0);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = y / height;
    const n = fbm2(x * 1.1 + t * 0.65, z * 1.1, 3, seed) - 0.5;
    const ledge = Math.cos(t * courses * Math.PI * 2) * 0.038;
    const radial = 1 + n * 0.38 + ledge;
    p.setXYZ(i, x * width * 0.5 * radial + Math.sin(t * 2.7 + seed) * width * 0.025,
      y + t * t * n * height * 0.14, z * depth * 0.5 * radial);
  }
  g.computeVertexNormals(); return g;
}

/** 9m clear mouth / recessed second throat / solid ceiling. View from +Z toward -Z. */
function caveMouth(seed: number): NarrativePart[] {
  const outer: THREE.BufferGeometry[] = [], inner: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      outer.push(stratifiedRock(7.2, 11.5 + i * 0.75 + side * 0.6, 5.8, seed + i * 2 + side)
        .rotateY(side * 0.12).translate(side * 8.1, -0.3, -i * 3.5));
    }
    outer.push(stratifiedRock(13.8, 4.6 + i * 0.25, 6.4, seed + 20 + i).rotateZ(-0.08).translate(0, 7.3, -i * 3.5));
  }
  inner.push(stratifiedRock(20, 11.5, 3, seed + 30).translate(0, -0.2, -10.1));
  return [part(mergeSimple(outer), 'layeredBasalt'), part(mergeSimple(inner), 'layeredBasalt')];
}

/** Four-metre olive shaft, carved taper and separate fire-hardened tip. */
function burnedStake(seed: number): NarrativePart[] {
  const shaft = erode(new THREE.CylinderGeometry(0.16, 0.23, 3.5, 10, 8), 0.06, seed, 1.8);
  shaft.rotateZ(-Math.PI / 2); shaft.translate(-0.25, 0.3, 0);
  const tip = new THREE.ConeGeometry(0.165, 0.8, 7).rotateZ(-Math.PI / 2).translate(1.9, 0.3, 0);
  const cut = new THREE.CylinderGeometry(0.16, 0.19, 0.18, 10).rotateZ(-Math.PI / 2).translate(-1.97, 0.3, 0);
  return [part(shaft, 'oliveWood'), part(tip, 'burntWood'), part(cut, 'saltWood')];
}

export const NARRATIVE_ASSETS = {
  'game.nostos.prop.orchard_tree': { name: '忘食果树 · 开放树冠与低垂果枝', make: orchardTree },
  'game.nostos.prop.abandoned_vessels': { name: '倒伏空瓮 · 中空器壁与陶片', make: abandonedVessels },
  'game.nostos.prop.cold_hearth': { name: '冷却火塘 · 白灰与焦木', make: coldHearth },
  'game.nostos.prop.abandoned_helmet': { name: '弃置头盔 · 松开的双带', make: abandonedHelmet },
  'game.nostos.prop.shore_oar': { name: '半埋船桨 · 宽叶与盐蚀柄', make: (seed: number) => [part(brokenOar(3.8, seed).translate(0, 0.12, 0), 'saltWood')] },
  'game.nostos.environment.cyclops_cave': { name: '独眼岬洞窟 · 三进层岩洞口', make: caveMouth },
  'game.nostos.prop.burned_stake': { name: '橄榄木桩 · 削尖与烧硬端部', make: burnedStake },
} as const;
export type NarrativeAssetId = keyof typeof NARRATIVE_ASSETS;
export function resolveNarrativeAsset(id: NarrativeAssetId, seed = 1701): NarrativePart[] {
  return NARRATIVE_ASSETS[id].make(seed);
}
export function placeNarrativeAsset(d: Dresser, id: NarrativeAssetId, options: PlaceOptions, seed = 1701): void {
  resolveNarrativeAsset(id, seed).forEach((p, i) => d.place(p.geometry, p.surface, { ...options, block: i === 0 ? options.block : undefined }));
}
