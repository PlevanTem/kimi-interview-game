import type { Island, TerrainBlock, Vec2 } from '../content/types'

/** 玩家碰撞体半径。整部游戏只有这一种碰撞形状。 */
export const PLAYER_RADIUS = 0.42

/** 恒定移动速度（单位/秒）。没有加速度、没有惯性、没有冲刺。 */
export const MOVE_SPEED = 4.2

export interface Position {
  x: number
  z: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/**
 * 圆 vs 单个地形块的推出解算。
 *
 * 只支持轴对齐盒与圆柱两种形状——这是刻意的下限：本作不需要刚体物理，
 * 一个"把玩家推到最近的合法位置"的解算就足够，且完全可预测、可单测。
 */
function resolveBlock(pos: Position, block: TerrainBlock): Position {
  if (!block.solid) return pos
  const [bx, bz] = block.position

  if (block.kind === 'cylinder') {
    const radius = block.size[0]
    const dx = pos.x - bx
    const dz = pos.z - bz
    const dist = Math.hypot(dx, dz)
    const minDist = radius + PLAYER_RADIUS
    if (dist >= minDist) return pos
    // 圆心重合时给一个确定的推出方向，避免除零产生 NaN。
    if (dist < 1e-6) return { x: bx + minDist, z: bz }
    return { x: bx + (dx / dist) * minDist, z: bz + (dz / dist) * minDist }
  }

  const halfW = block.size[0] / 2 + PLAYER_RADIUS
  const halfD = block.size[1] / 2 + PLAYER_RADIUS
  const dx = pos.x - bx
  const dz = pos.z - bz
  if (Math.abs(dx) >= halfW || Math.abs(dz) >= halfD) return pos

  // 沿穿透最浅的那根轴推出，玩家会沿墙滑行而不是被弹开。
  const overlapX = halfW - Math.abs(dx)
  const overlapZ = halfD - Math.abs(dz)
  if (overlapX < overlapZ) {
    return { x: bx + Math.sign(dx || 1) * halfW, z: pos.z }
  }
  return { x: pos.x, z: bz + Math.sign(dz || 1) * halfD }
}

/**
 * 把一个候选位置解算为合法位置：先钳制到岛屿边界，再逐块推出。
 * 两轮迭代足以处理墙角，且开销恒定。
 */
export function resolvePosition(candidate: Position, island: Island): Position {
  const [boundX, boundZ] = island.bounds
  let pos: Position = {
    x: clamp(candidate.x, -boundX + PLAYER_RADIUS, boundX - PLAYER_RADIUS),
    z: clamp(candidate.z, -boundZ + PLAYER_RADIUS, boundZ - PLAYER_RADIUS),
  }
  for (let pass = 0; pass < 2; pass += 1) {
    for (const block of island.terrain) pos = resolveBlock(pos, block)
  }
  return pos
}

/**
 * 单次子步允许推进的最大距离。
 * 取值小于最薄的地形块半厚，保证任何一步都不可能整块穿过去。
 */
const MAX_SUBSTEP = 0.35

/**
 * 按八向输入推进一步。
 * 对角线做归一化，斜着走不会比直着走更快。
 *
 * 长间隔会被拆成若干子步逐个解算，而不是把 delta 一刀砍掉——砍 delta 会让
 * 玩家在低帧率下莫名其妙变慢（软件渲染跑到 6 fps 时移速只剩三成），
 * 子步进则同时保住了「移速与帧率无关」和「任何帧率下都不会穿墙」。
 */
export function step(from: Position, input: Vec2, delta: number, island: Island): Position {
  const [ix, iz] = input
  const length = Math.hypot(ix, iz)
  if (length < 1e-6) return from

  const distance = MOVE_SPEED * delta
  const steps = Math.max(1, Math.ceil(distance / MAX_SUBSTEP))
  const dx = (ix / length) * (distance / steps)
  const dz = (iz / length) * (distance / steps)

  let pos = from
  for (let i = 0; i < steps; i += 1) {
    pos = resolvePosition({ x: pos.x + dx, z: pos.z + dz }, island)
  }
  return pos
}

/** 平面距离，交互半径判定用。 */
export function distanceTo(pos: Position, target: Vec2): number {
  return Math.hypot(pos.x - target[0], pos.z - target[1])
}

/** 从一组带坐标的目标中取交互半径内最近的一个。 */
export function nearest<T extends { position: Vec2 }>(
  pos: Position,
  targets: readonly T[],
  radius: number,
): T | undefined {
  let best: T | undefined
  let bestDist = radius
  for (const target of targets) {
    const dist = distanceTo(pos, target.position)
    if (dist <= bestDist) {
      best = target
      bestDist = dist
    }
  }
  return best
}
