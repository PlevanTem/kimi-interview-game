import * as THREE from 'three';
import { createRng, fbm2, ridge2, clamp } from './noise';

/**
 * 程序化纹理。全部用 Canvas2D 一次性生成并缓存，运行时不再重算。
 *
 * 本作不引入任何二进制美术文件，石头的风化、灰泥的龟裂、沙的波纹、
 * 陶器上的回纹都在这里画出来。所有生成都由固定种子驱动，画面可复现。
 */

const cache = new Map<string, THREE.Texture>();

function canvas(size: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas context unavailable');
  return { c, g };
}

function finish(key: string, c: HTMLCanvasElement, repeat = 1): THREE.Texture {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

function memo(key: string, make: () => THREE.Texture): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  return make();
}

/**
 * 风化细节图：灰度，1.0 = 干净石面，越暗越是缺口、水渍与裂缝。
 * 在着色器里以三平面投影乘到反照率上，所以它必须无缝平铺。
 */
export function weatheringTexture(): THREE.Texture {
  return memo('weathering', () => {
    const size = 512;
    const { c, g } = canvas(size);
    const img = g.createImageData(size, size);
    const d = img.data;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const u = (x / size) * 6;
        const v = (y / size) * 6;
        // 粗粒斑驳
        const blotch = fbm2(u, v, 5, 1337);
        // 层理：让石头有沉积岩的横纹
        const bedding = ridge2(u * 0.6, v * 3.2, 3, 991);
        // 细麻点
        const pit = fbm2(u * 9, v * 9, 3, 5501);

        let value = 0.82 + (blotch - 0.5) * 0.34;
        value -= (1 - bedding) * 0.12;
        value -= Math.max(0, pit - 0.62) * 0.9;
        value = clamp(value, 0.12, 1);

        const i = (y * size + x) * 4;
        const b = Math.round(value * 255);
        d[i] = b;
        d[i + 1] = b;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);

    // 裂缝：从随机点出发的折线，越走越细
    const rng = createRng(4242);
    g.lineCap = 'round';
    for (let n = 0; n < 26; n += 1) {
      let x = rng() * size;
      let y = rng() * size;
      let angle = rng() * Math.PI * 2;
      const steps = 12 + Math.floor(rng() * 26);
      for (let s = 0; s < steps; s += 1) {
        const len = 4 + rng() * 12;
        const nx = x + Math.cos(angle) * len;
        const ny = y + Math.sin(angle) * len;
        const t = 1 - s / steps;
        g.strokeStyle = `rgba(26,19,16,${0.16 + t * 0.3})`;
        g.lineWidth = 0.6 + t * 1.8;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(nx, ny);
        g.stroke();
        x = nx;
        y = ny;
        angle += (rng() - 0.5) * 0.9;
      }
    }
    return finish('weathering', c, 1);
  });
}

/** 沙与碎贝：横向波纹，用于海岸地面。 */
export function sandTexture(): THREE.Texture {
  return memo('sand', () => {
    const size = 512;
    const { c, g } = canvas(size);
    const img = g.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const u = (x / size) * 8;
        const v = (y / size) * 8;
        const warp = fbm2(u * 0.5, v * 0.5, 3, 77) * 2.4;
        const ripple = Math.sin((v + warp) * 7.5) * 0.5 + 0.5;
        const grit = fbm2(u * 14, v * 14, 2, 313);
        const value = clamp(0.86 + (ripple - 0.5) * 0.16 + (grit - 0.5) * 0.16, 0.35, 1);
        const i = (y * size + x) * 4;
        const b = Math.round(value * 255);
        d[i] = b;
        d[i + 1] = b;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return finish('sand', c, 1);
  });
}

/**
 * 壁画底：赭红与骨白的湿壁画层，边缘有剥落。
 * 用作神殿地面与墙上的"还剩一半"的画。
 */
export function frescoTexture(): THREE.Texture {
  return memo('fresco', () => {
    const size = 512;
    const { c, g } = canvas(size);
    g.fillStyle = '#cbb89a';
    g.fillRect(0, 0, size, size);

    const rng = createRng(8080);
    // 颜料块：赭红、土黄、铜绿
    const inks = ['rgba(166,64,44,0.55)', 'rgba(201,138,59,0.45)', 'rgba(110,140,122,0.35)'];
    for (let n = 0; n < 130; n += 1) {
      const ink = inks[Math.floor(rng() * inks.length)]!;
      g.fillStyle = ink;
      const x = rng() * size;
      const y = rng() * size;
      const w = 12 + rng() * 90;
      const h = 8 + rng() * 40;
      g.save();
      g.translate(x, y);
      g.rotate((rng() - 0.5) * 0.6);
      g.beginPath();
      g.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    // 剥落：露出白色石灰底
    g.globalCompositeOperation = 'source-over';
    for (let n = 0; n < 60; n += 1) {
      g.fillStyle = `rgba(231,217,190,${0.35 + rng() * 0.5})`;
      const x = rng() * size;
      const y = rng() * size;
      const r = 4 + rng() * 26;
      g.beginPath();
      const points = 6 + Math.floor(rng() * 5);
      for (let p = 0; p <= points; p += 1) {
        const a = (p / points) * Math.PI * 2;
        const rr = r * (0.6 + rng() * 0.6);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (p === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
    }
    return finish('fresco', c, 1);
  });
}

/**
 * 回纹（Greek key / meander）带：透明底黑绘，贴在祭坛、柱础、陶器上。
 * 这是全作唯一的"装饰性图案"，用来把程序化几何锚定到古希腊语境。
 */
export function meanderTexture(): THREE.Texture {
  return memo('meander', () => {
    const size = 256;
    const { c, g } = canvas(size);
    g.clearRect(0, 0, size, size);
    const band = size * 0.5;
    const unit = size / 4;
    const lw = unit * 0.16;
    g.strokeStyle = '#1a1310';
    g.lineWidth = lw;
    g.lineCap = 'square';
    g.lineJoin = 'miter';

    const top = (size - band) * 0.5;
    // 上下界线
    g.beginPath();
    g.moveTo(0, top + lw);
    g.lineTo(size, top + lw);
    g.moveTo(0, top + band - lw);
    g.lineTo(size, top + band - lw);
    g.stroke();

    // 四个回纹单元，首尾相接以保证水平无缝
    for (let i = 0; i < 4; i += 1) {
      const x = i * unit;
      const y = top + lw * 2.4;
      const h = band - lw * 4.8;
      const s = unit * 0.2;
      g.beginPath();
      g.moveTo(x + s * 0.5, y + h);
      g.lineTo(x + s * 0.5, y);
      g.lineTo(x + s * 3.5, y);
      g.lineTo(x + s * 3.5, y + h * 0.66);
      g.lineTo(x + s * 1.7, y + h * 0.66);
      g.lineTo(x + s * 1.7, y + h * 0.33);
      g.lineTo(x + s * 2.6, y + h * 0.33);
      g.stroke();
    }
    return finish('meander', c, 1);
  });
}

/** 释放全部缓存纹理（场景切换不需要，页面销毁时用）。 */
export function disposeTextures(): void {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}
