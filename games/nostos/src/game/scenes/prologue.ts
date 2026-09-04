import { TEXT } from '../../content/script';
import { boulder, plank, pole, shipRib, boatHull, stoneAnchor } from '../../world/props';
import type { Act } from './types';

const T = TEXT.prologue;

/**
 * 序章 · 无名之海
 *
 * 一片刚够站人的沙洲，黎明前。这里没有遗迹、没有神殿、没有故事，
 * 只有一张散架的木筏和一支断桨。它的任务只有一件：
 * 教会玩家"走过去、看着它、按一下"，并且让第一段回忆把十二条船开出来——
 * 好让后面七幕每一次沉船，都在减这个数。
 */
export const prologue: Act = {
  def: {
    id: 'prologue',
    act: 0,
    title: '无名之海',
    subtitle: '第一夜之后的第十年',
    tone: '失重、无名。世界只剩下水面、一点星光，和一双还记得怎么打绳结的手。',
    env: 'dawnAtSea',
    audio: 'openSea',
    spawn: { x: 2, z: 13, yaw: 0 },
    memoryId: 'prologue.oar',
    arrival: { pan: 0.5, seconds: 7 },
    interactables: [
      {
        id: 'prologue.raft',
        kind: 'clue',
        prompt: '看绳结',
        lines: T.clue.raft,
        x: -3.5,
        z: 2,
        y: 0.7,
        radius: 3,
      },
      {
        id: 'prologue.plank',
        kind: 'clue',
        prompt: '读船板',
        lines: T.clue.plank,
        x: 7.5,
        z: 4,
        y: 0.5,
      },
      {
        id: 'prologue.water',
        kind: 'clue',
        prompt: '试水温',
        lines: T.clue.water,
        x: -11,
        z: -9,
        y: 0.4,
        radius: 3.4,
      },
      {
        id: 'prologue.star',
        kind: 'clue',
        prompt: '找那颗星',
        lines: T.clue.star,
        x: 3,
        z: -12,
        y: 1.6,
        radius: 3.2,
      },
      {
        id: 'prologue.oar',
        kind: 'memory',
        prompt: '拿起断桨',
        lines: T.memory,
        x: 9,
        z: -4,
        y: 0.6,
        radius: 2.8,
      },
      {
        id: 'prologue.depart',
        kind: 'depart',
        prompt: '推船下水',
        lines: [],
        x: -8,
        z: 9,
        y: 0.8,
        radius: 3.4,
        requiresMemory: true,
      },
    ],
    vision: {
      id: 'prologue.vision',
      duration: 36,
      stage: { x: 9, y: 0.5, z: -4 },
      beats: [
        {
          at: 0.6,
          line: T.vision[0],
          camera: { yaw: 0, pitch: 0.06, fov: -6, ease: 3 },
          motif: { kind: 'galley', x: 0, y: 7, z: -26, size: 26, grow: 3.2 },
        },
        {
          at: 5.2,
          line: T.vision[1],
          motif: { kind: 'galley', x: -17, y: 5.4, z: -33, size: 19, grow: 2.6, opacity: 0.75 },
        },
        {
          at: 9.6,
          line: T.vision[2],
          motif: { kind: 'galley', x: 16, y: 5.8, z: -31, size: 20, grow: 2.6, opacity: 0.75 },
          camera: { yaw: 0.1, pitch: 0.02, fov: -3, ease: 4 },
        },
        {
          at: 14.4,
          line: T.vision[3],
          motif: { kind: 'rower', x: -5.5, y: 2.4, z: -11, size: 8, grow: 1.8 },
        },
        {
          at: 19.4,
          line: T.vision[4],
          motif: { kind: 'rower', x: 5.2, y: 2.4, z: -12, size: 8, grow: 1.8 },
          camera: { yaw: -0.06, pitch: -0.02, fov: -8, ease: 3.5 },
        },
        {
          at: 25.2,
          line: T.vision[5],
          motif: { kind: 'wave', x: 0, y: 1.1, z: -7, size: 16, grow: 2.4, ink: 'shadow', opacity: 0.55 },
          exposure: 0.86,
        },
      ],
    },
  },

  terrain: {
    seed: 20260101,
    radius: 26,
    amplitude: 1.05,
    frequency: 0.06,
    dome: 2.1,
    ridge: 0,
    detail: 'sand',
    colorFlat: 0x6b6b6b,
    colorSteep: 0x45474d,
    colorHigh: 0x7a7970,
    heightStart: 1.2,
    heightEnd: 2.6,
  },

  dress(d) {
    // ── 散架的木筏：主角十年来所有的家当 ──
    for (let i = 0; i < 7; i += 1) {
      const spread = (i - 3) * 0.62;
      d.place(plank(4.4 + d.rng() * 0.8, 0.44, 0.11, 100 + i), 'driftwood', {
        x: -3.6 + spread * 0.25,
        z: 2 + spread,
        lift: 0.16 + d.rng() * 0.05,
        yaw: 0.08 + (d.rng() - 0.5) * 0.14,
        tiltZ: (d.rng() - 0.5) * 0.07,
      });
    }
    d.place(pole(3.2, 0.1, 111), 'driftwood', { x: -2.2, z: 3.6, lift: 0.2, tiltX: 1.35, yaw: 0.6 });
    d.place(stoneAnchor(1.1, 112), 'darkRock', { x: -5.4, z: 0.6, yaw: 0.9, tiltX: 1.2, block: 0.8 });

    // ── 刻过名字的船板 ──
    d.place(plank(2.6, 0.7, 0.14, 120), 'driftwood', { x: 7.5, z: 4, lift: 0.1, yaw: -0.4, tiltZ: 0.06 });

    // ── 断桨：核心记忆 ──
    d.place(pole(2.9, 0.075, 130), 'driftwood', { x: 9, z: -4, lift: 0.1, tiltX: 1.18, yaw: 2.1 });

    // ── 沙洲高处的一小堆石，给"找那颗星"一个站的地方 ──
    d.place(boulder(1.5, 140), 'darkRock', { x: 3.4, z: -12.6, block: 1.5 });
    d.place(boulder(0.9, 141), 'darkRock', { x: 2.1, z: -13.4, block: 1 });

    // ── 离岛的小船，搁在浅水边 ──
    d.place(boatHull(5.2, 150), 'driftwood', { x: -8, z: 9, lift: 0.42, yaw: 0.35, tiltZ: 0.09 });
    d.place(pole(3.6, 0.09, 151), 'driftwood', { x: -8.3, z: 8.6, lift: 0.7, tiltX: 0.16 });

    // ── 半埋的旧船肋：这片沙洲吃过不止一条船 ──
    for (let i = 0; i < 5; i += 1) {
      d.place(shipRib(2.6 + i * 0.2, 0.7, 160 + i), 'charredWood', {
        x: -13 + i * 1.5,
        z: -6.5 - i * 0.8,
        lift: -0.5,
        yaw: 1.1,
        tiltX: 0.5,
      });
    }

    // ── 卵石：把视线从沙洲引向水边 ──
    d.scatter(34, {
      innerRadius: 4,
      outerRadius: 24,
      minSpacing: 1.6,
      minHeight: 0.1,
      make: (_, rng) => ({
        geometry: boulder(0.28 + rng() * 0.7, 200 + Math.floor(rng() * 900)),
        surface: 'darkRock' as const,
        place: { yaw: rng() * Math.PI, lift: -0.1 },
      }),
    });
  },
};
