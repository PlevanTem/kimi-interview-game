import type { SceneDef } from './types';
import { previewAct } from './local-preview';

/**
 * 进度。
 *
 * 全作只记两件事：走到第几幕，碰过哪些东西。
 * 没有数值、没有分支权重、没有结局解算——碰过的东西只影响"这句旁白还播不播"
 * 和"能不能上船"，不影响故事往哪儿走。
 */

const STORAGE_KEY = 'nostos.progress.v1';

export interface Progress {
  act: number;
  triggered: string[];
}

export function createProgress(act = 0): Progress {
  return { act, triggered: [] };
}

export function hasTriggered(progress: Progress, id: string): boolean {
  return progress.triggered.includes(id);
}

/** 记录一次触发；重复触发不会写第二遍。返回是否是第一次。 */
export function markTriggered(progress: Progress, id: string): boolean {
  if (progress.triggered.includes(id)) return false;
  progress.triggered.push(id);
  return true;
}

/** 核心记忆触发之后，船才会亮起来。 */
export function canDepart(progress: Progress, scene: SceneDef): boolean {
  return hasTriggered(progress, scene.memoryId);
}

/** 这一幕已经看过的线索数 / 总线索数，用于登岸时的极简进度提示。 */
export function clueProgress(progress: Progress, scene: SceneDef): { seen: number; total: number } {
  const clues = scene.interactables.filter((item) => item.kind === 'clue');
  const seen = clues.filter((item) => hasTriggered(progress, item.id)).length;
  return { seen, total: clues.length };
}

/** 进入下一幕：幕号 +1，触发记录保留（跨幕不重置，日志式的记忆）。 */
export function advance(progress: Progress, totalActs: number): Progress {
  return { act: Math.min(progress.act + 1, totalActs - 1), triggered: [...progress.triggered] };
}

export function isFinalAct(progress: Progress, totalActs: number): boolean {
  return progress.act >= totalActs - 1;
}

/** 存档。localStorage 不可用（无痕、被禁用）时静默跳过，不影响游玩。 */
export function save(progress: Progress): void {
  if (previewAct() !== null) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 存不下就算了，这不是一个需要长期存档的作品
  }
}

export function load(): Progress | null {
  if (previewAct() !== null) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Progress).act !== 'number' ||
      !Array.isArray((parsed as Progress).triggered)
    ) {
      return null;
    }
    const value = parsed as Progress;
    return {
      act: Math.max(0, Math.floor(value.act)),
      triggered: value.triggered.filter((id): id is string => typeof id === 'string'),
    };
  } catch {
    return null;
  }
}

export function clear(): void {
  if (previewAct() !== null) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 同上
  }
}
