import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COASTAL_ASSETS, coastalBoat, saltPithos, seaRock, cutStone, carvedBoard, coastalLeaves, mineralColumn } from '../src/world/sea-worn';
import { lotusCrewman } from '../src/world/lotus-crewman';
import { ACTS } from '../src/game/scenes';
import { ENV } from '../src/content/palette';

describe('海蚀彩陶：几何、媒介与范围契约', () => {
  it('新增次级资产全部有稳定来源与登记', () => {
    const registry = JSON.parse(readFileSync(new URL('../context/asset-registry.json', import.meta.url), 'utf8'));
    for (const id of Object.keys(COASTAL_ASSETS)) {
      const record = registry.assets.find((asset: { id: string }) => asset.id === id);
      expect(record, id).toBeDefined(); expect(record.license).toBe('project-owned');
    }
  });
  it('陶器和船的开口能向内看到底部，不是封口实体', () => {
    for (const geometry of [saltPithos(1, 17), coastalBoat(5.6, 71)]) {
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material); mesh.updateMatrixWorld();
      const hits = new THREE.Raycaster(new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(0, -1, 0)).intersectObject(mesh);
      expect(hits.length).toBeGreaterThan(0); expect(hits[0]!.point.y).toBeLessThan(0.2);
      geometry.dispose(); material.dispose();
    }
  });
  it('近景表面、法线与尺寸有效，简化未变成空几何', () => {
    const geometries = [seaRock(1, 31), cutStone(2, 0.2, 1, 7), carvedBoard(4.5, 0.6, 0.13, 100),
      coastalLeaves(1, 170), mineralColumn({ height: 5, radius: 0.5, broken: 0.3 }),
      ...lotusCrewman(1701).map((part) => part.geometry)];
    for (const g of geometries) {
      const p = g.getAttribute('position'), n = g.getAttribute('normal');
      expect(p.count).toBeGreaterThan(20); expect(p.count).toBeLessThan(20000);
      expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
      expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
      g.computeBoundingBox(); expect(g.boundingBox!.max.y).toBeGreaterThan(0);
      g.dispose();
    }
  });
  it('人物决策落实到前三幕现有内容，不增加未授权剧情人物', () => {
    const npcs = ACTS.slice(0, 3).flatMap((act) => act.def.interactables.filter((item) => item.kind === 'talk'));
    expect(npcs.map((npc) => npc.id)).toEqual(['lotus.crewman']);
    for (const npc of npcs) { expect(npc.modelAsset).toBeTruthy(); expect(npc.motif).toBeUndefined(); }
  });
  it('新风格只作用于前三幕', () => {
    ACTS.forEach((act, i) => expect(ENV[act.def.env].sculptedStyle).toBe(i < 3 ? 1 : 0));
  });
});
