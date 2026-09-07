import * as THREE from 'three';
import { lotusCrewman } from './lotus-crewman';
import { engravedShield } from './engraved-shield';
import { createRng, fbm2 } from '../engine/noise';
import { brokenOar, corinthianHelmet, erode, mergeSimple, plank } from './props';
import { seaRock, saltPithos, carvedBoard } from './sea-worn';
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
  const wood: THREE.BufferGeometry[] = [tube([[0, 0, 0], [-0.16, 1.1, 0.08], [0.18, 2.5, 0], [0, 3.15, 0.1]], 0.21)];
  const leaves: THREE.BufferGeometry[] = [];
  const gesture = seed % 3;
  const angles = [-2.6, -1.8, -0.55, 0.15, 1.4, 2.05];
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i]! + gesture * 0.35;
    const r = 1.25 + rng() * 1.0 + (i === gesture ? 0.5 : 0);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = 3.3 + Math.sin(a + gesture) * 0.42 + rng() * 0.65;
    wood.push(tube([[0, 1.8 + i * 0.13, 0], [x * 0.52, y - 0.45, z * 0.52], [x, y, z]], 0.07, 8));
    // Compact lobed sprays + separate lanceolate leaves preserve holes and branch readability.
    for (let j = 0; j < 9; j++) {
      const q = a + (rng() - 0.5) * 1.9, d = Math.sqrt(rng()) * 0.85;
      const leaf = new THREE.IcosahedronGeometry(1, 0);
      leaf.scale(0.48 + rng() * 0.32, 0.085 + rng() * 0.075, 0.22);
      leaf.rotateY(-a); leaf.rotateZ((rng() - 0.5) * 0.6);
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
export function abandonedVessels(seed: number): NarrativePart[] {
  const profile = [[0.1, 0], [0.25, 0.1], [0.5, 0.5], [0.44, 0.92], [0.2, 1.15], [0.23, 1.36],
    [0.18, 1.36], [0.15, 1.16], [0.39, 0.92], [0.45, 0.5], [0.18, 0.1], [0.1, 0]];
  const clay: THREE.BufferGeometry[] = [];
  const vessel = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const p = vessel.getAttribute('position'), uv = vessel.getAttribute('uv');
  for (let i = 0; i < p.count; i++) uv.setY(i, i % profile.length <= 5 ? p.getY(i) / 1.36 : 0);
  erode(vessel, 0.025, seed, 2);
  vessel.rotateZ(1.7); vessel.rotateY(-0.4); vessel.translate(0.55, 0.5, 0);
  for (const side of [-1, 1]) {
    const handle = new THREE.TorusGeometry(0.2, 0.035, 6, 14, Math.PI * 1.4);
    handle.rotateY(Math.PI / 2); handle.translate(side * 0.22, 1.07, 0);
    handle.rotateZ(1.7); handle.rotateY(-0.4); handle.translate(0.55, 0.5, 0); clay.push(handle);
  }
  for (let i = 0; i < 6; i++) {
    const shard = new THREE.SphereGeometry(0.36, 6, 3, 0, 0.8, 0.8, 0.7);
    shard.rotateX(1.5); shard.rotateY(i); shard.translate(-0.6 + i * 0.27, 0.13, 0.8 + Math.sin(i) * 0.3); clay.push(shard);
  }
  // Separate intact vessels by their actual geometry bounds, not overlapping centres.
  // Keep the small pot beside the belly, away from the fallen amphora's mouth.
  const cup = saltPithos(0.42, seed + 21);
  vessel.computeBoundingBox(); cup.computeBoundingBox();
  cup.translate(vessel.boundingBox!.max.x - cup.boundingBox!.min.x + 0.24, 0, -0.3);
  return [part(vessel, 'paintedClay'), part(cup, 'paintedClay'), part(mergeSimple(clay), 'terracotta')];
}

function coldHearth(seed: number): NarrativePart[] {
  const rng = createRng(seed);
  const stones: THREE.BufferGeometry[] = [], embers: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2;
    stones.push(seaRock(0.26 + rng() * 0.1, seed + i).scale(1.3, 0.65, 1).translate(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25));
  }
  for (let i = 0; i < 6; i++) embers.push(plank(1.1 + rng() * 0.5, 0.14, 0.1, seed + i).rotateY(i * 1.12).translate((rng() - 0.5) * 0.6, 0.1, (rng() - 0.5) * 0.6));
  const ash = new THREE.CylinderGeometry(1.02, 0.95, 0.045, 22).translate(0, 0.03, 0);
  return [part(mergeSimple(stones), 'darkRock'), part(mergeSimple(embers), 'charredWood'), part(ash, 'ash')];
}

/** A single abandoned picking basket, woven from broad reeds with visible gaps. */
function harvestBasket(seed: number): NarrativePart[] {
  const reeds: THREE.BufferGeometry[] = [], fruit: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const y = 0.04 + i * 0.065, r = 0.23 + i * 0.017;
    reeds.push(new THREE.TorusGeometry(r, 0.014, 4, 14).rotateX(Math.PI / 2).translate(0, y, 0));
  }
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    reeds.push(tube([[Math.cos(a) * 0.23, 0.025, Math.sin(a) * 0.23],
      [Math.cos(a) * 0.285, 0.23, Math.sin(a) * 0.285],
      [Math.cos(a) * 0.32, 0.37, Math.sin(a) * 0.32]], 0.013, 4));
  }
  reeds.push(new THREE.CylinderGeometry(0.23, 0.23, 0.025, 14).translate(0, 0.025, 0));
  reeds.push(tube([[-0.32, 0.35, 0], [-0.28, 0.63, 0], [0, 0.72, 0], [0.28, 0.63, 0], [0.32, 0.35, 0]], 0.023, 12));
  const rng = createRng(seed);
  for (let i = 0; i < 5; i++) fruit.push(new THREE.IcosahedronGeometry(0.085, 0)
    .scale(0.85, 1.1, 0.85).translate((rng() - 0.5) * 0.33, 0.13 + (i % 2) * 0.08, (rng() - 0.5) * 0.28));
  return [part(mergeSimple(reeds), 'rope'), part(mergeSimple(fruit), 'terracotta')];
}

function abandonedHelmet(seed: number): NarrativePart[] {
  const helmet = corinthianHelmet(0.52, seed).rotateZ(1.65).rotateY(-0.3).translate(0.24, 0.27, 0);
  const lining = helmet.clone();
  const lp = lining.getAttribute('position');
  for (let i = 0; i < lp.count; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const a = lp.array[(i + 1) * 3 + axis]!;
      lp.array[(i + 1) * 3 + axis] = lp.array[(i + 2) * 3 + axis]!;
      lp.array[(i + 2) * 3 + axis] = a;
    }
  }
  lining.computeVertexNormals();
  // Distinct oxidised inner wall; no invisible backfaces in the overturned memory object.
  const straps = [tube([[-0.2, 0.15, 0], [-0.4, 0.07, 0.3], [-0.76, 0.04, 0.5]], 0.023, 9),
    tube([[0.18, 0.18, 0], [0.43, 0.08, 0.24], [0.6, 0.04, 0.15]], 0.023, 9)];
  return [part(helmet, 'bronze'), part(lining, 'oliveWood'), part(mergeSimple(straps), 'saltWood')];
}

/** Layered angular rock, broad ledges and offsets, not a scaled smooth pebble. */
export function stratifiedRock(width: number, height: number, depth: number, seed: number): THREE.BufferGeometry {
  // One continuous shell: separate stacked caps caused hairline light leaks / bucket rims.
  const courses = Math.max(3, Math.ceil(height / 1.4));
  const g = new THREE.CylinderGeometry(0.75, 1, height, 7, courses);
  g.translate(0, height / 2, 0);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = y / height;
    const n = fbm2(x * 1.1 + t * 0.65, z * 1.1, 3, seed) - 0.5;
    const ledge = Math.sin(t * 4.5 + seed) * 0.06;
    const radial = 1 + n * 0.38 + ledge;
    p.setXYZ(i, x * width * 0.5 * radial + Math.sin(t * 2.7 + seed) * width * 0.025,
      y + t * t * n * height * 0.14, z * depth * 0.5 * radial);
  }
  const faceted = g.toNonIndexed(); g.dispose();
  faceted.computeVertexNormals(); return faceted;
}

/** 9m clear mouth / recessed second throat / solid ceiling. View from +Z toward -Z. */
function caveMouth(seed: number): NarrativePart[] {
  const outer: THREE.BufferGeometry[] = [], inner: THREE.BufferGeometry[] = [];
  // Continuous asymmetric polygon vault. The hole itself is the primary silhouette.
  const innerRing = [[-5, -1], [-5.6, 3], [-3.6, 7.3], [0.4, 8.6], [4.1, 5.9], [5.2, -1]];
  const outerRing = [[-12, -1.5], [-13, 6], [-8, 13.8], [1.1, 14.4], [11.8, 10], [13, -1.5]];
  const pos: number[] = [];
  const point = (ring: number[][], i: number, z: number): number[] => {
    const [x, y] = ring[i]!; return [x! + z * 0.055, y! - z * 0.04, z];
  };
  const quad = (a: number[], b: number[], c: number[], d: number[]) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < innerRing.length - 1; i++) {
    const a = point(innerRing, i, 0), b = point(innerRing, i + 1, 0);
    const c = point(outerRing, i + 1, 0), d = point(outerRing, i, 0);
    quad(a, b, c, d);
    quad(point(innerRing, i, -9), point(innerRing, i + 1, -9), b, a);
    quad(d, c, point(outerRing, i + 1, -9), point(outerRing, i, -9));
  }
  const shell = new THREE.BufferGeometry();
  // Both sides have explicit geometry so static depth shadows remain coherent.
  const front = [...pos];
  for (let i = 0; i < front.length; i += 9) pos.push(...front.slice(i, i + 3), ...front.slice(i + 6, i + 9), ...front.slice(i + 3, i + 6));
  shell.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); shell.computeVertexNormals();
  outer.push(shell);
  outer.push(stratifiedRock(6.5, 8.5, 8, seed + 2).rotateZ(-0.1).translate(-9.2, -0.8, 1.1));
  outer.push(stratifiedRock(5.5, 6.8, 7.5, seed + 3).rotateZ(0.13).translate(8.7, -0.8, -0.4));
  inner.push(stratifiedRock(20, 11.5, 3, seed + 30).translate(0, -0.2, -10.1));
  return [part(mergeSimple(outer), 'layeredBasalt'), part(mergeSimple(inner), 'layeredBasalt')];
}

/** Four-metre olive shaft, carved taper and separate fire-hardened tip. */
function burnedStake(seed: number): NarrativePart[] {
  const shaft = erode(new THREE.CylinderGeometry(0.16, 0.23, 3.5, 7, 4), 0.035, seed, 1.8);
  shaft.rotateZ(-Math.PI / 2); shaft.translate(-0.25, 0.3, 0);
  const tip = new THREE.ConeGeometry(0.165, 0.8, 7).rotateZ(-Math.PI / 2).translate(1.9, 0.3, 0);
  const cut = new THREE.CylinderGeometry(0.16, 0.19, 0.18, 10).rotateZ(-Math.PI / 2).translate(-1.97, 0.3, 0);
  const scrape = carvedBoard(1.8, 0.045, 0.016, seed + 1).translate(0.25, 0.465, 0);
  return [part(shaft, 'oliveWood'), part(tip, 'burntWood'), part(mergeSimple([cut, scrape]), 'saltWood')];
}

export const NARRATIVE_ASSETS = {
  'game.nostos.prop.engraved_shield': { name: '归航青铜盾 · 四向星刻章与断续环带', make: engravedShield },
  'game.nostos.prop.harvest_basket': { name: '采集篮 · 宽苇编织与遗留果实', make: harvestBasket },
  'game.nostos.character.lotus_crewman': { name: '留下的人 · 跪坐水手与忘食果', make: lotusCrewman },
  'game.nostos.prop.orchard_tree': { name: '忘食果树 · 开放树冠与低垂果枝', make: orchardTree },
  'game.nostos.prop.abandoned_vessels': { name: '倒伏空瓮 · 中空器壁与陶片', make: abandonedVessels },
  'game.nostos.prop.cold_hearth': { name: '冷却火塘 · 白灰与焦木', make: coldHearth },
  'game.nostos.prop.abandoned_helmet': { name: '弃置头盔 · 松开的双带', make: abandonedHelmet },
  'game.nostos.prop.shore_oar': { name: '半埋船桨 · 宽叶与盐蚀柄', make: (seed: number) => [part(brokenOar(3.8, seed).translate(0, 0.12, 0), 'saltWood')] },
  'game.nostos.environment.cyclops_cave': { name: '独眼岬洞窟 · 偏心连续岩壳', make: caveMouth },
  'game.nostos.prop.burned_stake': { name: '橄榄木桩 · 削尖与烧硬端部', make: burnedStake },
} as const;
export type NarrativeAssetId = keyof typeof NARRATIVE_ASSETS;
export function resolveNarrativeAsset(id: NarrativeAssetId, seed = 1701): NarrativePart[] {
  return NARRATIVE_ASSETS[id].make(seed);
}
export function placeNarrativeAsset(d: Dresser, id: NarrativeAssetId, options: PlaceOptions, seed = 1701): void {
  resolveNarrativeAsset(id, seed).forEach((p, i) => d.place(p.geometry, p.surface, { ...options, block: i === 0 ? options.block : undefined }));
}
