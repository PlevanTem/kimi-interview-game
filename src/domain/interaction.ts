import { EVIDENCE_BY_ID } from '../content'
import type { Island } from '../content/types'
import { evaluateOptional } from './conditions'
import { lockedOnIsland } from './ledger'
import { distanceTo, nearest } from './movement'
import { conditionContext, visibleEntries, type GameState } from './state'

/** 交互半径。整部游戏只有这一个半径常量。 */
export const INTERACT_RADIUS = 1.75

export type Interaction =
  | { kind: 'evidence'; id: string; label: string }
  | { kind: 'tableau'; id: string; label: string }
  | { kind: 'npc'; id: string; label: string }
  | { kind: 'choice'; label: string }
  | { kind: 'depart'; label: string }
  | { kind: 'depart-blocked'; label: string }

/**
 * 玩家此刻按 E 会发生什么。
 *
 * 优先级是刻意的：证物 > NPC > 抉择 > 离岛。离岛点被排在最后，且当本岛条目
 * 不够时只给出一个"被挡住"的提示而不是禁止——本作没有失败态，也没有硬门禁，
 * 只有"你还没准备好把这一段写完"。
 */
export function interactionAt(state: GameState, island: Island): Interaction | null {
  const ctx = conditionContext(state)
  const pos = state.player

  // 记忆定影优先：站在刚检视过、且带定影的证物旁边时，E 是"进入记忆"。
  const ev = nearest(pos, island.evidence, INTERACT_RADIUS)
  if (ev) {
    if (ev.tableau && state.examined.has(ev.id)) {
      const seen = state.seenTableaux.has(ev.tableau)
      return { kind: 'tableau', id: ev.tableau, label: seen ? `重看记忆：${ev.name}` : `举杖唤起记忆：${ev.name}` }
    }
    return { kind: 'evidence', id: ev.id, label: `检视 ${ev.name}` }
  }

  const npc = nearest(pos, island.npcs, INTERACT_RADIUS + 0.4)
  if (npc) return { kind: 'npc', id: npc.id, label: `与 ${npc.name} 交谈` }

  const choiceDone = state.flags.has(`done:${island.choice.id}`)
  if (
    !choiceDone &&
    distanceTo(pos, island.choice.position) <= INTERACT_RADIUS + 0.4 &&
    evaluateOptional(island.choice.availableWhen, ctx)
  ) {
    return { kind: 'choice', label: island.choice.title }
  }

  if (distanceTo(pos, island.departure) <= INTERACT_RADIUS + 0.6) {
    const solved = lockedOnIsland(visibleEntries(state), state.locked, island.id)
    if (solved >= island.departureRequirement) {
      return { kind: 'depart', label: island.id === 'ithaca' ? '走向岸上的火光' : '登船离岛' }
    }
    return {
      kind: 'depart-blocked',
      label: `还写不完这一段（本岛已锁定 ${solved} / ${island.departureRequirement} 条）`,
    }
  }

  return null
}

/** 证物名，UI 显示用。 */
export function evidenceName(id: string): string {
  return EVIDENCE_BY_ID.get(id)?.name ?? id
}
