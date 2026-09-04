import { describe, expect, it } from 'vitest'
import { ISLANDS } from '../src/content'
import type { Island } from '../src/content/types'
import { distanceTo, MOVE_SPEED, nearest, PLAYER_RADIUS, resolvePosition, step } from '../src/domain/movement'

const island: Island = {
  ...ISLANDS[0],
  bounds: [10, 10],
  terrain: [
    { kind: 'box', position: [0, 0], size: [4, 4], height: 2, color: '#000', solid: true },
    { kind: 'cylinder', position: [6, 0], size: [1, 1], height: 2, color: '#000', solid: true },
    { kind: 'box', position: [-6, 0], size: [2, 2], height: 1, color: '#000', solid: false },
  ],
}

describe('移动与碰撞', () => {
  it('钳制在岛屿边界内', () => {
    const pos = resolvePosition({ x: 99, z: -99 }, island)
    expect(pos.x).toBeCloseTo(10 - PLAYER_RADIUS)
    expect(pos.z).toBeCloseTo(-10 + PLAYER_RADIUS)
  })

  it('被实心盒推出，且沿穿透最浅的轴推出', () => {
    const pos = resolvePosition({ x: 0, z: 1.9 }, island)
    expect(pos.z).toBeGreaterThanOrEqual(2 + PLAYER_RADIUS - 1e-6)
    expect(pos.x).toBeCloseTo(0)
  })

  it('被实心圆柱沿径向推出', () => {
    const pos = resolvePosition({ x: 6.5, z: 0 }, island)
    expect(distanceTo(pos, [6, 0])).toBeCloseTo(1 + PLAYER_RADIUS)
  })

  it('圆心完全重合时给出确定方向，不产生 NaN', () => {
    const pos = resolvePosition({ x: 6, z: 0 }, island)
    expect(Number.isNaN(pos.x)).toBe(false)
    expect(Number.isNaN(pos.z)).toBe(false)
    expect(distanceTo(pos, [6, 0])).toBeCloseTo(1 + PLAYER_RADIUS)
  })

  it('非实心块不阻挡', () => {
    const pos = resolvePosition({ x: -6, z: 0 }, island)
    expect(pos.x).toBeCloseTo(-6)
    expect(pos.z).toBeCloseTo(0)
  })

  it('对角线移动经过归一化，不比直行更快', () => {
    const start = { x: -8, z: -8 }
    const straight = step(start, [1, 0], 1, island)
    const diagonal = step(start, [1, 1], 1, island)
    const dStraight = Math.hypot(straight.x - start.x, straight.z - start.z)
    const dDiagonal = Math.hypot(diagonal.x - start.x, diagonal.z - start.z)
    expect(dStraight).toBeCloseTo(MOVE_SPEED)
    expect(dDiagonal).toBeCloseTo(MOVE_SPEED)
  })

  it('零输入不移动', () => {
    const start = { x: 1, z: 2 }
    expect(step(start, [0, 0], 1, island)).toBe(start)
  })

  it('nearest 只返回半径内最近的目标', () => {
    const targets = [
      { id: 'far', position: [5, 5] as const },
      { id: 'near', position: [0.5, 0] as const },
    ]
    expect(nearest({ x: 0, z: 0 }, targets, 1)?.id).toBe('near')
    expect(nearest({ x: 0, z: 0 }, targets, 0.1)).toBeUndefined()
  })
})

describe('岛屿布局可用性', () => {
  it('每座岛的出生点、离岛点与抉择点都不在实心地形里', () => {
    for (const isl of ISLANDS) {
      for (const [name, point] of [
        ['出生点', isl.spawn],
        ['离岛点', isl.departure],
        ['抉择点', isl.choice.position],
      ] as const) {
        const resolved = resolvePosition({ x: point[0], z: point[1] }, isl)
        expect(distanceTo(resolved, point), `${isl.name} 的${name}被地形挡住`).toBeLessThan(0.05)
      }
    }
  })

  it('每件证物与每个 NPC 都站在可达的位置上', () => {
    for (const isl of ISLANDS) {
      for (const target of [...isl.evidence, ...isl.npcs]) {
        const resolved = resolvePosition(
          { x: target.position[0], z: target.position[1] },
          isl,
        )
        // 允许证物贴着墙放，但不能被整个吞进墙体里（否则玩家走不到交互半径内）。
        expect(distanceTo(resolved, target.position), `${isl.name} 的 ${target.id}`).toBeLessThan(1.2)
      }
    }
  })
})

describe('低帧率下的移动一致性', () => {
  it('同样的总时长，拆成多帧和一整帧走出同样的距离', () => {
    const start = { x: 0, z: 6 }
    const oneBigFrame = step(start, [0, -1], 0.2, island)

    let stepped = start
    for (let i = 0; i < 12; i += 1) stepped = step(stepped, [0, -1], 0.2 / 12, island)

    expect(stepped.z).toBeCloseTo(oneBigFrame.z, 4)
  })

  it('一整帧走很长的距离也不会穿过实心墙', () => {
    // 从盒子一侧起步，用一个 1 秒的巨帧冲向另一侧。
    const crossing = step({ x: 0, z: 6 }, [0, -1], 1, island)
    expect(crossing.z).toBeGreaterThanOrEqual(2 + PLAYER_RADIUS - 1e-6)
  })
})
