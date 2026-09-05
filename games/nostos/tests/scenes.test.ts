import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ACTS, TOTAL_ACTS, actAt, actById } from '../src/game/scenes';
import { ENV } from '../src/content/palette';
import { AUDIO } from '../src/engine/audio';
import { MOTIF_KINDS } from '../src/world/silhouette';
import { findFocus } from '../src/game/interact';
import { holdFor } from '../src/game/types';
import { MEMORY_LABELS, TEXT } from '../src/content/script';
import {
  CANOPY_CLEARANCE,
  brokenOar,
  oliveTree,
  weatheredNamePlank,
  wreckedRaft,
} from '../src/world/props';

/**
 * 这一组测试守的是**内容契约**，不是渲染。
 * 它保证八幕都装得齐、每一幕都能走通、并且没有玩法越界
 * （没有第五种交互类型、没有第二个记忆物件、没有多余的 NPC）。
 */
describe('八幕内容契约', () => {
  it('恰好八幕，幕号连续，id 唯一', () => {
    expect(TOTAL_ACTS).toBe(8);
    expect(ACTS.map((act) => act.def.act)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(ACTS.map((act) => act.def.id)).size).toBe(8);
  });

  it('每一幕都有标题、副题与一句情绪基调', () => {
    for (const { def } of ACTS) {
      expect(def.title.length).toBeGreaterThan(1);
      expect(def.subtitle.length).toBeGreaterThan(1);
      expect(def.tone.length).toBeGreaterThan(10);
    }
  });

  it('天候与音景预设都存在', () => {
    for (const { def } of ACTS) {
      expect(ENV[def.env]).toBeDefined();
      expect(AUDIO[def.audio]).toBeDefined();
    }
  });

  it('交互物 id 全局唯一，且都以本幕 id 为前缀', () => {
    const seen = new Set<string>();
    for (const { def } of ACTS) {
      for (const item of def.interactables) {
        expect(seen.has(item.id)).toBe(false);
        seen.add(item.id);
        expect(item.id.startsWith(`${def.id}.`)).toBe(true);
      }
    }
  });

  it('每一幕恰好一个核心记忆物件，并且 memoryId 指得到它', () => {
    for (const { def } of ACTS) {
      const memories = def.interactables.filter((item) => item.kind === 'memory');
      expect(memories).toHaveLength(1);
      expect(memories[0]!.id).toBe(def.memoryId);
    }
  });

  it('除终章外每一幕都有且只有一个离岛点，且要求先看完记忆', () => {
    ACTS.forEach(({ def }, index) => {
      const departs = def.interactables.filter((item) => item.kind === 'depart');
      if (index === TOTAL_ACTS - 1) {
        expect(departs).toHaveLength(0);
        return;
      }
      expect(departs).toHaveLength(1);
      expect(departs[0]!.requiresMemory).toBe(true);
    });
  });

  it('每一幕有 3–5 处环境线索——少了不够读，多了会变成清单', () => {
    for (const { def } of ACTS) {
      const clues = def.interactables.filter((item) => item.kind === 'clue');
      expect(clues.length).toBeGreaterThanOrEqual(3);
      expect(clues.length).toBeLessThanOrEqual(5);
    }
  });

  it('全作只有四位 NPC，每位都有名字、一种实体表示与短对话', () => {
    const talkers = ACTS.flatMap(({ def }) => def.interactables.filter((item) => item.kind === 'talk'));
    expect(talkers).toHaveLength(4);
    for (const npc of talkers) {
      expect(npc.speaker).toBeTruthy();
      if (npc.id === 'lotus.crewman') {
        expect(npc.modelAsset).toBe('game.nostos.character.lotus_crewman');
        expect(npc.motif).toBeUndefined();
      } else {
        expect(npc.motif && MOTIF_KINDS.includes(npc.motif)).toBe(true);
        expect(npc.modelAsset).toBeUndefined();
      }
      expect(npc.lines.length).toBeGreaterThanOrEqual(4);
      expect(npc.lines.length).toBeLessThanOrEqual(8);
      // 一段短对话：说得完，但不能拖成一场戏
      const seconds = npc.lines.reduce((sum, line) => sum + holdFor(line), 0);
      expect(seconds).toBeGreaterThan(15);
      expect(seconds).toBeLessThan(75);
    }
  });

  it('不存在第五种交互类型——玩法边界写死在数据里', () => {
    const kinds = new Set(ACTS.flatMap(({ def }) => def.interactables.map((item) => item.kind)));
    expect([...kinds].sort()).toEqual(['clue', 'depart', 'memory', 'talk']);
  });

  it('除离岛点外每个交互物都有台词，离岛点没有台词', () => {
    for (const { def } of ACTS) {
      for (const item of def.interactables) {
        if (item.kind === 'depart') {
          expect(item.lines).toHaveLength(0);
        } else {
          expect(item.lines.length).toBeGreaterThan(0);
          for (const line of item.lines) expect(line.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('每一幕的幻象拍号递增、母题合法、时长足够放完最后一句', () => {
    for (const { def } of ACTS) {
      const beats = def.vision.beats;
      expect(beats.length).toBeGreaterThanOrEqual(6);
      for (let i = 1; i < beats.length; i += 1) {
        expect(beats[i]!.at).toBeGreaterThan(beats[i - 1]!.at);
      }
      for (const beat of beats) {
        if (beat.motif) expect(MOTIF_KINDS).toContain(beat.motif.kind);
      }
      const last = beats[beats.length - 1]!;
      const needed = last.at + (last.line ? holdFor(last.line) : 0);
      expect(def.vision.duration).toBeGreaterThan(needed);
    }
  });

  it('幻象至少有一句旁白，并且每一句都不是空的', () => {
    for (const { def } of ACTS) {
      const lines = def.vision.beats.filter((beat) => beat.line);
      expect(lines.length).toBeGreaterThanOrEqual(6);
      for (const beat of lines) expect(beat.line!.trim().length).toBeGreaterThan(0);
    }
  });

  it('幻象舞台就在核心记忆物件附近，构图才对得上', () => {
    for (const { def } of ACTS) {
      const memory = def.interactables.find((item) => item.id === def.memoryId)!;
      const distance = Math.hypot(def.vision.stage.x - memory.x, def.vision.stage.z - memory.z);
      expect(distance).toBeLessThan(3);
    }
  });

  it('所有交互点都落在岛的可行走半径之内', () => {
    for (const { def, terrain } of ACTS) {
      for (const item of def.interactables) {
        expect(Math.hypot(item.x, item.z)).toBeLessThan(terrain.radius);
      }
      expect(Math.hypot(def.spawn.x, def.spawn.z)).toBeLessThan(terrain.radius);
    }
  });

  it('同一幕内交互点彼此不重叠，不会互相抢焦点', () => {
    for (const { def } of ACTS) {
      const items = [...def.interactables];
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          const a = items[i]!;
          const b = items[j]!;
          expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(2.5);
        }
      }
    }
  });

  it('地形种子互不相同——八座岛不能长得一样', () => {
    expect(new Set(ACTS.map((act) => act.terrain.seed)).size).toBe(8);
  });

  it('actAt 会把越界的幕号夹住，actById 能按 id 找到', () => {
    expect(actAt(-5).def.id).toBe('prologue');
    expect(actAt(999).def.id).toBe('ithaca');
    expect(actById('nekyia')?.def.act).toBe(4);
    expect(actById('atlantis')).toBeUndefined();
  });
});

describe('开场引导与终幕收束', () => {
  it('开场留下归家动机，操作由情境提示承接，保留第一段回忆的揭示', () => {
    const lines = TEXT.intro.lines;
    expect(lines).toHaveLength(3);
    for (const line of lines) expect(line.trim().length).toBeGreaterThan(0);
    const all = lines.join('');
    // 目标与使命必须落到字面上，不能靠玩家自己悟
    expect(all).not.toContain('八座岛');
    expect(all).not.toContain('十二条船');
    expect(all).toContain('回家');
    // 操作也要说，否则玩家不知道 E 和 H 是干什么的
    expect(TEXT.ui.tutorialTouch).toContain('E');
    expect(TEXT.ui.guideHint).toContain('H');
    // 但它得念得完。这是全作唯一一次直接对玩家说话，也是玩家点了"开始"之后
    // 唯一一段看着黑屏等的时间——超过一分钟就不再是引导，是过场动画了。
    // 五十秒是留了余地的上限：任何一次改写把它撑破，都该先砍字，而不是先放宽这条线。
    const seconds = lines.reduce((sum, line) => sum + holdFor(line), 0);
    expect(seconds).toBeLessThanOrEqual(15);
  });

  it('每一幕的记忆物件都有名字，进度面板与终幕总览才有东西可显示', () => {
    for (const { def } of ACTS) {
      const label = MEMORY_LABELS[def.id];
      expect(label, `${def.id} 缺少记忆物件名`).toBeTruthy();
      expect(label!.trim().length).toBeGreaterThan(0);
    }
    expect(Object.keys(MEMORY_LABELS)).toHaveLength(TOTAL_ACTS);
  });

  it('终幕的收束把序章那十二条船的账算清楚', () => {
    const epilogue = TEXT.ithaca.epilogue;
    expect(epilogue.length).toBeGreaterThan(4);
    const all = epilogue.join('');
    // 序章数出十二条船，全程没有计数器，终幕必须结这个账
    expect(TEXT.prologue.vision.join('')).toContain('十二条船');
    expect(all).toContain('十二条船');
    // 并且要落到"他变成了什么样的人"，而不只是报个数
    expect(all).toContain('名字');
  });
});

describe('交互对焦', () => {
  const items = ACTS[1]!.def.interactables;

  it('站在物件跟前并看着它才会对上焦', () => {
    const amphora = items.find((item) => item.id === 'lotus.amphora')!;
    // 从正南方看过去：yaw = 0 朝 -Z，所以站在 +Z 一侧
    const hit = findFocus({ x: amphora.x, z: amphora.z + 2, yaw: 0 }, items);
    expect(hit?.def.id).toBe('lotus.amphora');
  });

  it('背对着它就对不上焦', () => {
    const amphora = items.find((item) => item.id === 'lotus.amphora')!;
    expect(findFocus({ x: amphora.x, z: amphora.z + 2, yaw: Math.PI }, items)).toBeNull();
  });

  it('离得太远对不上焦', () => {
    const amphora = items.find((item) => item.id === 'lotus.amphora')!;
    expect(findFocus({ x: amphora.x, z: amphora.z + 12, yaw: 0 }, items)).toBeNull();
  });

  it('已经看过的东西可以被过滤掉', () => {
    const amphora = items.find((item) => item.id === 'lotus.amphora')!;
    const query = { x: amphora.x, z: amphora.z + 2, yaw: 0 };
    expect(findFocus(query, items, (def) => def.id !== 'lotus.amphora')).toBeNull();
  });

  it('两件东西都在范围内时，优先选正对着的那一件', () => {
    const near = { id: 'a', kind: 'clue' as const, prompt: '', lines: ['x'], x: 0, z: -1.6, radius: 4 };
    const side = { id: 'b', kind: 'clue' as const, prompt: '', lines: ['x'], x: 2.6, z: 0.4, radius: 4 };
    expect(findFocus({ x: 0, z: 0, yaw: 0 }, [near, side])?.def.id).toBe('a');
  });

  it('序章导星必须在观星点抬头对准，且不生成地面微光', () => {
    const star = ACTS[0]!.def.interactables.find((item) => item.id === 'prologue.star')!;
    expect(findFocus({ x: star.x, z: star.z, yaw: 0, pitch: 0 }, [star])).toBeNull();
    expect(findFocus({ x: star.x, z: star.z, yaw: 0, pitch: 0.42 }, [star])?.def.id).toBe('prologue.star');
    expect(findFocus({ x: star.x, z: star.z, yaw: 0, pitch: -0.42 }, [star])).toBeNull();
    expect(star.glint).toBe(false);
  });
});

describe('序章英雄资产轮廓', () => {
  it('木筏、名牌与断桨各自保留可辨识的比例和分材质细节', () => {
    const raft = wreckedRaft(100);
    const raftBox = new THREE.Box3().setFromBufferAttribute(raft.wood.getAttribute('position') as THREE.BufferAttribute);
    expect(raftBox.max.x - raftBox.min.x).toBeGreaterThan(4);
    expect(raftBox.max.z - raftBox.min.z).toBeGreaterThan(3.5);
    expect(raft.rope.getAttribute('position').count).toBeGreaterThan(100);

    const name = weatheredNamePlank(120);
    const nameBox = new THREE.Box3().setFromBufferAttribute(name.inscription.getAttribute('position') as THREE.BufferAttribute);
    expect(nameBox.max.y).toBeGreaterThan(0.08);

    const oar = brokenOar(3.35, 130);
    const oarBox = new THREE.Box3().setFromBufferAttribute(oar.getAttribute('position') as THREE.BufferAttribute);
    expect(oarBox.max.x - oarBox.min.x).toBeGreaterThan(3);

    raft.wood.dispose();
    raft.rope.dispose();
    name.wood.dispose();
    name.inscription.dispose();
    oar.dispose();
  });
});

describe('树冠必须让开人的头顶', () => {
  /**
   * 这不是洁癖，是一个真实发生过的 bug：
   * 三座岛各自抄了一遍"树干 + 树冠"的装配比例，谁也没保证树冠够高，
   * 结果忘食岸的冠底只有 1.48 米——比眼高 1.68 还低。而那一幕的
   * 「闻果子」线索恰好摆在一棵树的正下方，也就是说**每个玩家**
   * 都必然走到那儿，然后一头撞进一团黑。
   *
   * 修法是把装配收进 oliveTree()，由它量出树冠包围盒再决定抬多高。
   * 这条测试盯着那个保证：只要还成立，树冠就永远在头顶之上。
   */
  it('不管树多高、seed 抽到什么形状，冠底都不低于 CANOPY_CLEARANCE', () => {
    // 覆盖三座岛用到的全部树高，外加两端的极端值
    const heights = [3.2, 3.6, 3.8, 3.9, 4.0, 4.1, 4.2, 4.4, 4.6, 4.8, 5.2, 6.5];
    for (const height of heights) {
      for (let seed = 0; seed < 40; seed += 1) {
        const tree = oliveTree(height, 300 + seed * 7);
        tree.canopy.computeBoundingBox();
        const clearance = tree.canopyLift + tree.canopy.boundingBox!.min.y;
        expect(
          clearance,
          `高 ${height} / seed ${300 + seed * 7} 的树冠垂到了 ${clearance.toFixed(2)} 米`,
        ).toBeGreaterThanOrEqual(CANOPY_CLEARANCE - 1e-6);
      }
    }
  });

  it('留出的余量确实高过眼高，不是刚好擦过头皮', () => {
    // engine/controller.ts 的 EYE_HEIGHT
    expect(CANOPY_CLEARANCE).toBeGreaterThan(1.68 + 0.5);
  });

  it('树冠仍然坐在树干上，没有飘成一顶悬空的帽子', () => {
    for (const height of [3.6, 4.4, 5.2]) {
      const tree = oliveTree(height, 340);
      tree.canopy.computeBoundingBox();
      const canopyBottom = tree.canopyLift + tree.canopy.boundingBox!.min.y;
      // 冠底必须低于树干顶，否则中间会开一道天光
      expect(canopyBottom, `高 ${height} 的树冠与树干脱开了`).toBeLessThan(height);
    }
  });
});
