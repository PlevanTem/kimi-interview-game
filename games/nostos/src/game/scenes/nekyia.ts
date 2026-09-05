import { TEXT } from '../../content/script';
import { amphora, boatHull, boulder, boundaryStone, plank, pole, stoneBlock } from '../../world/props';
import type { Act } from './types';

const T = TEXT.nekyia;

/**
 * 第四幕 · 亡者之岸
 *
 * 没有太阳，没有方向光，没有影子。雾密到只剩十几米，海面几乎不动。
 * 全作唯一一幕**把饱和度拉到接近零**——不是黑白，是被漂过的灰白，
 * 像一张放久了的湿壁画。
 *
 * 这一幕的可读物全是"该做而没做的事"：挖好没用的坑、堆好没点的柴、
 * 插过桨的洞。玩家在替一个欠着债的人走这段路。
 */
export const nekyia: Act = {
  def: {
    id: 'nekyia',
    act: 4,
    title: '亡者之岸',
    subtitle: '在世界的边上',
    tone: '肃穆、赎罪。这里没有惩罚，只有一件一件没有做完的事，安静地等在原地。',
    env: 'paleShore',
    audio: 'silence',
    spawn: { x: 0, z: 30, yaw: 0 },
    memoryId: 'nekyia.bowl',
    arrival: { pan: 0.3, seconds: 9 },
    interactables: [
      {
        id: 'nekyia.sand',
        kind: 'clue',
        prompt: '回头看',
        lines: T.clue.sand,
        x: -5,
        z: 20,
        y: 0.3,
        radius: 3.6,
      },
      {
        id: 'nekyia.marker',
        kind: 'clue',
        prompt: '看界石',
        lines: T.clue.marker,
        // 界石排成一列弯离了原来的交互点，最近的一块在 5 m 外——
        // 旁白写的是"一块界石"，就该站在它跟前读。挪到第一块石头旁边。
        x: 12.6,
        z: 10.4,
        y: 1.2,
      },
      {
        id: 'nekyia.pyre',
        kind: 'clue',
        prompt: '看那堆柴',
        lines: T.clue.pyre,
        x: -11,
        z: 1,
        y: 0.5,
      },
      {
        id: 'nekyia.oarMark',
        kind: 'clue',
        prompt: '看沙地上的洞',
        lines: T.clue.oarMark,
        x: 8,
        z: -8,
        y: 0.2,
        radius: 3,
      },
      {
        id: 'nekyia.pit',
        kind: 'clue',
        prompt: '看那个坑',
        lines: T.clue.pit,
        x: -2,
        z: -13,
        y: 0.2,
        radius: 3.2,
      },
      {
        id: 'nekyia.shade',
        kind: 'talk',
        prompt: '听他说',
        lines: T.talk,
        speaker: T.npcName,
        motif: 'standing',
        motifSize: 1.8,
        x: 12,
        z: -14,
        y: 1,
        radius: 3.4,
      },
      {
        id: 'nekyia.bowl',
        kind: 'memory',
        prompt: '拿起祭酒碗',
        lines: T.memory,
        x: -1,
        z: -24,
        y: 0.6,
        radius: 2.8,
      },
      {
        id: 'nekyia.depart',
        kind: 'depart',
        prompt: '回到船上',
        lines: [],
        x: 2,
        z: 33,
        y: 0.8,
        radius: 3.6,
        requiresMemory: true,
      },
    ],
    vision: {
      id: 'nekyia.vision',
      duration: 78,
      stage: { x: -1, y: 0.6, z: -24 },
      beats: [
        {
          at: 0.8,
          line: T.vision[0],
          camera: { yaw: 0, pitch: -0.16, fov: -6, ease: 3.5 },
          motif: { kind: 'kneeling', x: 0, y: 1.4, z: -6, size: 3, grow: 2 },
        },
        {
          at: 6.4,
          line: T.vision[1],
          motif: { kind: 'shades', x: 0, y: 2.6, z: -14, size: 13, grow: 4 },
          camera: { yaw: 0, pitch: 0.02, fov: -2, ease: 4 },
        },
        { at: 12.4, line: T.vision[2] },
        {
          at: 17.0,
          line: T.vision[3],
          motif: { kind: 'standing', x: -0.6, y: 2.0, z: -9.5, size: 4.2, grow: 3 },
          camera: { yaw: -0.04, pitch: 0.03, fov: -9, ease: 4 },
        },
        { at: 22.6, line: T.vision[4] },
        {
          at: 27.6,
          line: T.vision[5],
          exposure: 0.86,
        },
        {
          at: 33.2,
          line: T.vision[6],
          motif: { kind: 'reaching', x: 3.4, y: 1.9, z: -8, size: 4, grow: 1.4 },
        },
        {
          at: 38.4,
          line: T.vision[7],
          motif: { kind: 'reaching', x: 3.4, y: 1.9, z: -8, size: 4, grow: 0.4, crumbleAt: 40.2, opacity: 0.8 },
        },
        {
          at: 43.4,
          line: T.vision[8],
          motif: { kind: 'reaching', x: 3.4, y: 1.9, z: -8, size: 4, grow: 0.4, crumbleAt: 45.2, opacity: 0.6 },
        },
        {
          at: 48.6,
          line: T.vision[9],
          camera: { yaw: 0.06, pitch: -0.04, fov: -13, ease: 2.6 },
        },
        {
          at: 55.0,
          line: T.vision[10],
          motif: { kind: 'standing', x: -0.6, y: 2.0, z: -9.5, size: 4.4, grow: 1.2, ink: 'shadow' },
        },
        {
          at: 63.0,
          line: T.vision[11],
          motif: { kind: 'wave', x: 0, y: 1.2, z: -6.5, size: 15, grow: 2.6, ink: 'shadow', opacity: 0.45 },
          camera: { yaw: 0, pitch: -0.02, fov: 2, ease: 4 },
        },
      ],
    },
  },

  terrain: {
    seed: 20260501,
    radius: 38,
    amplitude: 1.1,
    frequency: 0.026,
    dome: 1.4,
    ridge: 0,
    detail: 'sand',
    colorFlat: 0x9fa3a1,
    colorSteep: 0x7c807e,
    colorHigh: 0xafb2b0,
    heightStart: 1.4,
    heightEnd: 3,
    basins: [{ x: -2, z: -13, radius: 4.5, depth: 1.1 }],
  },

  dress(d) {
    // ── 界石：一排，两面都磨平了，上面没有字 ──
    for (let i = 0; i < 6; i += 1) {
      d.place(boundaryStone(1.8 + d.rng() * 0.5, 1300 + i), 'ash', {
        x: 9 + Math.cos(i * 1.1) * 5.5,
        z: 10 - i * 4.4,
        yaw: i * 0.4,
        tiltZ: (d.rng() - 0.5) * 0.06,
        block: 0.55,
      });
    }

    // ── 堆好却没点的柴 ──
    for (let i = 0; i < 14; i += 1) {
      const layer = Math.floor(i / 5);
      d.place(plank(2.2 - layer * 0.2, 0.22, 0.2, 1320 + i), 'ash', {
        x: -11 + ((i % 5) - 2) * 0.42,
        z: 1 + (layer % 2 === 0 ? 0 : 0.3),
        lift: 0.12 + layer * 0.24,
        yaw: layer % 2 === 0 ? 0 : Math.PI / 2,
      });
    }

    // ── 挖好的坑（地形已经下陷，这里补一圈翻出来的土）──
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      d.place(boulder(0.32 + d.rng() * 0.22, 1340 + i), 'ash', {
        x: -2 + Math.cos(a) * 5.1,
        z: -13 + Math.sin(a) * 5.1,
        lift: -0.1,
      });
    }

    // ── 插过桨的洞：只剩一圈边 ──
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2;
      d.place(boulder(0.13, 1360 + i), 'ash', { x: 8 + Math.cos(a) * 0.42, z: -8 + Math.sin(a) * 0.42, lift: -0.02 });
    }

    // ── 祭酒碗与它旁边空着的位置（核心记忆）──
    d.place(stoneBlock(1.5, 0.42, 1.5, 1380, 0.03), 'ash', { x: -1, z: -24 });
    d.place(amphora(0.5, 1381), 'ash', { x: -1, z: -24, lift: 0.42 });
    d.place(amphora(0.42, 1382), 'ash', { x: 0.5, z: -23.4, lift: 0.42, tiltZ: 1.5, yaw: 0.7 });

    // ── 沉在雾里的礁石，作为唯一的空间参照 ──
    d.scatter(30, {
      innerRadius: 14,
      outerRadius: 36,
      minSpacing: 3.4,
      minHeight: 0.15,
      make: (_, rng) => ({
        geometry: boulder(0.6 + rng() * 1.6, 1400 + Math.floor(rng() * 900)),
        surface: 'ash' as const,
        place: { yaw: rng() * Math.PI, lift: -0.3, block: 0.8 },
      }),
    });

    // ── 岸边的船 ──
    d.place(boatHull(5.6, 1450), 'ash', { x: 2, z: 33, lift: 0.4, yaw: -0.2, tiltZ: 0.05 });
    d.place(pole(3.9, 0.1, 1451), 'ash', { x: 2.2, z: 32.6, lift: 0.72, tiltX: 0.1 });
  },
};
