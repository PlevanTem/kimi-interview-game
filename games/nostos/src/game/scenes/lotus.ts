import { TEXT } from '../../content/script';
import {
  footprint,
  boatHull,
  boulder,
  columnDrum,
  flutedColumn,
  pithos,
  pole,
  statueTorso,
  stoneBlock,
} from '../../world/props';
import { placeNarrativeAsset } from '../../world/narrative-assets';
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
        x: 14.25,
        z: -10.95,
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
    shoreWetWidth: 4,
    shoreWetColor: 0x8d7454,
    shoreWetStrength: 0.35,
  },

  dress(d) {
    // ── 倒下的酒瓮，口朝下 ──
    placeNarrativeAsset(d, 'game.nostos.prop.abandoned_vessels', { x: -12, z: 16, yaw: 0.7 }, 300);
    d.place(pithos(1.6, 302), 'terracotta', { x: -15.4, z: 17.6, lift: -0.5, yaw: 0.4, block: 1 });

    // ── 半埋的桨 ──
    placeNarrativeAsset(d, 'game.nostos.prop.shore_oar', { x: 11, z: 19, yaw: -0.8, tiltZ: 0.04 }, 310);

    // ── 冷掉的火堆 ──
    placeNarrativeAsset(d, 'game.nostos.prop.cold_hearth', { x: -18, z: -6 }, 320);

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
      placeNarrativeAsset(d, 'game.nostos.prop.orchard_tree', { x, z, scale: height / 4.4, block: 0.45 }, seed);
    }

    // ── 一行脚印：从水边往岛里去，只有去的那一行 ──
    //
    // 这条线索原本**没有实物**：交互点、提示语"看脚印"和三句旁白都写好了，
    // 沙地上却从来没有画过脚印。玩家走过去，准星张开，地上是空的——
    // 旁白在描述一件不存在的东西。走完整周目的 e2e 也抓不到它：
    // 触碰照样成功，旁白照样播完，只有人眼看得出那里什么都没有。
    //
    // 方向是单向的，这是本幕的整个论点："上岛的人都还在岛上"。
    // 所以只铺去程，绝不铺回程——那一行不存在的返程脚印，就是这一幕的主题。
    {
      const START_X = 17;
      const START_Z = 32;
      const dirX = -START_X;
      const dirZ = -START_Z;
      const len = Math.hypot(dirX, dirZ);
      // 步幅法线，用来做左右交替的脚位与蜿蜒
      const nx = -dirZ / len;
      const nz = dirX / len;
      const STEPS = 46;
      const yaw = Math.atan2(dirX, dirZ);
      for (let i = 0; i < STEPS; i += 1) {
        const t = i / (STEPS - 1);
        // 没有人在沙上走直线
        const wander = Math.sin(t * 5.2) * 1.1;
        // 左右脚交替偏出半个身位
        const side = (i % 2 === 0 ? 1 : -1) * 0.17;
        const offset = wander + side;
        d.place(footprint(0.26 + d.rng() * 0.05, 700 + i), 'driftwood', {
          x: START_X + dirX * t + offset * nx,
          z: START_Z + dirZ * t + offset * nz,
          yaw: yaw + (d.rng() - 0.5) * 0.26,
          // 略微陷进沙里，只留薄薄一层露在外面
          lift: -0.012,
        });
      }
    }

    // ── 留下的人坐的那块石头 ──
    d.place(stoneBlock(1.8, 0.5, 1.4, 360), 'limestone', { x: 22.1, z: -1.9, yaw: 0.4 });

    // ── 被丢下的头盔（核心记忆）：一块矮台上 ──
    d.place(stoneBlock(2.0, 0.16, 1.8, 370), 'limestone', { x: -6, z: -19, yaw: 0.2 });
    // 侧翻着搁在矮台上：旁白说"头盔翻在地上，里面积了一层沙"，
    // 所以它必须是倒的——正着摆就成了陈列，而这顶盔是被人解开带子丢下的。
    placeNarrativeAsset(d, 'game.nostos.prop.abandoned_helmet', {
      x: -6,
      z: -19,
      lift: 0.16,
      yaw: 0.3,
    }, 371);

    // ── 岛心的一段断柱廊：这里从前有人住过 ──
    for (let i = 0; i < 5; i += 1) {
      const x = -2 + i * 3.4;
      const z = -28 - i * 0.6;
      const height = 5.5 - i * 0.52;
      d.place(flutedColumn({ height, radius: 0.48, seed: 380 + i, broken: 0.12 + i * 0.11 }), 'limestone', {
        x,
        z,
        block: 0.62,
        tiltZ: (d.rng() - 0.5) * 0.05,
      });
      d.place(stoneBlock(1.35, 0.23, 1.35, 1400 + i), 'limestone', { x, z, lift: -0.04 });
      // Two surviving lintels establish architecture; the rest is deliberately missing.
      if (i < 2) {
        const top0 = d.terrain.heightAt(x, z) + height * (0.88 - i * 0.11);
        const top1 = d.terrain.heightAt(x + 3.4, z - 0.6) + (height - 0.52) * (0.77 - i * 0.11);
        const span = Math.hypot(3.4, 0.6), rise = top1 - top0;
        d.place(stoneBlock(Math.hypot(span, rise) + 0.55, 0.48, 1.05, 1410 + i, 0.1), 'limestone', {
          x: x + 1.7, z: z - 0.3, y: (top0 + top1) / 2 - 0.08,
          yaw: Math.atan2(0.6, 3.4), tiltZ: Math.atan2(rise, span),
        });
      }
    }
    d.place(columnDrum(0.44, 0.9, 390), 'limestone', { x: 3.2, z: -24.5, tiltX: 1.4, yaw: 0.9, block: 0.6 });
    d.place(columnDrum(0.44, 1.1, 391), 'limestone', { x: 5.6, z: -26.2, tiltZ: 1.5, yaw: 0.3, block: 0.6 });

    // Eroded courtyard fragments: discontinuous, ground-conforming, never a raised collision floor.
    for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) {
      if ((row * 3 + col * 5) % 7 < 2) continue;
      const x = 6 + col * 1.65 + (row % 2) * 0.7, z = -5 - row * 1.7;
      const g = stoneBlock(1.45, 0.09, 1.48, 1800 + row * 7 + col, 0.08);
      const pos = g.getAttribute('position'), base = d.terrain.heightAt(x, z);
      for (let j = 0; j < pos.count; j++) pos.setY(j, pos.getY(j) + d.terrain.heightAt(x + pos.getX(j), z + pos.getZ(j)) - base);
      g.computeVertexNormals();
      d.place(g, 'weatheredMarble', { x, z, lift: -0.045 });
    }

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
    d.scatter(24, {
      innerRadius: 18,
      outerRadius: 40,
      minSpacing: 2.2,
      minHeight: 0.4,
      exclude: lotus.def.interactables.map((p) => ({ x: p.x, z: p.z, radius: 4 })),
      make: (_, rng) => ({
        geometry: boulder(0.2 + rng() * 0.55, 500 + Math.floor(rng() * 900)),
        surface: 'limestone' as const,
        place: { yaw: rng() * Math.PI, lift: -0.12 },
      }),
    });
  },
};
