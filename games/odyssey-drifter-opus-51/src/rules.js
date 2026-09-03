/**
 * rules.js — 承重规则（纯函数，可在 Node 下直接测试）
 *
 * 这些公式是玩家能解释失败的全部依据。它们必须：
 *   1. 确定性：同样的线永远得到同样的结论；
 *   2. 可见：load 与断裂位置在松开之前就已经画在屏幕上；
 *   3. 无隐藏容错：不做隐藏吸附、不偷偷提高容量。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});

  const RULES = {
    BASE_CAPACITY: 1000,   // 无锚点的一条线大约能承 1000 弧长
    ANCHOR_BONUS: 420,     // 每借一个锚点
    SYNC_BONUS: 240,       // 踩上脚步拍松手
    TENSION_FLOOR: 0.55,   // 完全松弛时的负载系数
    TENSION_GAIN: 0.75,    // 张力对负载的加成
    WARN: 0.84,            // 起毛阈值
    BREAK: 1.0,            // 断裂阈值
  };

  /** 张力 = 弦长 / 弧长，1 表示笔直，越小越松 */
  function tension(arc, chord) {
    if (!(arc > 1e-6)) return 1;
    const t = chord / arc;
    return t < 0 ? 0 : t > 1 ? 1 : t;
  }

  /** 容量只由借锚数与同步决定，全部对玩家可见 */
  function capacity(anchorCount, sync) {
    return RULES.BASE_CAPACITY + anchorCount * RULES.ANCHOR_BONUS + (sync ? RULES.SYNC_BONUS : 0);
  }

  /**
   * 负载。紧线承得少（系数接近 1.3），松线承得多（系数 0.55）：
   * 这就是「张力是运动」的代价——想跑得快，就得给它锚点。
   */
  function load(arc, tensionValue, capacityValue) {
    return (arc / capacityValue) * (RULES.TENSION_FLOOR + tensionValue * RULES.TENSION_GAIN);
  }

  /**
   * 断裂位置（弧长比例）。load 越高越靠前，且在提交前就已经画在起毛处。
   * 斜率必须够缓：如果轻微过载也在 14% 处崩掉，玩家看到的只是「随机断」，
   * 学不到「再松一点 / 借一个锚点就能过」。
   */
  function breakAt(loadValue) {
    if (loadValue <= RULES.BREAK) return Infinity;
    const f = 1.35 - loadValue * 0.55;
    return f < 0.18 ? 0.18 : f > 0.8 ? 0.8 : f;
  }

  /** 给玩家看的三档状态；只用于文案，不参与判定 */
  function tensionLabel(t) {
    return t > 0.93 ? '紧' : t < 0.72 ? '松' : '稳';
  }

  LL.rules = { RULES, tension, capacity, load, breakAt, tensionLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = LL.rules;
})(typeof window !== 'undefined' ? window : globalThis);
