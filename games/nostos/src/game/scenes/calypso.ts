import { TEXT } from '../../content/script';
import {
  boatHull,
  boulder,
  columnDrum,
  cypress,
  pole,
  sailCloth,
  stoneBlock,
} from '../../world/props';
import type { Act } from './types';

const T = TEXT.calypso;

/**
 * 第六幕 · 卡吕普索之岛
 *
 * 永昼。太阳挂在高处不动，一切都被曝到发白，雪松在白光里是一列列黑竖线。
 * 这一幕的美是**过量的**——太亮、太安全、太完整，完整到让人喘不过气。
 *
 * 岛上唯一的"事件"是二十个树桩和海边一处被坐出来的岩石凹陷。
 * 七年的长度，用这两样东西量出来。
 */
export const calypso: Act = {
  def: {
    id: 'calypso',
    act: 6,
    title: '卡吕普索之岛',
    subtitle: '第七年',
    tone: '永生的代价。这里什么都好，好到没有尽头——而他要的恰恰是一个有尽头的人生。',
    env: 'endlessDay',
    audio: 'endlessDay',
    spawn: { x: 4, z: 33, yaw: -0.15 },
    memoryId: 'calypso.axe',
    arrival: { pan: 0.55, seconds: 9 },
    interactables: [
      {
        id: 'calypso.hollow',
        kind: 'clue',
        prompt: '坐下来看海',
        lines: T.clue.hollow,
        x: 18,
        z: 16,
        y: 0.7,
        radius: 3.4,
      },
      {
        id: 'calypso.spring',
        kind: 'clue',
        prompt: '看四道泉',
        lines: T.clue.spring,
        x: -14,
        z: 6,
        y: 0.4,
        radius: 3.4,
      },
      {
        id: 'calypso.stumps',
        kind: 'clue',
        prompt: '数树桩',
        lines: T.clue.stumps,
        x: 8,
        z: -6,
        y: 0.5,
        radius: 3.6,
      },
      {
        id: 'calypso.loom',
        kind: 'clue',
        prompt: '看织了一半的布',
        lines: T.clue.loom,
        x: -9,
        z: -19,
        y: 1.4,
      },
      {
        id: 'calypso.robe',
        kind: 'clue',
        prompt: '看那件衣服',
        lines: T.clue.robe,
        x: -13,
        z: -22,
        y: 1.5,
      },
      {
        id: 'calypso.host',
        kind: 'talk',
        prompt: '和她说话',
        lines: T.talk,
        speaker: T.npcName,
        motif: 'standing',
        motifSize: 2.0,
        x: -5,
        z: -24,
        y: 1.1,
        radius: 3.4,
      },
      {
        id: 'calypso.axe',
        kind: 'memory',
        prompt: '拿起斧子',
        lines: T.memory,
        x: 10,
        z: -19,
        y: 0.6,
        radius: 2.8,
      },
      {
        id: 'calypso.depart',
        kind: 'depart',
        prompt: '上自己造的船',
        lines: [],
        x: 6,
        z: 36,
        y: 0.8,
        radius: 3.6,
        requiresMemory: true,
      },
    ],
    vision: {
      id: 'calypso.vision',
      duration: 66,
      stage: { x: 10, y: 0.6, z: -19 },
      beats: [
        {
          at: 0.8,
          line: T.vision[0],
          camera: { yaw: 0, pitch: 0.03, fov: -5, ease: 3 },
          motif: { kind: 'standing', x: 0, y: 2.0, z: -8, size: 4, grow: 2.4 },
        },
        {
          at: 5.4,
          line: T.vision[1],
          motif: { kind: 'wave', x: 0, y: 1.0, z: -15, size: 18, grow: 3.4, ink: 'shadow', opacity: 0.42 },
          camera: { yaw: 0.12, pitch: -0.02, fov: -2, ease: 4.5 },
        },
        {
          at: 11.6,
          line: T.vision[2],
          motif: { kind: 'threshold', x: -7.5, y: 3.2, z: -12, size: 8, grow: 2.4, ink: 'shadow', opacity: 0.55 },
          camera: { yaw: -0.24, ease: 4 },
        },
        {
          at: 18.0,
          line: T.vision[3],
          motif: { kind: 'wreath', x: 0, y: 4.4, z: -10, size: 5.6, grow: 2.2 },
          camera: { yaw: 0, pitch: 0.08, fov: -9, ease: 3.5 },
          exposure: 1.28,
        },
        {
          at: 24.6,
          line: T.vision[4],
          motif: { kind: 'shades', x: 6.5, y: 2.4, z: -12, size: 9, grow: 2.6, ink: 'shadow', opacity: 0.5 },
        },
        { at: 31.4, line: T.vision[5] },
        {
          at: 36.4,
          line: T.vision[6],
          camera: { yaw: 0, pitch: 0, fov: -13, ease: 2.4 },
        },
        {
          at: 41.6,
          line: T.vision[7],
          exposure: 0.88,
        },
        {
          at: 47.6,
          line: T.vision[8],
        },
        {
          at: 53.2,
          line: T.vision[9],
          motif: { kind: 'galley', x: 0, y: 4.6, z: -20, size: 15, grow: 2.6 },
          camera: { yaw: 0.05, pitch: -0.03, fov: 3, ease: 4 },
        },
      ],
    },
  },

  terrain: {
    seed: 20260701,
    radius: 40,
    amplitude: 2.8,
    frequency: 0.034,
    dome: 4.8,
    ridge: 0.6,
    detail: 'stone',
    colorFlat: 0xbdae8c,
    colorSteep: 0x8d7f62,
    colorHigh: 0xd2c4a2,
    heightStart: 4,
    heightEnd: 10,
    plateaus: [{ x: -8, z: -22, radius: 9, height: 4.2 }],
  },

  dress(d) {
    // ── 二十个树桩，正好够造一条船 ──
    for (let i = 0; i < 20; i += 1) {
      const a = (i / 20) * Math.PI * 1.6 - 0.5;
      const r = 5 + (i % 4) * 2.4;
      d.place(columnDrum(0.34 + d.rng() * 0.1, 0.5 + d.rng() * 0.3, 1900 + i), 'driftwood', {
        x: 8 + Math.cos(a) * r,
        z: -6 + Math.sin(a) * r,
        yaw: d.rng() * Math.PI,
        block: 0.4,
      });
    }

    // ── 还站着的雪松：白光里的一列列黑竖线 ──
    const cedars: Array<[number, number, number]> = [
      [22, -4, 9],
      [26, -12, 8.2],
      [19, -16, 10],
      [28, 2, 7.6],
      [24, -22, 8.8],
      [-20, -8, 9.4],
      [-25, -16, 8],
      [-18, -30, 9],
      [16, -28, 7.4],
      [-27, 2, 8.6],
    ];
    for (const [x, z, height] of cedars) {
      d.place(cypress(height, 1950 + Math.floor(x * 3 + z)), 'olive', { x, z, block: 0.8 });
    }

    // ── 被坐出来的那处凹陷：一块朝海的岩石 ──
    d.place(boulder(2.4, 1980), 'limestone', { x: 18, z: 16, scale: [1.4, 0.55, 1.2], block: 1.6 });
    d.place(boulder(1.1, 1981), 'limestone', { x: 20.4, z: 17.6, block: 0.9 });

    // ── 四道泉：从一处流出，分向四边（用浅色石带表示水路）──
    for (let arm = 0; arm < 4; arm += 1) {
      const a = arm * (Math.PI / 2) + 0.4;
      for (let i = 1; i < 12; i += 1) {
        d.place(boulder(0.26 + d.rng() * 0.12, 2000 + arm * 20 + i, 1), 'bone', {
          x: -14 + Math.cos(a) * i * 1.6 + (d.rng() - 0.5) * 0.6,
          z: 6 + Math.sin(a) * i * 1.6 + (d.rng() - 0.5) * 0.6,
          lift: -0.14,
          scale: [1.3, 0.35, 1.3],
        });
      }
    }
    d.place(boulder(1.3, 2090), 'limestone', { x: -14, z: 6, scale: [1.2, 0.5, 1.2], block: 1 });

    // ── 洞口的织机与那件从没穿过的衣服 ──
    const CAVE = 4.2;
    d.place(pole(3.4, 0.1, 2100), 'driftwood', { x: -10.6, z: -19, y: CAVE, block: 0.4 });
    d.place(pole(3.4, 0.1, 2101), 'driftwood', { x: -7.4, z: -19, y: CAVE, block: 0.4 });
    d.place(stoneBlock(3.6, 0.14, 0.16, 2102, 0.05), 'driftwood', { x: -9, z: -19, y: CAVE + 3.3 });
    d.place(sailCloth(3.0, 2.0, 0.3, 2103), 'cloth', { x: -9, z: -19.06, y: CAVE + 2.1 });

    d.place(pole(2.6, 0.08, 2110), 'driftwood', { x: -13, z: -22, y: CAVE, block: 0.35 });
    d.place(sailCloth(1.5, 2.0, 0.42, 2111), 'cloth', { x: -13, z: -22.1, y: CAVE + 1.5 });

    // ── 洞：几块巨岩围出的半开空间，但这里的洞是亮的 ──
    const cave: Array<[number, number, number, number]> = [
      [-15.5, -27, 4.6, 2120],
      [-4.5, -27.5, 4.8, 2121],
      [-10, -31, 5.4, 2122],
    ];
    for (const [x, z, r, seed] of cave) {
      d.place(boulder(r, seed), 'limestone', { x, z, y: CAVE - 1.2, block: r * 0.8 });
    }

    // ── 伐木的斧（核心记忆）：搁在一个树桩上 ──
    d.place(columnDrum(0.42, 0.66, 2130), 'driftwood', { x: 10, z: -19, block: 0.5 });
    d.place(stoneBlock(0.62, 0.1, 0.22, 2131, 0.2), 'bronze', { x: 10, z: -19, lift: 0.68, yaw: 0.6, tiltZ: 0.12 });
    d.place(pole(0.8, 0.045, 2132), 'driftwood', { x: 10.15, z: -19.2, lift: 0.7, tiltX: 1.45, yaw: 0.6 });

    // ── 卵石与低矮的灌木，把过曝的地面撑住 ──
    d.scatter(44, {
      innerRadius: 8,
      outerRadius: 38,
      minSpacing: 2.6,
      minHeight: 0.5,
      make: (_, rng) => ({
        geometry: boulder(0.32 + rng() * 1.0, 2200 + Math.floor(rng() * 900)),
        surface: 'limestone' as const,
        place: { yaw: rng() * Math.PI, lift: -0.12 },
      }),
    });

    // ── 他自己造的那条船 ──
    d.place(boatHull(6.2, 2300), 'driftwood', { x: 6, z: 36, lift: 0.42, yaw: -0.28, tiltZ: 0.05 });
    d.place(pole(4.4, 0.11, 2301), 'driftwood', { x: 6.2, z: 35.6, lift: 0.76, tiltX: 0.1 });
    d.place(sailCloth(3.0, 3.0, 0.35, 2302), 'cloth', { x: 6.2, z: 35.5, lift: 3.2 });
  },
};
