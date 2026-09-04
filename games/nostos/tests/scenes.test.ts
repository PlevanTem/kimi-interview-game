import { describe, expect, it } from 'vitest';
import { ACTS, TOTAL_ACTS, actAt, actById } from '../src/game/scenes';
import { ENV } from '../src/content/palette';
import { AUDIO } from '../src/engine/audio';
import { MOTIF_KINDS } from '../src/world/silhouette';
import { findFocus } from '../src/game/interact';
import { holdFor } from '../src/game/types';

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

  it('全作只有四位 NPC，每位都有名字、剪影与一段短对话', () => {
    const talkers = ACTS.flatMap(({ def }) => def.interactables.filter((item) => item.kind === 'talk'));
    expect(talkers).toHaveLength(4);
    for (const npc of talkers) {
      expect(npc.speaker).toBeTruthy();
      expect(npc.motif && MOTIF_KINDS.includes(npc.motif)).toBe(true);
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
});
