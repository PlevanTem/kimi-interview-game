import { calypso } from './calypso';
import { circe } from './circe';
import { cyclops } from './cyclops';
import { ithaca } from './ithaca';
import { lotus } from './lotus';
import { nekyia } from './nekyia';
import { prologue } from './prologue';
import { sirens } from './sirens';
import type { Act } from './types';

/**
 * 八幕，按顺序。
 *
 * 每一幕都是**彼此完全独立**的一座小岛：各自的地形、天候、音景与几何，
 * 上一幕的东西一件也不会出现在下一幕里。幕与幕之间用一次白光过曝硬切，
 * 中间没有航行、没有过场、没有加载画面里的世界地图。
 *
 * 天候的节奏是刻意排的：靛蓝 → 蜜金 → 雷暴 → 琥珀 → 无光 → 铅灰 → 永昼 → 转晴。
 * 风暴与黄昏交替，最暗的一幕（亡者之岸）压在正中间。
 */
export const ACTS: readonly Act[] = [
  prologue,
  lotus,
  cyclops,
  circe,
  nekyia,
  sirens,
  calypso,
  ithaca,
];

export const TOTAL_ACTS = ACTS.length;

export function actAt(index: number): Act {
  const clamped = Math.max(0, Math.min(ACTS.length - 1, index));
  return ACTS[clamped]!;
}

export function actById(id: string): Act | undefined {
  return ACTS.find((act) => act.def.id === id);
}

export type { Act } from './types';
