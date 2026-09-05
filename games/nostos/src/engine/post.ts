import * as THREE from 'three';
import type { EnvPreset } from '../content/palette';

/**
 * 后期链：把渲染结果变成一格胶片。
 *
 *   场景 → 高光提取 → 两次高斯 → 合成（光晕 / 曝光 / 胶片曲线 / 分级 /
 *   色差 / 暗角 / 颗粒 / 遮幅 / 转场）
 *
 * 这里的每一项都不是"加滤镜"，而是在补齐真实镜头的物理副作用：
 * halation 是胶片乳剂层背面的反射，颗粒是银盐颗粒，暗角是镜头边缘失光，
 * 色差是镜片对不同波长折射率不同。合起来才让程序化几何看着像被拍下来的。
 */

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform float uThreshold;
  uniform vec2 uTexel;
  varying vec2 vUv;

  void main() {
    // 四点盒式降采样，顺手把高光挑出来
    vec3 sum = vec3(0.0);
    sum += texture2D(tScene, vUv + vec2(-1.0, -1.0) * uTexel).rgb;
    sum += texture2D(tScene, vUv + vec2( 1.0, -1.0) * uTexel).rgb;
    sum += texture2D(tScene, vUv + vec2(-1.0,  1.0) * uTexel).rgb;
    sum += texture2D(tScene, vUv + vec2( 1.0,  1.0) * uTexel).rgb;
    vec3 c = sum * 0.25;
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float w = smoothstep(uThreshold, uThreshold + 0.6, lum);
    gl_FragColor = vec4(c * w, 1.0);
  }
`;

const BLUR_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tSource;
  uniform vec2 uDirection;
  varying vec2 vUv;

  void main() {
    // 9 抽头高斯
    float w[5];
    w[0] = 0.227027; w[1] = 0.194594; w[2] = 0.121621; w[3] = 0.054054; w[4] = 0.016216;
    vec3 sum = texture2D(tSource, vUv).rgb * w[0];
    for (int i = 1; i < 5; i++) {
      vec2 o = uDirection * float(i);
      sum += texture2D(tSource, vUv + o).rgb * w[i];
      sum += texture2D(tSource, vUv - o).rgb * w[i];
    }
    gl_FragColor = vec4(sum, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D tScene;
  uniform sampler2D tHalation;
  uniform vec2 uResolution;
  uniform float uTime;

  uniform float uExposure;
  uniform float uLift;
  uniform float uGamma;
  uniform float uGain;
  uniform float uSaturation;
  uniform float uHalation;
  uniform vec3 uHalationTint;
  uniform float uVignette;
  uniform float uGrain;
  uniform float uAberration;

  /** 目标画幅比；1.78 = 不加黑边，2.39 = 幻象 */
  uniform float uTargetAspect;
  uniform float uBarSoftness;

  /** 转场：向某个颜色整体推过去 */
  uniform vec3 uFadeColor;
  uniform float uFadeAmount;

  /** 幻象额外分级 */
  uniform float uVision;
  uniform vec3 uVisionPaper;
  uniform vec3 uVisionInk;

  varying vec2 vUv;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  // 简化的胶片曲线：肩部压高光，趾部抬起黑位，中间保线性
  vec3 filmic(vec3 x) {
    const float A = 2.51;
    const float B = 0.03;
    const float C = 2.43;
    const float D = 0.59;
    const float E = 0.14;
    return clamp((x * (A * x + B)) / (x * (C * x + D) + E), 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    float r2 = dot(centered, centered);

    // --- 色差：只在画面边缘发生，中心保持锐利 ---
    float ca = uAberration * r2;
    vec3 base;
    base.r = texture2D(tScene, uv + centered * ca).r;
    base.g = texture2D(tScene, uv).g;
    base.b = texture2D(tScene, uv - centered * ca).b;

    // --- 光晕：高光向外渗，带暖色 ---
    vec3 halo = texture2D(tHalation, uv).rgb;
    base += halo * uHalationTint * uHalation;

    // --- 曝光与胶片曲线 ---
    vec3 color = filmic(base * uExposure);

    // --- 分级：lift / gamma / gain ---
    color = color + uLift * (1.0 - color);
    color = pow(max(color, 0.0), vec3(1.0 / max(uGamma, 0.01)));
    color *= uGain;

    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(lum), color, uSaturation);

    // --- 幻象：整幅画坍缩成壁画的双色调 ---
    // 石灰底与黑绘墨之间做一次亮度映射，暗部必须真的暗下去，
    // 否则剪影会糊在背景里——黑绘陶器的力量全在这个对比上
    if (uVision > 0.001) {
      vec3 duo = mix(uVisionInk, uVisionPaper, smoothstep(0.02, 0.86, lum));
      color = mix(color, duo, uVision * 0.45);
    }

    // --- 暗角 ---
    float vig = 1.0 - uVignette * smoothstep(0.15, 0.75, r2);
    color *= vig;

    // --- 颗粒：中间调最重，纯黑与纯白处最轻，和真实银盐一致 ---
    float g = hash13(vec3(gl_FragCoord.xy, floor(uTime * 24.0)));
    float grainWeight = 1.0 - abs(lum * 2.0 - 1.0);
    color += (g - 0.5) * uGrain * (0.35 + grainWeight);

    // --- 转场 ---
    color = mix(color, uFadeColor, clamp(uFadeAmount, 0.0, 1.0));

    // --- 遮幅 ---
    float screenAspect = uResolution.x / uResolution.y;
    if (uTargetAspect > screenAspect + 0.001) {
      float visible = screenAspect / uTargetAspect;
      float halfVisible = visible * 0.5;
      float d = abs(uv.y - 0.5);
      float bar = smoothstep(halfVisible, halfVisible + uBarSoftness, d);
      color = mix(color, vec3(0.0), bar);
    }

    // 线性 → sRGB（渲染器的自动转换已关闭，这里是唯一的编码点）
    vec3 srgb = mix(color * 12.92, 1.055 * pow(max(color, 1e-5), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, color));
    gl_FragColor = vec4(srgb, 1.0);
  }
`;

function fullscreenMesh(material: THREE.ShaderMaterial): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  return mesh;
}

export class PostChain {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  private sceneTarget: THREE.WebGLRenderTarget;
  private blurA: THREE.WebGLRenderTarget;
  private blurB: THREE.WebGLRenderTarget;

  private readonly brightMaterial: THREE.ShaderMaterial;
  private readonly blurMaterial: THREE.ShaderMaterial;
  private readonly compositeMaterial: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;

  private width = 1;
  private height = 1;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;

    const targetOptions: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    };
    this.sceneTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
    this.blurA = new THREE.WebGLRenderTarget(1, 1, { ...targetOptions, depthBuffer: false });
    this.blurB = new THREE.WebGLRenderTarget(1, 1, { ...targetOptions, depthBuffer: false });

    this.brightMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BRIGHT_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: null },
        uThreshold: { value: 0.72 },
        uTexel: { value: new THREE.Vector2() },
      },
    });

    this.blurMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLUR_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tSource: { value: null },
        uDirection: { value: new THREE.Vector2() },
      },
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: null },
        tHalation: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uExposure: { value: 1.05 },
        uLift: { value: 0.03 },
        uGamma: { value: 1 },
        uGain: { value: 1.02 },
        uSaturation: { value: 0.92 },
        uHalation: { value: 0.5 },
        uHalationTint: { value: new THREE.Color(0xffc98a) },
        uVignette: { value: 0.42 },
        uGrain: { value: 0.055 },
        uAberration: { value: 0.0016 },
        uTargetAspect: { value: 0 },
        uBarSoftness: { value: 0.004 },
        uFadeColor: { value: new THREE.Color(0x000000) },
        uFadeAmount: { value: 0 },
        uVision: { value: 0 },
        uVisionPaper: { value: new THREE.Color(0xcbb89a) },
        uVisionInk: { value: new THREE.Color(0x140f0c) },
      },
    });

    this.quad = fullscreenMesh(this.compositeMaterial);
    this.quadScene.add(this.quad);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.width = Math.max(1, Math.floor(width * pixelRatio));
    this.height = Math.max(1, Math.floor(height * pixelRatio));
    this.sceneTarget.setSize(this.width, this.height);
    const bw = Math.max(1, Math.floor(this.width / 4));
    const bh = Math.max(1, Math.floor(this.height / 4));
    this.blurA.setSize(bw, bh);
    this.blurB.setSize(bw, bh);
    (this.compositeMaterial.uniforms.uResolution!.value as THREE.Vector2).set(this.width, this.height);
    (this.brightMaterial.uniforms.uTexel!.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
  }

  applyEnv(env: EnvPreset): void {
    const u = this.compositeMaterial.uniforms;
    u.uExposure!.value = env.exposure;
    u.uLift!.value = env.lift;
    u.uGamma!.value = env.gamma;
    u.uGain!.value = env.gain;
    u.uSaturation!.value = env.saturation;
    u.uHalation!.value = env.halation;
    (u.uHalationTint!.value as THREE.Color).setHex(env.halationTint);
    u.uVignette!.value = env.vignette;
    u.uGrain!.value = env.grain;
  }

  /** 幻象强度：额外压向石灰底，并把遮幅从 2.00 收到 2.39。 */
  setVision(amount: number, aspectFrom: number, aspectTo: number, paper: number): void {
    const u = this.compositeMaterial.uniforms;
    u.uVision!.value = amount;
    (u.uVisionPaper!.value as THREE.Color).setHex(paper);
    // 无幻象时不加黑边（用一个小于任何屏幕比的值关掉遮幅）
    u.uTargetAspect!.value = amount < 0.001 ? 0 : aspectFrom + (aspectTo - aspectFrom) * amount;
  }

  /** 转场：向指定颜色推。白光过曝用于登岛/离岛的硬切。 */
  setFade(color: number, amount: number): void {
    (this.compositeMaterial.uniforms.uFadeColor!.value as THREE.Color).setHex(color);
    this.compositeMaterial.uniforms.uFadeAmount!.value = amount;
  }

  /** 覆盖当前曝光（幻象中会临时提亮/压暗）。 */
  setExposureScale(scale: number, env: EnvPreset): void {
    this.compositeMaterial.uniforms.uExposure!.value = env.exposure * scale;
  }

  render(scene: THREE.Scene, camera: THREE.Camera, time: number): void {
    const renderer = this.renderer;
    this.compositeMaterial.uniforms.uTime!.value = time;

    // 1) 场景
    renderer.setRenderTarget(this.sceneTarget);
    renderer.clear();
    renderer.render(scene, camera);

    // 2) 高光提取 + 降采样
    this.quad.material = this.brightMaterial;
    this.brightMaterial.uniforms.tScene!.value = this.sceneTarget.texture;
    renderer.setRenderTarget(this.blurA);
    renderer.render(this.quadScene, this.quadCamera);

    // 3) 两次一维高斯
    this.quad.material = this.blurMaterial;
    const bw = this.blurA.width;
    const bh = this.blurA.height;
    this.blurMaterial.uniforms.tSource!.value = this.blurA.texture;
    (this.blurMaterial.uniforms.uDirection!.value as THREE.Vector2).set(1.4 / bw, 0);
    renderer.setRenderTarget(this.blurB);
    renderer.render(this.quadScene, this.quadCamera);

    this.blurMaterial.uniforms.tSource!.value = this.blurB.texture;
    (this.blurMaterial.uniforms.uDirection!.value as THREE.Vector2).set(0, 1.4 / bh);
    renderer.setRenderTarget(this.blurA);
    renderer.render(this.quadScene, this.quadCamera);

    // 4) 合成到屏幕
    this.quad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.tScene!.value = this.sceneTarget.texture;
    this.compositeMaterial.uniforms.tHalation!.value = this.blurA.texture;
    renderer.setRenderTarget(null);
    renderer.render(this.quadScene, this.quadCamera);
  }

  dispose(): void {
    this.sceneTarget.dispose();
    this.blurA.dispose();
    this.blurB.dispose();
    this.brightMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.quad.geometry.dispose();
  }
}
