import { TEXT } from '../../content/script';
import { boatHull, boulder, plank, pole, ribBone, sailCloth, shipRib, stoneBlock } from '../../world/props';
import type { Act } from './types';

const T = TEXT.sirens;

/**
 * 第五幕 · 塞壬水道
 *
 * 铅灰海雾，能见度最低的一幕。礁石之间横七竖八全是船——**船头都朝着同一个方向**，
 * 朝里。玩家沿着这条由沉船排成的甬道往里走，走到最后是一截立着的桅杆。
 *
 * 这一幕不给任何"美"的奖励：没有黄昏，没有金光，只有湿冷的灰和白骨。
 * 因为它讲的是主角唯一一次心甘情愿被绑起来。
 */
export const sirens: Act = {
  def: {
    id: 'sirens',
    act: 5,
    title: '塞壬水道',
    subtitle: '两块礁石之间',
    tone: '诱惑与自缚。他不是被骗的那一个，他是提前知道自己会求饶、于是先堵住别人耳朵的那一个。',
    env: 'leadenStrait',
    audio: 'strait',
    spawn: { x: 0, z: 34, yaw: 0 },
    memoryId: 'sirens.rope',
    arrival: { pan: -0.5, seconds: 8 },
    interactables: [
      {
        id: 'sirens.wrecks',
        kind: 'clue',
        prompt: '看船头的方向',
        lines: T.clue.wrecks,
        x: -10,
        z: 18,
        y: 1.4,
        radius: 3.6,
      },
      {
        id: 'sirens.log',
        kind: 'clue',
        prompt: '读记航板',
        lines: T.clue.log,
        x: 11,
        z: 9,
        y: 0.6,
      },
      {
        id: 'sirens.wax',
        kind: 'clue',
        prompt: '捡起蜡',
        lines: T.clue.wax,
        x: -8,
        z: -2,
        y: 0.4,
      },
      {
        id: 'sirens.bones',
        kind: 'clue',
        prompt: '看那些骨头',
        lines: T.clue.bones,
        x: 12,
        z: -12,
        y: 0.7,
        radius: 3.4,
      },
      {
        id: 'sirens.mast',
        kind: 'clue',
        prompt: '摸那圈磨痕',
        lines: T.clue.mast,
        x: -3,
        z: -20,
        y: 1.3,
      },
      {
        id: 'sirens.rope',
        kind: 'memory',
        prompt: '拿起绳子',
        lines: T.memory,
        x: 1,
        z: -27,
        y: 0.6,
        radius: 2.8,
      },
      {
        id: 'sirens.depart',
        kind: 'depart',
        prompt: '回到船上',
        lines: [],
        x: 3,
        z: 37,
        y: 0.8,
        radius: 3.6,
        requiresMemory: true,
      },
    ],
    vision: {
      id: 'sirens.vision',
      duration: 82,
      stage: { x: 1, y: 0.6, z: -27 },
      beats: [
        {
          at: 0.8,
          line: T.vision[0],
          camera: { yaw: 0, pitch: 0.05, fov: -4, ease: 3 },
          motif: { kind: 'bound', x: 0, y: 3.4, z: -11, size: 8, grow: 3 },
        },
        {
          at: 6.6,
          line: T.vision[1],
          motif: { kind: 'rower', x: -5.4, y: 1.6, z: -8, size: 4.4, grow: 1.6 },
        },
        {
          at: 11.6,
          line: T.vision[2],
          motif: { kind: 'rower', x: 5.4, y: 1.6, z: -8.4, size: 4.4, grow: 1.6 },
          camera: { yaw: 0, pitch: 0.02, fov: -8, ease: 4 },
        },
        {
          at: 16.6,
          line: T.vision[3],
          motif: { kind: 'siren', x: -7.5, y: 5.2, z: -15, size: 7.5, grow: 2.6 },
          camera: { yaw: -0.3, pitch: 0.08, ease: 4.5 },
        },
        {
          at: 23.0,
          line: T.vision[4],
          motif: { kind: 'siren', x: 7.8, y: 5.6, z: -16, size: 8, grow: 2.6 },
          camera: { yaw: 0.34, pitch: 0.09, ease: 4.5 },
        },
        {
          at: 30.0,
          line: T.vision[5],
          motif: { kind: 'siren', x: 0.4, y: 7.4, z: -19, size: 9, grow: 2.4 },
          camera: { yaw: 0, pitch: 0.14, fov: -6, ease: 4 },
        },
        {
          at: 37.0,
          line: T.vision[6],
          exposure: 1.16,
          camera: { yaw: 0, pitch: -0.02, fov: -12, ease: 2.2 },
        },
        { at: 43.0, line: T.vision[7] },
        {
          at: 49.4,
          line: T.vision[8],
          motif: { kind: 'rower', x: -5.4, y: 1.6, z: -8, size: 4.4, grow: 0.6, ink: 'shadow' },
        },
        {
          at: 56.0,
          line: T.vision[9],
          exposure: 0.8,
        },
        {
          at: 62.4,
          line: T.vision[10],
        },
        {
          at: 68.6,
          line: T.vision[11],
          motif: { kind: 'wave', x: 0, y: 1.4, z: -7, size: 18, grow: 2.4, ink: 'shadow', opacity: 0.6 },
          camera: { yaw: 0, pitch: -0.1, fov: 4, ease: 4 },
        },
      ],
    },
  },

  terrain: {
    seed: 20260601,
    radius: 40,
    amplitude: 3.4,
    frequency: 0.066,
    dome: 2.6,
    ridge: 2.8,
    detail: 'stone',
    colorFlat: 0x6d7178,
    colorSteep: 0x484d54,
    colorHigh: 0x7d818a,
    heightStart: 3.5,
    heightEnd: 9,
  },

  dress(d) {
    // ── 沉船甬道：船头全部朝里（-Z），排成一条把玩家往里带的路 ──
    const wrecks: Array<[number, number, number]> = [
      [-12, 22, 0.15],
      [13, 20, -0.2],
      [-15, 12, 0.1],
      [14, 8, -0.12],
      [-13, 0, 0.08],
      [15, -4, -0.18],
      [-11, -12, 0.05],
      [12, -16, -0.1],
    ];
    wrecks.forEach(([x, z, yaw], index) => {
      const seed = 1500 + index * 10;
      // 龙骨
      d.place(plank(9, 1.1, 0.4, seed), 'charredWood', { x, z, lift: 0.2, yaw, tiltZ: (d.rng() - 0.5) * 0.2 });
      // 肋骨：一具船的骨架
      for (let i = 0; i < 7; i += 1) {
        const t = (i - 3) * 1.15;
        for (const side of [-1, 1]) {
          d.place(shipRib(2.6 - Math.abs(t) * 0.16, side * 1.5, seed + i * 2 + (side > 0 ? 1 : 0)), 'charredWood', {
            x: x + Math.sin(yaw) * -t,
            z: z + Math.cos(yaw) * t,
            lift: 0.25,
            yaw: yaw + (side > 0 ? 0 : Math.PI),
            tiltX: 0.1,
            block: 0.5,
          });
        }
      }
      // 断桅
      if (index % 2 === 0) {
        d.place(pole(4.2 + d.rng() * 1.5, 0.13, seed + 30), 'charredWood', {
          x: x + 0.6,
          z,
          lift: 0.4,
          tiltX: 0.25 + d.rng() * 0.5,
          yaw,
          block: 0.5,
        });
      }
    });

    // ── 记航板：别人的，刻到一半 ──
    d.place(plank(2.4, 0.8, 0.14, 1600), 'driftwood', { x: 11, z: 9, lift: 0.15, yaw: -0.5, tiltZ: 0.1 });

    // ── 蜡：一小坨浅色的东西，在一块黑礁上 ──
    d.place(stoneBlock(1.4, 0.5, 1.2, 1610, 0.1), 'basalt', { x: -8, z: -2, block: 0.8 });
    d.place(boulder(0.2, 1611, 2), 'bone', { x: -8, z: -2, lift: 0.5, scale: [1.3, 0.7, 1.1] });

    // ── 坐着听什么的白骨 ──
    for (let i = 0; i < 9; i += 1) {
      const a = -0.4 + i * 0.34;
      d.place(ribBone(1.5 + d.rng() * 0.8, 1620 + i), 'bone', {
        x: 12 + Math.cos(a) * (3 + d.rng() * 2.5),
        z: -12 + Math.sin(a) * (3 + d.rng() * 2.5),
        yaw: a + Math.PI,
        tiltZ: 0.9 + d.rng() * 0.5,
      });
    }

    // ── 立着的那截桅杆：磨白的一圈在齐胸高度 ──
    d.place(pole(4.6, 0.19, 1650), 'driftwood', { x: -3, z: -20, block: 0.6 });
    d.place(sailCloth(2.6, 3.2, 0.5, 1651), 'cloth', { x: -3.2, z: -20.3, lift: 3.2, yaw: 0.4 });

    // ── 带牙印的绳（核心记忆）：盘在一块礁上 ──
    d.place(stoneBlock(1.6, 0.55, 1.4, 1660, 0.08), 'basalt', { x: 1, z: -27 });
    for (let i = 0; i < 5; i += 1) {
      d.place(boulder(0.42 - i * 0.05, 1661 + i, 1), 'cloth', {
        x: 1 + Math.cos(i * 1.3) * 0.25,
        z: -27 + Math.sin(i * 1.3) * 0.25,
        lift: 0.56 + i * 0.055,
        scale: [1.5, 0.22, 1.5],
      });
    }

    // ── 礁石：把水道两侧收紧，雾之外什么也看不见 ──
    d.scatter(64, {
      innerRadius: 16,
      outerRadius: 40,
      minSpacing: 2.6,
      minHeight: 0.2,
      maxSlope: 1.2,
      make: (_, rng) => ({
        geometry: boulder(0.7 + rng() * 2.4, 1700 + Math.floor(rng() * 900)),
        surface: rng() > 0.5 ? ('basalt' as const) : ('darkRock' as const),
        place: { yaw: rng() * Math.PI, lift: -0.35, block: 1.1 },
      }),
    });

    // ── 岸边的船 ──
    d.place(boatHull(5.6, 1800), 'driftwood', { x: 3, z: 37, lift: 0.4, yaw: -0.35, tiltZ: 0.07 });
    d.place(pole(3.9, 0.1, 1801), 'driftwood', { x: 3.2, z: 36.6, lift: 0.72, tiltX: 0.14 });
  },
};
