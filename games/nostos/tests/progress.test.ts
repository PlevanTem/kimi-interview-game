import { beforeEach, describe, expect, it } from 'vitest';
import {
  advance,
  canDepart,
  clear,
  clueProgress,
  createProgress,
  hasTriggered,
  isFinalAct,
  load,
  markTriggered,
  save,
} from '../src/game/progress';
import { ACTS, TOTAL_ACTS } from '../src/game/scenes';

/** 用一个最小的内存实现顶替 localStorage，测试存档往返。 */
function installStorage(): { throwOnWrite: boolean } {
  const store = new Map<string, string>();
  const flags = { throwOnWrite: false };
  const stub = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (flags.throwOnWrite) throw new Error('quota');
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  (globalThis as unknown as { localStorage: unknown }).localStorage = stub;
  return flags;
}

describe('进度', () => {
  let flags: { throwOnWrite: boolean };

  beforeEach(() => {
    flags = installStorage();
    clear();
  });

  it('触发只记一次，重复触发返回 false', () => {
    const progress = createProgress();
    expect(markTriggered(progress, 'lotus.oar')).toBe(true);
    expect(markTriggered(progress, 'lotus.oar')).toBe(false);
    expect(progress.triggered).toEqual(['lotus.oar']);
    expect(hasTriggered(progress, 'lotus.oar')).toBe(true);
    expect(hasTriggered(progress, 'lotus.hearth')).toBe(false);
  });

  it('只有触发过核心记忆才能离岛', () => {
    const lotus = ACTS[1]!.def;
    const progress = createProgress(1);
    expect(canDepart(progress, lotus)).toBe(false);
    markTriggered(progress, 'lotus.amphora');
    expect(canDepart(progress, lotus)).toBe(false);
    markTriggered(progress, lotus.memoryId);
    expect(canDepart(progress, lotus)).toBe(true);
  });

  it('线索进度只统计 clue，不把记忆与船算进去', () => {
    const lotus = ACTS[1]!.def;
    const progress = createProgress(1);
    const total = lotus.interactables.filter((item) => item.kind === 'clue').length;
    expect(clueProgress(progress, lotus)).toEqual({ seen: 0, total });
    markTriggered(progress, 'lotus.amphora');
    markTriggered(progress, lotus.memoryId);
    expect(clueProgress(progress, lotus)).toEqual({ seen: 1, total });
  });

  it('推进幕次时保留已触发记录，并停在最后一幕', () => {
    let progress = createProgress();
    markTriggered(progress, 'prologue.oar');
    progress = advance(progress, TOTAL_ACTS);
    expect(progress.act).toBe(1);
    expect(progress.triggered).toEqual(['prologue.oar']);

    for (let i = 0; i < TOTAL_ACTS * 2; i += 1) progress = advance(progress, TOTAL_ACTS);
    expect(progress.act).toBe(TOTAL_ACTS - 1);
    expect(isFinalAct(progress, TOTAL_ACTS)).toBe(true);
  });

  it('存档往返保真', () => {
    const progress = createProgress(3);
    markTriggered(progress, 'circe.loom');
    markTriggered(progress, 'circe.cup');
    save(progress);
    expect(load()).toEqual({ act: 3, triggered: ['circe.loom', 'circe.cup'] });
    clear();
    expect(load()).toBeNull();
  });

  it('存档写不进去时静默失败，不影响游玩', () => {
    flags.throwOnWrite = true;
    expect(() => save(createProgress(2))).not.toThrow();
    expect(load()).toBeNull();
  });

  it('存档内容被破坏时当作没有存档', () => {
    localStorage.setItem('nostos.progress.v1', '{"act":"三","triggered":null}');
    expect(load()).toBeNull();
    localStorage.setItem('nostos.progress.v1', 'not json');
    expect(load()).toBeNull();
  });
});
