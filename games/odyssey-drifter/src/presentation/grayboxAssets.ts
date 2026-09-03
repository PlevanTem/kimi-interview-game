import * as THREE from 'three';
import type { BlockZone, Point } from '../domain/path';

export const GRAYBOX_ASSET_ID = 'game.odyssey-drifter.procedural.graybox-primitives';

export interface GrayboxPrimitives {
  root: THREE.Group;
  corridor: THREE.Mesh;
  start: THREE.Mesh;
  target: THREE.Mesh;
  traveler: THREE.Mesh;
  updateLayout(startPoint: Point, targetPoint: Point, blocks: readonly BlockZone[]): void;
}

export function createGrayboxPrimitives(): GrayboxPrimitives {
  const root = new THREE.Group();
  const corridor = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ color: '#303743', transparent: true, opacity: 0.8 }));
  corridor.position.set(5, 0, 0);
  root.add(corridor);
  const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(10, 5)), new THREE.LineBasicMaterial({ color: '#cbd5e1' }));
  border.position.set(5, 0, 0.02);
  root.add(border);
  const grid = new THREE.GridHelper(12, 12, '#475569', '#334155');
  grid.rotation.x = Math.PI / 2;
  grid.position.set(5, 0, -0.02);
  root.add(grid);
  const start = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), new THREE.MeshBasicMaterial({ color: '#f8fafc' }));
  const target = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ color: '#f8fafc' }));
  const traveler = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), new THREE.MeshBasicMaterial({ color: '#fbbf24' }));
  const gaps = new THREE.Group();
  root.add(start, target, traveler, gaps);
  const updateLayout = (startPoint: Point, targetPoint: Point, blocks: readonly BlockZone[]) => {
    start.position.set(startPoint[0], startPoint[1], 0.05);
    target.position.set(targetPoint[0], targetPoint[1], 0.05);
    traveler.position.set(startPoint[0], startPoint[1], 0.08);
    gaps.clear();
    for (const block of blocks) {
      const width = block.maxX - block.minX;
      const height = block.maxY - block.minY;
      const geometry = new THREE.PlaneGeometry(width, height);
      const gap = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#090c12' }));
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: '#64748b' }));
      gap.position.set((block.minX + block.maxX) / 2, (block.minY + block.maxY) / 2, 0.035);
      edge.position.z = 0.01;
      gap.add(edge);
      gaps.add(gap);
    }
  };
  return { root, corridor, start, target, traveler, updateLayout };
}
