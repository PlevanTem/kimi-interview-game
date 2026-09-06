import * as THREE from 'three';
import { PIGMENT } from '../../content/palette';
import { clamp } from '../../engine/noise';
import { terrainHeight } from '../../world/terrain';
import { CHART, stateFor, type ChartIsland, type IslandState } from './atlas';
import {
  PLINTH_WALL,
  RELIEF_EXAGGERATION,
  buildBlank,
  buildRelief,
  chartScale,
} from './geometry';
import { buildLandmarks } from './landmarks';

export { CHART, stateFor } from './atlas';
export type { ChartIsland, IslandState } from './atlas';

/**
 * 航程海图。
 *
 * 八枚从世界上挖下来的地块，摆在一张图版上，按走过的先后串成一条航线。
 * 它替换掉暂停面板里那一列文字进度——文字告诉你"第 4 / 8 幕"，
 * 章告诉你"你走过的是这些地方"。
 *
 * 三条它**不做**的事，比它做的事更重要：
 *
 * - **不是世界地图**。八座岛在设定里彼此毫无关系，图上不给方位、不给距离、
 *   不给航行路线的地理含义。那条 S 只表示先后。
 * - **不揭示没走过的地方**。未到的幕是一块**未刻的石料**：没有地形、
 *   没有地标、没有名字。它不是"缺了什么"，是"还没有发生"。
 * - **不引入新的美术**。岛形来自 `terrainHeight()`，颜色来自各幕的地形三色，
 *   光来自各幕的天候。海图没有自己的调色板。
 */

/** 图版的底色，与暂停面板的背景同源。 */
const BED = 0x120e0c;

export interface ChartHandlers {
  /** 鼠标停在某一枚章上；null 表示离开。只有走过的幕会报出来。 */
  onHover?: (island: ChartIsland | null) => void;
  onSelect?: (island: ChartIsland) => void;
}

interface IslandNode {
  island: ChartIsland;
  group: THREE.Group;
  relief: THREE.Mesh;
  blank: THREE.Mesh;
  landmarks: THREE.Mesh | null;
  smoke: THREE.Points | null;
  halo: THREE.Mesh;
  light: THREE.PointLight;
  picker: THREE.Mesh;
  /** 世界米 → 图版单位 */
  scale: number;
  radius: number;
  state: IslandState;
  /** 当前抬起量，用于缓动 */
  lift: number;
  liftTarget: number;
}

/** 一张软边圆斑，给每枚章底下那层贴地的天候雾用。 */
function haloTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class IslandChart {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly ownsRenderer: boolean;
  private readonly nodes: IslandNode[] = [];
  private readonly surface: THREE.MeshLambertMaterial;
  private readonly route: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2(-2, -2);
  private readonly focus = new THREE.Vector3();
  private readonly focusTarget = new THREE.Vector3();
  private readonly parallax = new THREE.Vector2();
  private readonly parallaxTarget = new THREE.Vector2();

  private currentAct = 0;
  private hovered: IslandNode | null = null;
  private clock = 0;
  private reducedMotion = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly handlers: ChartHandlers = {},
    renderer?: THREE.WebGLRenderer,
  ) {
    this.ownsRenderer = !renderer;
    this.renderer =
      renderer ??
      new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    // 低角度俯瞰：太高就成了平面图，看不见章的侧壁与浮雕的投影；
    // 太低则后面几枚被前面挡住。32° 上下是两者的交界。
    this.camera.position.set(0, 3.05, 4.35);

    this.scene.fog = new THREE.FogExp2(BED, 0.115);

    // 全图共用一个材质：顶点色扛掉全部色彩，八枚章只有 16 个 draw call
    this.surface = new THREE.MeshLambertMaterial({ vertexColors: true });

    this.scene.add(new THREE.HemisphereLight(0x8fa6b4, 0x241d18, 0.42));
    const key = new THREE.DirectionalLight(PIGMENT.bone, 0.62);
    key.position.set(-2.4, 4.2, 2.8);
    this.scene.add(key);

    this.scene.add(this.buildBed());
    this.route = this.buildRoute();
    this.scene.add(this.route);

    const halo = haloTexture();
    for (const island of CHART) this.nodes.push(this.buildIsland(island, halo));

    this.setProgress(0);
    this.focus.copy(this.focusTarget);

    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('click', this.handleClick);
  }

  // ── 构建 ──

  /** 图版：一块比八枚章大一圈的深色底板，边缘自己沉进雾里。 */
  private buildBed(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(9, 64).rotateX(-Math.PI / 2);
    const colors: number[] = [];
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colour = new THREE.Color();
    for (let i = 0; i < position.count; i += 1) {
      const d = Math.hypot(position.getX(i), position.getZ(i)) / 9;
      colour.setHex(0x2a211b).multiplyScalar(1 - d * 0.75);
      colors.push(colour.r, colour.g, colour.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(geometry, this.surface);
    mesh.position.y = -PLINTH_WALL - 0.005;
    return mesh;
  }

  /**
   * 航线。
   *
   * 用**二次贝塞尔**串起相邻两枚章——和世界里按 `H` 唤出的那条引路的光
   * 是同一种曲线（`world/guidelight.ts`）。玩家在岛上跟着走的那道弧，
   * 和图上他走过的那条线，是同一句话的两种说法。
   *
   * 走过的段填金，没走的只是图版上一道空槽。
   */
  private buildRoute(): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(0), 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(0), 3));
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -PLINTH_WALL + 0.004;
    mesh.renderOrder = 1;
    return mesh;
  }

  private rebuildRoute(): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const gold = new THREE.Color(PIGMENT.duskGold);
    const groove = new THREE.Color(0x1c1613);
    const half = 0.018;

    for (let i = 0; i < CHART.length - 1; i += 1) {
      const a = CHART[i]!.slot;
      const b = CHART[i + 1]!.slot;
      // 控制点抬向两点之外的一侧，弧就朝着航程前进的方向鼓出来
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      const control = new THREE.Vector2(mx, mz + (i % 2 === 0 ? -0.55 : 0.55));
      const travelled = i < this.currentAct;
      const steps = 26;
      let prev: THREE.Vector2 | null = null;
      for (let s = 0; s <= steps; s += 1) {
        const t = s / steps;
        const inv = 1 - t;
        const p = new THREE.Vector2(
          inv * inv * a.x + 2 * inv * t * control.x + t * t * b.x,
          inv * inv * a.z + 2 * inv * t * control.y + t * t * b.z,
        );
        if (prev) {
          const dir = new THREE.Vector2().subVectors(p, prev).normalize();
          const n = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(half);
          const quad = [
            [prev.x + n.x, prev.y + n.y],
            [prev.x - n.x, prev.y - n.y],
            [p.x - n.x, p.y - n.y],
            [prev.x + n.x, prev.y + n.y],
            [p.x - n.x, p.y - n.y],
            [p.x + n.x, p.y + n.y],
          ] as const;
          // 两端淡出，别让金线直直地戳进章的侧壁
          const fade = Math.sin(t * Math.PI) * 0.6 + 0.4;
          const c = travelled ? gold.clone().multiplyScalar(fade) : groove;
          for (const [x, z] of quad) {
            positions.push(x, 0, z);
            colors.push(c.r, c.g, c.b);
          }
        }
        prev = p;
      }
    }

    const geometry = this.route.geometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
  }

  private buildIsland(island: ChartIsland, haloMap: THREE.Texture): IslandNode {
    const group = new THREE.Group();
    group.position.set(island.slot.x, 0, island.slot.z);
    group.rotation.y = island.slot.yaw;

    const relief = buildRelief(island);
    const blank = buildBlank(island);
    const scale = chartScale(island);

    const reliefMesh = new THREE.Mesh(relief.geometry, this.surface);
    const blankMesh = new THREE.Mesh(blank.geometry, this.surface);
    group.add(reliefMesh, blankMesh);

    // 地标：世界米坐标 → 图版单位。贴地用的是同一个高度函数，
    // 所以一件东西在章上的高度，就是玩家走到它跟前时脚下的高度。
    //
    // 落点的 y **乘上竖向夸张**（因为浮雕被夸张过了，不乘就会陷进地里），
    // 但地标自身的形体只做等比缩放——地形夸张，地标不夸张。
    const groundAt = (x: number, z: number): number =>
      Math.max(island.terrain.waterLevel ?? 0, terrainHeight(island.terrain, x, z)) *
      RELIEF_EXAGGERATION;
    const landmarkGeometry = buildLandmarks(island.landmarks, island.terrain.seed, groundAt);
    let landmarks: THREE.Mesh | null = null;
    if (landmarkGeometry) {
      landmarks = new THREE.Mesh(landmarkGeometry, this.surface);
      landmarks.scale.setScalar(scale);
      group.add(landmarks);
    }

    // 贴地的一层天候雾：这枚章自己的地平线色
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(relief.radius * 4.4, relief.radius * 4.4).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: haloMap,
        color: island.weather.horizon,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      }),
    );
    halo.position.y = -PLINTH_WALL + 0.012;
    group.add(halo);

    // 这枚章自己的太阳。distance 收得紧，免得邻岛互相串色——
    // 八枚排开时天候节奏要一眼读得出，串了就糊成一片。
    const light = new THREE.PointLight(island.weather.key, 0, 1.15, 2);
    light.position.set(0, 0.52, 0.22);
    group.add(light);

    // 拾取用一个看不见的圆柱，不去打浮雕那几万个三角
    const picker = new THREE.Mesh(
      new THREE.CylinderGeometry(relief.radius, relief.radius, 0.5, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    picker.position.y = 0.05;
    group.add(picker);

    const smoke = island.landmarks.some((l) => l.kind === 'hearthSmoke')
      ? this.buildSmoke(island, scale)
      : null;
    if (smoke) group.add(smoke);

    this.scene.add(group);
    return {
      island,
      group,
      relief: reliefMesh,
      blank: blankMesh,
      landmarks,
      smoke,
      halo,
      light,
      picker,
      scale,
      radius: relief.radius,
      state: 'locked',
      lift: 0,
      liftTarget: 0,
    };
  }

  /** 屋顶那缕烟：全图唯一在动的地标，也是唯一需要透明材质的东西。 */
  private buildSmoke(island: ChartIsland, scale: number): THREE.Points {
    const anchor = island.landmarks.find((l) => l.kind === 'hearthSmoke')!;
    const ground = Math.max(
      island.terrain.waterLevel ?? 0,
      terrainHeight(island.terrain, anchor.x, anchor.z),
    );
    const count = 14;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = anchor.x * scale;
      positions[i * 3 + 1] = ground * scale * RELIEF_EXAGGERATION;
      positions[i * 3 + 2] = anchor.z * scale;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: PIGMENT.bone,
        size: 0.016,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    points.userData.base = [anchor.x * scale, ground * scale * RELIEF_EXAGGERATION, anchor.z * scale];
    points.visible = false;
    return points;
  }

  // ── 状态 ──

  /**
   * 走到第几幕。
   *
   * 之前的幕全部刻出来，当前幕抬起并亮着自己的天候，之后的幕是未刻的石料。
   */
  setProgress(currentAct: number): void {
    this.currentAct = clamp(Math.round(currentAct), 0, CHART.length - 1);
    for (const node of this.nodes) {
      const state = stateFor(node.island.act, this.currentAct);
      node.state = state;
      const revealed = state !== 'locked';
      node.relief.visible = revealed;
      node.blank.visible = !revealed;
      if (node.landmarks) node.landmarks.visible = revealed;
      if (node.smoke) node.smoke.visible = revealed;
      const material = node.halo.material as THREE.MeshBasicMaterial;
      material.opacity = state === 'current' ? 0.5 : state === 'done' ? 0.22 : 0;
      node.light.intensity =
        state === 'current' ? 1.5 * node.island.weather.intensity : state === 'done' ? 0.62 : 0;
      node.liftTarget = state === 'current' ? 0.085 : 0;
    }
    this.rebuildRoute();
    this.setFocus(this.currentAct);
  }

  /** 把镜头的注视点挪到某一枚章上。 */
  setFocus(index: number): void {
    const slot = CHART[clamp(index, 0, CHART.length - 1)]!.slot;
    // 不完全对准：注视点往图版中心拉回一点，八枚章才不会有半数出画
    this.focusTarget.set(slot.x * 0.62, 0, slot.z * 0.5);
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (reduced) {
      this.parallaxTarget.set(0, 0);
      this.parallax.set(0, 0);
    }
  }

  get progress(): number {
    return this.currentAct;
  }

  // ── 交互 ──

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.parallaxTarget.set(this.pointer.x * 0.16, this.pointer.y * 0.09);
  };

  private readonly handlePointerLeave = (): void => {
    this.pointer.set(-2, -2);
    this.parallaxTarget.set(0, 0);
    this.setHovered(null);
  };

  private readonly handleClick = (): void => {
    if (this.hovered) this.handlers.onSelect?.(this.hovered.island);
  };

  private setHovered(node: IslandNode | null): void {
    if (this.hovered === node) return;
    if (this.hovered && this.hovered.state !== 'current') this.hovered.liftTarget = 0;
    this.hovered = node;
    if (node && node.state !== 'current') node.liftTarget = 0.055;
    this.handlers.onHover?.(node ? node.island : null);
  }

  private pick(): void {
    if (this.pointer.x < -1.5) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = this.nodes.filter((n) => n.state !== 'locked').map((n) => n.picker);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) {
      this.setHovered(null);
      return;
    }
    this.setHovered(this.nodes.find((n) => n.picker === hit.object) ?? null);
  }

  // ── 每帧 ──

  resize(): void {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  update(dt: number): void {
    this.clock += dt;
    this.pick();

    const ease = 1 - Math.pow(0.001, dt);
    this.focus.lerp(this.focusTarget, ease);
    this.parallax.lerp(this.parallaxTarget, this.reducedMotion ? 1 : 1 - Math.pow(0.004, dt));

    for (const node of this.nodes) {
      node.lift += (node.liftTarget - node.lift) * ease;
      // 当前幕那一枚在极缓地呼吸：和世界里引路的光同一个 2.6 秒节律
      const breathe =
        node.state === 'current' && !this.reducedMotion
          ? Math.sin((this.clock / 2.6) * Math.PI * 2) * 0.006
          : 0;
      node.group.position.y = node.lift + breathe;
      if (node.state === 'current') {
        const pulse = this.reducedMotion ? 1 : 0.9 + Math.sin((this.clock / 2.6) * Math.PI * 2) * 0.12;
        node.light.intensity = 1.5 * node.island.weather.intensity * pulse;
      }
      if (node.smoke?.visible) this.driftSmoke(node, dt);
    }

    this.camera.position.set(
      this.focus.x + this.parallax.x,
      3.05 + this.parallax.y * 0.5,
      this.focus.z + 4.35 - this.parallax.y * 0.8,
    );
    this.camera.lookAt(this.focus.x, 0.05, this.focus.z);
  }

  /** 烟：一列点，慢慢往上飘、往一侧偏，到顶就回到炉口重来。 */
  private driftSmoke(node: IslandNode, dt: number): void {
    const points = node.smoke!;
    const base = points.userData.base as [number, number, number];
    const position = points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const speed = this.reducedMotion ? 0 : dt * 0.05;
    for (let i = 0; i < position.count; i += 1) {
      let y = position.getY(i) + speed * (0.6 + (i % 5) * 0.12);
      let x = position.getX(i) + speed * 0.35;
      const rise = y - base[1];
      if (rise > 0.14 || rise < 0) {
        y = base[1] + (i / position.count) * 0.14;
        x = base[0] + ((i / position.count) * 0.14) * 2.4;
      }
      position.setX(i, x);
      position.setY(i, y);
      position.setZ(i, base[2]);
    }
    position.needsUpdate = true;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('click', this.handleClick);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        const material = object.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      }
    });
    this.surface.dispose();
    if (this.ownsRenderer) this.renderer.dispose();
  }
}
