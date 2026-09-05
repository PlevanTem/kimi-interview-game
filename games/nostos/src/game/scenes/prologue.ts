import { TEXT } from '../../content/script';
import {
  boulder,
  pole,
  shipRib,
  boatHull,
  stoneAnchor,
  wreckedRaft,
  weatheredNamePlank,
  brokenOar,
} from '../../world/props';
import type { Act } from './types';

const T = TEXT.prologue;
// 半径约 24m：可行走的湿岸内缘。交互与潮石共用落点，避免装饰与逻辑脱节。
const WATER_EDGE = { x: -18.6, z: -15.2 };

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
        x: -2.2,
        z: 3.9,
        y: 0.42,
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
        ...WATER_EDGE,
        y: 0.15,
        radius: 3.4,
        proximityRadius: 1.5,
        // 湿岸着色从 radius - shoreWetWidth 开始，环绕整座沙洲。
        // 玩家踩到任何一段可见湿岸都能试水温，不再必须找到西南角的潮石。
        proximityZone: { kind: 'annulus', centerX: 0, centerZ: 0, innerRadius: 20.4, outerRadius: 25.6 },
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
        look: { yaw: 0, pitch: 0.42, tolerance: 0.24 },
        glint: false,
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
    shoreWetWidth: 5.6,
    shoreWetColor: 0x26384c,
    shoreWetStrength: 0.62,
  },

  dress(d) {
    // ── 散架的木筏：主角十年来所有的家当 ──
    const raft = wreckedRaft(100);
    const raftPlacement = { x: -3.5, z: 2, lift: 0.18, yaw: 0.08, tiltZ: -0.025 };
    d.place(raft.wood, 'saltWood', { ...raftPlacement, block: 2.25 });
    d.place(raft.rope, 'rope', raftPlacement);
    d.place(stoneAnchor(1.1, 112), 'darkRock', { x: -5.4, z: 0.6, yaw: 0.9, tiltX: 1.2, block: 0.8 });

    // ── 刻过名字的船板 ──
    const namePlank = weatheredNamePlank(120);
    const namePlacement = { x: 7.5, z: 4, lift: 0.12, yaw: -0.4, tiltZ: 0.06 };
    d.place(namePlank.wood, 'saltWood', namePlacement);
    d.place(namePlank.inscription, 'charredWood', namePlacement);

    // ── 断桨：核心记忆 ──
    d.place(brokenOar(3.35, 130), 'saltWood', { x: 9, z: -4, lift: 0.12, yaw: 2.1, tiltZ: -0.08 });

    // ── 观星点只留一块低石；天空本身承担线索，不再用地面光球冒充星星 ──
    d.place(boulder(0.3, 140), 'darkRock', { x: 3, z: -12, lift: -0.12, block: 0.3 });

    // ── 水温线索的半埋潮石：给玩家一个俯身触水的视觉锚点 ──
    d.place(boulder(0.34, 142), 'basalt', { ...WATER_EDGE, lift: -0.18 });

    // ── 离岛的小船，搁在浅水边 ──
    d.place(boatHull(5.2, 150), 'saltWood', { x: -8, z: 9, lift: 0.42, yaw: 0.35, tiltZ: 0.09 });
    d.place(pole(3.6, 0.09, 151), 'saltWood', { x: -8.3, z: 8.6, lift: 0.7, tiltX: 0.16 });

    // ── 半埋的旧船肋：这片沙洲吃过不止一条船 ──
    for (let i = 0; i < 3; i += 1) {
      d.place(shipRib(2.35 + i * 0.16, 0.62, 160 + i), 'charredWood', {
        x: -17 + i * 1.4,
        z: -10 - i,
        lift: -0.78,
        yaw: 1.1,
        tiltX: 0.5,
      });
    }

    // ── 卵石减量，留出木筏后的纯净负形；石头只负责标出潮线 ──
    d.scatter(10, {
      innerRadius: 10,
      outerRadius: 24,
      minSpacing: 3,
      minHeight: 0.1,
      make: (_, rng) => ({
        geometry: boulder(0.2 + rng() * 0.42, 200 + Math.floor(rng() * 900)),
        surface: 'darkRock' as const,
        place: { yaw: rng() * Math.PI, lift: -0.1 },
      }),
    });
  },
};
