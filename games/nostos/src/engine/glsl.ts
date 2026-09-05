/**
 * 共享的着色器片段。
 *
 * 雾在本作里同时是关卡边界、景深与情绪，天空、海面与所有实体表面
 * 必须用**完全相同**的一段积分公式，否则地平线上会出现一道接缝。
 */

/** 雾所需的 uniform 声明，与 materials.ts 的 sharedUniforms 一一对应。 */
export const FOG_UNIFORMS_GLSL = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uFogHeightFalloff;
  uniform vec3 uFogSunColor;
  uniform float uFogSunAmount;
`;

/**
 * 高度雾：沿视线对指数高度分布做解析积分。
 * 直接按距离算的雾在爬坡时会突然变薄，这里保证上下坡雾量连续。
 *
 * @param worldPos  片元世界坐标
 * @param cameraPos 相机世界坐标
 * @param viewDir   相机指向片元的单位向量
 * @param sunDir    太阳方向
 */
export const FOG_GLSL = /* glsl */ `
  float fogIntegral(vec3 worldPos, vec3 cameraPos, float dist, float k) {
    float hCam = max(cameraPos.y, 0.0);
    float hFrag = max(worldPos.y, 0.0);
    float dy = hFrag - hCam;
    if (abs(dy) < 1e-3) {
      return dist * exp(-k * hCam);
    }
    return dist * (exp(-k * hCam) - exp(-k * hFrag)) / (k * dy);
  }

  vec3 applyFog(vec3 color, vec3 worldPos, vec3 cameraPos, vec3 viewDir, vec3 sunDir) {
    float dist = length(worldPos - cameraPos);
    float integral = fogIntegral(worldPos, cameraPos, dist, uFogHeightFalloff);
    float amount = 1.0 - exp(-uFogDensity * max(integral, 0.0));
    float sunGlow = pow(max(dot(viewDir, sunDir), 0.0), 5.0);
    vec3 fogCol = mix(uFogColor, uFogSunColor, uFogSunAmount * sunGlow);
    return mix(color, fogCol, clamp(amount, 0.0, 1.0));
  }
`;

/** 二维值噪声与 fbm，与 CPU 侧 noise.ts 是同一套形状语言。 */
export const NOISE_GLSL = /* glsl */ `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p, int octaves) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 8; i++) {
      if (i >= octaves) break;
      sum += valueNoise(p) * amp;
      p *= 2.02;
      amp *= 0.5;
    }
    return sum;
  }
`;

/**
 * 色阶量化：把连续的明暗压成三档。
 * 这是全作最重要的一行代码——它把三维几何读成壁画。
 */
export const BANDS_GLSL = /* glsl */ `
  float bandLighting(float ndl) {
    float t = ndl * 0.5 + 0.5;
    float s1 = smoothstep(0.40, 0.48, t);
    float s2 = smoothstep(0.62, 0.70, t);
    return 0.30 + 0.34 * s1 + 0.36 * s2;
  }
`;
