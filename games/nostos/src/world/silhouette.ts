import * as THREE from 'three';

/**
 * 黑绘剪影。
 *
 * 回忆幻象里不出现任何写实模型——只有一层层浮起来的剪影，像瓶画上的人物
 * 从陶土里走出来。这既是本作的造型语言，也让"没有骨骼动画"这件事从
 * 技术限制变成风格选择：黑绘陶器上的人物本来就是不动的，动的是我们的眼睛。
 *
 * 所有母题都在这里用 Canvas2D 一笔一笔画出来，不加载任何图片。
 */

export type MotifKind =
  | 'galley' // 长桨船
  | 'rower' // 划桨的人
  | 'standing' // 站立的人
  | 'reaching' // 伸手的人
  | 'bound' // 被缚在桅上的人
  | 'kneeling' // 跪坐的人
  | 'eye' // 巨大的独眼
  | 'hand' // 巨大的手
  | 'siren' // 鸟身女妖
  | 'loom' // 织机
  | 'flock' // 羊群
  | 'shades' // 亡者的行列
  | 'wreath' // 花环
  | 'threshold' // 门槛
  | 'wave' // 波浪回纹
  | 'flame'; // 火

const cache = new Map<MotifKind, THREE.Texture>();
const SIZE = 512;

function ctx2d(): { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas context unavailable');
  g.fillStyle = '#000';
  g.strokeStyle = '#000';
  g.lineJoin = 'round';
  g.lineCap = 'round';
  return { canvas, g };
}

/** 一段两端粗细不同的肢体。黑绘人物的四肢就是这种锥形笔触。 */
function limb(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w1: number, w2: number): void {
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
}

function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fill();
}

/**
 * 一个古风人物：头（带发髻）、颈、躯干（衣褶收腰）、双臂、双腿。
 * armA / armB 是两臂末端的相对方向，用来摆出不同的姿态。
 */
function figure(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  pose: {
    armA?: [number, number];
    armB?: [number, number];
    legSpread?: number;
    lean?: number;
    kneeling?: boolean;
  } = {},
): void {
  const s = scale;
  const lean = pose.lean ?? 0;
  const hipY = cy;
  const shoulderY = cy - 0.42 * s;
  const headY = cy - 0.56 * s;
  const shoulderX = cx + lean * 0.1 * s;

  // 腿
  if (pose.kneeling) {
    limb(g, cx, hipY, cx - 0.1 * s, hipY + 0.2 * s, 0.062 * s, 0.05 * s);
    limb(g, cx - 0.1 * s, hipY + 0.2 * s, cx + 0.16 * s, hipY + 0.22 * s, 0.05 * s, 0.032 * s);
    limb(g, cx + 0.03 * s, hipY, cx + 0.06 * s, hipY + 0.24 * s, 0.06 * s, 0.045 * s);
    limb(g, cx + 0.06 * s, hipY + 0.24 * s, cx + 0.2 * s, hipY + 0.26 * s, 0.045 * s, 0.03 * s);
  } else {
    const spread = pose.legSpread ?? 0.09;
    limb(g, cx, hipY, cx - spread * s, hipY + 0.42 * s, 0.062 * s, 0.032 * s);
    limb(g, cx, hipY, cx + spread * s, hipY + 0.42 * s, 0.062 * s, 0.032 * s);
    // 脚
    ellipse(g, cx - spread * s - 0.02 * s, hipY + 0.43 * s, 0.045 * s, 0.018 * s);
    ellipse(g, cx + spread * s + 0.02 * s, hipY + 0.43 * s, 0.045 * s, 0.018 * s);
  }

  // 躯干：上宽下收的衣身
  g.beginPath();
  g.moveTo(shoulderX - 0.11 * s, shoulderY);
  g.quadraticCurveTo(cx - 0.13 * s, cy - 0.18 * s, cx - 0.085 * s, hipY + 0.02 * s);
  g.lineTo(cx + 0.085 * s, hipY + 0.02 * s);
  g.quadraticCurveTo(cx + 0.13 * s, cy - 0.18 * s, shoulderX + 0.11 * s, shoulderY);
  g.closePath();
  g.fill();

  // 臂
  const armA = pose.armA ?? [-0.2, 0.24];
  const armB = pose.armB ?? [0.2, 0.24];
  limb(g, shoulderX - 0.09 * s, shoulderY + 0.02 * s, shoulderX + armA[0] * s, shoulderY + armA[1] * s, 0.042 * s, 0.024 * s);
  limb(g, shoulderX + 0.09 * s, shoulderY + 0.02 * s, shoulderX + armB[0] * s, shoulderY + armB[1] * s, 0.042 * s, 0.024 * s);

  // 颈与头
  limb(g, shoulderX, shoulderY + 0.01 * s, shoulderX + lean * 0.03 * s, headY + 0.04 * s, 0.035 * s, 0.03 * s);
  ellipse(g, shoulderX + lean * 0.04 * s, headY, 0.055 * s, 0.068 * s, lean * 0.2);
  // 发髻：古风时期男女都束在脑后
  ellipse(g, shoulderX + lean * 0.04 * s - 0.05 * s, headY + 0.02 * s, 0.036 * s, 0.045 * s);
}

function drawGalley(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  const cy = S * 0.6;
  // 船体
  g.beginPath();
  g.moveTo(S * 0.06, cy - S * 0.05);
  g.quadraticCurveTo(S * 0.5, cy + S * 0.13, S * 0.94, cy - S * 0.06);
  g.quadraticCurveTo(S * 0.9, cy + S * 0.02, S * 0.85, cy + S * 0.035);
  g.quadraticCurveTo(S * 0.5, cy + S * 0.19, S * 0.13, cy + S * 0.02);
  g.closePath();
  g.fill();
  // 船首兽头与船尾的翘尾
  g.beginPath();
  g.moveTo(S * 0.06, cy - S * 0.05);
  g.quadraticCurveTo(S * 0.02, cy - S * 0.1, S * 0.055, cy - S * 0.14);
  g.quadraticCurveTo(S * 0.085, cy - S * 0.1, S * 0.1, cy - S * 0.045);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(S * 0.94, cy - S * 0.06);
  g.quadraticCurveTo(S * 0.985, cy - S * 0.17, S * 0.93, cy - S * 0.24);
  g.quadraticCurveTo(S * 0.96, cy - S * 0.14, S * 0.9, cy - S * 0.055);
  g.closePath();
  g.fill();
  // 桨
  for (let i = 0; i < 11; i += 1) {
    const x = S * (0.16 + i * 0.062);
    limb(g, x, cy + S * 0.04, x - S * 0.05, cy + S * 0.17, S * 0.008, S * 0.014);
  }
  // 桅与横桁
  limb(g, S * 0.5, cy - S * 0.02, S * 0.5, cy - S * 0.42, S * 0.012, S * 0.009);
  limb(g, S * 0.3, cy - S * 0.36, S * 0.7, cy - S * 0.36, S * 0.008, S * 0.008);
  // 帆
  g.beginPath();
  g.moveTo(S * 0.31, cy - S * 0.355);
  g.lineTo(S * 0.69, cy - S * 0.355);
  g.quadraticCurveTo(S * 0.66, cy - S * 0.2, S * 0.62, cy - S * 0.13);
  g.lineTo(S * 0.38, cy - S * 0.13);
  g.quadraticCurveTo(S * 0.34, cy - S * 0.2, S * 0.31, cy - S * 0.355);
  g.closePath();
  g.fill();
}

function drawRower(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  figure(g, S * 0.44, S * 0.56, S * 0.62, { kneeling: true, armA: [0.3, -0.02], armB: [0.34, 0.06], lean: 0.6 });
  // 桨
  limb(g, S * 0.62, S * 0.5, S * 0.92, S * 0.86, S * 0.014, S * 0.03);
  // 座板
  g.fillRect(S * 0.28, S * 0.72, S * 0.34, S * 0.03);
}

function drawStanding(g: CanvasRenderingContext2D): void {
  figure(g, SIZE * 0.5, SIZE * 0.62, SIZE * 0.78, { armA: [-0.16, 0.3], armB: [0.14, 0.32] });
}

function drawReaching(g: CanvasRenderingContext2D): void {
  figure(g, SIZE * 0.44, SIZE * 0.64, SIZE * 0.76, { armA: [-0.1, 0.3], armB: [0.44, -0.12], lean: 0.5 });
}

function drawBound(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  // 桅杆
  g.fillRect(S * 0.475, S * 0.06, S * 0.05, S * 0.88);
  figure(g, S * 0.5, S * 0.62, S * 0.74, { armA: [-0.02, -0.06], armB: [0.02, -0.06], legSpread: 0.05 });
  // 一圈圈绳
  for (let i = 0; i < 5; i += 1) {
    const y = S * (0.36 + i * 0.055);
    g.lineWidth = S * 0.012;
    g.beginPath();
    g.ellipse(S * 0.5, y, S * 0.085, S * 0.018, 0, 0, Math.PI * 2);
    g.stroke();
  }
}

function drawKneeling(g: CanvasRenderingContext2D): void {
  figure(g, SIZE * 0.5, SIZE * 0.6, SIZE * 0.8, { kneeling: true, armA: [-0.24, 0.1], armB: [0.24, 0.1] });
}

function drawEye(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  const cx = S * 0.5;
  const cy = S * 0.5;
  // 杏仁形眼眶
  g.beginPath();
  g.moveTo(cx - S * 0.44, cy);
  g.quadraticCurveTo(cx, cy - S * 0.34, cx + S * 0.44, cy);
  g.quadraticCurveTo(cx, cy + S * 0.34, cx - S * 0.44, cy);
  g.closePath();
  g.fill();
  // 挖掉眼白，只留虹膜——黑绘的负形
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.moveTo(cx - S * 0.38, cy);
  g.quadraticCurveTo(cx, cy - S * 0.27, cx + S * 0.38, cy);
  g.quadraticCurveTo(cx, cy + S * 0.27, cx - S * 0.38, cy);
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'source-over';
  ellipse(g, cx, cy, S * 0.115, S * 0.115);
  // 睫毛
  for (let i = -5; i <= 5; i += 1) {
    const t = i / 5;
    const x = cx + t * S * 0.34;
    const y = cy - Math.cos(t * 1.4) * S * 0.16;
    limb(g, x, y, x + t * S * 0.03, y - S * 0.07, S * 0.008, S * 0.003);
  }
}

function drawHand(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  // 掌
  g.beginPath();
  g.moveTo(S * 0.32, S * 0.92);
  g.quadraticCurveTo(S * 0.24, S * 0.58, S * 0.3, S * 0.44);
  g.quadraticCurveTo(S * 0.5, S * 0.36, S * 0.7, S * 0.44);
  g.quadraticCurveTo(S * 0.76, S * 0.58, S * 0.68, S * 0.92);
  g.closePath();
  g.fill();
  // 四指与拇指
  const fingers: Array<[number, number, number]> = [
    [0.36, 0.42, 0.1],
    [0.47, 0.36, 0.06],
    [0.58, 0.38, 0.08],
    [0.67, 0.46, 0.14],
  ];
  for (const [x, y, bend] of fingers) {
    limb(g, S * x, S * 0.5, S * x - S * 0.01, S * y, S * 0.055, S * 0.042);
    limb(g, S * x - S * 0.01, S * y, S * (x - 0.02), S * (y - bend), S * 0.042, S * 0.03);
  }
  limb(g, S * 0.3, S * 0.66, S * 0.16, S * 0.56, S * 0.06, S * 0.04);
}

function drawSiren(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  // 鸟身
  g.beginPath();
  g.moveTo(S * 0.32, S * 0.62);
  g.quadraticCurveTo(S * 0.48, S * 0.44, S * 0.72, S * 0.56);
  g.quadraticCurveTo(S * 0.86, S * 0.64, S * 0.9, S * 0.8);
  g.quadraticCurveTo(S * 0.6, S * 0.78, S * 0.36, S * 0.72);
  g.closePath();
  g.fill();
  // 翅：三层羽片
  for (let i = 0; i < 3; i += 1) {
    g.beginPath();
    g.moveTo(S * (0.4 + i * 0.03), S * (0.58 + i * 0.02));
    g.quadraticCurveTo(S * (0.62 + i * 0.04), S * (0.3 + i * 0.06), S * (0.86 + i * 0.02), S * (0.34 + i * 0.08));
    g.quadraticCurveTo(S * 0.66, S * (0.5 + i * 0.05), S * (0.44 + i * 0.03), S * (0.64 + i * 0.02));
    g.closePath();
    g.fill();
  }
  // 爪
  limb(g, S * 0.5, S * 0.74, S * 0.48, S * 0.9, S * 0.018, S * 0.012);
  limb(g, S * 0.62, S * 0.75, S * 0.63, S * 0.9, S * 0.018, S * 0.012);
  // 人的头颈
  limb(g, S * 0.34, S * 0.62, S * 0.28, S * 0.44, S * 0.038, S * 0.03);
  ellipse(g, S * 0.26, S * 0.38, S * 0.055, S * 0.068, -0.2);
  ellipse(g, S * 0.31, S * 0.35, S * 0.04, S * 0.05);
}

function drawLoom(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  // 立式织机的框
  g.fillRect(S * 0.16, S * 0.12, S * 0.035, S * 0.78);
  g.fillRect(S * 0.8, S * 0.12, S * 0.035, S * 0.78);
  g.fillRect(S * 0.16, S * 0.12, S * 0.675, S * 0.03);
  // 经线
  for (let i = 0; i < 16; i += 1) {
    const x = S * (0.21 + i * 0.0385);
    g.fillRect(x, S * 0.15, S * 0.006, S * 0.5);
  }
  // 已织成的一段与坠石
  g.fillRect(S * 0.2, S * 0.15, S * 0.6, S * 0.16);
  for (let i = 0; i < 8; i += 1) {
    ellipse(g, S * (0.23 + i * 0.077), S * 0.68, S * 0.016, S * 0.026);
  }
}

function drawFlock(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  const sheep = (x: number, y: number, s: number): void => {
    ellipse(g, x, y, s * 0.5, s * 0.32);
    ellipse(g, x - s * 0.46, y - s * 0.14, s * 0.19, s * 0.15);
    for (const dx of [-0.3, -0.1, 0.15, 0.35]) {
      g.fillRect(x + dx * s, y + s * 0.2, s * 0.055, s * 0.28);
    }
  };
  sheep(S * 0.3, S * 0.6, S * 0.34);
  sheep(S * 0.62, S * 0.52, S * 0.26);
  sheep(S * 0.78, S * 0.7, S * 0.3);
  sheep(S * 0.44, S * 0.78, S * 0.22);
}

function drawShades(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  // 一列走远的亡者，越远越小越淡
  const xs = [0.16, 0.32, 0.47, 0.6, 0.71, 0.8];
  xs.forEach((x, i) => {
    const t = i / (xs.length - 1);
    g.globalAlpha = 1 - t * 0.65;
    figure(g, S * x, S * (0.72 - t * 0.16), S * (0.62 - t * 0.3), {
      armA: [-0.12, 0.28],
      armB: [0.12, 0.28],
      legSpread: 0.05,
    });
  });
  g.globalAlpha = 1;
}

function drawWreath(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  const cx = S * 0.5;
  const cy = S * 0.5;
  const R = S * 0.32;
  for (let i = 0; i < 34; i += 1) {
    const a = (i / 34) * Math.PI * 2;
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    const lean = a + Math.PI * 0.5;
    // 一片橄榄叶
    g.save();
    g.translate(x, y);
    g.rotate(lean + (i % 2 ? 0.5 : -0.5));
    g.beginPath();
    g.ellipse(0, 0, S * 0.055, S * 0.017, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.lineWidth = S * 0.012;
  g.beginPath();
  g.arc(cx, cy, R, 0.4, Math.PI * 2 - 0.4);
  g.stroke();
}

function drawThreshold(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  // 门框
  g.fillRect(S * 0.18, S * 0.1, S * 0.1, S * 0.82);
  g.fillRect(S * 0.72, S * 0.1, S * 0.1, S * 0.82);
  g.fillRect(S * 0.14, S * 0.04, S * 0.72, S * 0.09);
  // 门槛石
  g.fillRect(S * 0.14, S * 0.88, S * 0.72, S * 0.07);
  // 门内的黑
  g.globalAlpha = 0.55;
  g.fillRect(S * 0.28, S * 0.13, S * 0.44, S * 0.75);
  g.globalAlpha = 1;
}

function drawWave(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  // 三条错开的浪，用希腊瓶画的卷浪母题
  for (let row = 0; row < 3; row += 1) {
    const y = S * (0.3 + row * 0.2);
    const phase = row * 0.9;
    g.beginPath();
    g.moveTo(0, y + S * 0.09);
    for (let x = 0; x <= S; x += 8) {
      const t = x / S;
      const yy = y + Math.sin(t * Math.PI * 4 + phase) * S * 0.055;
      g.lineTo(x, yy);
    }
    g.lineTo(S, y + S * 0.09);
    g.closePath();
    g.fill();
    // 卷起的浪头
    for (let i = 0; i < 4; i += 1) {
      const x = S * (0.12 + i * 0.25);
      g.beginPath();
      g.arc(x, y - S * 0.02, S * 0.045, Math.PI * 0.15, Math.PI * 1.65);
      g.lineWidth = S * 0.02;
      g.stroke();
    }
  }
}

function drawFlame(g: CanvasRenderingContext2D): void {
  const S = SIZE;
  for (let i = 0; i < 3; i += 1) {
    const w = 1 - i * 0.28;
    const h = 1 - i * 0.22;
    g.globalAlpha = 1 - i * 0.25;
    g.beginPath();
    g.moveTo(S * 0.5, S * (0.95 - 0.75 * h));
    g.quadraticCurveTo(S * (0.5 + 0.22 * w), S * 0.62, S * (0.5 + 0.15 * w), S * 0.9);
    g.quadraticCurveTo(S * 0.5, S * 0.96, S * (0.5 - 0.15 * w), S * 0.9);
    g.quadraticCurveTo(S * (0.5 - 0.22 * w), S * 0.62, S * 0.5, S * (0.95 - 0.75 * h));
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1;
}

const PAINTERS: Record<MotifKind, (g: CanvasRenderingContext2D) => void> = {
  galley: drawGalley,
  rower: drawRower,
  standing: drawStanding,
  reaching: drawReaching,
  bound: drawBound,
  kneeling: drawKneeling,
  eye: drawEye,
  hand: drawHand,
  siren: drawSiren,
  loom: drawLoom,
  flock: drawFlock,
  shades: drawShades,
  wreath: drawWreath,
  threshold: drawThreshold,
  wave: drawWave,
  flame: drawFlame,
};

/** 取一张母题的透明底剪影贴图。 */
export function motifTexture(kind: MotifKind): THREE.Texture {
  const hit = cache.get(kind);
  if (hit) return hit;
  const { canvas, g } = ctx2d();
  PAINTERS[kind](g);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  cache.set(kind, texture);
  return texture;
}

const MOTIF_VERT = /* glsl */ `
  varying vec2 vUv;
  uniform float uBillboard;
  void main() {
    vUv = uv;
    if (uBillboard > 0.5) {
      // 面向相机的公告板：保留缩放，丢掉旋转
      vec3 scale = vec3(
        length(modelMatrix[0].xyz),
        length(modelMatrix[1].xyz),
        length(modelMatrix[2].xyz)
      );
      vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      gl_Position = projectionMatrix * (center + vec4(position.x * scale.x, position.y * scale.y, 0.0, 0.0));
    } else {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  }
`;

const MOTIF_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3 uInk;
  uniform float uOpacity;
  /** 0 → 1：从下往上"画"出来 */
  uniform float uReveal;
  /** 0 → 1：从上往下崩解成颗粒 */
  uniform float uDissolve;
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
  }

  void main() {
    float a = texture2D(uMap, vUv).a;
    if (a < 0.02) discard;

    // 浮现：一条带噪声的水平线扫过，像颜料被画上去
    float edge = uReveal * 1.25 - 0.12;
    float grain = hash(floor(vUv * 90.0)) * 0.16;
    float appear = smoothstep(edge - 0.16, edge + 0.02, vUv.y + grain);
    a *= 1.0 - appear;

    // 崩解：从上往下碎成颗粒
    if (uDissolve > 0.001) {
      float d = hash(floor(vUv * 130.0) + floor(uTime * 6.0) * 0.001);
      float threshold = uDissolve * 1.3 - (1.0 - vUv.y) * 0.3;
      a *= step(threshold, d);
    }

    if (a < 0.03) discard;
    gl_FragColor = vec4(uInk, a * uOpacity);
  }
`;

export interface MotifOptions {
  kind: MotifKind;
  /** 可选外部 alpha 纹理；不传时继续使用 kind 对应的程序化 Canvas。 */
  texture?: THREE.Texture;
  /** 世界尺寸（高度），宽度按贴图比例 1:1 */
  size: number;
  ink: number;
  /** 是否始终面向相机 */
  billboard?: boolean;
  opacity?: number;
  /**
   * 是否参与深度测试。
   *
   * 立在世界里的 NPC 要（它是这座岛上的一个东西，会被石头挡住）；
   * 幻象里的剪影不要——**一幅壁画没有深度**。让它们盖在世界之上，
   * 既符合"画在墙上"的读法，也免得记忆物件恰好在洞里时整段幻象被岩壁吃掉。
   */
  depthTest?: boolean;
  /** 同层绘制顺序，数字大的盖在上面 */
  renderOrder?: number;
}

/**
 * 一片剪影。幻象按节拍调用 reveal / dissolve，画面于是层层长出来又碎掉。
 */
export class Motif {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(options: MotifOptions) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: MOTIF_VERT,
      fragmentShader: MOTIF_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: options.depthTest ?? true,
      side: THREE.DoubleSide,
      uniforms: {
        uMap: { value: options.texture ?? motifTexture(options.kind) },
        uInk: { value: new THREE.Color(options.ink) },
        uOpacity: { value: options.opacity ?? 1 },
        uReveal: { value: 0 },
        uDissolve: { value: 0 },
        uTime: { value: 0 },
        uBillboard: { value: options.billboard ? 1 : 0 },
      },
    });
    const geometry = new THREE.PlaneGeometry(options.size, options.size);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = options.renderOrder ?? 10;
    this.mesh.visible = false;
  }

  set reveal(value: number) {
    this.material.uniforms.uReveal!.value = value;
    this.mesh.visible = value > 0.001;
  }

  set dissolve(value: number) {
    this.material.uniforms.uDissolve!.value = value;
  }

  set opacity(value: number) {
    this.material.uniforms.uOpacity!.value = value;
  }

  setInk(hex: number): void {
    (this.material.uniforms.uInk!.value as THREE.Color).setHex(hex);
  }

  tick(time: number): void {
    this.material.uniforms.uTime!.value = time;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/** 页面卸载时释放母题贴图。 */
export function disposeMotifs(): void {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}

/** 供测试用：全部母题的名字。 */
export const MOTIF_KINDS = Object.keys(PAINTERS) as MotifKind[];

/**
 * 每个母题的"脚底"在画布里的位置，按贴图高度的比例记（0 = 贴到底边）。
 *
 * 剪影是一张正方形贴片，人物不一定画满整张——跪坐的人下面留了近三成空白。
 * 把这个偏移量记下来，立在世界里时才能让脚踩在地上，而不是浮在半空。
 * 只有会被当成 NPC 立在场景里的母题需要它，其余在幻象里按构图摆，用不到。
 */
export const MOTIF_FOOT: Partial<Record<MotifKind, number>> = {
  standing: 0.045,
  reaching: 0.035,
  kneeling: 0.28,
  bound: 0.03,
};
