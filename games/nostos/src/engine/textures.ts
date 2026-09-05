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
/**
 * 羊毛细节图：一绺一绺的纤维。
 *
 * 与其他三张不同，这张是**有方向**的：细密的曲线顺着同一个大方向走，
 * 中间夹着少量岔开的乱毛。低多边形的一撮毛之所以能读成毛而不是石头，
 * 靠的就是这层方向性——形状给不出蓬松，纹理能给出。
 */
export function fleeceTexture(): THREE.Texture {
  return memo('fleece', () => {
    const size = 512;
    const { c, g } = canvas(size);
    const rng = createRng(917);

    g.fillStyle = '#cfcfcf';
    g.fillRect(0, 0, size, size);

    // 一层薄雾似的底噪，免得纤维之间是死板的纯色
    const img = g.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const n = fbm2(x * 0.03, y * 0.03, 3, 41);
        const o = (y * size + x) * 4;
        const v = clamp(img.data[o]! + (n - 0.5) * 46, 0, 255);
        img.data[o] = v;
        img.data[o + 1] = v;
        img.data[o + 2] = v;
      }
    }
    g.putImageData(img, 0, 0);

    // 纤维：从左往右走的细曲线，两端出画才能无缝平铺
    g.lineCap = 'round';
    for (let i = 0; i < 620; i += 1) {
      const y0 = rng() * size;
      // 大部分顺着主方向，少量乱毛岔开
      const stray = rng() < 0.16;
      const drift = (rng() - 0.5) * (stray ? 90 : 26);
      const dark = rng() < 0.5;
      g.strokeStyle = dark ? `rgba(90,88,84,${0.10 + rng() * 0.16})` : `rgba(255,255,255,${0.10 + rng() * 0.2})`;
      g.lineWidth = 0.7 + rng() * 1.7;
      g.beginPath();
      const bow = (rng() - 0.5) * 70;
      // 画两遍并上下各偏移一个贴图高度，接缝处才连得上
      for (const wrap of [-size, 0, size]) {
        g.moveTo(-20, y0 + wrap);
        g.bezierCurveTo(
          size * 0.3,
          y0 + bow + wrap,
          size * 0.7,
          y0 + drift - bow + wrap,
          size + 20,
          y0 + drift + wrap,
        );
      }
      g.stroke();
    }

    return finish('fleece', c, 3);
  });
}

/**
 * 喀耳刻柱廊地上的那幅壁画。
 *
 * 旁白只给了一句：「地上的壁画剥了大半。还能看出一排人，弯着腰，
 * 越往后越不像人。」——所以画面必须做到三件事，缺一件这句话就落空：
 *
 *   1. **一排人**：横向的队列，同一个方向走；
 *   2. **弯着腰**：从直立到伏地，是一条连续的曲线，不是几个离散姿势；
 *   3. **越往后越不像人**：腿变短变粗、背弓起、头逐渐换成猪首。
 *      关键是"逐渐"——中间那几个必须是**说不清是人是猪**的状态，
 *      那才是这一幕真正吓人的地方。
 *
 * 画法沿用 world/silhouette.ts 的黑绘语言：平涂剪影 + 锥形笔触的四肢，
 * 不画明暗、不画透视。区别只在这是一幅**画在地上的画**，
 * 所以它有确定的上下左右，按 UV 贴，不走三平面。
 *
 * 最后剥掉一大半：擦除是用 destination-out 画的不规则块，
 * 擦掉之后露出底下更浅的灰泥。旁白说"剥了大半"，那就真的剥掉一大半——
 * 让玩家自己在残片之间把那一排人连起来，比画完整更接近"还能看出"。
 */
export function muralTexture(): THREE.Texture {
  return memo('mural', () => {
    const W = 1024;
    const H = 512;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (!g) throw new Error('2D canvas context unavailable');
    const rng = createRng(7717);

    // ── 底：上过色的灰泥 ──
    g.fillStyle = '#cbb89a';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i += 1) {
      const x = rng() * W;
      const y = rng() * H;
      g.fillStyle = rng() < 0.5 ? 'rgba(160,140,110,0.06)' : 'rgba(230,216,188,0.06)';
      g.fillRect(x, y, 2 + rng() * 5, 2 + rng() * 5);
    }

    // ── 回纹边框：只画上下两条，而且本身就是断的 ──
    const meanderBand = (y0: number, h: number): void => {
      g.strokeStyle = '#a6402c';
      g.lineWidth = h * 0.17;
      g.lineCap = 'butt';
      const step = h * 1.5;
      for (let x = -step; x < W + step; x += step) {
        // 随机跳过一段：边框也剥了
        if (rng() < 0.22) continue;
        g.beginPath();
        g.moveTo(x, y0 + h);
        g.lineTo(x, y0 + h * 0.2);
        g.lineTo(x + step * 0.62, y0 + h * 0.2);
        g.lineTo(x + step * 0.62, y0 + h * 0.62);
        g.lineTo(x + step * 0.28, y0 + h * 0.62);
        g.stroke();
      }
    };
    meanderBand(H * 0.045, H * 0.075);
    g.save();
    g.translate(0, H * 0.955);
    g.scale(1, -1);
    meanderBand(0, H * 0.075);
    g.restore();

    // ── 一排人：从直立到伏地，从人到猪 ──
    const COUNT = 7;
    // 人物带放在贴图中线偏下：这幅画铺在地上，玩家是斜着看过去的，
    // 队列压在边缘的话，站近了就只剩边框在画面里
    const baseline = H * 0.66;
    for (let i = 0; i < COUNT; i += 1) {
      // t = 0 完全是人，t = 1 完全是猪
      const t = i / (COUNT - 1);
      const cx = W * (0.1 + (i / (COUNT - 1)) * 0.8);
      const s = H * 0.46;
      // 越往后越矮：四肢缩短，人被压向地面
      const stature = 1 - t * 0.42;
      // 前两个用赭红（红绘的余韵），后面越来越黑——颜色也在往兽里走
      g.fillStyle = t < 0.28 ? '#a6402c' : '#1a1310';
      drawTurning(g, cx, baseline, s * stature, t, rng);
    }

    // ── 剥落 ──
    //
    // "剥了大半"是旁白的话，但**画面不能真的剥掉大半**：
    // 第一版擦掉了六成多，中段那几个"半人半猪"全没了——
    // 而那几个恰恰是这幅画唯一要说的东西。剥落在这里是气氛，
    // 队列的可读性是内容，冲突时内容优先。
    //
    // 所以两条约束：总量降到四成左右；落点**避开人物那一条带**，
    // 让缺口主要吃掉上下的空白与边框。看上去仍然是残破的，
    // 但那一排人从头到尾连得起来。
    g.globalCompositeOperation = 'destination-out';
    const FIGURE_TOP = H * 0.34;
    const FIGURE_BOTTOM = H * 0.74;
    for (let i = 0; i < 26; i += 1) {
      const x = rng() * W;
      // 大部分缺口推到人物带之外
      let y = rng() * H;
      if (y > FIGURE_TOP && y < FIGURE_BOTTOM && rng() < 0.72) {
        y = rng() < 0.5 ? rng() * FIGURE_TOP : FIGURE_BOTTOM + rng() * (H - FIGURE_BOTTOM);
      }
      const r = H * (0.04 + rng() * 0.11);
      g.beginPath();
      // 不规则多边形，不是圆——石灰剥落是崩出来的，不是磨出来的
      const lobes = 7 + Math.floor(rng() * 5);
      for (let k = 0; k <= lobes; k += 1) {
        const a = (k / lobes) * Math.PI * 2;
        const rr = r * (0.55 + rng() * 0.75);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr * 0.8;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
    }
    // 边缘再啃一圈，免得画面像一块整齐的方毯
    for (let i = 0; i < 34; i += 1) {
      const edge = Math.floor(rng() * 4);
      const r = H * (0.025 + rng() * 0.075);
      const x = edge === 0 || edge === 1 ? rng() * W : edge === 2 ? 0 : W;
      const y = edge === 0 ? 0 : edge === 1 ? H : rng() * H;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';

    // ── 龟裂：细网，压在最上面 ──
    g.strokeStyle = 'rgba(120,104,82,0.5)';
    g.lineWidth = 1;
    for (let i = 0; i < 150; i += 1) {
      let x = rng() * W;
      let y = rng() * H;
      g.beginPath();
      g.moveTo(x, y);
      const segs = 2 + Math.floor(rng() * 4);
      for (let k = 0; k < segs; k += 1) {
        x += (rng() - 0.5) * 70;
        y += (rng() - 0.5) * 55;
        g.lineTo(x, y);
      }
      g.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    // 这是一幅画，不平铺：超出边界就不画，露出底下的灰泥石板
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    cache.set('mural', tex);
    return tex;
  });
}

/**
 * 队列里的一个：t = 0 是人，t = 1 是猪，中间是说不清的那些。
 *
 * 逐渐变形靠的是同一组笔触的连续插值，而不是换一张图：
 * 背弓（lean）、四肢缩短（limbShrink）、口鼻前伸（snout）都随 t 走，
 * 所以第三、第四个必然落在"还是人但已经不像"的位置上。
 */
function drawTurning(
  g: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  s: number,
  t: number,
  rng: () => number,
): void {
  const bend = t * 1.15;              // 上身前倾的弧度
  const shrink = 1 - t * 0.45;        // 四肢缩短
  const hipY = groundY - 0.42 * s * shrink;
  const shoulderX = cx + Math.sin(bend) * 0.34 * s;
  const shoulderY = hipY - Math.cos(bend) * 0.4 * s;

  const stroke = (x1: number, y1: number, x2: number, y2: number, w1: number, w2: number): void => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    g.beginPath();
    g.moveTo(x1 + nx * w1, y1 + ny * w1);
    g.lineTo(x2 + nx * w2, y2 + ny * w2);
    g.arc(x2, y2, w2, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
    g.lineTo(x1 - nx * w1, y1 - ny * w1);
    g.arc(x1, y1, w1, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
    g.closePath();
    g.fill();
  };

  // 后腿：越往后越粗越短，最后成了蹄
  const hindSpread = 0.1 + t * 0.06;
  for (const side of [-1, 1]) {
    const kneeX = cx + side * hindSpread * s * 0.5 - t * 0.06 * s;
    const kneeY = hipY + 0.2 * s * shrink;
    stroke(cx, hipY, kneeX, kneeY, (0.062 + t * 0.03) * s, (0.05 + t * 0.02) * s);
    stroke(kneeX, kneeY, kneeX + side * 0.03 * s, groundY, (0.05 + t * 0.02) * s, (0.03 + t * 0.025) * s);
  }

  // 躯干：从收腰的衣身逐渐变成鼓起的兽背
  g.beginPath();
  const belly = 0.085 + t * 0.075;
  g.moveTo(shoulderX - 0.11 * s, shoulderY);
  g.quadraticCurveTo(
    cx - 0.13 * s - t * 0.05 * s,
    (hipY + shoulderY) * 0.5,
    cx - belly * s,
    hipY + 0.02 * s,
  );
  g.lineTo(cx + belly * s, hipY + 0.02 * s);
  g.quadraticCurveTo(
    cx + 0.13 * s + t * 0.08 * s,
    (hipY + shoulderY) * 0.5,
    shoulderX + 0.11 * s,
    shoulderY,
  );
  g.closePath();
  g.fill();

  // 前肢：人的手臂 → 撑地的前腿
  const reach = 0.24 + t * 0.3;
  const armEndX = shoulderX + reach * s * 0.7;
  const armEndY = shoulderY + (0.24 + t * 0.62) * s;
  const armLandY = Math.min(armEndY, groundY);
  stroke(shoulderX - 0.07 * s, shoulderY + 0.02 * s, armEndX - 0.05 * s, armLandY, 0.042 * s, (0.024 + t * 0.03) * s);
  stroke(shoulderX + 0.07 * s, shoulderY + 0.02 * s, armEndX + 0.04 * s, armLandY, 0.042 * s, (0.024 + t * 0.03) * s);

  // 颈：越往后越短越粗，头越低
  const headX = shoulderX + Math.sin(bend) * 0.16 * s + t * 0.05 * s;
  const headY = shoulderY - Math.cos(bend) * 0.15 * s + t * 0.07 * s;
  stroke(shoulderX, shoulderY + 0.01 * s, headX, headY, 0.035 * s, (0.03 + t * 0.035) * s);

  // 头：人头 → 猪首。口鼻随 t 前伸，耳朵立起来
  g.beginPath();
  g.ellipse(headX, headY, (0.055 + t * 0.012) * s, (0.068 - t * 0.012) * s, bend * 0.4, 0, Math.PI * 2);
  g.fill();
  if (t > 0.18) {
    // 吻部
    const snout = (t - 0.18) * 0.19 * s;
    stroke(headX, headY, headX + snout * 1.5, headY + snout * 0.6, 0.045 * s, (0.028 + t * 0.02) * s);
    // 耳
    g.beginPath();
    g.moveTo(headX - 0.03 * s, headY - 0.05 * s);
    g.lineTo(headX - 0.055 * s - t * 0.02 * s, headY - 0.1 * s - t * 0.05 * s);
    g.lineTo(headX + 0.008 * s, headY - 0.055 * s);
    g.closePath();
    g.fill();
  }
  if (t < 0.55) {
    // 发髻：还是人的那几个才有
    g.beginPath();
    g.ellipse(headX - 0.05 * s, headY + 0.02 * s, 0.036 * s, 0.045 * s, 0, 0, Math.PI * 2);
    g.fill();
  }
  // 尾：最后两个才长出来
  if (t > 0.62) {
    const tailT = (t - 0.62) / 0.38;
    stroke(cx - 0.09 * s, hipY - 0.02 * s, cx - (0.16 + tailT * 0.06) * s, hipY - (0.1 + tailT * 0.05) * s, 0.016 * s, 0.01 * s);
  }
  void rng;
}

export function disposeTextures(): void {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}
