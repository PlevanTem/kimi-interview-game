import type { AudioProfileName } from '../engine/audio';
import type { EnvName } from '../content/palette';
import type { MotifKind } from '../world/silhouette';
import type { NarrativeAssetId } from '../world/narrative-assets';

/**
 * 玩法数据契约。
 *
 * 这个文件里没有 three.js，也没有 DOM——它描述的是"这一幕有什么、
 * 碰了会发生什么"。渲染层读它，单元测试也读它，两边永远说同一件事。
 */

/** 可交互物的四种类型，全作只有这四种，不再增加。 */
export type InteractKind =
  /** 环境线索：读一两句旁白，不改变任何状态 */
  | 'clue'
  /** 核心记忆物件：触发本幕的回忆幻象 */
  | 'memory'
  /** 简短对话：一位 NPC，线性说完就结束 */
  | 'talk'
  /** 离岛：走到船边，结束这一幕 */
  | 'depart';

/**
 * 可见环境本身就是交互目标时使用的二维区域。
 * 物件仍以 x/z 作为引导光锚点；区域只扩展玩家可触发的真实画面范围。
 */
export interface ProximityZone {
  kind: 'annulus';
  centerX: number;
  centerZ: number;
  innerRadius: number;
  outerRadius: number;
}

export interface InteractableDef {
  id: string;
  kind: InteractKind;
  /** 准星旁的一行提示，例如"读铭文" */
  prompt: string;
  /** 触发后逐条播放的文本 */
  lines: readonly string[];
  x: number;
  z: number;
  /** 交互点相对地面的高度，用于对准视线 */
  y?: number;
  /** 触发半径，默认 2.4 米 */
  radius?: number;
  /** 小范围环境交互：贴近此半径后无需瞄准脚下的单个点。默认仍须朝向目标。 */
  proximityRadius?: number;
  /** 面状环境交互：进入可见区域即可触发，例如环绕岛屿的湿岸。 */
  proximityZone?: ProximityZone;
  /** 远处线索可要求玩家真正抬头并朝向它，而不只是在地面交互点附近。 */
  look?: {
    yaw: number;
    pitch: number;
    tolerance?: number;
  };
  /** 物件自身足够醒目时可关闭近地面的辅助微光。 */
  glint?: boolean;
  /**
   * 离岛点专用：必须先触发核心记忆才会亮起。
   * 其余类型忽略此字段。
   */
  requiresMemory?: boolean;
  /** 对话专用：说话人名字，会显示在字幕上方 */
  speaker?: string;
  /**
   * 对话专用：这位 NPC 在世界里的剪影母题。
   * 尚未升级的世界 NPC 使用黑绘；回忆母题始终使用黑绘。
   */
  motif?: MotifKind;
  /** 剪影高度（米），默认 1.9 */
  motifSize?: number;
  /** 实体人物由场景通过资产 resolver 放置，与 motif 二选一。 */
  modelAsset?: NarrativeAssetId;
  modelHeight?: number;
}

/** 幻象里浮现的一片剪影。 */
export interface MotifBeat {
  kind: MotifKind;
  /** 相对幻象舞台中心的位置（米） */
  x: number;
  y: number;
  z: number;
  size: number;
  /** 用主色还是影色 */
  ink?: 'figure' | 'shadow';
  /** 是否始终面向相机；不面向时按 yaw 摆放 */
  billboard?: boolean;
  yaw?: number;
  /** 浮现耗时（秒），默认 1.6 */
  grow?: number;
  /** 从幻象开始算起，何时开始崩解；不填则结尾统一崩解 */
  crumbleAt?: number;
  opacity?: number;
}

/** 幻象的一拍：一句旁白 + 可选的一片剪影 + 可选的镜头动作。 */
export interface VisionBeat {
  /** 相对幻象开始的秒数 */
  at: number;
  /** 这一拍的旁白；不填表示只有画面 */
  line?: string;
  /** 这句旁白停留多久，默认按字数估算 */
  hold?: number;
  motif?: MotifBeat;
  /**
   * 镜头动作。幻象里玩家仍可自由转头，
   * 这里的值是"镜头被轻轻推向哪儿"，不是硬锁定。
   */
  camera?: {
    /** 相对进入幻象时的朝向（弧度） */
    yaw?: number;
    pitch?: number;
    /** FOV 偏移，负值是推近 */
    fov?: number;
    /** 缓动时间（秒），默认 2.5 */
    ease?: number;
  };
  /** 曝光倍率，用来做"白到看不见"这类瞬间 */
  exposure?: number;
}

export interface VisionDef {
  id: string;
  /** 总时长（秒） */
  duration: number;
  /** 舞台中心：剪影围绕这个点摆开，通常就在记忆物件前方 */
  stage: { x: number; y: number; z: number };
  beats: readonly VisionBeat[];
}

export interface SceneDef {
  id: string;
  /** 第几幕，序章是 0 */
  act: number;
  title: string;
  /** 副题：登岸时压在画面下缘的一行 */
  subtitle: string;
  /** 情绪基调，一句话。同时写进 docs/SCENES.md */
  tone: string;
  env: EnvName;
  audio: AudioProfileName;
  spawn: { x: number; z: number; yaw: number };
  /** 本幕核心记忆物件的 id，必须出现在 interactables 里 */
  memoryId: string;
  interactables: readonly InteractableDef[];
  vision: VisionDef;
  /** 登岸镜头：缓慢横摇多少弧度，持续多少秒 */
  arrival: { pan: number; seconds: number };
}

/** 一条正在播放的字幕。 */
export interface Caption {
  text: string;
  /** 剩余显示时间 */
  remaining: number;
  /** 说话人；旁白为 undefined */
  speaker?: string;
}

/**
 * 按字数估算一句话该停多久。
 *
 * 中文默读大约每秒 4–5 字，但这是一部要人慢慢看的作品：
 * 每句留一点读完之后的静默，节奏才不像在赶路。
 */
export function holdFor(text: string): number {
  return Math.max(2.8, Math.min(10, 1.5 + text.length / 4.6));
}
