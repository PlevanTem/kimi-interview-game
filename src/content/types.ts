/**
 * 《归乡录 · Nostos》内容层类型定义。
 *
 * 全部游戏内容都是纯数据：岛屿、证物、记忆定影、归乡录条目、对话树、抉择。
 * domain 层只消费这些数据，不认识任何具体的神话内容——这样五座岛可以完全
 * 由数据驱动，新增一岛不需要改一行逻辑。
 */

export type IslandId = 'lotus' | 'cyclops' | 'aeolia' | 'aiaia' | 'thrinacia' | 'ithaca'

/** 证物的五种类型，对应《Obra Dinn》的"现场遗留物"分类。 */
export type EvidenceKind = 'object' | 'inscription' | 'body' | 'trace' | 'testimony'

/** 事实标记：检视证物后写入玩家的"已知事实"集合，是一切门控的原子单位。 */
export type FactId = string

/** 抉择旗标：关键抉择留下的不可撤销痕迹，参与结局判定与后续对话门控。 */
export type FlagId = string

/** 二维平面坐标（y 由地形决定，内容层不关心高度）。 */
export type Vec2 = readonly [number, number]

// ---------------------------------------------------------------------------
// 条件表达式
// ---------------------------------------------------------------------------

/**
 * 对话选项、抉择可用性与证物可见性的统一门控语言。
 * 全部可静态求值，无副作用——见 domain/conditions.ts。
 */
export type Condition =
  | { has: FactId }
  | { locked: string }
  | { lockedCount: number }
  | { flag: FlagId }
  | { trust: number }
  | { not: Condition }
  | { all: Condition[] }
  | { any: Condition[] }

// ---------------------------------------------------------------------------
// 证物与记忆定影
// ---------------------------------------------------------------------------

export interface Evidence {
  id: string
  island: IslandId
  kind: EvidenceKind
  /** 场景中显示的名称，如「刻名的护身符」。 */
  name: string
  /** 检视面板正文。可多段。 */
  examine: string[]
  position: Vec2
  /** 检视后写入玩家事实集合。 */
  grantsFacts: FactId[]
  /** 检视后解锁的归乡录下拉选项 id。 */
  unlocksOptions?: string[]
  /** 若存在，检视后可按 E 进入对应的记忆定影。 */
  tableau?: string
}

/** 记忆定影里的一个凝固人物。没有骨骼动画，只有位置、朝向与姿态枚举。 */
export interface TableauFigure {
  id: string
  /** 画面中的标注名。未辨认者写「无法辨认」之类的占位词。 */
  label: string
  position: Vec2
  /** 面朝方向，弧度。 */
  facing: number
  pose: 'stand' | 'kneel' | 'lie' | 'reach' | 'flee' | 'sit'
  /** 该人物的可辨识细节，检视时显示。 */
  detail?: string
  /** 是否为巨人尺度（波吕斐摩斯）。 */
  giant?: boolean
}

export interface Tableau {
  id: string
  island: IslandId
  title: string
  /** 进入时播放的一句"回声"台词。 */
  echo: string
  /** 回声的说话人显示名。 */
  echoSpeaker: string
  figures: TableauFigure[]
  /** 定影相机的注视中心。玩家可在该点周围有限半径内绕行。 */
  center: Vec2
  grantsFacts: FactId[]
  unlocksOptions?: string[]
}

// ---------------------------------------------------------------------------
// 归乡录
// ---------------------------------------------------------------------------

export interface LedgerOption {
  id: string
  label: string
}

/** 归乡录条目的一个下拉框（身份 / 手段 / 施动者……）。 */
export interface LedgerSlot {
  /** 下拉框前的提示词，如「身份」。 */
  label: string
  /** 该框可选项的来源分组，见 LedgerEntry.optionPool。 */
  pool: string
  /** 正确答案的选项 id。 */
  answer: string
}

export interface LedgerEntry {
  id: string
  island: IslandId
  /** 条目题面，如「这具带铜扣的遗骸是谁？」。 */
  prompt: string
  slots: LedgerSlot[]
  /** 条目在归乡录中出现的条件；缺省表示抵达该岛即出现。 */
  appearsWhen?: Condition
}

// ---------------------------------------------------------------------------
// 对话
// ---------------------------------------------------------------------------

export interface DialogueChoice {
  text: string
  when?: Condition
  goto?: string
  sets?: FlagId[]
  /** 选择后对欧律洛科斯信任度的增减。 */
  trust?: number
}

export interface DialogueNode {
  id: string
  speaker: string
  text: string
  /** 空数组表示该节点结束对话。 */
  choices: DialogueChoice[]
}

export interface Npc {
  id: string
  name: string
  position: Vec2
  facing: number
  /** 人物在场景中的渲染尺度，用于波吕斐摩斯这类巨人。 */
  giant?: boolean
  /** 对话树。第一个节点为入口，或由 entry 指定。 */
  nodes: DialogueNode[]
  /** 按条件选择入口节点，取第一个满足者；全不满足时回落到最后一项。 */
  entries: { node: string; when?: Condition }[]
}

// ---------------------------------------------------------------------------
// 抉择
// ---------------------------------------------------------------------------

export interface ChoiceOption {
  id: string
  label: string
  /** 选后展示的后果描述。 */
  outcome: string
  sets: FlagId[]
  wrath?: number
  crew?: number
  trust?: number
  when?: Condition
}

export interface IslandChoice {
  id: string
  title: string
  prompt: string
  options: ChoiceOption[]
  /** 抉择可被触发的条件（通常要求已锁定若干条目）。 */
  availableWhen?: Condition
  /** 抉择所在位置，玩家走到此处按 E 触发。 */
  position: Vec2
}

// ---------------------------------------------------------------------------
// 地形与岛屿
// ---------------------------------------------------------------------------

/** 程序化地形块。全部是轴对齐盒或圆柱，碰撞与渲染共用同一份数据。 */
export interface TerrainBlock {
  kind: 'box' | 'cylinder' | 'ramp'
  position: Vec2
  /** box: [宽, 深]；cylinder: [半径, 半径]。 */
  size: Vec2
  height: number
  color: string
  /** 是否阻挡移动。 */
  solid: boolean
  rotation?: number
}

/** 纯装饰道具，不可检视、不阻挡（除非 solid）。 */
export interface Decoration {
  kind: 'column' | 'urn' | 'olive' | 'rock' | 'sheep' | 'flame' | 'lotus' | 'cattle' | 'wave'
  position: Vec2
  scale?: number
  rotation?: number
  solid?: boolean
}

export interface Island {
  id: IslandId
  index: number
  /** 中文岛名。 */
  name: string
  /** 希腊原文岛名，标题卡装饰用。 */
  greek: string
  /** 标题卡副标题。 */
  subtitle: string
  /** 抵达时的引子文本。 */
  arrival: string[]
  /** 可行走区域半宽半深，以原点为中心。 */
  bounds: Vec2
  /** 地面主色。 */
  ground: string
  terrain: TerrainBlock[]
  decorations: Decoration[]
  evidence: Evidence[]
  tableaux: Tableau[]
  ledger: LedgerEntry[]
  npcs: Npc[]
  choice: IslandChoice
  /** 离岛所需的最少已锁定本岛条目数。 */
  departureRequirement: number
  /** 离岛点坐标。 */
  departure: Vec2
  /** 玩家出生点。 */
  spawn: Vec2
}
