import * as THREE from 'three';
import type { EnvPreset } from '../content/palette';
import { FOG_GLSL, FOG_UNIFORMS_GLSL, NOISE_GLSL } from './glsl';
import { sharedUniforms } from './materials';

/**
 * 海。
 *
 * 每一幕都从海开始、也从海结束，所以它必须是全作最讲究的一个面：
 * - 四道 Gerstner 波叠出方向性，风暴时抬高、拉陡；
 * - 水色只有深、浅两档，靠菲涅尔硬切换，仍然是壁画读法；
 * - 太阳方向上有一条**碎金光路**，用噪声打散成硬边亮点，而不是柔和高光；
 * - 岸线处有一圈随浪呼吸的白沫；
 * - 远处用与天空完全相同的雾公式融进地平线，看不到接缝。
 */

const VERT = /* glsl */ `
  ${NOISE_GLSL}

  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uWaveChop;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vCrest;

  // 单道 Gerstner 波：返回位移，同时累加陡度用于泡沫
  vec3 gerstner(vec2 p, vec2 dir, float steepness, float wavelength, float speed, inout float crest) {
    float k = 6.28318 / wavelength;
    float c = sqrt(9.8 / k) * speed;
    vec2 d = normalize(dir);
    float f = k * (dot(d, p) - c * uTime);
    float a = steepness / k;
    crest += cos(f) * steepness;
    return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
  }

  vec3 waveOffset(vec2 p, out float crest) {
    crest = 0.0;
    vec3 o = vec3(0.0);
    o += gerstner(p, vec2(1.0, 0.35), 0.22 * uWaveChop, 26.0, 1.0, crest);
    o += gerstner(p, vec2(-0.6, 1.0), 0.16 * uWaveChop, 14.0, 1.15, crest);
    o += gerstner(p, vec2(0.8, -0.7), 0.10 * uWaveChop, 7.5, 1.3, crest);
    o += gerstner(p, vec2(-0.2, -1.0), 0.06 * uWaveChop, 3.6, 1.55, crest);
    o.y *= uWaveHeight * 3.0;
    o.xz *= uWaveHeight * 1.6;
    return o;
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 p = world.xz;

    float crest;
    vec3 offset = waveOffset(p, crest);
    world.xyz += offset;

    // 有限差分求法线，比解析导数短且足够稳
    float c1;
    float c2;
    vec3 ox = waveOffset(p + vec2(0.6, 0.0), c1);
    vec3 oz = waveOffset(p + vec2(0.0, 0.6), c2);
    vec3 tx = normalize(vec3(0.6, 0.0, 0.0) + ox - offset);
    vec3 tz = normalize(vec3(0.0, 0.0, 0.6) + oz - offset);
    vNormal = normalize(cross(tz, tx));

    vCrest = crest;
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  ${NOISE_GLSL}
  ${FOG_UNIFORMS_GLSL}
  ${FOG_GLSL}

  uniform float uTime;
  uniform vec3 uCameraPos;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform vec3 uSkyAmbient;

  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform vec2 uShoreCenter;
  uniform float uShoreRadius;
  uniform float uShoreWidth;

  uniform float uVision;
  uniform vec3 uVisionGround;
  uniform vec3 uVisionShadow;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vCrest;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 toFrag = vWorldPos - uCameraPos;
    float dist = length(toFrag);
    vec3 V = toFrag / max(dist, 1e-4);

    // --- 深浅两档，硬切换 ---
    float facing = 1.0 - abs(dot(N, -V));
    float fres = pow(clamp(facing, 0.0, 1.0), 2.2);
    float step1 = smoothstep(0.30, 0.52, fres);
    vec3 color = mix(uDeep, uShallow, step1);
    color += uSkyAmbient * fres * 0.22;

    // --- 碎金光路：噪声打散的硬边高光。太阳落到地平线以下就整条熄灭 ---
    float sunUp = smoothstep(-0.03, 0.10, uSunDir.y);
    vec3 H = normalize(uSunDir - V);
    float spec = pow(max(dot(N, H), 0.0), 90.0);
    float sparkleField = valueNoise(vWorldPos.xz * 5.5 + vec2(uTime * 0.6, uTime * 0.25));
    float sparkle = smoothstep(0.66, 0.82, sparkleField) * smoothstep(0.015, 0.09, spec);
    float pathMask = pow(max(dot(normalize(vec3(V.x, 0.0, V.z) + 1e-5), normalize(vec3(uSunDir.x, 0.0, uSunDir.z) + 1e-5)), 0.0), 4.0);
    color += uSunColor * uSunIntensity * sunUp * (spec * 0.55 + sparkle * 0.75 * pathMask);

    // --- 浪尖白沫：只在陡度过阈值时出现，硬边 ---
    float crestFoam = smoothstep(0.34, 0.52, vCrest);
    float foamNoise = valueNoise(vWorldPos.xz * 1.8 + uTime * 0.35);
    crestFoam *= step(0.42, foamNoise);

    // --- 岸线白沫：随时间呼吸的一圈。细碎、断续，不是一条连续的白带 ---
    float shoreDist = length(vWorldPos.xz - uShoreCenter);
    float wobble = (valueNoise(vWorldPos.xz * 0.18) - 0.5) * 5.0;
    float breath = sin(uTime * 0.55) * 1.1;
    float band = abs(shoreDist - (uShoreRadius + wobble + breath));
    float shoreFoam = 1.0 - smoothstep(0.0, uShoreWidth, band);
    shoreFoam *= smoothstep(0.42, 0.72, valueNoise(vWorldPos.xz * 6.5 + uTime * 0.25));

    float foam = clamp(max(crestFoam, shoreFoam * 0.75), 0.0, 1.0);
    color = mix(color, uFoam, foam);

    color = applyFog(color, vWorldPos, uCameraPos, V, uSunDir);

    // 幻象里的海也重新画一遍：浪谷是墨，浪面是底，白沫是纯石灰
    if (uVision > 0.001) {
      float fresco = 0.30 + step1 * 0.34 + foam * 0.5;
      vec3 ink = mix(uVisionShadow, uVisionGround, clamp(fresco, 0.0, 1.0));
      float d2 = length(vWorldPos - uCameraPos);
      float fogAmt = 1.0 - exp(-uFogDensity * fogIntegral(vWorldPos, uCameraPos, d2, uFogHeightFalloff));
      ink = mix(ink, uVisionGround, clamp(fogAmt * 0.85, 0.0, 1.0));
      color = mix(color, ink, uVision);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class Sea {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    // 大而分段适中：远处交给雾，不需要几何细节
    const geometry = new THREE.PlaneGeometry(2600, 2600, 200, 200);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: sharedUniforms.uTime,
        uCameraPos: sharedUniforms.uCameraPos,
        uSunDir: sharedUniforms.uSunDir,
        uSunColor: sharedUniforms.uSunColor,
        uSunIntensity: sharedUniforms.uSunIntensity,
        uSkyAmbient: sharedUniforms.uSkyAmbient,
        uFogColor: sharedUniforms.uFogColor,
        uFogDensity: sharedUniforms.uFogDensity,
        uFogHeightFalloff: sharedUniforms.uFogHeightFalloff,
        uFogSunColor: sharedUniforms.uFogSunColor,
        uFogSunAmount: sharedUniforms.uFogSunAmount,
        uVision: sharedUniforms.uVision,
        uVisionGround: sharedUniforms.uVisionGround,
        uVisionShadow: sharedUniforms.uVisionShadow,
        uShallow: { value: new THREE.Color(0x2a4a55) },
        uDeep: { value: new THREE.Color(0x14262e) },
        uFoam: { value: new THREE.Color(0xe7d9be) },
        uWaveHeight: { value: 0.32 },
        uWaveChop: { value: 1 },
        uShoreCenter: { value: new THREE.Vector2(0, 0) },
        uShoreRadius: { value: 40 },
        uShoreWidth: { value: 2.6 },
      },
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -500;
  }

  applyEnv(env: EnvPreset): void {
    const u = this.material.uniforms;
    (u.uShallow!.value as THREE.Color).setHex(env.seaShallow);
    (u.uDeep!.value as THREE.Color).setHex(env.seaDeep);
    (u.uFoam!.value as THREE.Color).setHex(env.seaFoam);
    u.uWaveHeight!.value = env.waveHeight;
    u.uWaveChop!.value = env.waveChop;
  }

  /** 告诉海面这一幕的岸线在哪，白沫才会围着岛走。 */
  setShore(center: THREE.Vector2, radius: number, width = 2.6): void {
    (this.material.uniforms.uShoreCenter!.value as THREE.Vector2).copy(center);
    this.material.uniforms.uShoreRadius!.value = radius;
    this.material.uniforms.uShoreWidth!.value = width;
  }

  /** 海面跟着相机在水平面上平移，边界永远在雾里。 */
  follow(cameraPosition: THREE.Vector3, waterLevel: number): void {
    this.mesh.position.set(cameraPosition.x, waterLevel, cameraPosition.z);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
