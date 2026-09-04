/**
 * 《归航 · NOSTOS》调色板与天候预设。
 *
 * 这是 docs/ART_BIBLE.md 的代码化版本：所有颜色只允许从这里取，
 * 场景不得自行硬编码十六进制色值。整部作品共用一套古希腊壁画色系，
 * 幕与幕之间靠"天候预设"改变光、雾与海，而不是靠换一套颜色。
 */

/** 壁画基色。命名沿用颜料而非用途，方便美术侧对照。 */
export const PIGMENT = {
  /** 骨白 — 石灰底、被晒白的骨与石 */
  bone: 0xe7d9be,
  /** 灰泥 — 未上色的墙体、沙 */
  plaster: 0xcbb89a,
  /** 赭红 — 红绘陶、干涸的颜料、锈 */
  terracotta: 0xa6402c,
  /** 土黄 — 麦秆、麻绳、被夕阳照亮的石面 */
  ochre: 0xc98a3b,
  /** 黑绘 — 剪影、阴影里的石缝、烧焦的木 */
  blackFigure: 0x1a1310,
  /** 海青 — 中景海水、青铜的冷面 */
  aegean: 0x2a4a55,
  /** 深海 — 远景海水、洞窟深处 */
  deepSea: 0x14262e,
  /** 雷云 — 风暴天空、湿透的石头 */
  storm: 0x3b3d4a,
  /** 金昏 — 黄昏太阳、火盆、被点亮的雾 */
  duskGold: 0xe0a94e,
  /** 铜绿 — 氧化青铜、苔、橄榄叶背面 */
  verdigris: 0x6e8c7a,
  /** 灰白 — 亡者之岸的一切 */
  ash: 0x9aa0a0,
  /** 靛蓝 — 黎明前的天与水 */
  indigo: 0x1b2740,
} as const;

export type PigmentName = keyof typeof PIGMENT;

/** 一个天候预设完整描述一幕的光、天、雾、海。 */
export interface EnvPreset {
  /** 太阳方位角（弧度，0 = +X 方向）与仰角（弧度，0 = 地平线） */
  sunAzimuth: number;
  sunElevation: number;
  /** 直射光颜色与强度 */
  sunColor: number;
  sunIntensity: number;
  /** 半球环境光：天顶色 / 地面反弹色 */
  skyAmbient: number;
  groundAmbient: number;
  ambientIntensity: number;

  /** 天空穹顶：地平线色 / 天顶色 */
  horizonColor: number;
  zenithColor: number;
  /** 云量 0–1；风暴接近 1，永昼接近 0 */
  cloudiness: number;
  /** 云的运动速度，风暴更快 */
  cloudSpeed: number;
  /** 星光强度，仅序章使用 */
  starIntensity: number;

  /** 雾。雾同时是关卡边界与情绪，密度决定"半封闭"的半径 */
  fogColor: number;
  fogDensity: number;
  /** 雾的高度衰减：越大雾越贴地 */
  fogHeightFalloff: number;
  /** 朝向太阳方向的雾内散射色，制造"雾被点亮" */
  fogSunColor: number;
  fogSunAmount: number;

  /**
   * 影部染色：光进不去的地方被什么颜色的反弹光填满。
   * 黄昏是暖赭，风暴是冷青，亡者之岸几乎无色——这一项决定了"影子的温度"。
   */
  shadowTint: number;

  /** 海面 */
  seaShallow: number;
  seaDeep: number;
  seaFoam: number;
  /** 浪高与频率 */
  waveHeight: number;
  waveChop: number;

  /** 后期分级 */
  exposure: number;
  /** 阴影/中间调/高光的染色 */
  lift: number;
  gamma: number;
  gain: number;
  saturation: number;
  /** 光晕强度与色温 */
  halation: number;
  halationTint: number;
  /** 暗角强度 */
  vignette: number;
  /** 胶片颗粒强度 */
  grain: number;
}

/** 以黄昏为基准的预设原型，其余天候只覆盖差异项。 */
const BASE: EnvPreset = {
  sunAzimuth: -0.6,
  sunElevation: 0.17,
  sunColor: PIGMENT.duskGold,
  sunIntensity: 1.35,
  skyAmbient: 0x8fa6b4,
  groundAmbient: PIGMENT.terracotta,
  ambientIntensity: 0.55,

  horizonColor: PIGMENT.duskGold,
  zenithColor: 0x35506b,
  cloudiness: 0.35,
  cloudSpeed: 0.012,
  starIntensity: 0,

  fogColor: 0xd9b073,
  fogDensity: 0.0095,
  fogHeightFalloff: 0.035,
  fogSunColor: 0xffd89a,
  fogSunAmount: 0.75,
  shadowTint: 0x8c5a48,

  seaShallow: PIGMENT.aegean,
  seaDeep: PIGMENT.deepSea,
  seaFoam: PIGMENT.bone,
  waveHeight: 0.32,
  waveChop: 1,

  exposure: 1.05,
  lift: 0.018,
  gamma: 0.96,
  gain: 1.04,
  saturation: 0.98,
  halation: 0.5,
  halationTint: 0xffc98a,
  vignette: 0.42,
  grain: 0.055,
};

function preset(patch: Partial<EnvPreset>): EnvPreset {
  return { ...BASE, ...patch };
}

/**
 * 八幕的天候。命名与 docs/SCENES.md 的幕次一一对应。
 * 风暴与黄昏交替出现，是全作的节奏骨架：
 * 靛蓝 → 蜜金 → 雷暴 → 琥珀 → 无光 → 铅灰 → 永昼 → 转晴。
 */
export const ENV = {
  /** 序章 · 无名之海：黎明前，一切都还没有名字 */
  dawnAtSea: preset({
    sunAzimuth: 1.9,
    sunElevation: -0.04,
    sunColor: 0x6f7fa8,
    sunIntensity: 0.5,
    skyAmbient: 0x2c3d5c,
    groundAmbient: 0x14202f,
    ambientIntensity: 0.42,
    horizonColor: 0x3d4a68,
    zenithColor: 0x0d1424,
    cloudiness: 0.5,
    cloudSpeed: 0.008,
    starIntensity: 0.8,
    fogColor: 0x1e2b42,
    fogDensity: 0.011,
    fogHeightFalloff: 0.028,
    fogSunColor: 0x53658f,
    fogSunAmount: 0.5,
    shadowTint: 0x2c3a52,
    seaShallow: 0x1f3244,
    seaDeep: 0x0b131d,
    seaFoam: 0x8fa0bd,
    waveHeight: 0.5,
    waveChop: 1.15,
    exposure: 1.12,
    saturation: 0.85,
    halation: 0.3,
    halationTint: 0x9fb6ff,
    vignette: 0.55,
    grain: 0.07,
  }),

  /** 第一幕 · 忘食岸：蜜金黄昏，静得让人不想走 */
  honeyDusk: preset({
    sunElevation: 0.15,
    sunIntensity: 1.5,
    cloudiness: 0.22,
    fogColor: 0xe0bd85,
    fogDensity: 0.0085,
    shadowTint: 0x8a5b42,
    horizonColor: 0xf0c274,
    zenithColor: 0x4a6a86,
    seaShallow: 0x3f6b70,
    waveHeight: 0.18,
    waveChop: 0.7,
    saturation: 1.02,
    halation: 0.42,
    vignette: 0.38,
  }),

  /** 第二幕 · 独眼岬：雷暴逆光，洞口是唯一的亮 */
  thunderCape: preset({
    sunAzimuth: 2.5,
    sunElevation: 0.2,
    sunColor: 0xbfd0e8,
    sunIntensity: 1.15,
    skyAmbient: 0x4a5266,
    groundAmbient: 0x2a2b33,
    ambientIntensity: 0.5,
    horizonColor: 0x6e7686,
    zenithColor: 0x24262f,
    cloudiness: 0.92,
    cloudSpeed: 0.05,
    fogColor: 0x4d5361,
    fogDensity: 0.016,
    fogHeightFalloff: 0.04,
    fogSunColor: 0x9fb0c6,
    fogSunAmount: 0.9,
    shadowTint: 0x3c4451,
    seaShallow: 0x2c3f4c,
    seaDeep: 0x111a22,
    seaFoam: 0xd8dee6,
    waveHeight: 0.85,
    waveChop: 1.6,
    exposure: 1,
    saturation: 0.78,
    halation: 0.55,
    halationTint: 0xc9dcff,
    vignette: 0.6,
    grain: 0.085,
  }),

  /** 第三幕 · 喀耳刻的柱廊：琥珀室内光，时间在这里停了一年 */
  amberColonnade: preset({
    sunAzimuth: -1.35,
    sunElevation: 0.28,
    sunColor: 0xf0b866,
    sunIntensity: 1.25,
    skyAmbient: 0x9c8f7a,
    groundAmbient: 0x7a4a30,
    ambientIntensity: 0.62,
    horizonColor: 0xd9a662,
    zenithColor: 0x6b6a63,
    cloudiness: 0.4,
    cloudSpeed: 0.004,
    fogColor: 0xc2a074,
    fogDensity: 0.011,
    fogHeightFalloff: 0.05,
    fogSunColor: 0xffdda6,
    fogSunAmount: 0.95,
    shadowTint: 0x7d5236,
    seaShallow: 0x44615f,
    waveHeight: 0.12,
    waveChop: 0.5,
    saturation: 0.98,
    halation: 0.48,
    vignette: 0.5,
  }),

  /** 第四幕 · 亡者之岸：没有方向光，影子不属于任何人 */
  paleShore: preset({
    sunAzimuth: 0,
    sunElevation: 1.2,
    sunColor: 0xbfc4c4,
    sunIntensity: 0.35,
    skyAmbient: 0xa9aeae,
    groundAmbient: 0x8b8f8f,
    ambientIntensity: 0.95,
    horizonColor: 0xb9bdbc,
    zenithColor: 0x8e9393,
    cloudiness: 0.15,
    cloudSpeed: 0.002,
    fogColor: 0xb4b8b6,
    fogDensity: 0.027,
    fogHeightFalloff: 0.02,
    fogSunColor: 0xc9cccb,
    fogSunAmount: 0.3,
    shadowTint: 0x757a79,
    seaShallow: 0x767c7c,
    seaDeep: 0x4e5454,
    seaFoam: 0xd6d9d7,
    waveHeight: 0.06,
    waveChop: 0.35,
    exposure: 1.08,
    saturation: 0.12,
    halation: 0.3,
    halationTint: 0xdfe2e0,
    vignette: 0.5,
    grain: 0.09,
  }),

  /** 第五幕 · 塞壬水道：铅灰海雾，看不清歌声从哪来 */
  leadenStrait: preset({
    sunAzimuth: 2.9,
    sunElevation: 0.35,
    sunColor: 0xa8b6c2,
    sunIntensity: 0.8,
    skyAmbient: 0x6f7c88,
    groundAmbient: 0x40484f,
    ambientIntensity: 0.6,
    horizonColor: 0x8b97a2,
    zenithColor: 0x4e585f,
    cloudiness: 0.75,
    cloudSpeed: 0.018,
    fogColor: 0x7f8b95,
    fogDensity: 0.021,
    fogHeightFalloff: 0.03,
    fogSunColor: 0xb4c1cb,
    fogSunAmount: 0.6,
    shadowTint: 0x4a545d,
    seaShallow: 0x3a4d58,
    seaDeep: 0x1a252c,
    seaFoam: 0xc4cdd4,
    waveHeight: 0.4,
    waveChop: 1.05,
    saturation: 0.62,
    halation: 0.38,
    halationTint: 0xc6d6e4,
    vignette: 0.55,
    grain: 0.075,
  }),

  /** 第六幕 · 卡吕普索之岛：永昼，过曝，没有夜晚就没有尽头 */
  endlessDay: preset({
    sunAzimuth: -2.2,
    sunElevation: 0.62,
    sunColor: 0xfff2d4,
    sunIntensity: 1.8,
    skyAmbient: 0xcfe0e6,
    groundAmbient: 0x9a8f6e,
    ambientIntensity: 0.8,
    horizonColor: 0xf3e5c8,
    zenithColor: 0x86b3c4,
    cloudiness: 0.08,
    cloudSpeed: 0.003,
    fogColor: 0xecdfc4,
    fogDensity: 0.0072,
    fogHeightFalloff: 0.045,
    fogSunColor: 0xfff6e2,
    fogSunAmount: 1,
    shadowTint: 0x8d8464,
    seaShallow: 0x5aa0a2,
    seaDeep: 0x1f5c6b,
    seaFoam: 0xfdf8ec,
    waveHeight: 0.14,
    waveChop: 0.6,
    exposure: 1.22,
    saturation: 0.88,
    halation: 0.62,
    halationTint: 0xfff0cf,
    vignette: 0.3,
    grain: 0.05,
  }),

  /** 终章 · 伊萨卡：雾正在散，但没有人吹号 */
  ithacaClearing: preset({
    sunAzimuth: -0.35,
    sunElevation: 0.22,
    sunColor: 0xf2c98a,
    sunIntensity: 1.25,
    skyAmbient: 0x9db4bd,
    groundAmbient: 0x6f6248,
    ambientIntensity: 0.6,
    horizonColor: 0xe2c391,
    zenithColor: 0x53748c,
    cloudiness: 0.28,
    cloudSpeed: 0.01,
    fogColor: 0xcdc0a4,
    fogDensity: 0.0085,
    fogHeightFalloff: 0.04,
    fogSunColor: 0xffe7bd,
    fogSunAmount: 0.8,
    shadowTint: 0x6f5c42,
    seaShallow: 0x477078,
    waveHeight: 0.22,
    waveChop: 0.8,
    saturation: 1.0,
    halation: 0.42,
    vignette: 0.4,
    grain: 0.055,
  }),
} satisfies Record<string, EnvPreset>;

export type EnvName = keyof typeof ENV;

/**
 * 回忆幻象的统一分级：色彩坍缩到壁画三色。
 * 每一幕的幻象会在这个基础上叠加自己的"视觉签名"（见 vision.ts）。
 */
export const VISION_GRADE = {
  /** 幻象里的三色：底、主、影 */
  ground: PIGMENT.plaster,
  figure: PIGMENT.terracotta,
  shadow: PIGMENT.blackFigure,
  /** 遮幅从 2.00 收窄到 2.39 */
  aspectFrom: 2.0,
  aspectTo: 2.39,
} as const;
