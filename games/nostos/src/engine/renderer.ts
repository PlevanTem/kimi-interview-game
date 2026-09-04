import * as THREE from 'three';
import type { EnvPreset } from '../content/palette';
import { PostChain } from './post';

/**
 * 渲染视口：WebGL 渲染器 + 摄影机 + 后期链 + 尺寸自适应。
 *
 * 渲染器的自动色彩空间转换被关掉了——线性值一路走到后期链，
 * 由 post.ts 的合成 pass 做唯一一次 sRGB 编码。这样胶片曲线、
 * 分级与颗粒都作用在线性光上，和真实的调色流程一致。
 */
export class Viewport {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  readonly post: PostChain;
  readonly canvas: HTMLCanvasElement;

  /** 基准 FOV，镜头语言里的"呼吸"与"凝视"都相对它做偏移 */
  baseFov = 62;
  private fovOffset = 0;
  private pixelRatio: number;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'nostos-canvas';
    container.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 1);

    // 高 DPI 屏上限制到 1.5，颗粒与色带在更高倍率下反而变弱
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(this.pixelRatio);

    this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 0.1, 1600);
    // layer 1 放不参与投影的东西（天、海、剪影、微光），主相机照样要看见它们
    this.camera.layers.enable(1);
    this.post = new PostChain(this.renderer);

    this.resize();
  }

  setFovOffset(offset: number): void {
    this.fovOffset = offset;
  }

  resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.post.setSize(width, height, this.pixelRatio);
  }

  applyEnv(env: EnvPreset): void {
    this.post.applyEnv(env);
  }

  render(scene: THREE.Scene, time: number): void {
    const fov = this.baseFov + this.fovOffset;
    if (Math.abs(this.camera.fov - fov) > 0.001) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.post.render(scene, this.camera, time);
  }

  dispose(): void {
    this.post.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
