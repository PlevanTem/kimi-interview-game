import * as THREE from 'three';
import type { EnvPreset } from '../content/palette';
import { PIGMENT } from '../content/palette';
import { SHADOW_GLSL } from './shadow';
import { weatheringTexture, sandTexture, frescoTexture, fleeceTexture } from './textures';

/**
 * 壁画材质：全作唯一的表面着色模型。
 *
 * 它不是 PBR。光照被量化成三个色阶（亮面 / 中间调 / 影），影里带一层暖色反弹，
 * 逆光边缘补一道细窄的轮廓光——这正是古希腊湿壁画与黑绘陶器的读法：
 * 大块平涂 + 一条边线。所有雾也在这里计算，因为雾在本作里是关卡边界，
 * 必须和光照同权，而不是渲染完再糊一层。
 */

/** 所有材质共享的一组 uniform 对象（按引用共享，改一次全场生效）。 */
export const sharedUniforms = {
  uTime: { value: 0 },
  uCameraPos: { value: new THREE.Vector3() },

  uSunDir: { value: new THREE.Vector3(0.5, 0.3, 0.5).normalize() },
  uSunColor: { value: new THREE.Color(PIGMENT.duskGold) },
  uSunIntensity: { value: 1.3 },
  uSkyAmbient: { value: new THREE.Color(0x8fa6b4) },
  uGroundAmbient: { value: new THREE.Color(PIGMENT.terracotta) },
  uAmbientIntensity: { value: 0.55 },

  uFogColor: { value: new THREE.Color(0xd9b073) },
  uFogDensity: { value: 0.016 },
  uFogHeightFalloff: { value: 0.045 },
  uFogSunColor: { value: new THREE.Color(0xffd89a) },
  uFogSunAmount: { value: 0.75 },

  /** 太阳阴影：深度图、光空间矩阵、纹素大小、总强度 */
  uShadowMap: { value: null as THREE.Texture | null },
  uShadowMatrix: { value: new THREE.Matrix4() },
  uShadowTexel: { value: 1 / 2048 },
  uShadowStrength: { value: 0.85 },

  /** 幻象强度 0–1：世界褪成壁画三色 */
  uVision: { value: 0 },
  uVisionGround: { value: new THREE.Color(PIGMENT.plaster) },
  uVisionShadow: { value: new THREE.Color(PIGMENT.blackFigure) },
};

export type SharedUniforms = typeof sharedUniforms;

const VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  ${SHADOW_GLSL}

  uniform float uTime;
  uniform vec3 uCameraPos;

  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform vec3 uSkyAmbient;
  uniform vec3 uGroundAmbient;
  uniform float uAmbientIntensity;

  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uFogHeightFalloff;
  uniform vec3 uFogSunColor;
  uniform float uFogSunAmount;

  uniform float uVision;
  uniform vec3 uVisionGround;
  uniform vec3 uVisionShadow;

  uniform vec3 uColor;
  uniform vec3 uColorSteep;
  uniform vec3 uColorHigh;
  uniform float uSlopeBlend;
  uniform float uHeightStart;
  uniform float uHeightEnd;
  uniform vec3 uShadowTint;
  uniform vec3 uRimColor;
  uniform float uRimPower;
  uniform float uRimStrength;
  uniform float uDetailScale;
  uniform float uDetailStrength;
  uniform float uRoughBreakup;
  uniform float uOpacity;
  uniform sampler2D uDetail;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  // 三平面投影：程序化几何没有可靠的 UV，风化只能按世界坐标贴
  vec3 triplanar(sampler2D tex, vec3 p, vec3 n, float scale) {
    vec3 blend = pow(abs(n), vec3(4.0));
    blend /= max(blend.x + blend.y + blend.z, 1e-4);
    vec3 x = texture2D(tex, p.zy * scale).rgb;
    vec3 y = texture2D(tex, p.xz * scale).rgb;
    vec3 z = texture2D(tex, p.xy * scale).rgb;
    return x * blend.x + y * blend.y + z * blend.z;
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 toFrag = vWorldPos - uCameraPos;
    float dist = length(toFrag);
    vec3 V = toFrag / max(dist, 1e-4);

    // --- 反照率：底色 × 风化 ---
    float wear = triplanar(uDetail, vWorldPos, N, uDetailScale).r;
    wear = mix(1.0, wear, uDetailStrength);

    // 地形用得上：陡面换成岩色，高处换成第三种色。
    // 阈值故意做得很硬，沙与岩之间是一条画出来的线，不是渐变。
    vec3 baseColor = uColor;
    if (uSlopeBlend > 0.001) {
      float steep = 1.0 - smoothstep(0.62, 0.86, N.y);
      // 噪声扰动这条分界线，避免出现等高线一样的机械边缘
      float jitter = (triplanar(uDetail, vWorldPos, N, uDetailScale * 0.35).r - 0.5) * 0.35;
      steep = clamp(steep + jitter, 0.0, 1.0);
      baseColor = mix(baseColor, uColorSteep, steep * uSlopeBlend);
      float high = smoothstep(uHeightStart, uHeightEnd, vWorldPos.y + jitter * 2.0);
      baseColor = mix(baseColor, uColorHigh, high * uSlopeBlend);
    }
    vec3 albedo = baseColor * wear;

    // 朝上的面被日晒被雨冲，比侧面更白一点；这一条让断柱立刻有体积
    float upFace = smoothstep(0.2, 0.9, N.y);
    albedo = mix(albedo, albedo * 1.12 + 0.02, upFace * uRoughBreakup);

    // --- 三阶色带光照 ---
    float ndl = dot(N, uSunDir) * 0.5 + 0.5;
    float s1 = smoothstep(0.40, 0.48, ndl);
    float s2 = smoothstep(0.62, 0.70, ndl);
    float band = 0.18 + 0.37 * s1 + 0.45 * s2;

    // 影里不是纯黑，而是被地面反弹的暖赭色染过
    vec3 shaded = mix(albedo * uShadowTint, albedo, band);

    // 谁挡住了谁：低角度侧光下，断柱在沙上拖出的长影是这部作品的签名
    float shadow = sunShadow(vWorldPos, N, uSunDir);
    vec3 hemi = mix(uGroundAmbient, uSkyAmbient, N.y * 0.5 + 0.5) * uAmbientIntensity;
    vec3 color = shaded * (hemi + uSunColor * uSunIntensity * band * shadow);

    // --- 逆光轮廓：黑绘陶器的那一条边线 ---
    float fres = pow(1.0 - max(dot(N, -V), 0.0), uRimPower);
    float backlit = pow(max(dot(uSunDir, -V) * 0.5 + 0.5, 0.0), 2.0);
    color += uRimColor * fres * backlit * uRimStrength * mix(0.35, 1.0, shadow);

    // --- 高度雾 ---
    // 视线穿过的雾量按高度指数衰减做解析积分，避免爬坡时雾突然变薄
    float hCam = uCameraPos.y;
    float hFrag = vWorldPos.y;
    float dy = hFrag - hCam;
    float k = uFogHeightFalloff;
    float integral;
    if (abs(dy) < 1e-3) {
      integral = dist * exp(-k * max(hCam, 0.0));
    } else {
      integral = dist * (exp(-k * max(hCam, 0.0)) - exp(-k * max(hFrag, 0.0))) / (k * dy);
    }
    float fogAmount = 1.0 - exp(-uFogDensity * max(integral, 0.0));
    float sunGlow = pow(max(dot(V, uSunDir), 0.0), 5.0);
    vec3 fogCol = mix(uFogColor, uFogSunColor, uFogSunAmount * sunGlow);
    color = mix(color, fogCol, clamp(fogAmount, 0.0, 1.0));

    // --- 幻象：世界坍缩成壁画的底与影 ---
    // 关键：幻象里的明暗**不来自当前天候的曝光**，而是重新按法线与反照率算一遍。
    // 否则夜里的幻象会整幅漆黑，正午的幻象会整幅惨白——
    // 壁画不管画的是白天还是夜里，底永远是那块石灰。
    if (uVision > 0.001) {
      float albedoLum = dot(albedo, vec3(0.299, 0.587, 0.114));
      float fresco = band * shadow * 0.58 + clamp(albedoLum, 0.0, 1.0) * 0.3 + upFace * 0.12;
      vec3 ink = mix(uVisionShadow, uVisionGround, clamp(fresco, 0.0, 1.0));
      // 雾在幻象里也保留，但雾色换成石灰底，远处于是"化进纸里"
      ink = mix(ink, uVisionGround, clamp(fogAmount * 0.85, 0.0, 1.0));
      color = mix(color, ink, uVision);
    }

    gl_FragColor = vec4(color, uOpacity);
  }
`;

export interface FrescoOptions {
  color: number;
  /** 陡坡色（仅地形用） */
  colorSteep?: number;
  /** 高处色（仅地形用） */
  colorHigh?: number;
  /** 坡度/高度换色的总强度，0 表示只用单色 */
  slopeBlend?: number;
  /** 高处换色的起止高度 */
  heightStart?: number;
  heightEnd?: number;
  /** 影部染色，默认偏赭红的暖反弹 */
  shadowTint?: number;
  /** 轮廓光颜色，默认取天候的太阳色 */
  rimColor?: number;
  rimPower?: number;
  rimStrength?: number;
  /** 风化图的世界坐标缩放；数字越大纹理越细 */
  detailScale?: number;
  /** 风化强度 0–1 */
  detailStrength?: number;
  /** 朝上面的提亮量 0–1 */
  roughBreakup?: number;
  /** 使用哪张细节图 */
  detail?: 'stone' | 'sand' | 'fresco' | 'fleece';
  opacity?: number;
  transparent?: boolean;
  side?: THREE.Side;
}

/**
 * 活着的壁画材质。天候一改要挨个写进去，所以必须登记；
 * 也因此换幕销毁时必须**注销**，否则八幕走完会残留几十个已释放的材质，
 * applyEnvToMaterials 每次都在往死对象上写 uniform。
 */
const created = new Set<THREE.ShaderMaterial>();

function detailTexture(kind: FrescoOptions['detail']): THREE.Texture {
  if (kind === 'sand') return sandTexture();
  if (kind === 'fresco') return frescoTexture();
  if (kind === 'fleece') return fleeceTexture();
  return weatheringTexture();
}

/** 造一个壁画材质。所有共享 uniform 按引用挂进去，天候一改全场同步。 */
export function createFrescoMaterial(options: FrescoOptions): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: options.transparent ?? false,
    side: options.side ?? THREE.FrontSide,
    uniforms: {
      ...sharedUniforms,
      uColor: { value: new THREE.Color(options.color) },
      uColorSteep: { value: new THREE.Color(options.colorSteep ?? options.color) },
      uColorHigh: { value: new THREE.Color(options.colorHigh ?? options.color) },
      uSlopeBlend: { value: options.slopeBlend ?? 0 },
      uHeightStart: { value: options.heightStart ?? 4 },
      uHeightEnd: { value: options.heightEnd ?? 12 },
      uShadowTint: { value: new THREE.Color(options.shadowTint ?? 0x8c5a48) },
      uRimColor: { value: new THREE.Color(options.rimColor ?? PIGMENT.duskGold) },
      uRimPower: { value: options.rimPower ?? 3 },
      uRimStrength: { value: options.rimStrength ?? 0.55 },
      uDetailScale: { value: options.detailScale ?? 0.12 },
      uDetailStrength: { value: options.detailStrength ?? 0.85 },
      uRoughBreakup: { value: options.roughBreakup ?? 0.5 },
      uOpacity: { value: options.opacity ?? 1 },
      uDetail: { value: detailTexture(options.detail) },
    },
  });
  created.add(material);
  return material;
}

/** 销毁一个材质并把它从登记表里摘掉。换幕拆场景时用。 */
export function releaseFrescoMaterial(material: THREE.ShaderMaterial): void {
  created.delete(material);
  material.dispose();
}

/** 一幕开始时把天候写进共享 uniform。 */
export function applyEnvToMaterials(env: EnvPreset): void {
  const u = sharedUniforms;
  const ca = Math.cos(env.sunAzimuth);
  const sa = Math.sin(env.sunAzimuth);
  const ce = Math.cos(env.sunElevation);
  const se = Math.sin(env.sunElevation);
  u.uSunDir.value.set(ca * ce, se, sa * ce).normalize();
  u.uSunColor.value.setHex(env.sunColor);
  u.uSunIntensity.value = env.sunIntensity;
  u.uSkyAmbient.value.setHex(env.skyAmbient);
  u.uGroundAmbient.value.setHex(env.groundAmbient);
  u.uAmbientIntensity.value = env.ambientIntensity;
  u.uFogColor.value.setHex(env.fogColor);
  u.uFogDensity.value = env.fogDensity;
  u.uFogHeightFalloff.value = env.fogHeightFalloff;
  u.uFogSunColor.value.setHex(env.fogSunColor);
  u.uFogSunAmount.value = env.fogSunAmount;

  // 轮廓光跟着太阳走、影部染色跟着天候走，
  // 否则逆光边线会和天空脱节，暗部会永远是同一个暖赭色
  for (const material of created) {
    const rim = material.uniforms.uRimColor?.value as THREE.Color | undefined;
    if (rim) rim.setHex(env.sunColor);
    const shadow = material.uniforms.uShadowTint?.value as THREE.Color | undefined;
    if (shadow) shadow.setHex(env.shadowTint);
  }
}

/** 每帧更新时间与相机位置。 */
export function tickMaterials(time: number, cameraPosition: THREE.Vector3): void {
  sharedUniforms.uTime.value = time;
  sharedUniforms.uCameraPos.value.copy(cameraPosition);
}

/** 幻象强度 0–1。 */
export function setVisionAmount(amount: number): void {
  sharedUniforms.uVision.value = amount;
}

/** 常用材质预设，保证全作的表面语言只有这几种。 */
export const SURFACE = {
  limestone: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: PIGMENT.bone, detailScale: 0.14, roughBreakup: 0.6 }),
  weatheredMarble: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: 0xdfd3ba, detailScale: 0.09, detailStrength: 0.7, roughBreakup: 0.7 }),
  darkRock: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: 0x5b5148, shadowTint: 0x3a2f2a, detailScale: 0.1, roughBreakup: 0.35 }),
  basalt: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: 0x3c3a3c, shadowTint: 0x26262c, detailScale: 0.16, roughBreakup: 0.3 }),
  sand: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: PIGMENT.plaster, detail: 'sand', detailScale: 0.05, roughBreakup: 0.15 }),
  paintedPlaster: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: 0xd8c7a6, detail: 'fresco', detailScale: 0.06, detailStrength: 1, roughBreakup: 0.2 }),
  terracotta: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: 0x8f4732, detailScale: 0.2, roughBreakup: 0.4 }),
  driftwood: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: 0x6b5a49, shadowTint: 0x40342c, detailScale: 0.22, roughBreakup: 0.45 }),
  charredWood: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: 0x2e2620, shadowTint: 0x1a1512, detailScale: 0.24, roughBreakup: 0.25 }),
  bronze: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: PIGMENT.verdigris, shadowTint: 0x33463d, detailScale: 0.3, rimStrength: 0.9 }),
  bone: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: 0xe4dcc8, detailScale: 0.26, roughBreakup: 0.6 }),
  olive: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: 0x5f6b4e, shadowTint: 0x3a4232, detailScale: 0.35, roughBreakup: 0.3 }),
  cloth: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: 0xc9b291, shadowTint: 0x7d6a54, detailScale: 0.3, side: THREE.DoubleSide }),
  ash: (): THREE.ShaderMaterial =>
    createFrescoMaterial({ color: PIGMENT.ash, shadowTint: 0x6f7474, detailScale: 0.12, roughBreakup: 0.4 }),
  /**
   * 羊毛。detailScale 给得极大（贴图铺得极密），因为一撮毛只有二十几厘米，
   * 常规的 0.1 会让整撮毛落在纹理的一个像素上，等于没贴。
   */
  fleece: (): THREE.ShaderMaterial =>
    createFrescoMaterial({
      color: 0xdcd3c2,
      shadowTint: 0x8d8578,
      detail: 'fleece',
      detailScale: 3.2,
      detailStrength: 1,
      roughBreakup: 0.5,
    }),
} as const;

/** 销毁所有材质，页面卸载时调用。 */
export function disposeMaterials(): void {
  for (const material of created) material.dispose();
  created.clear();
}
