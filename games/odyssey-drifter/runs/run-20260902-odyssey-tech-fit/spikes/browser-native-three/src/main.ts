import * as THREE from 'three';
import { canonicalize, type Point, type Rules, validate } from './domain';
import './style.css';

const rules: Rules = {
  start: [0, 0], target: [10, 0], anchorTolerance: 0.22, targetTolerance: 0.62,
  budget: 12, corridor: { minX: 0, maxX: 10, minY: -1.5, maxY: 1.5 }
};

const stage = document.querySelector<HTMLDivElement>('#stage')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const result = document.querySelector<HTMLParagraphElement>('#result')!;
const reset = document.querySelector<HTMLButtonElement>('#reset')!;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#10131a');
const camera = new THREE.OrthographicCamera(-6, 6, 4, -4, 0.1, 50);
camera.position.set(5, 0, 10);
camera.lookAt(5, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(960, 640, false);
renderer.domElement.id = 'canvas';
renderer.domElement.setAttribute('aria-label', '路径预览画布');
stage.append(renderer.domElement);

const corridor = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), new THREE.MeshBasicMaterial({ color: '#334155', transparent: true, opacity: 0.72 }));
corridor.position.set(5, 0, 0);
scene.add(corridor);
const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(10, 3)), new THREE.LineBasicMaterial({ color: '#cbd5e1' }));
edge.position.set(5, 0, 0.02);
scene.add(edge);
const start = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshBasicMaterial({ color: '#f8fafc' }));
start.position.set(0, 0, 0.03);
scene.add(start);
const target = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78), new THREE.MeshBasicMaterial({ color: '#f8fafc' }));
target.position.set(10, 0, 0.03);
scene.add(target);
const budgetText = new THREE.GridHelper(12, 12, '#475569', '#334155');
budgetText.rotation.x = Math.PI / 2;
budgetText.position.set(5, 0, -0.01);
scene.add(budgetText);

let draft: Point[] = [];
let drawing = false;
let line: THREE.Line | null = null;
let pendingInputAt: number | null = null;
const inputToRenderMs: number[] = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function reasonText(reason: string | null) {
  return reason === null ? '可抵达落点' : ({ start_anchor: '必须从圆形起点开始', outside_corridor: '路径离开允许走廊', target_miss: '路径没有抵达方形目标', over_budget: '路径超过灯带预算' } as Record<string, string>)[reason];
}

function toWorld(event: PointerEvent): Point {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, hit);
  return [hit.x, hit.y];
}

function drawPath(points: Point[], color = '#f8fafc') {
  if (line) scene.remove(line);
  if (points.length < 2) return;
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y]) => new THREE.Vector3(x, y, 0.05)));
  line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  scene.add(line);
}

function preview() {
  if (draft.length < 2) return;
  if (Math.hypot(draft[0][0] - draft.at(-1)![0], draft[0][1] - draft.at(-1)![1]) < 0.001) {
    status.textContent = '正在从起点铺设路径。';
    return;
  }
  const check = validate(rules, draft);
  drawPath(check.normalized, check.valid ? '#f8fafc' : '#94a3b8');
  status.textContent = `预览：${reasonText(check.reason)}；长度 ${check.length.toFixed(2)} / ${rules.budget}`;
  pendingInputAt = performance.now();
}

function clear() {
  draft = [];
  drawing = false;
  if (line) scene.remove(line);
  line = null;
  status.textContent = '等待从起点开始铺设。';
  result.textContent = '尚未提交。';
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  renderer.domElement.setPointerCapture(event.pointerId);
  drawing = true;
  draft = [rules.start, toWorld(event)];
  preview();
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!drawing) return;
  const point = toWorld(event);
  const last = draft.at(-1)!;
  if (Math.hypot(last[0] - point[0], last[1] - point[1]) > 0.03) draft.push(point);
  preview();
});
renderer.domElement.addEventListener('pointerup', (event) => {
  if (!drawing) return;
  drawing = false;
  draft.push(toWorld(event));
  const check = validate(rules, draft);
  drawPath(check.normalized, check.valid ? '#f8fafc' : '#94a3b8');
  result.textContent = check.valid ? '提交结果：有效路径，旅者可通过。' : `提交结果：无效路径，${reasonText(check.reason)}。`;
  status.textContent = result.textContent;
  renderer.domElement.releasePointerCapture(event.pointerId);
});
reset.addEventListener('click', clear);

function render() {
  const now = performance.now();
  if (pendingInputAt !== null) {
    inputToRenderMs.push(Math.max(0, now - pendingInputAt));
    pendingInputAt = null;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();

declare global { interface Window { __lanternSpike?: { validate: (points: Point[]) => ReturnType<typeof validate>; canonicalize: (points: Point[]) => Point[]; draft: () => Point[]; inputMetrics: () => { samples: number; p95: number | null } } } }
window.__lanternSpike = {
  validate: (points) => validate(rules, points),
  canonicalize,
  draft: () => [...draft],
  inputMetrics: () => {
    const sorted = [...inputToRenderMs].sort((a, b) => a - b);
    return { samples: sorted.length, p95: sorted.length ? Number(sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2)) : null };
  }
};
