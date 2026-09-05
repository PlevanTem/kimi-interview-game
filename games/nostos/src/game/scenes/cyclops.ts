import { TEXT } from '../../content/script';
import { boatHull, boulder, crushedShield, plank, pole, ribBone, stoneBlock, woolTuft } from '../../world/props';
import type { Act } from './types';

const T = TEXT.cyclops;

/**
 * 第二幕 · 独眼岬
 *
 * 雷暴，强逆光。玄武岩的层理被雨浇成一道道黑亮的横纹，海在下面砸礁。
 * 岛的构图只有一件事：**把玩家推向那个洞口**。所有可读的东西都在半路上——
 * 羊栏、压扁的盾、比人高的肋骨——每一件都在把"这里住着什么"的尺度往上抬。
 *
 * 洞里没有怪物。全作最恐怖的一幕，恐怖的是主角自己在船尾喊出的那句话。
 */
export const cyclops: Act = {
  def: {
    id: 'cyclops',
    act: 2,
    title: '独眼岬',
    subtitle: '第六个失去的人',
    tone: '幽闭与代价。赢了之后还要再赢一次的那种人，最后输给的是自己的名字。',
    env: 'thunderCape',
    audio: 'storm',
    spawn: { x: 6, z: 36, yaw: 0.2 },
    memoryId: 'cyclops.stake',
    arrival: { pan: -0.7, seconds: 8 },
    interactables: [
      {
        id: 'cyclops.pen',
        kind: 'clue',
        prompt: '看羊栏',
        lines: T.clue.pen,
        x: -14,
        z: 18,
        y: 1,
        radius: 3.4,
      },
      {
        id: 'cyclops.bone',
        kind: 'clue',
        prompt: '看肋骨',
        lines: T.clue.bone,
        x: 13,
        z: 8,
        y: 2.2,
        radius: 3.6,
      },
      {
        id: 'cyclops.shield',
        kind: 'clue',
        prompt: '认那面盾',
        lines: T.clue.shield,
        x: -6,
        z: 2,
        y: 0.4,
      },
      {
        id: 'cyclops.wool',
        kind: 'clue',
        prompt: '看石缝',
        lines: T.clue.wool,
        x: 4,
        z: -10,
        y: 1.2,
      },
      {
        id: 'cyclops.char',
        kind: 'clue',
        prompt: '看焦木',
        lines: T.clue.char,
        x: -3,
        z: -20,
        y: 0.5,
      },
      {
        id: 'cyclops.stake',
        kind: 'memory',
        prompt: '拿起木桩',
        lines: T.memory,
        x: 0,
        z: -27,
        y: 0.7,
        radius: 3,
      },
      {
        id: 'cyclops.depart',
        kind: 'depart',
        prompt: '回到船上',
        lines: [],
        x: 8,
        z: 38,
        y: 0.8,
        radius: 3.6,
        requiresMemory: true,
      },
    ],
    vision: {
      id: 'cyclops.vision',
      duration: 84,
      stage: { x: 0, y: 0.8, z: -27 },
      beats: [
        {
          at: 0.8,
          line: T.vision[0],
          camera: { yaw: 0, pitch: -0.04, fov: -4, ease: 3 },
          motif: { kind: 'threshold', x: 0, y: 4.2, z: -13, size: 11, grow: 3, ink: 'shadow' },
        },
        {
          at: 6.2,
          line: T.vision[1],
          motif: { kind: 'standing', x: -3.6, y: 1.8, z: -8, size: 3.4, grow: 1.4, crumbleAt: 11 },
        },
        {
          at: 11.6,
          line: T.vision[2],
          motif: { kind: 'eye', x: 0, y: 6.5, z: -17, size: 13, grow: 3.4 },
          camera: { yaw: 0, pitch: 0.12, fov: -10, ease: 4 },
        },
        {
          at: 17.8,
          line: T.vision[3],
          motif: { kind: 'flame', x: 0, y: 2.6, z: -9, size: 5.2, grow: 1.2 },
          exposure: 1.35,
        },
        {
          at: 23.6,
          line: T.vision[4],
          camera: { yaw: -0.18, pitch: 0.02, fov: -2, ease: 3.5 },
        },
        {
          at: 28.8,
          line: T.vision[5],
          motif: { kind: 'hand', x: -6.5, y: 4.2, z: -12, size: 9, grow: 1.8, crumbleAt: 40 },
        },
        {
          at: 34.4,
          line: T.vision[6],
          exposure: 0.7,
        },
        {
          at: 39.4,
          line: T.vision[7],
          motif: { kind: 'flock', x: 5.2, y: 1.6, z: -8.5, size: 6.5, grow: 2 },
          camera: { yaw: 0.22, pitch: -0.08, fov: 4, ease: 4 },
        },
        {
          at: 45.6,
          line: T.vision[8],
          motif: { kind: 'galley', x: 1.5, y: 5.2, z: -22, size: 18, grow: 2.6 },
          camera: { yaw: 0, pitch: 0.03, fov: -6, ease: 4 },
        },
        {
          at: 51.6,
          line: T.vision[9],
          motif: { kind: 'standing', x: 0.4, y: 2.4, z: -10.5, size: 4.6, grow: 1.1 },
        },
        {
          at: 57.4,
          line: T.vision[10],
          camera: { yaw: 0, pitch: 0.1, fov: -14, ease: 2.4 },
          exposure: 1.25,
        },
        {
          at: 64.0,
          line: T.vision[11],
          motif: { kind: 'eye', x: 0, y: 7.5, z: -16, size: 16, grow: 1.6, ink: 'shadow' },
          exposure: 0.75,
        },
        {
          at: 71.4,
          line: T.vision[12],
          motif: { kind: 'wave', x: 0, y: 1.6, z: -7, size: 20, grow: 2.2, ink: 'shadow', opacity: 0.7 },
          camera: { yaw: 0, pitch: -0.12, fov: 6, ease: 4 },
        },
      ],
    },
  },

  terrain: {
    seed: 20260301,
    radius: 44,
    amplitude: 4.6,
    frequency: 0.058,
    dome: 5.5,
    ridge: 3.2,
    detail: 'stone',
    colorFlat: 0x5a5450,
    colorSteep: 0x36332f,
    colorHigh: 0x6b6560,
    heightStart: 5,
    heightEnd: 13,
    plateaus: [{ x: 0, z: -30, radius: 13, height: 3.2 }],
    basins: [{ x: 0, z: -14, radius: 12, depth: 1.6 }],
  },

  dress(d) {
    // ── 羊栏：石头太大，不是给人搬的 ──
    for (let i = 0; i < 22; i += 1) {
      const t = i / 22;
      const a = -0.9 + t * 2.6;
      const r = 7.5 + Math.sin(t * 9) * 0.8;
      d.place(stoneBlock(1.5 + d.rng() * 0.9, 1.0 + d.rng() * 0.5, 1.2, 600 + i, 0.12), 'darkRock', {
        x: -14 + Math.cos(a) * r,
        z: 18 + Math.sin(a) * r,
        yaw: a + 1.57 + (d.rng() - 0.5) * 0.3,
        tiltZ: (d.rng() - 0.5) * 0.12,
        block: 1.1,
      });
    }

    // ── 巨兽的肋骨：这一幕的尺度锚 ──
    for (let i = 0; i < 5; i += 1) {
      d.place(ribBone(6.5 - i * 0.6, 620 + i), 'bone', {
        x: 13 + i * 2.1,
        z: 8 - i * 1.4,
        yaw: -0.5 + i * 0.12,
        tiltZ: 0.25 + i * 0.05,
        block: 0.7,
      });
    }
    d.place(ribBone(7.4, 630), 'bone', { x: 10.5, z: 11.5, yaw: 2.4, tiltZ: -0.5, block: 0.8 });

    // ── 被压成一张饼的青铜盾 ──
    // 原来是一块压扁的卵石，而且 lift 给到 -0.6：盾面半高只有 15 厘米，
    // 整面盾沉在地下 45 厘米，玩家走到跟前也什么都看不见。
    // 现在用真的盾形（碟面 + 中央盾脐，纹章就在盾脐上），只略微陷进土里。
    d.place(crushedShield(1.15, 640), 'bronze', { x: -6, z: 2, lift: -0.03, yaw: 0.6, tiltZ: 0.05 });

    // ── 洞口：几块巨岩围出的拱，里面是黑的 ──
    const mouth: Array<[number, number, number, number]> = [
      [-6.2, -24.5, 4.4, 650],
      [-4.4, -28.5, 5.2, 651],
      [6.4, -24.2, 4.6, 652],
      [4.8, -28.8, 5.4, 653],
      [-1.5, -32.5, 6.2, 654],
      [2.6, -33.2, 5.8, 655],
    ];
    for (const [x, z, r, seed] of mouth) {
      d.place(boulder(r, seed), 'basalt', { x, z, yaw: seed * 0.7, block: r * 0.82 });
    }
    // 洞顶的压梁，让洞口成为一个"门"而不是一堆石头
    d.place(stoneBlock(13, 2.6, 5, 660, 0.1), 'basalt', { x: 0, z: -28.5, lift: 4.6, yaw: 0.05 });
    // 洞的后壁：把光完全吃掉
    d.place(stoneBlock(14, 7, 2.4, 661, 0.08), 'basalt', { x: 0, z: -34.5, block: 5 });

    // ── 石缝里的羊毛 ──
    //
    // 这是全幕最不该被看错的一处：它是奥德修斯把人绑在羊肚子底下、
    // 贴着石壁拖出洞口留下的痕迹。原来用的是小卵石，圆滚滚地浮在半空，
    // 读出来是七颗蛋，跟"羊毛"没有关系。
    //
    // 改成扁长的一绺，**贴着石头的立面**卡进去（不再悬空），
    // 顺着被拖走的方向排成一条线，配合 SURFACE.fleece 的纤维细节图。
    const CRACK_X = 5.6;
    const CRACK_Z = -10;
    d.place(stoneBlock(2.4, 2.2, 1.2, 675, 0.15), 'darkRock', {
      x: CRACK_X,
      z: CRACK_Z,
      yaw: 0.3,
      block: 1.3,
    });
    for (let i = 0; i < 9; i += 1) {
      const t = i / 8;
      d.place(woolTuft(0.22 + d.rng() * 0.12, 670 + i), 'fleece', {
        // 沿石头朝向洞口的那一面排开，稍微离面一点点，像被挤在缝里
        x: CRACK_X - 0.72 - d.rng() * 0.16,
        z: CRACK_Z - 1.05 + t * 2.1,
        // 高度错落：羊背蹭过的那一段，不是一条直线
        lift: 0.35 + Math.sin(t * 4.1) * 0.42 + d.rng() * 0.12,
        yaw: -1.35 + (d.rng() - 0.5) * 0.5,
        tiltZ: (d.rng() - 0.5) * 0.7,
      });
    }

    // ── 焦木堆与那根削尖的木桩 ──
    for (let i = 0; i < 8; i += 1) {
      d.place(plank(1.4 + d.rng() * 0.9, 0.2, 0.14, 680 + i), 'charredWood', {
        x: -3 + (d.rng() - 0.5) * 2.4,
        z: -20 + (d.rng() - 0.5) * 2.4,
        lift: 0.1 + d.rng() * 0.2,
        yaw: d.rng() * Math.PI,
        tiltZ: (d.rng() - 0.5) * 0.6,
      });
    }
    d.place(pole(3.8, 0.13, 690), 'charredWood', { x: 0, z: -27, lift: 0.15, tiltX: 1.28, yaw: 0.5 });

    // ── 礁石群：把海岸线咬得很碎，也让登岸那一眼有前景 ──
    d.scatter(58, {
      innerRadius: 10,
      outerRadius: 42,
      minSpacing: 2.4,
      minHeight: 0.2,
      maxSlope: 1.1,
      make: (_, rng) => ({
        geometry: boulder(0.5 + rng() * 1.9, 700 + Math.floor(rng() * 900)),
        surface: rng() > 0.4 ? ('basalt' as const) : ('darkRock' as const),
        place: { yaw: rng() * Math.PI, lift: -0.25, block: 0.9 },
      }),
    });

    // ── 岸边的船 ──
    d.place(boatHull(5.6, 800), 'driftwood', { x: 8, z: 38, lift: 0.4, yaw: 0.4, tiltZ: -0.08 });
    d.place(pole(3.9, 0.1, 801), 'driftwood', { x: 8.2, z: 37.6, lift: 0.72, tiltX: -0.15 });
  },
};
