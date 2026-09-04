import * as THREE from 'three';
import { NO_SHADOW_LAYER } from '../engine/shadow';
import type { Terrain } from './terrain';

/**
 * 引路的微光。
 *
 * 本作原本一个指引都没有——没有箭头、没有小地图、没有目标标记，
 * 全靠地形与地标带路。实际玩下来，在雾里来回找最后一件没看过的东西
 * 会把"漫游"变成"翻找"，那是另一种体验，也不是这部作品想给的。
 *
 * 所以补一个**玩家自己呼唤**的指引：按下之后，一串光尘从脚边亮起，
 * 顺着地面流向下一处该去的地方，几秒之后自己熄灭。
 *
 * 三条纪律让它不至于毁掉气氛：
 * 1. **只在被呼唤时出现**，绝不常驻——不呼唤的人得到的仍是原本那部作品；
 * 2. 它是**世界里的一串光**，不是屏幕上的一个箭头，所以仍然受景深与遮挡影响；
 * 3. 它流动、呼吸、然后熄灭，像有人举着灯在前面走，而不是像导航。
 *
 * 光点浮在齐眼的高度而不是贴着地：贴地的一串灯会被中间的沙丘整段吞掉，
 * 而这个功能恰恰是在"翻过丘看不见东西"的时候才被按下的。浮起来之后，
 * 它也更像这座岛上本来就有的东西——被风吹着走的一串磷火。
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  uniform float uSize;
  void main() {
    vUv = uv;
    // 公告板：保留位置，丢掉旋转，永远正对相机
    vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    gl_Position = projectionMatrix * (center + vec4(position.x * uSize, position.y * uSize, 0.0, 0.0));
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uTime;
  /** 这一点在整条路径上的位置 0–1 */
  uniform float uPhase;
  /** 整条路径的总体明灭，用于淡入与熄灭 */
  uniform float uFade;
  varying vec2 vUv;

  void main() {
    float d = length(vUv - 0.5);
    float disc = smoothstep(0.5, 0.03, d);
    // 一道沿路径向前跑的亮波：靠近波峰的点更亮，于是整条路"流"起来
    float travel = fract(uTime * 0.42 - uPhase);
    float pulse = pow(1.0 - abs(travel * 2.0 - 1.0), 3.0);
    float glow = 0.32 + pulse * 0.95;
    float a = disc * glow * uFade;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * glow, a);
  }
`;

/** 一条引路光的持续时间（秒）。够走一段，不够当导航用。 */
export const GUIDE_SECONDS = 9;

/**
 * 从脚下到目标铺一串浮空的光点。
 *
 * 不做寻路：岛很小，障碍是稀疏的柱子与石头。但也不是一条直线——
 * 直线会让光尘直接出现在画面之外（目标常常在侧后方），玩家按了键却什么也没看见。
 *
 * 所以走一条二次贝塞尔：起点在脚下，**控制点放在玩家正前方**，终点是目标。
 * 于是这串光总是先从你正看着的地方浮起来，再拐向该去的方向——
 * 像有人先在你面前点亮一盏灯，然后举着它往那边走。
 */
export function guidePath(
  terrain: Terrain,
  from: { x: number; z: number },
  yaw: number,
  to: { x: number; z: number },
  count = 16,
): THREE.Vector3[] {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  if (distance < 1.5) return [];

  // yaw = 0 时朝 -Z，与控制器一致
  const reach = Math.min(Math.max(distance * 0.42, 3), 9);
  const controlX = from.x - Math.sin(yaw) * reach;
  const controlZ = from.z - Math.cos(yaw) * reach;

  const points: THREE.Vector3[] = [];
  for (let i = 0; i < count; i += 1) {
    // 起点稍微离开脚跟，终点停在目标前面一点，别糊住它
    const t = 0.16 + (i / (count - 1)) * 0.78;
    const inv = 1 - t;
    const x = inv * inv * from.x + 2 * inv * t * controlX + t * t * to.x;
    const z = inv * inv * from.z + 2 * inv * t * controlZ + t * t * to.z;
    // 齐眼高度，中段再抬一点：翻过中间的沙丘也还看得见
    const lift = 1.25 + Math.sin(t * Math.PI) * 0.75;
    points.push(new THREE.Vector3(x, terrain.heightAt(x, z) + lift, z));
  }
  return points;
}

export class GuideLight {
  private readonly meshes: THREE.Mesh[] = [];
  private readonly materials: THREE.ShaderMaterial[] = [];
  /** 每个光点的基准高度，浮动是在它上面加的 */
  private readonly baseY: number[] = [];
  private readonly geometry = new THREE.PlaneGeometry(1, 1);
  private life = 0;

  constructor(private readonly scene: THREE.Scene) {}

  get active(): boolean {
    return this.meshes.length > 0;
  }

  /** 点亮一条通向目标的光路。会替换掉上一条。 */
  show(points: THREE.Vector3[], color = 0xffd9a0): void {
    this.clear();
    if (points.length === 0) return;
    this.life = 0;

    points.forEach((point, index) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uTime: { value: 0 },
          uPhase: { value: index / points.length },
          uFade: { value: 0 },
          // 越远的光点画得越大一点，透视缩小之后看着才是一串同样的灯
          // 偏移是在视图空间做的，透视缩小自动发生——这里给的是真实世界尺寸
          uSize: { value: 0.3 },
        },
      });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.position.copy(point);
      mesh.frustumCulled = false;
      mesh.renderOrder = 15;
      mesh.layers.set(NO_SHADOW_LAYER);
      this.scene.add(mesh);
      this.meshes.push(mesh);
      this.materials.push(material);
      this.baseY.push(point.y);
    });
  }

  update(dt: number, elapsed: number): void {
    if (this.meshes.length === 0) return;
    this.life += dt;
    // 半秒淡入，最后一秒半熄灭
    const fadeIn = Math.min(1, this.life / 0.5);
    const fadeOut = Math.min(1, Math.max(0, GUIDE_SECONDS - this.life) / 1.5);
    const fade = Math.min(fadeIn, fadeOut);
    this.materials.forEach((material, index) => {
      material.uniforms.uTime!.value = elapsed;
      material.uniforms.uFade!.value = fade;
      // 每一点各自慢慢上下浮，整串光于是像活的，不像一排路灯
      const mesh = this.meshes[index];
      if (mesh) mesh.position.y = (this.baseY[index] ?? 0) + Math.sin(elapsed * 1.1 + index * 0.7) * 0.16;
    });
    if (this.life >= GUIDE_SECONDS) this.clear();
  }

  clear(): void {
    for (const mesh of this.meshes) this.scene.remove(mesh);
    for (const material of this.materials) material.dispose();
    this.meshes.length = 0;
    this.materials.length = 0;
    this.baseY.length = 0;
    this.life = 0;
  }

  dispose(): void {
    this.clear();
    this.geometry.dispose();
  }
}
