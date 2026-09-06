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
    // 浮雕靠投影读形体。没有影子的话，一枚章无论起伏多大都是一块平饼——
    // 这是整张图上最值钱的一盏灯，值得开一张 1024 的阴影图。
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    // 机位由 frameAll() 按八枚章的实际包围盒算出来，不写死：
    // 面板宽高比从 21:9 到竖屏都可能，写死的距离一定会切掉两头的章。
    this.camera.position.set(0, 6.2, 9.4);

    // 雾只负责让最远的一两枚章沉下去，不该把中景也吃掉
    this.scene.fog = new THREE.FogExp2(BED, 0.028);

    // 全图共用一个材质：顶点色扛掉全部色彩，八枚章只有 16 个 draw call
    this.surface = new THREE.MeshLambertMaterial({ vertexColors: true });

    // 半球光只托底，**绝不能给大**。它按法线的 y 分量给光，而一枚浅穹顶的
    // 法线几乎处处朝上——开到 0.9 就等于把八枚章的形体统一照平，
    // 无论浮雕做多高都读成一块饼。形体全部交给下面那盏主光。
    this.scene.add(new THREE.HemisphereLight(0xa8bcc8, 0x2e2620, 0.45));
    const key = new THREE.DirectionalLight(PIGMENT.bone, 1.55);
    // 与 geometry.ts 的 HILLSHADE_LIGHT 同向：烘进颜色的明暗和实时投影
    // 必须指同一个太阳。塑形交给晕渲，这盏灯只负责地标投在地形上的影子。
    key.position.set(-4.2, 2.4, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    // 视锥收到刚好罩住八枚章，别浪费纹素——1024 摊在 ±4.6 上时，
    // 一个纹素接近一厘米，最平那几枚章立刻开始自遮挡。
    const frustum = key.shadow.camera as THREE.OrthographicCamera;
    frustum.left = -4.2;
    frustum.right = 4.2;
    frustum.top = 3.4;
    frustum.bottom = -3.4;
    frustum.near = 0.1;
    frustum.far = 16;
    // bias 必须走 normalBias，不能走 bias。
    // 原来给的是 bias = -0.0016，结果亡者之岸——全作最平的一枚——整个顶面
    // 自遮挡成一片黑：掠射光打在近乎水平的面上，深度差本来就小于那个偏移量。
    // 越平的岛越容易翻车，而这张图上恰好有三枚是平的。
    key.shadow.bias = 0;
    key.shadow.normalBias = 0.035;
    frustum.updateProjectionMatrix();
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
    const geometry = new THREE.CircleGeometry(16, 64).rotateX(-Math.PI / 2);
    const colors: number[] = [];
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colour = new THREE.Color();
    for (let i = 0; i < position.count; i += 1) {
      const d = Math.hypot(position.getX(i), position.getZ(i)) / 16;
      colour.setHex(0x2a211b).multiplyScalar(1 - d * 0.75);
      colors.push(colour.r, colour.g, colour.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(geometry, this.surface);
    mesh.position.y = -PLINTH_WALL - 0.005;
    mesh.receiveShadow = true;
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
    // 贴着图版画，但抬到侧壁的一半高：压在图版上会被前排的章整条挡掉
    mesh.position.y = -PLINTH_WALL * 0.42;
    mesh.renderOrder = 1;
    return mesh;
  }

  private rebuildRoute(): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const gold = new THREE.Color(PIGMENT.duskGold);
    const groove = new THREE.Color(0x2b2119);
    const half = 0.042;

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
          const fade = Math.sin(t * Math.PI) * 0.45 + 0.55;
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
    for (const mesh of [reliefMesh, blankMesh]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // 章会被 group 抬起、呼吸，三方的包围球对不上就会整枚被剔除掉。
      // 八枚静态小网格，关掉视锥剔除比维护包围球划算得多。
      mesh.frustumCulled = false;
    }
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
      landmarks.castShadow = true;
      landmarks.receiveShadow = true;
      landmarks.frustumCulled = false;
      group.add(landmarks);
    }

    // 贴地的一层天候雾：这枚章自己的地平线色
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(relief.radius * 2.9, relief.radius * 2.9).rotateX(-Math.PI / 2),
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
    // 天候灯只负责**染色**，不负责塑形：它从正上方来，压过主光就会把
    // 形体重新照平。位置按这一幕太阳的方位角偏出去，让染色也有方向感。
    const light = new THREE.PointLight(island.weather.key, 0, 1.35, 2);
    light.position.set(Math.cos(island.weather.azimuth) * 0.34, 0.46, Math.sin(island.weather.azimuth) * 0.34);
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
        state === 'current' ? 0.95 * node.island.weather.intensity : state === 'done' ? 0.42 : 0;
      node.liftTarget = state === 'current' ? 0.085 : 0;
    }
    this.rebuildRoute();
    this.setFocus(this.currentAct);
  }

  /**
   * 注视点。
   *
   * **八枚章始终全部在画面里**——航程的意义在于一眼看见全程，
   * 只框住当前那一枚就退化成了一个"你在这里"的指示器。
   * 所以注视点是图版中心，只朝当前幕偏 22%：够让视线知道该看哪儿，
   * 又不至于把两头的章挤出画。
   */
  setFocus(index: number): void {
    // 注视点固定在图版中心。曾经让它朝当前幕偏 22%，结果是**镜头挪了、
    // 取景宽度没跟着变**，走到最后一幕时最左边那枚章被挤出画面。
    // 当前幕本来就靠抬起、点亮自己的天候、以及呼吸来指认，不必再动镜头。
    void index;
    const centre = IslandChart.BOUNDS;
    this.focusTarget.set(centre.x, 0, centre.z);
  }

  /**
   * 八枚章的包围盒中心与半幅。用来算机位——面板的宽高比从 21:9 到竖屏
   * 都可能，距离写死一定会切掉两头的章。
   */
  private static readonly BOUNDS = (() => {
    const xs = CHART.map((i) => i.slot.x);
    const zs = CHART.map((i) => i.slot.z);
    const pad = 0.86;
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      z: (Math.min(...zs) + Math.max(...zs)) / 2,
      halfW: (Math.max(...xs) - Math.min(...xs)) / 2 + pad,
      halfD: (Math.max(...zs) - Math.min(...zs)) / 2 + pad,
    };
  })();

  /** 俯瞰角。太高成平面图，看不见侧壁与浮雕的投影；太低后排被前排挡住。 */
  private static readonly PITCH = 0.72;

  /** 让八枚章全部入画所需的机距。resize() 时按当前宽高比重算。 */
  private dolly = 9.4;

  private frameAll(): void {
    const { halfW, halfD } = IslandChart.BOUNDS;
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    // 俯瞰时纵深会被压扁，按 sin(pitch) 折算它在画面竖直方向上占的高度。
    // 宽度还要再放 1.14：近的那一排离镜头更近，透视下比注视平面上大约一成，
    // 不算这一项时最外侧那枚章会正好压在画布边缘上。
    const needWidth = (halfW * 1.14) / Math.tan(hfov / 2);
    const needDepth = (halfD * Math.sin(IslandChart.PITCH) + 0.5) / Math.tan(vfov / 2);
    this.dolly = Math.max(needWidth, needDepth) * 1.04;
  }

  /**
   * 从外面点名某一枚章（名字列表停在某一行时用）。
   *
   * 和鼠标悬停走同一条抬起逻辑，所以列表与图上不会各抬各的。
   */
  setHighlight(index: number | null): void {
    const node = index === null ? null : (this.nodes[index] ?? null);
    this.setHovered(node && node.state !== 'locked' ? node : null);
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
    this.frameAll();
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
        node.light.intensity = 0.95 * node.island.weather.intensity * pulse;
      }
      if (node.smoke?.visible) this.driftSmoke(node, dt);
    }

    const pitch = IslandChart.PITCH;
    this.camera.position.set(
      this.focus.x + this.parallax.x,
      this.dolly * Math.sin(pitch) + this.parallax.y * 0.6,
      this.focus.z + this.dolly * Math.cos(pitch) - this.parallax.y * 0.9,
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

  /** 研究用：把表面切成线框，确认浮雕真的有起伏。 */
  debugWireframe(on: boolean): void {
    this.surface.wireframe = on;
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
