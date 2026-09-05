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
  /** 镜头俯仰；正值代表抬头（Three.js 相机默认朝 -Z）。 */
  pitch?: number;
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

function insideZone(query: FocusQuery, def: InteractableDef): boolean {
  const zone = def.proximityZone;
  if (!zone) return false;
  const radial = Math.hypot(query.x - zone.centerX, query.z - zone.centerZ);
  return radial >= zone.innerRadius && radial <= zone.outerRadius;
}

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
    const anchorDistance = Math.hypot(dx, dz);
    const inZone = insideZone(query, def);
    // 区域命中代表玩家已经碰到画面里的目标；锚点距离只用于区域外的旧交互。
    const distance = inZone ? 0 : anchorDistance;
    const radius = def.radius ?? DEFAULT_RADIUS;
    if (!inZone && distance > radius) continue;

    if (def.look) {
      const tolerance = def.look.tolerance ?? 0.28;
      const yawDelta = Math.atan2(
        Math.sin(query.yaw - def.look.yaw),
        Math.cos(query.yaw - def.look.yaw),
      );
      const pitchDelta = (query.pitch ?? 0) - def.look.pitch;
      const lookError = Math.hypot(yawDelta, pitchDelta);
      if (lookError > tolerance) continue;
    }

    // 站在物件正上方时方向无意义，直接判为正对
    let offAngle = 0;
    if (!def.look && !inZone && distance > Math.max(0.15, def.proximityRadius ?? 0)) {
      const dot = (dx * forwardX + dz * forwardZ) / distance;
      offAngle = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (offAngle > CONE) continue;
    }

    // 近的优先，正对的优先；角度权重稍大，让"看着谁"比"离谁近"更重要
    const authoredLook = def.look
      ? Math.hypot(
          Math.atan2(Math.sin(query.yaw - def.look.yaw), Math.cos(query.yaw - def.look.yaw)),
          (query.pitch ?? 0) - def.look.pitch,
        ) / (def.look.tolerance ?? 0.28)
      : 0;
    const score = distance / radius + (offAngle / CONE) * 1.35 + authoredLook * 1.6;
    if (score < bestScore) {
      bestScore = score;
      best = { def, distance, offAngle };
    }
  }
  return best;
}
