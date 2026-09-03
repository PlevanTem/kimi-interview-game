import * as THREE from 'three';
import { segments } from '../content/segments';
import type { GameState } from '../domain/stateMachine';
import type { Point } from '../domain/path';
import { GRAYBOX_ASSET_ID, resolveProceduralAsset } from './assetResolver';

export class GrayboxRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-6, 6, 4.5, -4.5, 0.1, 50);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private readonly primitives = resolveProceduralAsset(GRAYBOX_ASSET_ID)();
  private pathLine: THREE.Line | null = null;
  private lastSegment = -1;

  constructor(host: HTMLElement) {
    this.scene.background = new THREE.Color('#10131a');
    this.camera.position.set(5, 0, 10);
    this.camera.lookAt(5, 0, 0);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(960, 720, false);
    this.canvas = this.renderer.domElement;
    this.canvas.id = 'game-canvas';
    this.canvas.setAttribute('aria-label', '下一盏灯灰盒场景');
    host.append(this.canvas);
    this.scene.add(this.primitives.root);
  }

  pointerToWorld(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, hit);
    return [hit.x, hit.y];
  }

  private drawPath(points: readonly Point[], valid: boolean) {
    if (this.pathLine) {
      this.pathLine.geometry.dispose();
      this.scene.remove(this.pathLine);
      this.pathLine = null;
    }
    if (points.length < 2) return;
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y]) => new THREE.Vector3(x, y, 0.07)));
    this.pathLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: valid ? '#f8fafc' : '#94a3b8' }));
    this.scene.add(this.pathLine);
  }

  render(state: GameState) {
    const segment = segments[state.segmentIndex];
    if (state.segmentIndex !== this.lastSegment) {
      this.primitives.updateLayout(segment.start, segment.target, segment.blocks ?? []);
      this.lastSegment = state.segmentIndex;
    }
    const points = state.draft.length ? state.draft : state.committed;
    this.drawPath(points, state.lastReason === null);
    if (state.phase === 'Traverse' && state.committed.length > 1) {
      const index = Math.min(state.committed.length - 1, Math.floor(state.travelerProgress * (state.committed.length - 1)));
      const point = state.committed[index];
      this.primitives.traveler.position.set(point[0], point[1], 0.08);
    } else {
      this.primitives.traveler.position.set(segment.start[0], segment.start[1], 0.08);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
