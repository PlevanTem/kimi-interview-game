import * as THREE from 'three';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NARRATIVE_ASSETS, resolveNarrativeAsset, type NarrativeAssetId } from '../src/world/narrative-assets';
import { Dresser } from '../src/game/scenes/dresser';
import { ACTS } from '../src/game/scenes';
import { Terrain } from '../src/world/terrain';
import { findFocus } from '../src/game/interact';
import { previewAct } from '../src/game/local-preview';

describe('第1、2幕程序化叙事资产', () => {
  it('稳定ID全部登记，文件、依赖和几何字节预算可解析', () => {
    const repo = fileURLToPath(new URL('../../../', import.meta.url));
    const registry = JSON.parse(readFileSync(new URL('../context/asset-registry.json', import.meta.url), 'utf8')) as {
      assets: Array<{ id: string; locator: { value: string }; source: string; license: string; dependencies: string[]; sizeBudgetBytes: number }>;
    };
    const ids = new Set(registry.assets.map((a) => a.id));
    expect(ids.size).toBe(registry.assets.length);
    for (const record of registry.assets) {
      expect(existsSync(resolve(repo, record.locator.value.split('#')[0]!)), record.id).toBe(true);
      expect(record.source).toBeTruthy(); expect(record.license).toBeTruthy();
      for (const dep of record.dependencies) expect(ids.has(dep), `${record.id} -> ${dep}`).toBe(true);
    }
    for (const id of Object.keys(NARRATIVE_ASSETS) as NarrativeAssetId[]) {
      const record = registry.assets.find((a) => a.id === id);
      expect(record, id).toBeDefined();
      const parts = resolveNarrativeAsset(id);
      const bytes = parts.reduce((sum, p) => sum + Object.values(p.geometry.attributes).reduce((n, a) => n + a.array.byteLength, 0), 0);
      expect(bytes).toBeLessThanOrEqual(record!.sizeBudgetBytes);
      parts.forEach((p) => p.geometry.dispose());
    }
  });
  it('分幕预览只允许本机且不借用正常存档', () => {
    expect(previewAct('http://127.0.0.1:4175/?preview=lotus')).toBe(1);
    expect(previewAct('http://localhost:4175/?preview=cyclops')).toBe(2);
    expect(previewAct('https://example.com/?preview=cyclops')).toBeNull();
    expect(previewAct('http://localhost/?preview=ithaca')).toBeNull();
    expect(previewAct()).toBeNull();
  });
  for (const id of Object.keys(NARRATIVE_ASSETS) as NarrativeAssetId[]) {
    it(`${id} 确定性、有效法线、局部几何预算`, () => {
      const a = resolveNarrativeAsset(id, 1701), b = resolveNarrativeAsset(id, 1701);
      let vertices = 0;
      a.forEach((p, i) => {
        const pos = p.geometry.getAttribute('position'), normals = p.geometry.getAttribute('normal');
        vertices += pos.count;
        expect(Array.from(pos.array).every(Number.isFinite)).toBe(true);
        expect(normals.count).toBe(pos.count);
        expect(Array.from(normals.array).every(Number.isFinite)).toBe(true);
        expect(Array.from(pos.array)).toEqual(Array.from(b[i]!.geometry.getAttribute('position').array));
        p.geometry.computeBoundingBox();
        expect(p.geometry.boundingBox!.max.y).toBeGreaterThan(0);
        p.geometry.dispose(); b[i]!.geometry.dispose();
      });
      expect(vertices).toBeLessThan(20000);
    });
  }
  it('果枝可触及，树冠高于人眼，洞口中央留出真正的空间', () => {
    const tree = resolveNarrativeAsset('game.nostos.prop.orchard_tree');
    for (const p of tree) p.geometry.computeBoundingBox();
    expect(tree.find((p) => p.surface === 'olive')!.geometry.boundingBox!.min.y).toBeGreaterThan(2.2);
    const fruit = tree.find((p) => p.surface === 'terracotta')!.geometry.boundingBox!;
    expect(fruit.min.y).toBeGreaterThan(1.3); expect(fruit.max.y).toBeLessThan(2.2);
    const cave = resolveNarrativeAsset('game.nostos.environment.cyclops_cave');
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 1.68, 6), new THREE.Vector3(0, 0, -1));
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const meshes = cave.map((p) => new THREE.Mesh(p.geometry, material));
    meshes.forEach((m) => m.updateMatrixWorld());
    const hits = ray.intersectObjects(meshes);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.distance).toBeGreaterThan(13); // no facade/roof across the player corridor
    [...tree, ...cave].forEach((p) => p.geometry.dispose()); material.dispose();
  });
});

describe('两幕实地通行与线索接近', () => {
  for (const act of ACTS.slice(1, 3)) it(`${act.def.id} 从出生点能走到所有交互范围，含随机布景碰撞`, () => {
    const terrain = Object.assign(Object.create(Terrain.prototype) as Terrain, {
      params: { frequency: 0.045, dome: 3, ridge: 0, waterLevel: 0, ...act.terrain },
    });
    const d = new Dresser(new THREE.Scene(), terrain, act.terrain.seed);
    // Execute the real scatter and placement/collision code without creating DOM materials.
    act.dress(d);
    const r = act.terrain.radius, step = 0.75, cells = Math.ceil(r * 2 / step) + 1;
    const ok = (x: number, z: number) => terrain.walkable(x, z) &&
      !d.blockers.some((b) => Math.hypot(x - b.x, z - b.z) < b.radius + 0.28);
    const key = (ix: number, iz: number) => iz * cells + ix;
    const ix = Math.round((act.def.spawn.x + r) / step), iz = Math.round((act.def.spawn.z + r) / step);
    const seen = new Set<number>([key(ix, iz)]), queue = [[ix, iz]];
    const reached = new Set<string>();
    for (let i = 0; i < queue.length; i++) {
      const [cx, cz] = queue[i]!, x = cx! * step - r, z = cz! * step - r;
      for (const item of act.def.interactables) {
        const dist = Math.hypot(x - item.x, z - item.z);
        if (dist > 1.1 && dist < (item.radius ?? 2.8) - 0.3 &&
          findFocus({ x, z, yaw: Math.atan2(x - item.x, z - item.z) }, [item])) reached.add(item.id);
      }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx! + dx!, nz = cz! + dz!, k = key(nx, nz);
        if (nx < 0 || nz < 0 || nx >= cells || nz >= cells || seen.has(k)) continue;
        if (!ok(nx * step - r, nz * step - r)) continue;
        seen.add(k); queue.push([nx, nz]);
      }
    }
    expect(act.def.interactables.filter((p) => !reached.has(p.id)).map((p) => p.id)).toEqual([]);
    // Build geometry directly to verify the same 300k scene budget used by runtime.
    const batches = (d as unknown as { batches: Map<string, { build(): THREE.BufferGeometry | null }> }).batches;
    let count = 0;
    for (const batch of batches.values()) { const g = batch.build(); if (g) { count += g.getAttribute('position').count; g.dispose(); } }
    expect(count).toBeLessThan(300000);
  });
});
