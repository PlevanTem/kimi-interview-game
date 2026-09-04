import * as THREE from 'three';

/**
 * 太阳阴影。
 *
 * 三阶色带光照只解决了"哪一面朝着太阳"，解决不了"谁挡住了谁"。
 * 而这部作品几乎每一幕都是低角度侧光——断柱在沙上拖出的那道长影，
 * 才是它像一张剧照而不是一张示意图的原因。
 *
 * 这里用一张正交深度图：把太阳当成无限远的平行光，沿光轴把整座岛拍一遍，
 * 壁画材质在着色时回查这张图，被挡住的地方只留环境光。
 *
 * 天空、海面、剪影与微光不参与投影（它们在 layer 1），
 * 因为它们要么是无限远的背景，要么是本来就不该有影子的"画"。
 */

/** 不投影的东西放这一层。 */
export const NO_SHADOW_LAYER = 1;

const SIZE = 2048;

export class ShadowMap {
  readonly target: THREE.WebGLRenderTarget;
  readonly matrix = new THREE.Matrix4();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.5, 400);
  private readonly depthMaterial: THREE.MeshDepthMaterial;
  private readonly center = new THREE.Vector3();

  constructor() {
    this.target = new THREE.WebGLRenderTarget(SIZE, SIZE, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    // RGBA 打包的深度比 DepthTexture 兼容性好，而且解包只多两行
    this.depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    this.camera.layers.set(0);
  }

  get texel(): number {
    return 1 / SIZE;
  }

  /**
   * 把光锥对准这一幕。radius 是要覆盖的水平半径，
   * 一幕一座小岛，所以一张 2048 的图足够细。
   */
  configure(sunDir: THREE.Vector3, radius: number, centerY = 2): void {
    this.center.set(0, centerY, 0);
    const distance = radius * 2.2 + 40;
    this.camera.position.copy(this.center).addScaledVector(sunDir, distance);
    this.camera.lookAt(this.center);
    const extent = radius * 1.18;
    this.camera.left = -extent;
    this.camera.right = extent;
    this.camera.top = extent;
    this.camera.bottom = -extent;
    this.camera.near = 1;
    this.camera.far = distance * 2;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);

    this.matrix
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(this.camera.projectionMatrix)
      .multiply(this.camera.matrixWorldInverse);
  }

  /** 渲染一次深度。地形与构件是静态的，所以每幕只需要渲染一次。 */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const previousOverride = scene.overrideMaterial;
    const previousTarget = renderer.getRenderTarget();
    scene.overrideMaterial = this.depthMaterial;
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(scene, this.camera);
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(0x000000, 1);
    scene.overrideMaterial = previousOverride;
  }

  dispose(): void {
    this.target.dispose();
    this.depthMaterial.dispose();
  }
}

/** 壁画材质里查这张图用的一段 GLSL。 */
export const SHADOW_GLSL = /* glsl */ `
  uniform sampler2D uShadowMap;
  uniform mat4 uShadowMatrix;
  uniform float uShadowTexel;
  uniform float uShadowStrength;

  float unpackDepth(vec4 rgba) {
    return dot(rgba, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
  }

  /**
   * 3×3 PCF。沿法线做偏移而不是沿光线，斜面上的自阴影条纹会少很多。
   */
  float sunShadow(vec3 worldPos, vec3 normal, vec3 sunDir) {
    if (uShadowStrength < 0.001) return 1.0;
    float ndl = dot(normal, sunDir);
    // 背光面本来就在最暗那一档，再查一次阴影只会查出满屏的自阴影条纹
    if (ndl <= 0.06) return 1.0;

    // 全作大量使用接近地平线的侧光，掠射角下必须给足法线偏移与斜率偏置
    float slope = clamp(1.0 - ndl, 0.0, 1.0);
    vec3 offset = normal * (0.18 + slope * slope * 2.6);
    vec4 coord = uShadowMatrix * vec4(worldPos + offset, 1.0);
    vec3 p = coord.xyz / coord.w;
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;

    float bias = 0.0012 + slope * slope * 0.016;
    float sum = 0.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 uv = p.xy + vec2(float(x), float(y)) * uShadowTexel * 1.4;
        float depth = unpackDepth(texture2D(uShadowMap, uv));
        sum += step(p.z - bias, depth);
      }
    }
    float lit = sum / 9.0;
    // 掠射角处让阴影自己淡出，避免地平线方向出现一整片假影
    return mix(1.0, lit, uShadowStrength * smoothstep(0.06, 0.28, ndl));
  }
`;
