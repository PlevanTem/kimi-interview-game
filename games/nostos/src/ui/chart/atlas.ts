import { ENV } from '../../content/palette';
import { MEMORY_LABELS } from '../../content/script';
import { ACTS } from '../../game/scenes';
import type { TerrainParams } from '../../world/terrain';

/**
 * 航程海图的图表数据。
 *
 * 这个文件里**不新建任何造型**：岛的形状来自 `ACTS[i].terrain`，
 * 岛的天候来自 `ENV[def.env]`，岛的名字与记忆物件来自剧本。
 * 海图上只允许多出三样东西——章在图上的位置、给地标的一份清单、
 * 以及少数几处「图上比世界里说得更清楚」的刻意偏差（见 carve）。
 *
 * 为什么这样约束：暂停面板里那八枚浮雕如果由美术另捏一遍轮廓，
 * 玩家在图上看到的就不是他走过的那座岛了。航程一旦说谎，它就只是装饰。
 */

/** 一枚章在图版上的落点。图版坐标，1 单位 ≈ 一枚章的半径的 2.4 倍。 */
export interface ChartSlot {
  x: number;
  z: number;
  /** 章自身的转角：让八枚不要像标本一样朝着同一个方向 */
  yaw: number;
}

/**
 * 图上刻意的形体偏差。
 *
 * 塞壬水道在世界里是**被雾和两侧礁石收出来**的——玩家站在水面上，
 * 用视线的封闭感读出"这是一条道"。可是从上方看一枚章，雾没有了，
 * 那条道就消失了，只剩一块普通的碎礁。所以图上要把它真的切开。
 *
 * 这是全图唯一允许的偏差，写在这里而不是藏在几何代码里，
 * 是为了让它是一个**被记录的决定**，不是一次手滑。
 */
export interface ChartCarve {
  /** 水道方向（弧度，0 = +X） */
  angle: number;
  /** 半宽（世界米） */
  halfWidth: number;
  /** 切多深（世界米） */
  depth: number;
}

/** 地标构件：真正的三维小构件，不是贴片。种类在 landmarks.ts 里实现。 */
export type LandmarkKind =
  | 'raft' /* 散架的木筏 */
  | 'brokenOar' /* 斜插的断桨 */
  | 'fruitTree' /* 果树：树干 + 树冠两件套 */
  | 'footprints' /* 一行单向脚印 */
  | 'brokenColumn' /* 断柱 */
  | 'caveMouth' /* 洞口：三层退进的石阶围出一个真的负形 */
  | 'ribs' /* 巨兽的肋骨 */
  | 'reef' /* 碎礁 */
  | 'colonnade' /* 两排列柱 + 楣石 */
  | 'collapsedRoof' /* 塌下来的屋顶一角 */
  | 'boundaryStones' /* 一列界石 */
  | 'unlitPyre' /* 堆好却没点的柴 */
  | 'libationBowl' /* 祭酒碗与它旁边空着的位置 */
  | 'wreck' /* 沉船的龙骨与肋 */
  | 'standingMast' /* 立着的那截桅杆 */
  | 'stumps' /* 二十个树桩 */
  | 'cedars' /* 还站着的雪松 */
  | 'springs' /* 四道泉 */
  | 'raftBoat' /* 他自己造的那条船 */
  | 'house' /* 全作唯一一座完整的屋 */
  | 'hearthSmoke' /* 屋顶上那缕烟 */
  | 'oliveTree'; /* 那棵橄榄树 */

export interface Landmark {
  kind: LandmarkKind;
  /** 世界坐标（米），和场景里 dress() 用的是同一套坐标 */
  x: number;
  z: number;
  yaw?: number;
  /**
   * 相对基准尺寸的放大。
   *
   * 章的比例尺大约 1:400。一根 5 米高的柱子在图上是 1.2 毫米——
   * 等比缩下去等于没有。所以地标一律**夸张 1.6–2.4 倍**：
   * 章要读得懂，不是要量得准。地形不夸张，地标才夸张。
   */
  scale?: number;
  /** 数量：给成组的构件用（脚印、树桩、界石…） */
  count?: number;
}

export interface ChartIsland {
  id: string;
  act: number;
  /** 「序章」「第一幕」… */
  ordinal: string;
  title: string;
  subtitle: string;
  tone: string;
  /** 本幕的核心记忆物件，走过之后才刻上章的侧壁 */
  memory: string;
  terrain: TerrainParams;
  slot: ChartSlot;
  carve?: ChartCarve;
  landmarks: readonly Landmark[];
  /** 这一幕的天候。章自己带着自己的光——八枚排开就是全作的天候节奏。 */
  weather: {
    /** 主光色，取自该幕的太阳 */
    key: number;
    /** 该幕太阳的方位角：天候染色也照着这个方向来 */
    azimuth: number;
    /** 章底那一圈贴地的雾，取自该幕的地平线 */
    horizon: number;
    /** 章周围那一圈水，取自该幕的浅海 */
    sea: number;
    intensity: number;
  };
}

const ORDINALS = ['序章', '第一幕', '第二幕', '第三幕', '第四幕', '第五幕', '第六幕', '第七幕'];

/**
 * 八枚章在图版上的落点。
 *
 * 排成**两排四枚的蛇形**：第一排从左往右走完序章到第三幕，第二排掉头往回。
 * 这不是一张地理地图——八座岛在世界里彼此毫无关系（`scenes/index.ts` 写明了
 * 这一点），图上如果给出方位与距离，就等于凭空发明了一片地中海。
 * 这个排法只表示先后。
 *
 * 为什么是两排而不是一条线：一条八枚的横排在面板里摊成 7.7 : 1.6 的窄带，
 * 塞进接近方形的画布后，每一枚只剩一百像素出头，浮雕与地标全部糊掉。
 * 折成两排之后占地接近 6 : 3.6，和面板的宽高比对上，每一枚大约放大一倍。
 */
const SLOTS: readonly ChartSlot[] = [
  { x: -2.42, z: -0.98, yaw: 0.22 },
  { x: -0.81, z: -0.82, yaw: -0.5 },
  { x: 0.81, z: -1.0, yaw: 0.34 },
  { x: 2.42, z: -0.78, yaw: -0.18 },
  { x: 2.42, z: 1.42, yaw: 0.62 },
  { x: 0.81, z: 1.58, yaw: -0.72 },
  { x: -0.81, z: 1.38, yaw: 0.1 },
  { x: -2.42, z: 1.6, yaw: -0.28 },
];

/**
 * 每一幕的地标清单。
 *
 * 坐标全部照抄各幕 `dress()` 里真实的摆放位置——玩家在岛上绕过的那个洞口、
 * 数过的那二十个树桩，在章上必须在同一个地方。清单只挑
 * **一眼能认出这是哪座岛**的两到四件，不做全景复刻：
 * 章是记忆，不是缩微模型。
 */
const LANDMARKS: Record<string, readonly Landmark[]> = {
  // 无名之海：全作最小最平的一块沙洲，海拔几乎为零。
  // 章上只有他十年来的全部家当：一堆散架的木头，和那根断桨。
  prologue: [
    { kind: 'raft', x: 0, z: -2.5, yaw: 0.3, scale: 2.0 },
    { kind: 'brokenOar', x: 3.4, z: -4.2, yaw: -0.9, scale: 2.4 },
    { kind: 'reef', x: -9, z: 7, count: 4, scale: 1.6 },
  ],

  // 忘食岸：宽而低的沙丘。那一行脚印是这一幕的整个论点——
  // 只有去的，没有回的。章上必须只刻单向的一行。
  lotus: [
    { kind: 'fruitTree', x: 8, z: -6, scale: 2.0 },
    { kind: 'fruitTree', x: 16, z: -13, scale: 1.8 },
    { kind: 'fruitTree', x: 21, z: -8, scale: 2.1 },
    { kind: 'footprints', x: 4, z: 20, yaw: -1.05, count: 11, scale: 2.2 },
    { kind: 'brokenColumn', x: -14, z: -16, count: 3, scale: 1.9 },
  ],

  // 独眼岬：全作最高最碎的一座，ridge 1.8 的海蚀层理在章上一眼能看出来。
  // 洞口做成真的负形——退进三层的石阶围出一个黑的体积，不是画一块黑。
  cyclops: [
    { kind: 'caveMouth', x: 0, z: -30, yaw: 0, scale: 2.2 },
    { kind: 'ribs', x: 6, z: -8, yaw: 0.5, count: 5, scale: 2.0 },
    { kind: 'reef', x: -16, z: 22, count: 7, scale: 1.8 },
  ],

  // 喀耳刻的柱廊：半座岛被削平成一块大台基（plateau r24）。
  // 列柱越靠海越残——废墟是有方向的，章上也要有。
  circe: [
    { kind: 'colonnade', x: 0, z: -6, yaw: 0, count: 6, scale: 1.9 },
    { kind: 'collapsedRoof', x: -7, z: -16, yaw: 0.4, scale: 2.0 },
    { kind: 'brokenColumn', x: 9, z: 12, count: 4, scale: 1.8 },
  ],

  // 亡者之岸：平、白，中间一个挖好的坑（basin 已经在地形里了）。
  // 章上不加光，也不加颜色——这一幕的天候本来就是"无光"。
  nekyia: [
    { kind: 'boundaryStones', x: -6, z: 6, yaw: -0.35, count: 5, scale: 2.1 },
    { kind: 'unlitPyre', x: 7, z: -5, scale: 2.0 },
    { kind: 'libationBowl', x: -2, z: -13, scale: 2.4 },
  ],

  // 塞壬水道：世界里靠雾与礁石收出一条道，图上要真的切开（见 carve）。
  // 三具沉船船头全部朝里，排成一条把人往里带的路。
  sirens: [
    { kind: 'wreck', x: -3, z: 6, yaw: 0.08, scale: 1.9 },
    { kind: 'wreck', x: 2, z: -2, yaw: -0.05, scale: 1.9 },
    { kind: 'wreck', x: -1, z: -11, yaw: 0.12, scale: 1.7 },
    { kind: 'standingMast', x: 5, z: -16, scale: 2.2 },
    { kind: 'reef', x: -17, z: -6, count: 6, scale: 1.9 },
    { kind: 'reef', x: 17, z: 4, count: 6, scale: 1.9 },
  ],

  // 卡吕普索之岛：二十个树桩，正好够造一条船。章上就刻二十个，
  // 少一个这枚章就不成立——玩家在岛上数过。
  calypso: [
    { kind: 'stumps', x: -6, z: -8, count: 20, scale: 2.0 },
    { kind: 'cedars', x: 12, z: -14, count: 7, scale: 1.8 },
    { kind: 'caveMouth', x: -8, z: -22, yaw: 0.2, scale: 1.9 },
    { kind: 'springs', x: 4, z: 2, count: 4, scale: 2.0 },
    { kind: 'raftBoat', x: 10, z: 18, yaw: -0.5, scale: 2.0 },
  ],

  // 伊萨卡：全作唯一一座完整的建筑，也是章上唯一一座有屋顶的东西。
  // 那缕烟是唯一在动的地标——终点是活的。
  ithaca: [
    { kind: 'house', x: 0, z: -12, yaw: 0, scale: 1.9 },
    { kind: 'hearthSmoke', x: 1.6, z: -13.5, scale: 2.0 },
    { kind: 'oliveTree', x: 11, z: -4, scale: 2.1 },
  ],
};

/** 图上刻意的偏差，目前只有一处。 */
const CARVES: Record<string, ChartCarve> = {
  sirens: { angle: Math.PI / 2, halfWidth: 7.5, depth: 5.2 },
};

/** 八枚章的完整描述。模块初始化时算一次，之后只读。 */
export const CHART: readonly ChartIsland[] = ACTS.map((act, index) => {
  const env = ENV[act.def.env];
  return {
    id: act.def.id,
    act: index,
    ordinal: ORDINALS[index] ?? `第${index}幕`,
    title: act.def.title,
    subtitle: act.def.subtitle,
    tone: act.def.tone,
    memory: MEMORY_LABELS[act.def.id] ?? '',
    terrain: act.terrain,
    slot: SLOTS[index] ?? { x: index * 1.1 - 3.5, z: 0, yaw: 0 },
    carve: CARVES[act.def.id],
    landmarks: LANDMARKS[act.def.id] ?? [],
    weather: {
      key: env.sunColor,
      azimuth: env.sunAzimuth,
      horizon: env.horizonColor,
      sea: env.seaShallow,
      // 亡者之岸的太阳强度接近零，章上要真的暗下去；
      // 但完全不给光就读不出形体，所以给一个下限。
      intensity: Math.max(0.45, env.sunIntensity),
    },
  };
});

/** 一枚章的三种状态。 */
export type IslandState = 'locked' | 'current' | 'done';

export function stateFor(index: number, currentAct: number): IslandState {
  if (index < currentAct) return 'done';
  if (index === currentAct) return 'current';
  return 'locked';
}
