import { TEXT } from '../../content/script';
import {
  amphora,
  boatHull,
  boulder,
  columnDrum,
  flutedColumn,
  oliveTree,
  pithos,
  plank,
  pole,
  statueTorso,
  stoneBlock,
} from '../../world/props';
import type { Act } from './types';

const T = TEXT.lotus;

/**
 * 第一幕 · 忘食岸
 *
 * 蜜金色的黄昏，风停了。沙洲缓缓抬起，几株低矮的果树把光切成一条条。
 * 这一幕的所有东西都在说同一句话：**这里很好，好得让人不想走**。
 * 倒下的酒瓮、白透的灰、只有去没有回的脚印——甜蜜是靠"没有人回来"写出来的。
 */
export const lotus: Act = {
  def: {
    id: 'lotus',
    act: 1,
    title: '忘食岸',
    subtitle: '第一次靠岸',
    tone: '甜蜜的麻痹。风是暖的，果子是甜的，而所有走进岛里的脚印都没有走回来。',
    env: 'honeyDusk',
    audio: 'calmShore',
    spawn: { x: -4, z: 34, yaw: 0 },
    memoryId: 'lotus.helmet',
    arrival: { pan: 0.6, seconds: 8 },
    interactables: [
      {
        id: 'lotus.amphora',
        kind: 'clue',
        prompt: '看酒瓮',
        lines: T.clue.amphora,
        x: -12,
        z: 16,
        y: 0.6,
      },
      {
        id: 'lotus.oar',
        kind: 'clue',
        prompt: '看半埋的桨',
        lines: T.clue.oar,
        x: 11,
        z: 19,
        y: 0.5,
      },
      {
        id: 'lotus.footprints',
        kind: 'clue',
        prompt: '看脚印',
        lines: T.clue.footprints,
        x: 3,
        z: 6,
        y: 0.3,
        radius: 3.4,
      },
      {
        id: 'lotus.hearth',
        kind: 'clue',
        prompt: '拨开灰',
        lines: T.clue.hearth,
        x: -18,
        z: -6,
        y: 0.4,
      },
      {
        id: 'lotus.fruit',
        kind: 'clue',
        prompt: '闻果子',
        lines: T.clue.fruit,
        x: 15,
        z: -11,
        y: 1.7,
      },
      {
        id: 'lotus.crewman',
        kind: 'talk',
        prompt: '和他说话',
        lines: T.talk,
        speaker: T.npcName,
        motif: 'kneeling',
        motifSize: 1.85,
        x: 19.6,
        z: -3.4,
        y: 1,
        radius: 3.2,
      },
      {
        id: 'lotus.helmet',
        kind: 'memory',
        prompt: '拿起头盔',
        lines: T.memory,
        x: -6,
        z: -19,
        y: 0.5,
        radius: 2.8,
      },
      {
        id: 'lotus.depart',
        kind: 'depart',
        prompt: '回到船上',
        lines: [],
        x: -6,
        z: 37,
        y: 0.8,
        radius: 3.6,
        requiresMemory: true,
      },
    ],
    vision: {
      id: 'lotus.vision',
      duration: 52,
      stage: { x: -6, y: 0.4, z: -19 },
      beats: [
        {
          at: 0.8,
          line: T.vision[0],
          camera: { yaw: 0, pitch: 0.02, fov: -5, ease: 3 },
          motif: { kind: 'standing', x: -4.2, y: 1.9, z: -9, size: 3.6, grow: 2 },
        },
        {
          at: 5.4,
          motif: { kind: 'standing', x: 0.2, y: 1.9, z: -9.8, size: 3.6, grow: 2 },
          line: T.vision[1],
        },
        {
          at: 10.2,
          motif: { kind: 'standing', x: 4.4, y: 1.9, z: -9.2, size: 3.6, grow: 2 },
          line: T.vision[2],
          camera: { yaw: 0.05, fov: -9, ease: 4 },
        },
        {
          at: 16.4,
          line: T.vision[3],
          motif: { kind: 'wreath', x: 0, y: 4.6, z: -12, size: 6, grow: 3, ink: 'shadow', opacity: 0.5 },
        },
        {
          at: 22.0,
          line: T.vision[4],
        },
        {
          at: 27.4,
          line: T.vision[5],
          motif: { kind: 'galley', x: 0.5, y: 4.2, z: -20, size: 17, grow: 2.4, crumbleAt: 46 },
          camera: { yaw: -0.1, pitch: -0.03, fov: -2, ease: 4 },
        },
        {
          at: 34.0,
          line: T.vision[6],
          motif: { kind: 'bound', x: -3.4, y: 2.1, z: -13, size: 4.4, grow: 2.2 },
        },
        {
          at: 40.6,
          line: T.vision[7],
          camera: { yaw: 0.24, pitch: 0.01, fov: -12, ease: 5 },
          exposure: 1.18,
        },
      ],
    },
  },

  terrain: {
    seed: 20260201,
    radius: 42,
    amplitude: 1.7,
    frequency: 0.032,
    dome: 2.4,
    ridge: 0.5,
    detail: 'sand',
    colorFlat: 0xc0a87c,
    colorSteep: 0x8d7454,
    colorHigh: 0xa89268,
    heightStart: 2.4,
    heightEnd: 6.5,
  },

  dress(d) {
    // ── 倒下的酒瓮，口朝下 ──
    d.place(amphora(1.5, 300), 'terracotta', { x: -12, z: 16, lift: 0.55, tiltZ: Math.PI * 0.52, yaw: 0.7 });
    d.place(amphora(1.2, 301), 'terracotta', { x: -13.6, z: 14.2, lift: 0.4, tiltZ: Math.PI * 0.46, yaw: 2.1 });
    d.place(pithos(1.6, 302), 'terracotta', { x: -15.4, z: 17.6, lift: -0.5, yaw: 0.4, block: 1 });

    // ── 半埋的桨 ──
    d.place(pole(3.4, 0.08, 310), 'driftwood', { x: 11, z: 19, lift: -0.3, tiltX: 1.05, yaw: -0.8 });

    // ── 冷掉的火堆 ──
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2;
      d.place(boulder(0.32 + d.rng() * 0.16, 320 + i), 'darkRock', {
        x: -18 + Math.cos(a) * 1.5,
        z: -6 + Math.sin(a) * 1.5,
      });
    }
    for (let i = 0; i < 5; i += 1) {
      d.place(plank(0.9 + d.rng() * 0.5, 0.16, 0.1, 330 + i), 'charredWood', {
        x: -18 + (d.rng() - 0.5) * 1.4,
        z: -6 + (d.rng() - 0.5) * 1.4,
        lift: 0.1,
        yaw: d.rng() * Math.PI,
        tiltZ: (d.rng() - 0.5) * 0.5,
      });
    }

    // ── 果树：低矮、伸手就够得到，光从叶缝里切下来 ──
    const trees: Array<[number, number, number]> = [
      [15.6, -11.6, 4.4],
      [21, -8, 3.9],
      [9, -14, 4.1],
      [24, -14, 3.6],
      [17, -18, 4.6],
      [26, -4, 3.8],
    ];
    for (const [x, z, height] of trees) {
      const seed = 340 + Math.floor(x * 7 + z);
      // 树冠抬到人眼之上：走到树下要能看见叶子的底面，而不是撞进一团黑。
      // 这个保证由 oliveTree() 量出来，不是在这里算的——「闻果子」那处线索
      // 就摆在其中一棵树的正下方，每个玩家都必然站到那儿。
      const tree = oliveTree(height, seed);
      d.place(tree.trunk, 'driftwood', { x, z, block: 0.5 });
      d.place(tree.canopy, 'olive', { x, z, lift: tree.canopyLift });
    }

    // ── 留下的人坐的那块石头 ──
    d.place(stoneBlock(1.8, 0.5, 1.4, 360), 'limestone', { x: 22.1, z: -1.9, yaw: 0.4 });

    // ── 被丢下的头盔（核心记忆）：一块矮台上 ──
    d.place(stoneBlock(1.2, 0.42, 1.2, 370), 'limestone', { x: -6, z: -19, yaw: 0.2 });
    d.place(boulder(0.34, 371, 2), 'bronze', { x: -6, z: -19, lift: 0.45 });

    // ── 岛心的一段断柱廊：这里从前有人住过 ──
    for (let i = 0; i < 5; i += 1) {
      const x = -2 + i * 3.4;
      const z = -28 - i * 0.6;
      d.place(flutedColumn({ height: 3.6 - i * 0.42, radius: 0.42, seed: 380 + i, broken: 0.25 + i * 0.11 }), 'limestone', {
        x,
        z,
        block: 0.62,
        tiltZ: (d.rng() - 0.5) * 0.05,
      });
    }
    d.place(columnDrum(0.44, 0.9, 390), 'limestone', { x: 3.2, z: -24.5, tiltX: 1.4, yaw: 0.9, block: 0.6 });
    d.place(columnDrum(0.44, 1.1, 391), 'limestone', { x: 5.6, z: -26.2, tiltZ: 1.5, yaw: 0.3, block: 0.6 });

    // ── 登岸口的地标：一对倒下的断柱与一段矮墙，
    //    让玩家一上岸就有一个"这里从前有人"的读法，而不是一片空沙 ──
    d.place(flutedColumn({ height: 4.2, radius: 0.46, seed: 402, broken: 0.3 }), 'limestone', {
      x: 6.5,
      z: 22,
      block: 0.7,
      tiltZ: 0.06,
    });
    d.place(columnDrum(0.46, 1.5, 403), 'limestone', { x: 8.6, z: 19.5, tiltX: 1.5, yaw: 0.8, block: 0.75 });
    d.place(columnDrum(0.46, 1.2, 404), 'limestone', { x: 4.2, z: 18.2, tiltZ: 1.5, yaw: 2.1, block: 0.7 });
    // 一段塌了一半的矮墙：两皮石，上一皮缺了两块。
    // 拆成小块砌是为了让它读成"砌体"，而不是一块立在沙上的褐色板子。
    for (let i = 0; i < 7; i += 1) {
      const x = -4 + i * 1.35;
      const z = 24.4 - i * 0.42;
      d.place(stoneBlock(1.15, 0.52, 0.72, 405 + i, 0.16), 'limestone', {
        x,
        z,
        yaw: 0.12 + (d.rng() - 0.5) * 0.22,
        tiltZ: (d.rng() - 0.5) * 0.09,
        block: 0.7,
      });
      // 上面这一皮：错缝，并且中间两块已经掉了
      if (i < 6 && i !== 2 && i !== 3) {
        d.place(stoneBlock(1.0, 0.46, 0.68, 415 + i, 0.2), 'limestone', {
          x: x + 0.66,
          z: z - 0.2,
          lift: 0.52,
          yaw: 0.12 + (d.rng() - 0.5) * 0.3,
          tiltZ: (d.rng() - 0.5) * 0.16,
        });
      }
    }
    // 掉下来的那两块，就滚在墙脚
    d.place(stoneBlock(0.95, 0.44, 0.66, 425, 0.24), 'limestone', {
      x: -0.4,
      z: 22.6,
      yaw: 1.1,
      tiltZ: 1.45,
      block: 0.6,
    });
    d.place(stoneBlock(0.9, 0.42, 0.62, 426, 0.24), 'limestone', {
      x: 1.2,
      z: 22.2,
      yaw: 0.4,
      tiltX: 1.5,
      block: 0.6,
    });
    d.place(statueTorso(1.0, 410), 'limestone', { x: -9, z: 8, yaw: 0.9, block: 0.6 });
    d.place(stoneBlock(1.4, 0.45, 1.4, 411, 0.05), 'limestone', { x: -9, z: 8, lift: -0.45 });

    // ── 岸边的船 ──
    d.place(boatHull(5.6, 400), 'driftwood', { x: -6, z: 37, lift: 0.4, yaw: -0.25, tiltZ: 0.07 });
    d.place(pole(3.9, 0.1, 401), 'driftwood', { x: -6.2, z: 36.6, lift: 0.72, tiltX: 0.13 });

    // ── 卵石与灌木，把空地填成可读的地面 ──
    d.scatter(46, {
      innerRadius: 6,
      outerRadius: 40,
      minSpacing: 2.2,
      minHeight: 0.4,
      make: (_, rng) => ({
        geometry: boulder(0.3 + rng() * 0.9, 500 + Math.floor(rng() * 900)),
        surface: 'limestone' as const,
        place: { yaw: rng() * Math.PI, lift: -0.12 },
      }),
    });
  },
};
