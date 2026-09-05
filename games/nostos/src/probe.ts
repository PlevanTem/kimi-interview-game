import type { Game } from './game/flow';

/**
 * e2e 探针的类型契约。
 *
 * 它只读状态、传送与触发，改变不了任何叙事结果——所以自动化测试走的
 * 确实是玩家会走的那条路径，只是不用脚本模拟走路。
 * 类型声明放在这里，游戏与测试共用同一份，不会各写一份而互相打架。
 */
export interface NostosProbe {
  state: () => ReturnType<Game['debugState']>;
  /** 把玩家放到某个交互点前并面向它 */
  teleport: (id: string) => boolean;
  /** 触发当前对焦物 */
  interact: () => void;
  /** 把当前幻象推到崩解段 */
  skipVision: () => void;
  /** 把当前旁白一口气念完 */
  skipNarration: () => void;
  /** 直接跳到某一幕 */
  gotoAct: (index: number) => void;
  /** Reproducible camera evidence; no narrative flags are changed. */
  view: (pose: { x: number; z: number; yaw: number; pitch: number }) => void;
  actCount: number;
}

declare global {
  interface Window {
    __nostos?: NostosProbe;
  }
}
