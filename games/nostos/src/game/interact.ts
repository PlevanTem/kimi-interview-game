import type { InteractableDef } from './types';

/**
 * 交互对焦。
 *
 * 不用射线打碰撞体——程序化几何的包围盒并不能代表玩家心里的"那个东西"。
 * 这里用的是**距离 + 视线夹角**的打分：你走近它，并且看向它，它就亮起来。
 * 这套判定对手柄和鼠标一样宽容，也不会因为断柱挡了一角就点不到。
 */

export interface FocusQuery {
  x: number;
  z: number;
  /** 玩家朝向。yaw = 0 时朝 -Z */
  yaw: number;
}

export interface FocusResult {
  def: InteractableDef;
  distance: number;
  /** 视线偏离角（弧度），越小越正对 */
  offAngle: number;
}

const DEFAULT_RADIUS = 2.6;
/** 视锥半角：约 55°，比准星宽，避免"明明看着却点不到" */
const CONE = Math.PI * 0.31;

/** 在候选里挑出当前该高亮的那一个；没有就返回 null。 */
export function findFocus(
  query: FocusQuery,
  items: readonly InteractableDef[],
  isAvailable: (def: InteractableDef) => boolean = () => true,
): FocusResult | null {
  const forwardX = -Math.sin(query.yaw);
  const forwardZ = -Math.cos(query.yaw);

  let best: FocusResult | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const def of items) {
    if (!isAvailable(def)) continue;
    const dx = def.x - query.x;
    const dz = def.z - query.z;
    const distance = Math.hypot(dx, dz);
    const radius = def.radius ?? DEFAULT_RADIUS;
    if (distance > radius) continue;

    // 站在物件正上方时方向无意义，直接判为正对
    let offAngle = 0;
    if (distance > 0.15) {
      const dot = (dx * forwardX + dz * forwardZ) / distance;
      offAngle = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (offAngle > CONE) continue;
    }

    // 近的优先，正对的优先；角度权重稍大，让"看着谁"比"离谁近"更重要
    const score = distance / radius + (offAngle / CONE) * 1.35;
    if (score < bestScore) {
      bestScore = score;
      best = { def, distance, offAngle };
    }
  }
  return best;
}
