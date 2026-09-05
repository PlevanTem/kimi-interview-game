import * as THREE from 'three';

/**
 * 可触碰之物的微光。
 *
 * 不用描边、不用图标、不用小地图。每一件可以触碰的东西上方浮着一点
 * 极淡的光尘——像黄昏里被侧光打亮的一粒灰。看向它时它稍微亮一点，
 * 触碰过之后它就熄灭，永远不再亮起。
 *
 * 这是全作唯一的"UI 提示"，而且它长在世界里，不长在屏幕上。
 */

let sharedTexture: THREE.Texture | null = null;

function glintTexture(): THREE.Texture {
  if (sharedTexture) return sharedTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas context unavailable');
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  sharedTexture = new THREE.CanvasTexture(canvas);
  sharedTexture.colorSpace = THREE.NoColorSpace;
  return sharedTexture;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  uniform float uSize;
  void main() {
    vUv = uv;
    vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    gl_Position = projectionMatrix * (center + vec4(position.x * uSize, position.y * uSize, 0.0, 0.0));
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float a = texture2D(uMap, vUv).a;
    gl_FragColor = vec4(uColor * uIntensity, a * uIntensity);
  }
`;

export class Glint {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private phase = Math.random() * Math.PI * 2;
  private focus = 0;
  private extinguished = false;

  constructor(color: number, size = 0.5) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uMap: { value: glintTexture() },
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: 0 },
        uSize: { value: size },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.mesh.renderOrder = 20;
    this.mesh.frustumCulled = false;
  }

  /** 熄灭：这件东西已经被看过了。 */
  extinguish(): void {
    this.extinguished = true;
  }

  get isExtinguished(): boolean {
    return this.extinguished;
  }

  /** focused：玩家此刻正看着它。 */
  update(dt: number, elapsed: number, focused: boolean): void {
    this.focus += ((focused ? 1 : 0) - this.focus) * Math.min(1, dt * 7);
    if (this.extinguished) {
      const current = this.material.uniforms.uIntensity!.value as number;
      this.material.uniforms.uIntensity!.value = Math.max(0, current - dt * 1.6);
      if (this.material.uniforms.uIntensity!.value < 0.001) this.mesh.visible = false;
      return;
    }
    // 极慢的呼吸，靠得越近越明显
    const breath = 0.5 + 0.5 * Math.sin(elapsed * 0.9 + this.phase);
    this.material.uniforms.uIntensity!.value = 0.07 + breath * 0.05 + this.focus * 0.22;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export function disposeGlints(): void {
  sharedTexture?.dispose();
  sharedTexture = null;
}
