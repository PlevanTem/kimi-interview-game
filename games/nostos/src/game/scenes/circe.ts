import { TEXT } from '../../content/script';
import {
  amphora,
  boatHull,
  boulder,
  columnDrum,
  doricCapital,
  flutedColumn,
  oliveCanopy,
  oliveTrunk,
  pole,
  sailCloth,
  statueTorso,
  stoneBlock,
} from '../../world/props';
import type { Act } from './types';

const T = TEXT.circe;

/**
 * 第三幕 · 喀耳刻的柱廊
 *
 * 琥珀色的室内光，一丝风也没有。列柱把光切成一根根竖条，落在剥了大半的
 * 地面壁画上。这一幕唯一的敌人是**时间**：藤爬进来又爬回去，走完了一整年，
 * 而柱廊里的人一次也没有问过"我们该走了吗"。
 *
 * 构图规则：所有可读的东西都摆在柱距之间，玩家每走过一根柱子就换一幅画。
 */
export const circe: Act = {
  def: {
    id: 'circe',
    act: 3,
    title: '喀耳刻的柱廊',
    subtitle: '第一年',
    tone: '温柔的时间流失。没有人被囚禁，所有人只是坐下来吃饭，然后一年过去了。',
    env: 'amberColonnade',
    audio: 'hall',
    spawn: { x: 0, z: 33, yaw: 0 },
    memoryId: 'circe.cup',
    arrival: { pan: 0.45, seconds: 8 },
    interactables: [
      {
        id: 'circe.vine',
        kind: 'clue',
        prompt: '看藤',
        lines: T.clue.vine,
        x: -9.5,
        z: 14,
        y: 1.4,
      },
      {
        id: 'circe.mural',
        kind: 'clue',
        prompt: '看地上的画',
        lines: T.clue.mural,
        x: 0,
        z: 4,
        y: 0.2,
        radius: 3.6,
      },
      {
        id: 'circe.cups',
        kind: 'clue',
        prompt: '看那排杯子',
        lines: T.clue.cups,
        x: 9,
        z: -2,
        y: 0.9,
      },
      {
        id: 'circe.loom',
        kind: 'clue',
        prompt: '看织机',
        lines: T.clue.loom,
        x: -10,
        z: -12,
        y: 1.5,
        radius: 3.2,
      },
      {
        id: 'circe.roof',
        kind: 'clue',
        prompt: '看塌下来的地方',
        lines: T.clue.roof,
        x: 12,
        z: -16,
        y: 0.5,
      },
      {
        id: 'circe.host',
        kind: 'talk',
        prompt: '和她说话',
        lines: T.talk,
        speaker: T.npcName,
        motif: 'standing',
        motifSize: 2.0,
        x: -13,
        z: -12,
        y: 1.1,
        radius: 3.4,
      },
      {
        id: 'circe.cup',
        kind: 'memory',
        prompt: '拿起酒杯',
        lines: T.memory,
        x: 0,
        z: -22,
        y: 1,
        radius: 2.8,
      },
      {
        id: 'circe.depart',
        kind: 'depart',
        prompt: '回到船上',
        lines: [],
        x: 2,
        z: 36,
        y: 0.8,
        radius: 3.6,
        requiresMemory: true,
      },
    ],
    vision: {
      id: 'circe.vision',
      duration: 66,
      stage: { x: 0, y: 1, z: -22 },
      beats: [
        {
          at: 0.8,
          line: T.vision[0],
          camera: { yaw: 0, pitch: -0.02, fov: -5, ease: 3 },
          motif: { kind: 'kneeling', x: -3.8, y: 1.5, z: -8, size: 3.2, grow: 1.8 },
        },
        {
          at: 6.2,
          line: T.vision[1],
          motif: { kind: 'standing', x: 3.6, y: 2.1, z: -9, size: 4.2, grow: 2 },
        },
        {
          at: 12.0,
          line: T.vision[2],
          motif: { kind: 'wreath', x: 0, y: 3.6, z: -11, size: 5.2, grow: 2.4, ink: 'shadow', opacity: 0.6 },
          camera: { yaw: 0.08, fov: -8, ease: 4 },
        },
        { at: 16.6, line: T.vision[3] },
        { at: 20.4, line: T.vision[4] },
        {
          at: 24.6,
          line: T.vision[5],
          motif: { kind: 'loom', x: -5.5, y: 2.6, z: -12, size: 6.4, grow: 3.4 },
          camera: { yaw: -0.26, pitch: 0.02, fov: -3, ease: 5 },
        },
        {
          at: 31.4,
          line: T.vision[6],
          motif: { kind: 'standing', x: 5.4, y: 2.0, z: -10, size: 4, grow: 1.6 },
          camera: { yaw: 0.2, ease: 4 },
        },
        {
          at: 37.8,
          line: T.vision[7],
          exposure: 0.82,
          camera: { yaw: 0, pitch: 0.04, fov: -11, ease: 3 },
        },
        {
          at: 44.2,
          line: T.vision[8],
          motif: { kind: 'reaching', x: 7.5, y: 4.6, z: -13, size: 5.4, grow: 0.5, crumbleAt: 48 },
          exposure: 1.2,
        },
        {
          at: 51.0,
          line: T.vision[9],
          motif: { kind: 'galley', x: 0, y: 5, z: -21, size: 17, grow: 2.4 },
          camera: { yaw: 0.06, pitch: -0.05, fov: 3, ease: 4 },
        },
      ],
    },
  },

  terrain: {
    seed: 20260401,
    radius: 40,
    amplitude: 2.2,
    frequency: 0.03,
    dome: 4.2,
    ridge: 0.4,
    detail: 'stone',
    colorFlat: 0xa08a68,
    colorSteep: 0x7a6448,
    colorHigh: 0xb9a37c,
    heightStart: 3,
    heightEnd: 8,
    plateaus: [{ x: 0, z: -6, radius: 24, height: 3.4 }],
  },

  dress(d) {
    const FLOOR = 3.4;

    // ── 台基：柱廊站在一块抬起来的石板上 ──
    // 玩家是踩在地形（平台高度 FLOOR）上走的，所以石板的**顶面**必须正好落在 FLOOR，
    // 否则脚会陷进板里、板面又浮在视线下缘，走起来像踩在半透明的地上
    d.place(stoneBlock(34, 0.55, 40, 900, 0.02), 'paintedPlaster', { x: 0, z: -6, y: FLOOR - 0.55 });
    d.place(stoneBlock(36, 0.4, 42, 901, 0.03), 'weatheredMarble', { x: 0, z: -6, y: FLOOR - 0.95 });

    // ── 两排列柱：光被切成一根根竖条 ──
    for (let row = 0; row < 2; row += 1) {
      const x = row === 0 ? -13 : 13;
      for (let i = 0; i < 7; i += 1) {
        const z = 10 - i * 5.2;
        const seed = 910 + row * 20 + i;
        // 越往里越完整，越靠海越残——废墟是有方向的
        const broken = i < 2 ? 0.45 - i * 0.12 : i > 4 ? 0.1 : 0;
        const height = 5.6;
        d.place(flutedColumn({ height, radius: 0.55, seed, broken }), 'weatheredMarble', {
          x: x + (d.rng() - 0.5) * 0.2,
          z,
          y: FLOOR,
          block: 0.75,
          tiltZ: (d.rng() - 0.5) * 0.02,
        });
        if (broken === 0) {
          d.place(doricCapital(0.55, seed + 100), 'weatheredMarble', { x, z, y: FLOOR + height });
          // 楣石只在完整柱之间搭着
          if (i > 2 && i < 6) {
            d.place(stoneBlock(1.5, 0.75, 5.2, seed + 200, 0.05), 'weatheredMarble', {
              x,
              z: z + 2.6,
              y: FLOOR + height + 0.62,
            });
          }
        }
      }
    }

    // ── 滚落的柱鼓与柱头 ──
    d.place(columnDrum(0.56, 1.3, 960), 'weatheredMarble', { x: -8.5, z: 9, y: FLOOR, tiltX: 1.5, yaw: 0.7, block: 0.8 });
    d.place(columnDrum(0.56, 1.1, 961), 'weatheredMarble', { x: -6.2, z: 6.4, y: FLOOR, tiltZ: 1.5, yaw: 1.9, block: 0.8 });
    d.place(doricCapital(0.56, 962), 'weatheredMarble', { x: 10.5, z: 8.2, y: FLOOR, tiltZ: 1.2, yaw: 0.4, block: 0.9 });

    // ── 屋顶塌下来的那一小块（对应"少了几块瓦"）──
    for (let i = 0; i < 6; i += 1) {
      d.place(stoneBlock(0.9 + d.rng() * 0.6, 0.16, 0.7, 970 + i, 0.2), 'weatheredMarble', {
        x: 12 + (d.rng() - 0.5) * 2.6,
        z: -16 + (d.rng() - 0.5) * 2.6,
        y: FLOOR,
        lift: 0.02 + i * 0.03,
        yaw: d.rng() * Math.PI,
        tiltZ: (d.rng() - 0.5) * 0.35,
      });
    }

    // ── 立式织机：两根立柱 + 一张垂下来的布 ──
    d.place(pole(3.2, 0.09, 980), 'driftwood', { x: -11.6, z: -12, y: FLOOR, block: 0.4 });
    d.place(pole(3.2, 0.09, 981), 'driftwood', { x: -8.4, z: -12, y: FLOOR, block: 0.4 });
    d.place(stoneBlock(3.6, 0.14, 0.16, 982, 0.05), 'driftwood', { x: -10, z: -12, y: FLOOR + 3.1 });
    d.place(sailCloth(3.0, 2.2, 0.35, 983), 'cloth', { x: -10, z: -12.05, y: FLOOR + 1.85 });

    // ── 那排空杯子，摆得很齐 ──
    for (let i = 0; i < 8; i += 1) {
      d.place(amphora(0.34, 990 + i), 'terracotta', { x: 9, z: -2 + (i - 3.5) * 0.55, y: FLOOR + 0.55 });
    }
    d.place(stoneBlock(1.1, 0.55, 5.2, 998, 0.04), 'weatheredMarble', { x: 9, z: -2, y: FLOOR, block: 0.9 });

    // ── 没喝完的那一只，单独在里侧的矮台上（核心记忆）──
    d.place(stoneBlock(1.3, 0.62, 1.3, 1000, 0.04), 'weatheredMarble', { x: 0, z: -22, y: FLOOR });
    d.place(amphora(0.42, 1001), 'terracotta', { x: 0, z: -22, y: FLOOR + 0.62 });

    // ── 无头的立像：柱廊尽头站着的那个"人" ──
    d.place(statueTorso(1.15, 1010), 'weatheredMarble', { x: -4.5, z: -25.5, y: FLOOR, yaw: 0.5, block: 0.7 });
    d.place(statueTorso(1.05, 1011), 'weatheredMarble', { x: 4.5, z: -25.5, y: FLOOR, yaw: -0.4, block: 0.7 });
    d.place(stoneBlock(1.6, 0.5, 1.6, 1012, 0.04), 'weatheredMarble', { x: -4.5, z: -25.5, y: FLOOR - 0.5 });
    d.place(stoneBlock(1.6, 0.5, 1.6, 1013, 0.04), 'weatheredMarble', { x: 4.5, z: -25.5, y: FLOOR - 0.5 });

    // ── 爬进来又爬回去的藤 ──
    // 一根细木质藤蔓贴着地与柱子走，叶子是一小簇一小簇的。
    // 团块必须小：藤是一条线，不是一串球。
    for (let i = 0; i < 22; i += 1) {
      const t = i / 21;
      const x = -9.5 - Math.sin(t * 3.4) * 2.4;
      const z = 14 - t * 8.5;
      const lift = 0.05 + Math.max(0, Math.sin(t * 2.6)) * 1.1;
      // 藤茎：一小段一小段接起来，比一根长管更像自然爬出来的
      d.place(pole(0.55, 0.035, 1020 + i), 'driftwood', {
        x,
        z,
        y: FLOOR,
        lift,
        tiltX: 1.1 + Math.sin(t * 5) * 0.35,
        yaw: t * 3.4,
      });
      if (i % 2 === 0) {
        d.place(oliveCanopy(0.2 + d.rng() * 0.1, 1060 + i), 'olive', {
          x: x + (d.rng() - 0.5) * 0.5,
          z: z + (d.rng() - 0.5) * 0.5,
          y: FLOOR,
          lift: lift + 0.18,
        });
      }
    }

    // ── 台基之外：橄榄树与碎石，把柱廊框起来 ──
    const trees: Array<[number, number, number]> = [
      [-24, 6, 4.2],
      [24, 2, 3.8],
      [-21, -20, 3.6],
      [23, -22, 4],
    ];
    for (const [x, z, height] of trees) {
      const seed = 1040 + Math.floor(x + z);
      d.place(oliveTrunk(height, seed), 'driftwood', { x, z, block: 0.6 });
      d.place(oliveCanopy(height * 0.82, seed + 1), 'olive', { x, z, lift: height * 1.02 });
    }

    d.scatter(40, {
      innerRadius: 20,
      outerRadius: 38,
      minSpacing: 2.4,
      minHeight: 0.4,
      make: (_, rng) => ({
        geometry: boulder(0.35 + rng() * 1.1, 1100 + Math.floor(rng() * 900)),
        surface: 'limestone' as const,
        place: { yaw: rng() * Math.PI, lift: -0.15 },
      }),
    });

    // ── 岸边的船 ──
    d.place(boatHull(5.6, 1200), 'driftwood', { x: 2, z: 36, lift: 0.4, yaw: -0.3, tiltZ: 0.06 });
    d.place(pole(3.9, 0.1, 1201), 'driftwood', { x: 2.2, z: 35.6, lift: 0.72, tiltX: 0.12 });
  },
};
