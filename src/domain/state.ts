import { ISLANDS, ALL_LEDGER_ENTRIES, EVIDENCE_BY_ID, TABLEAU_BY_ID } from '../content'
import type { Island, LedgerEntry } from '../content/types'
import { checkLocks, type LedgerAnswers } from './ledger'
import { resolveEnding, type Ending } from './endings'
import { evaluateOptional, firstMatching, type ConditionContext } from './conditions'
import { resolvePosition, step, type Position } from './movement'

/**
 * 游戏阶段。
 *
 * 注意这里没有任何"战斗""受伤""倒计时"阶段——本作没有失败态，
 * 玩家永远只是在这几个静态面板之间来回。
 */
export type Phase =
  | 'title'
  | 'arrival'
  | 'explore'
  | 'examine'
  | 'tableau'
  | 'ledger'
  | 'dialogue'
  | 'choice'
  | 'outcome'
  | 'departure'
  | 'ending'
  | 'paused'

export interface GameState {
  phase: Phase
  /** 暂停前的阶段，用于恢复。 */
  resumePhase: Phase
  islandIndex: number
  player: Position
  facing: number

  facts: ReadonlySet<string>
  examined: ReadonlySet<string>
  seenTableaux: ReadonlySet<string>
  answers: LedgerAnswers
  locked: ReadonlySet<string>
  flags: ReadonlySet<string>

  wrath: number
  shades: number
  trust: number

  activeEvidence: string | null
  activeTableau: string | null
  dialogue: { npc: string; node: string } | null
  outcome: string[] | null
  /** 每次锁定递增，供 UI 播放锁定动效与音效。 */
  lockPulse: number
  newlyLocked: string[]
  ending: Ending | null
  muted: boolean
}

export type GameAction =
  | { type: 'START' }
  | { type: 'ENTER_ISLAND' }
  | { type: 'MOVE'; input: readonly [number, number]; delta: number }
  | { type: 'EXAMINE'; id: string }
  | { type: 'CLOSE_PANEL' }
  | { type: 'ENTER_TABLEAU'; id: string }
  | { type: 'OPEN_LEDGER' }
  | { type: 'SET_ANSWER'; entry: string; slot: number; option: string | null }
  | { type: 'START_DIALOGUE'; npc: string }
  | { type: 'DIALOGUE_CHOOSE'; index: number }
  | { type: 'OPEN_CHOICE' }
  | { type: 'MAKE_CHOICE'; option: string }
  | { type: 'DEPART' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'RESTART' }

const EMPTY: ReadonlySet<string> = new Set()

/** 开局即已知的事实：玩家知道自己是谁，也认得同行的那个影子。 */
const STARTING_FACTS = new Set(['F-start'])

export const initialState: GameState = {
  phase: 'title',
  resumePhase: 'explore',
  islandIndex: 0,
  player: { x: 0, z: 0 },
  facing: 0,
  facts: STARTING_FACTS,
  examined: EMPTY,
  seenTableaux: EMPTY,
  answers: {},
  locked: EMPTY,
  flags: EMPTY,
  wrath: 0,
  shades: 0,
  trust: 0,
  activeEvidence: null,
  activeTableau: null,
  dialogue: null,
  outcome: null,
  lockPulse: 0,
  newlyLocked: [],
  ending: null,
  muted: false,
}

export function currentIsland(state: GameState): Island {
  return ISLANDS[Math.min(state.islandIndex, ISLANDS.length - 1)]
}

export function conditionContext(state: GameState): ConditionContext {
  return { facts: state.facts, locked: state.locked, flags: state.flags, trust: state.trust }
}

/** 归乡录中此刻应当出现的条目（含此前岛屿的，永远可回看）。 */
export function visibleEntries(state: GameState): LedgerEntry[] {
  const reached = new Set(ISLANDS.slice(0, state.islandIndex + 1).map((island) => island.id))
  const ctx = conditionContext(state)
  return ALL_LEDGER_ENTRIES.filter(
    (entry) => reached.has(entry.island) && evaluateOptional(entry.appearsWhen, ctx),
  )
}

const withAdded = (set: ReadonlySet<string>, ...values: string[]): ReadonlySet<string> =>
  values.length === 0 ? set : new Set([...set, ...values])

/** 把新获得的事实合并进状态，并顺带跑一次三条一组校验。 */
function grant(state: GameState, facts: string[]): GameState {
  const next = { ...state, facts: withAdded(state.facts, ...facts) }
  return runLockCheck(next)
}

/**
 * 三条一组校验的唯一入口。
 *
 * 每次答案变动或事实变动后都会跑一次：事实变动也要跑，因为新解锁的人名可能让
 * 一条早已填好、但当时选项还没出现的条目变得有效。
 */
function runLockCheck(state: GameState): GameState {
  const entries = visibleEntries(state)
  const result = checkLocks(entries, state.answers, state.locked)
  if (result.newlyLocked.length === 0) {
    return state.newlyLocked.length === 0 ? state : { ...state, newlyLocked: [] }
  }
  return {
    ...state,
    locked: result.locked,
    newlyLocked: result.newlyLocked,
    lockPulse: state.lockPulse + 1,
    // 每锁定一条，就有一个同船者可以跟着回去。
    shades: Math.min(12, state.shades + result.newlyLocked.length),
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      return { ...initialState, muted: state.muted, phase: 'arrival' }

    case 'ENTER_ISLAND': {
      const island = currentIsland(state)
      return {
        ...state,
        phase: 'explore',
        player: resolvePosition({ x: island.spawn[0], z: island.spawn[1] }, island),
      }
    }

    case 'MOVE': {
      if (state.phase !== 'explore' && state.phase !== 'tableau') return state
      const island = currentIsland(state)
      const next = step(state.player, action.input, action.delta, island)
      const [ix, iz] = action.input
      const facing = Math.hypot(ix, iz) > 1e-6 ? Math.atan2(ix, iz) : state.facing
      return { ...state, player: next, facing }
    }

    case 'EXAMINE': {
      const evidence = EVIDENCE_BY_ID.get(action.id)
      if (!evidence || state.phase !== 'explore') return state
      const granted = grant(state, evidence.grantsFacts)
      return {
        ...granted,
        phase: 'examine',
        activeEvidence: evidence.id,
        examined: withAdded(state.examined, evidence.id),
      }
    }

    case 'ENTER_TABLEAU': {
      const tableau = TABLEAU_BY_ID.get(action.id)
      if (!tableau) return state
      const granted = grant(state, tableau.grantsFacts)
      return {
        ...granted,
        phase: 'tableau',
        activeEvidence: null,
        activeTableau: tableau.id,
        seenTableaux: withAdded(state.seenTableaux, tableau.id),
        player: { x: tableau.center[0], z: tableau.center[1] + 3.2 },
      }
    }

    case 'OPEN_LEDGER':
      if (state.phase === 'ledger') return { ...state, phase: 'explore' }
      if (state.phase !== 'explore') return state
      return { ...state, phase: 'ledger' }

    case 'CLOSE_PANEL': {
      if (state.phase === 'tableau') {
        const island = currentIsland(state)
        const tableau = state.activeTableau ? TABLEAU_BY_ID.get(state.activeTableau) : undefined
        // 退出定影时把玩家放回触发它的那件证物旁边，避免"从记忆里掉出来"的错位感。
        const back = tableau
          ? resolvePosition({ x: tableau.center[0], z: tableau.center[1] + 1.6 }, island)
          : state.player
        return { ...state, phase: 'explore', activeTableau: null, player: back }
      }
      if (state.phase === 'outcome' && state.islandIndex < ISLANDS.length - 1) {
        return { ...state, phase: 'explore', outcome: null }
      }
      return { ...state, phase: 'explore', activeEvidence: null, outcome: null, dialogue: null }
    }

    case 'SET_ANSWER': {
      if (state.locked.has(action.entry)) return state
      const entry = ALL_LEDGER_ENTRIES.find((e) => e.id === action.entry)
      if (!entry) return state
      const previous = state.answers[action.entry] ?? entry.slots.map(() => null)
      const filled = [...previous]
      filled[action.slot] = action.option
      return runLockCheck({ ...state, answers: { ...state.answers, [action.entry]: filled } })
    }

    case 'START_DIALOGUE': {
      const island = currentIsland(state)
      const npc = island.npcs.find((n) => n.id === action.npc)
      if (!npc || state.phase !== 'explore') return state
      const entry = firstMatching(npc.entries, conditionContext(state))
      const node = entry?.node ?? npc.entries[npc.entries.length - 1].node
      return { ...state, phase: 'dialogue', dialogue: { npc: npc.id, node } }
    }

    case 'DIALOGUE_CHOOSE': {
      if (!state.dialogue) return state
      const island = currentIsland(state)
      const npc = island.npcs.find((n) => n.id === state.dialogue!.npc)
      const node = npc?.nodes.find((n) => n.id === state.dialogue!.node)
      if (!npc || !node) return state
      const ctx = conditionContext(state)
      const visible = node.choices.filter((choice) => evaluateOptional(choice.when, ctx))
      const chosen = visible[action.index]
      if (!chosen) return state

      const next: GameState = {
        ...state,
        flags: withAdded(state.flags, ...(chosen.sets ?? [])),
        trust: state.trust + (chosen.trust ?? 0),
      }
      if (!chosen.goto) {
        return runLockCheck({ ...next, phase: 'explore', dialogue: null })
      }
      return runLockCheck({ ...next, dialogue: { npc: npc.id, node: chosen.goto } })
    }

    case 'OPEN_CHOICE': {
      const island = currentIsland(state)
      if (state.phase !== 'explore') return state
      if (!evaluateOptional(island.choice.availableWhen, conditionContext(state))) return state
      if (state.flags.has(`done:${island.choice.id}`)) return state
      return { ...state, phase: 'choice' }
    }

    case 'MAKE_CHOICE': {
      const island = currentIsland(state)
      const option = island.choice.options.find((o) => o.id === action.option)
      if (!option) return state
      return runLockCheck({
        ...state,
        phase: 'outcome',
        flags: withAdded(state.flags, ...option.sets, `done:${island.choice.id}`),
        wrath: Math.max(0, state.wrath + (option.wrath ?? 0)),
        shades: Math.max(0, Math.min(12, state.shades + (option.crew ?? 0))),
        trust: state.trust + (option.trust ?? 0),
        outcome: [option.outcome],
      })
    }

    case 'DEPART': {
      const nextIndex = state.islandIndex + 1
      if (nextIndex >= ISLANDS.length) {
        return {
          ...state,
          phase: 'ending',
          ending: resolveEnding({
            truth: state.locked.size,
            wrath: state.wrath,
            shades: state.shades,
            flags: state.flags,
          }),
        }
      }
      return {
        ...state,
        phase: 'arrival',
        islandIndex: nextIndex,
        activeEvidence: null,
        activeTableau: null,
        dialogue: null,
        outcome: null,
      }
    }

    case 'TOGGLE_PAUSE':
      if (state.phase === 'paused') return { ...state, phase: state.resumePhase }
      if (state.phase === 'title' || state.phase === 'ending') return state
      return { ...state, phase: 'paused', resumePhase: state.phase }

    case 'TOGGLE_MUTE':
      return { ...state, muted: !state.muted }

    case 'RESTART':
      return { ...initialState, muted: state.muted }
  }
}
