import { useEffect, useRef, type Dispatch } from 'react'
import { nearestCollectible, type GameAction, type GameState } from './model'
const STEP = 0.28
export function useGameControls(state: GameState, dispatch: Dispatch<GameAction>) {
  const stateRef = useRef(state); stateRef.current = state
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const movement: Record<string, [number, number]> = { w: [0, -STEP], arrowup: [0, -STEP], s: [0, STEP], arrowdown: [0, STEP], a: [-STEP, 0], arrowleft: [-STEP, 0], d: [STEP, 0], arrowright: [STEP, 0] }
      if (movement[key]) { event.preventDefault(); dispatch({ type: 'MOVE', x: movement[key][0], z: movement[key][1] }) }
      else if (key === ' ') { event.preventDefault(); const id = nearestCollectible(stateRef.current); if (id) dispatch({ type: 'COLLECT', id }) }
      else if (key === 'escape' || key === 'p') dispatch({ type: 'TOGGLE_PAUSE' })
      else if (key === 'm') dispatch({ type: 'TOGGLE_MUTE' })
      else if (key === 'r') dispatch({ type: 'RESTART' })
    }
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch])
  useEffect(() => { if (state.phase !== 'playing') return; const timer = window.setInterval(() => dispatch({ type: 'TICK', seconds: 1 }), 1000); return () => window.clearInterval(timer) }, [dispatch, state.phase])
}
