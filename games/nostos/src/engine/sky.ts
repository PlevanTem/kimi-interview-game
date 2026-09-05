import * as THREE from 'three';
import type { EnvPreset } from '../content/palette';
import { NOISE_GLSL } from './glsl';
import { sharedUniforms } from './materials';

/**
 * 天空穹顶。
 *
 * 云不是体积云，而是**被量化成两三档的平涂色块**——和地面的三阶色带是同一种读法，
 * 像瓶画上那一圈手绘的云带。风暴时云量逼近满、移动加快、缝隙里透出强逆光；
 * 永昼时几乎无云、天顶被压白。序章会点出星星。
 */

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    // 深度写在最远处，天空永远在所有东西后面
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  ${NOISE_GLSL}

  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uFogColor;
  uniform float uCloudiness;
  uniform float uCloudSpeed;
  uniform float uStarIntensity;
  uniform vec3 uGuideStarDir;
  uniform float uGuideStarIntensity;
  uniform float uSunIntensity;
  uniform float uVision;
  uniform vec3 uVisionGround;
  uniform vec3 uVisionShadow;

  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float up = clamp(dir.y, -1.0, 1.0);

    // --- 底色渐变：地平线暖、天顶冷 ---
    float t = pow(clamp(up, 0.0, 1.0), 0.55);
    vec3 color = mix(uHorizon, uZenith, t);

    // --- 星：先画，好让下面的雾把靠地平线的星压掉 ---
    if (uStarIntensity > 0.001) {
      vec2 sp = dir.xz / max(abs(dir.y) + 0.28, 0.01) * 130.0;
      vec2 cell = floor(sp);
      vec2 frac = fract(sp);
      float rnd = hash21(cell);
      // 每格里随机放一个点，按距离做尖锐衰减；否则整格会亮成一个方块
      vec2 star = vec2(hash21(cell + 3.7), hash21(cell + 11.3));
      float d = length(frac - star);
      float point = smoothstep(0.13, 0.0, d) * step(0.978, rnd);
      float twinkle = 0.55 + 0.45 * sin(uTime * 1.6 + rnd * 90.0);
      color += vec3(0.70, 0.78, 0.94) * point * twinkle * uStarIntensity * smoothstep(0.02, 0.4, up);
    }

    // 序章的唯一导星：一个稳定的暖白核心和克制的冷色光晕。
    if (uGuideStarIntensity > 0.001) {
      float gd = dot(dir, uGuideStarDir);
      float halo = pow(max(gd, 0.0), 18000.0);
      float core = smoothstep(0.999992, 0.999999, gd);
      color += vec3(0.68, 0.78, 1.0) * halo * 0.24 * uGuideStarIntensity;
      color += vec3(1.0, 0.94, 0.78) * core * 2.4 * uGuideStarIntensity;
    }

    // 地平线附近整体交给雾色：天与海必须在同一处收敛，否则会出现一道接缝
    float horizonFog = 1.0 - smoothstep(0.0, 0.26, up);
    color = mix(color, uFogColor, horizonFog * 0.92);
    float below = smoothstep(0.02, -0.06, up);
    color = mix(color, uFogColor, below);

    // --- 太阳与它的光晕 ---
    float sd = dot(dir, uSunDir);
    float glow = pow(max(sd, 0.0), 26.0);
    float wide = pow(max(sd, 0.0), 4.0);
    color += uSunColor * glow * 1.5 * uSunIntensity;
    color += uSunColor * wide * 0.22 * uSunIntensity;
    float disc = smoothstep(0.99955, 0.99985, sd);
    color = mix(color, uSunColor * (1.6 + uSunIntensity), disc * smoothstep(-0.05, 0.05, uSunDir.y));

    // --- 云带：平涂、量化、横向流动 ---
    if (uCloudiness > 0.01) {
      // 把方向投影到一个"天穹平面"，云带在头顶才展开，靠近地平线被压扁
      vec2 cp = dir.xz / max(up + 0.22, 0.06);
      cp *= 0.9;
      cp += vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.35);
      float n = fbm(cp * 0.85, 5);
      float shape = smoothstep(0.62 - uCloudiness * 0.42, 0.78 - uCloudiness * 0.30, n);

      // 两档：云体 + 亮边。不做柔和过渡，保持壁画的硬边
      float core = smoothstep(0.35, 0.55, shape);
      float edge = smoothstep(0.05, 0.35, shape) - core;

      vec3 cloudDark = mix(uZenith, uHorizon, 0.35) * 0.72;
      vec3 cloudLit = mix(uHorizon, uSunColor, 0.45);
      // 云缝里透出的逆光
      float rimLight = pow(max(sd, 0.0), 2.5);
      vec3 cloudColor = mix(cloudDark, cloudLit, clamp(rimLight + 0.18, 0.0, 1.0));

      float mask = (core + edge * 0.55) * smoothstep(-0.02, 0.16, up);
      color = mix(color, cloudColor, mask * clamp(uCloudiness * 1.15, 0.0, 1.0));
      color += cloudLit * edge * rimLight * 0.9 * uCloudiness;
    }

    // 幻象：天空整个变成石灰底，只在天顶留一点点更深的墨，
    // 好让剪影不至于浮在一片死白上
    if (uVision > 0.001) {
      vec3 paper = mix(uVisionGround, mix(uVisionGround, uVisionShadow, 0.28), clamp(up, 0.0, 1.0));
      color = mix(color, paper, uVision);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class Sky {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: sharedUniforms.uTime,
        uSunDir: sharedUniforms.uSunDir,
        uSunColor: sharedUniforms.uSunColor,
        uSunIntensity: sharedUniforms.uSunIntensity,
        uFogColor: sharedUniforms.uFogColor,
        uHorizon: { value: new THREE.Color(0xe0a94e) },
        uZenith: { value: new THREE.Color(0x35506b) },
        uCloudiness: { value: 0.35 },
        uCloudSpeed: { value: 0.012 },
        uStarIntensity: { value: 0 },
        uGuideStarDir: { value: new THREE.Vector3(0, 0.4, -1).normalize() },
        uGuideStarIntensity: { value: 0 },
        uVision: sharedUniforms.uVision,
        uVisionGround: sharedUniforms.uVisionGround,
        uVisionShadow: sharedUniforms.uVisionShadow,
      },
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), this.material);
    this.mesh.frustumCulled = false;
    // 天空最先画，其余一切覆盖在它上面
    this.mesh.renderOrder = -1000;
    this.mesh.scale.setScalar(900);
  }

  applyEnv(env: EnvPreset): void {
    const u = this.material.uniforms;
    (u.uHorizon!.value as THREE.Color).setHex(env.horizonColor);
    (u.uZenith!.value as THREE.Color).setHex(env.zenithColor);
    u.uCloudiness!.value = env.cloudiness;
    u.uCloudSpeed!.value = env.cloudSpeed;
    u.uStarIntensity!.value = env.starIntensity;
    const horizontal = Math.cos(env.guideStarElevation);
    (u.uGuideStarDir!.value as THREE.Vector3).set(
      Math.cos(env.guideStarAzimuth) * horizontal,
      Math.sin(env.guideStarElevation),
      Math.sin(env.guideStarAzimuth) * horizontal,
    );
    u.uGuideStarIntensity!.value = env.guideStarIntensity;
  }

  /** 天空跟着相机走，玩家永远走不到边。 */
  follow(cameraPosition: THREE.Vector3): void {
    this.mesh.position.copy(cameraPosition);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
