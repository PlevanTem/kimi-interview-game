import { TEXT } from '../../content/script';
import {
  boatHull,
  boulder,
  brazier,
  flutedColumn,
  oliveTree,
  pole,
  ribBone,
  sailCloth,
  stoneBlock,
} from '../../world/props';
import type { Act } from './types';

const T = TEXT.ithaca;

/**
 * 终章 · 伊萨卡
 *
 * 雾正在散。这是全作唯一一幕**没有废墟**的岛：房子是完整的，屋顶在冒烟，
 * 橄榄树还在长。所有前面几幕堆起来的断柱与沉船，在这里全部缺席——
 * 缺席本身就是结局。
 *
 * 这里没有 NPC。没有号角，没有跑过来的人。核心记忆物件是一块门槛石，
 * 触碰它，主角说出全作的第一个也是唯一一个名字。
 */
export const ithaca: Act = {
  def: {
    id: 'ithaca',
    act: 7,
    title: '伊萨卡',
    subtitle: '第二十年',
    tone: '抵达后的空茫。想了二十年的那一刻真的到了，安静得几乎像一场误会。',
    env: 'ithacaClearing',
    audio: 'calmShore',
    spawn: { x: -2, z: 32, yaw: 0 },
    memoryId: 'ithaca.threshold',
    arrival: { pan: 0.4, seconds: 10 },
    interactables: [
      {
        id: 'ithaca.smoke',
        kind: 'clue',
        prompt: '看屋顶',
        lines: T.clue.smoke,
        x: 4,
        z: 14,
        y: 1.6,
        radius: 3.6,
      },
      {
        id: 'ithaca.olive',
        kind: 'clue',
        prompt: '摸树干',
        lines: T.clue.olive,
        x: -11,
        z: 2,
        y: 1.5,
      },
      {
        id: 'ithaca.dog',
        kind: 'clue',
        prompt: '看门边的骨头',
        lines: T.clue.dog,
        x: 6,
        z: -6,
        y: 0.3,
      },
      {
        id: 'ithaca.cloth',
        kind: 'clue',
        prompt: '看那块布',
        lines: T.clue.cloth,
        x: -6,
        z: -10,
        y: 1.3,
      },
      {
        id: 'ithaca.threshold',
        kind: 'memory',
        prompt: '站到门槛前',
        lines: T.memory,
        x: 0,
        z: -16,
        y: 0.5,
        radius: 3,
      },
    ],
    vision: {
      id: 'ithaca.vision',
      // 58 → 70：终幕多了两拍（"脸我记不住" / "他们还是一片影子"），
      // 后面每一拍都顺延，最后一句要放得完
      duration: 70,
      stage: { x: 0, y: 0.5, z: -16 },
      beats: [
        {
          at: 1.0,
          line: T.vision[0],
          camera: { yaw: 0, pitch: 0.02, fov: -4, ease: 3.5 },
          motif: { kind: 'threshold', x: 0, y: 3.4, z: -9, size: 8.5, grow: 3.4 },
        },
        { at: 6.6, line: T.vision[1] },
        {
          at: 12.0,
          line: T.vision[2],
          exposure: 0.9,
        },
        {
          at: 16.6,
          line: T.vision[3],
          motif: { kind: 'flame', x: 0, y: 1.6, z: -6, size: 3.2, grow: 2.6 },
          camera: { yaw: 0, pitch: -0.03, fov: -7, ease: 4 },
        },
        {
          at: 22.4,
          line: T.vision[4],
          // crumbleAt 33 → 46：后面插了两拍，原来的崩解时刻会赶在它该在的时候之前
          motif: { kind: 'galley', x: -9, y: 5.4, z: -20, size: 15, grow: 2.4, ink: 'shadow', opacity: 0.5, crumbleAt: 46 },
        },
        {
          // "脸我记不住。那不是海拿走的，是我自己没有看。"
          // 这一拍**刻意不给母题**：他正在说的是一件他手上没有的东西。
          // 画面上什么也不浮现，才是"想不起来"本身。镜头微微往后退。
          at: 28.4,
          line: T.vision[5],
          camera: { yaw: 0, pitch: -0.05, fov: 3, ease: 4 },
        },
        {
          // "他们还是一片影子。可这一次，我站住了。"
          // 亡者的行列挪到这一拍来：台词说"一片影子"，画面就正好浮出一列剪影。
          // 全作的视觉约定在这里被台词认领，也在这里散场。
          at: 35.6,
          line: T.vision[6],
          motif: { kind: 'shades', x: 8.5, y: 2.8, z: -15, size: 11, grow: 3, ink: 'shadow', opacity: 0.55, crumbleAt: 60 },
          camera: { yaw: 0.26, pitch: 0.02, ease: 4.5 },
        },
        {
          at: 42.4,
          line: T.vision[7],
          camera: { yaw: 0, pitch: 0, fov: -8, ease: 4 },
        },
        {
          at: 49.6,
          line: T.vision[8],
          camera: { yaw: 0, pitch: 0, fov: -12, ease: 3.5 },
        },
        {
          at: 56.4,
          line: T.vision[9],
          motif: { kind: 'wreath', x: 0, y: 3.2, z: -8, size: 5, grow: 1.6 },
          exposure: 1.22,
        },
        {
          at: 63.0,
          line: T.vision[10],
          camera: { yaw: 0, pitch: 0.04, fov: -16, ease: 3 },
        },
      ],
    },
  },

  terrain: {
    seed: 20260801,
    radius: 38,
    amplitude: 2.0,
    frequency: 0.03,
    dome: 4.4,
    ridge: 0.3,
    detail: 'stone',
    colorFlat: 0x9c8f6a,
    colorSteep: 0x776a4e,
    colorHigh: 0xb2a37a,
    heightStart: 3.5,
    heightEnd: 9,
    plateaus: [{ x: 0, z: -12, radius: 14, height: 4.6 }],
  },

  dress(d) {
    const YARD = 4.6;

    // ── 屋：全作唯一一座完整的建筑 ──
    // 台基
    // 台基顶面与院子地面齐平，玩家才不会半个身子陷进石板里
    d.place(stoneBlock(14, 0.6, 11, 2400, 0.02), 'limestone', { x: 0, z: -20, y: YARD - 0.6 });
    // 墙
    d.place(stoneBlock(14, 4.2, 0.8, 2401, 0.03), 'paintedPlaster', { x: 0, z: -25, y: YARD, block: 3 });
    d.place(stoneBlock(0.8, 4.2, 10, 2402, 0.03), 'paintedPlaster', { x: -6.6, z: -20, y: YARD, block: 2.4 });
    d.place(stoneBlock(0.8, 4.2, 10, 2403, 0.03), 'paintedPlaster', { x: 6.6, z: -20, y: YARD, block: 2.4 });
    // 正面：两段墙留出中间的门
    d.place(stoneBlock(4.6, 4.2, 0.8, 2404, 0.03), 'paintedPlaster', { x: -4.7, z: -15.6, y: YARD, block: 1.8 });
    d.place(stoneBlock(4.6, 4.2, 0.8, 2405, 0.03), 'paintedPlaster', { x: 4.7, z: -15.6, y: YARD, block: 1.8 });
    // 门楣
    d.place(stoneBlock(6.4, 0.8, 1.0, 2406, 0.04), 'limestone', { x: 0, z: -15.6, y: YARD + 4.2 });
    // 门廊的两根柱
    for (const side of [-1, 1]) {
      d.place(flutedColumn({ height: 4.4, radius: 0.34, seed: 2410 + side, broken: 0 }), 'limestone', {
        x: side * 2.6,
        z: -13.4,
        y: YARD,
        block: 0.5,
      });
    }
    d.place(stoneBlock(7.6, 0.7, 1.2, 2412, 0.04), 'limestone', { x: 0, z: -13.4, y: YARD + 4.4 });
    // 屋顶
    d.place(stoneBlock(14.4, 0.5, 11.6, 2413, 0.03), 'limestone', { x: 0, z: -20, y: YARD + 4.2 });

    // ── 门槛石：中间被踩出一道（核心记忆）──
    d.place(stoneBlock(3.4, 0.42, 1.3, 2420, 0.02), 'weatheredMarble', { x: 0, z: -16, y: YARD });
    d.place(boulder(0.9, 2421, 2), 'weatheredMarble', { x: 0, z: -16, y: YARD + 0.42, scale: [1.7, 0.1, 0.65] });

    // ── 屋顶上的烟：一个还在烧的火盆，从院子里能看见 ──
    d.place(brazier(0.75, 0.9, 2430), 'bronze', { x: 4, z: -14, y: YARD, block: 0.7 });

    // ── 那条狗趴过的地方 ──
    for (let i = 0; i < 6; i += 1) {
      d.place(ribBone(0.5 + d.rng() * 0.25, 2440 + i), 'bone', {
        x: 6 + (d.rng() - 0.5) * 1.1,
        z: -6 + (d.rng() - 0.5) * 1.1,
        y: YARD,
        lift: 0.02,
        yaw: d.rng() * Math.PI,
        tiltZ: 1.4 + d.rng() * 0.3,
      });
    }

    // ── 织了又拆的那块布 ──
    d.place(pole(2.8, 0.09, 2450), 'driftwood', { x: -7.4, z: -10, y: YARD, block: 0.4 });
    d.place(pole(2.8, 0.09, 2451), 'driftwood', { x: -4.6, z: -10, y: YARD, block: 0.4 });
    d.place(stoneBlock(3.2, 0.12, 0.14, 2452, 0.05), 'driftwood', { x: -6, z: -10, y: YARD + 2.72 });
    d.place(sailCloth(2.7, 1.9, 0.3, 2453), 'cloth', { x: -6, z: -10.06, y: YARD + 1.6 });

    // ── 那棵橄榄树：全作最后一件被触碰的活物 ──
    for (const [x, z, height, seed, block] of [
      [-11, 2, 5.2, 2460, 0.8],
      [-15, -3, 4.4, 2462, 0.7],
      [13, -2, 4.8, 2464, 0.75],
    ] as const) {
      const tree = oliveTree(height, seed);
      d.place(tree.trunk, 'driftwood', { x, z, block });
      d.place(tree.canopy, 'olive', { x, z, lift: tree.canopyLift });
    }

    // ── 从岸边通向院子的路：两侧的石 ──
    for (let i = 0; i < 12; i += 1) {
      const t = i / 11;
      const z = 26 - t * 20;
      for (const side of [-1, 1]) {
        d.place(boulder(0.3 + d.rng() * 0.25, 2470 + i * 2 + (side > 0 ? 1 : 0)), 'limestone', {
          x: side * (3.2 + Math.sin(t * 4) * 0.6),
          z,
          lift: -0.1,
        });
      }
    }

    // ── 主角带回来的那条船，留在岸上 ──
    d.place(boatHull(5.6, 2500), 'driftwood', { x: -6, z: 33, lift: 0.4, yaw: 0.5, tiltZ: 0.1 });

    d.scatter(38, {
      innerRadius: 16,
      outerRadius: 36,
      minSpacing: 2.6,
      minHeight: 0.5,
      make: (_, rng) => ({
        geometry: boulder(0.32 + rng() * 1.0, 2600 + Math.floor(rng() * 900)),
        surface: 'limestone' as const,
        place: { yaw: rng() * Math.PI, lift: -0.12 },
      }),
    });
  },
};
