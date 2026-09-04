/**
 * 古希腊陶瓶画配色。
 *
 * 整部游戏只用这一组颜色。黑绘式陶瓶的物理限制就是本作的美术纪律：
 * 一种陶土底色、一种黑釉、一点点用来点睛的红与白，再无其他。
 * 任何新增颜色都必须先加到这里，不允许在组件里写死色值。
 */
export const PALETTE = {
  /** 黑釉——人物剪影、轮廓、阴影 */
  glaze: '#1a1310',
  /** 陶土红——主角、强调、可交互高亮 */
  terracotta: '#b44a2e',
  /** 陶底——地面与大部分几何体 */
  clay: '#d9a05b',
  /** 象牙白——文字、细节刻线 */
  ivory: '#edd9b0',
  /** 海蓝——限定使用，只给海与水 */
  sea: '#2e5a6b',
  /** 金——已锁定的归乡录条目、神性物件 */
  gold: '#c8912f',
  /** 深陶——阴影面与远景 */
  shade: '#8a5a33',
  /** 背景天色 */
  sky: '#e8cfa0',
} as const

/** 记忆定影的双色。前景=黑釉，背景=陶土红。 */
export const TABLEAU_COLORS = {
  ink: '#1a1310',
  paper: '#b44a2e',
} as const

/** 结局画面按基调取一组背景/前景。 */
export const TONE_COLORS: Record<string, { bg: string; fg: string; accent: string }> = {
  dark: { bg: '#120d0b', fg: '#8a5a33', accent: '#b44a2e' },
  bitter: { bg: '#1a1310', fg: '#d9a05b', accent: '#b44a2e' },
  quiet: { bg: '#16181a', fg: '#c9b48a', accent: '#2e5a6b' },
  warm: { bg: '#2a1a10', fg: '#edd9b0', accent: '#c8912f' },
}
