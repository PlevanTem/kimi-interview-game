import { useEffect, useRef } from 'react'
import type { Island } from '../content/types'
import { interactionAt } from '../domain/interaction'
import type { GameAction, GameState } from '../domain/state'

/**
 * 键盘输入与移动循环。
 *
 * 移动是每帧 dispatch 一次 MOVE，位置解算全部在 domain/movement.ts 里做，
 * 这里不碰任何几何——UI 层只负责把按键翻译成意图。
 */
const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

export function useControls(
  state: GameState,
  island: Island,
  dispatch: (action: GameAction) => void,
) {
  // 用 ref 存快照，避免每次状态变化都重绑事件监听。
  const latest = useRef({ state, island })
  latest.current = { state, island }
  const held = useRef(new Set<string>())

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { state: s, island: isl } = latest.current
      if (event.repeat) return

      if (MOVE_KEYS[event.code]) {
        held.current.add(event.code)
        return
      }

      switch (event.code) {
        case 'KeyE':
        case 'Enter': {
          if (s.phase === 'title') return dispatch({ type: 'START' })
          if (s.phase === 'arrival') return dispatch({ type: 'ENTER_ISLAND' })
          if (s.phase !== 'explore') return
          const target = interactionAt(s, isl)
          if (!target) return
          if (target.kind === 'evidence') return dispatch({ type: 'EXAMINE', id: target.id })
          if (target.kind === 'tableau') return dispatch({ type: 'ENTER_TABLEAU', id: target.id })
          if (target.kind === 'npc') return dispatch({ type: 'START_DIALOGUE', npc: target.id })
          if (target.kind === 'choice') return dispatch({ type: 'OPEN_CHOICE' })
          if (target.kind === 'depart') return dispatch({ type: 'DEPART' })
          return
        }
        case 'KeyQ':
          if (s.phase === 'tableau' || s.phase === 'examine') dispatch({ type: 'CLOSE_PANEL' })
          return
        case 'Tab':
          event.preventDefault()
          dispatch({ type: 'OPEN_LEDGER' })
          return
        case 'Escape':
          if (s.phase === 'examine' || s.phase === 'tableau' || s.phase === 'ledger') {
            dispatch({ type: 'CLOSE_PANEL' })
          } else {
            dispatch({ type: 'TOGGLE_PAUSE' })
          }
          return
        case 'KeyP':
          dispatch({ type: 'TOGGLE_PAUSE' })
          return
        case 'KeyM':
          dispatch({ type: 'TOGGLE_MUTE' })
          return
        case 'Space':
          if (s.phase === 'dialogue') {
            event.preventDefault()
            dispatch({ type: 'DIALOGUE_CHOOSE', index: 0 })
          } else if (s.phase === 'examine' || s.phase === 'outcome') {
            event.preventDefault()
            dispatch({ type: 'CLOSE_PANEL' })
          }
          return
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
          if (s.phase === 'dialogue') {
            dispatch({ type: 'DIALOGUE_CHOOSE', index: Number(event.code.slice(5)) - 1 })
          }
          return
        default:
          return
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      held.current.delete(event.code)
    }
    const onBlur = () => held.current.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [dispatch])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      // 只封顶到 0.25 秒，避免切回标签页时一次冲出半个岛；
      // 低帧率下的移动准确性由 step() 的子步进保证，不靠砍 delta。
      const delta = Math.min((now - last) / 1000, 0.25)
      last = now
      const phase = latest.current.state.phase
      if ((phase === 'explore' || phase === 'tableau') && held.current.size > 0) {
        let x = 0
        let z = 0
        for (const code of held.current) {
          const [dx, dz] = MOVE_KEYS[code]
          x += dx
          z += dz
        }
        if (x !== 0 || z !== 0) dispatch({ type: 'MOVE', input: [x, z], delta })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [dispatch])
}
