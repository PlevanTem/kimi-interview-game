export type GamePhase = 'gate' | 'playing' | 'paused' | 'complete' | 'failed'
export interface GameState { phase: GamePhase; muted: boolean; reducedMotion: boolean; timeRemaining: number; player: { x: number; z: number }; collected: string[]; run: number }
export type GameAction = { type: 'START' } | { type: 'MOVE'; x: number; z: number } | { type: 'COLLECT'; id: string } | { type: 'TICK'; seconds: number } | { type: 'TOGGLE_PAUSE' } | { type: 'TOGGLE_MUTE' } | { type: 'SET_REDUCED_MOTION'; value: boolean } | { type: 'RESTART' }
export const ANCHORS = [{ id: 'anchor-a', x: -4.4, z: -2.6 }, { id: 'anchor-b', x: 4.2, z: -1.3 }, { id: 'anchor-c', x: 0.8, z: 4.2 }] as const
export const initialGameState: GameState = { phase: 'gate', muted: false, reducedMotion: false, timeRemaining: 90, player: { x: 0, z: 0 }, collected: [], run: 1 }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START': return state.phase === 'gate' ? { ...state, phase: 'playing' } : state
    case 'MOVE': return state.phase !== 'playing' ? state : { ...state, player: { x: clamp(state.player.x + action.x, -7, 7), z: clamp(state.player.z + action.z, -5.5, 6) } }
    case 'COLLECT': { if (state.phase !== 'playing' || state.collected.includes(action.id)) return state; const collected = [...state.collected, action.id]; return { ...state, collected, phase: collected.length === ANCHORS.length ? 'complete' : 'playing' } }
    case 'TICK': { if (state.phase !== 'playing') return state; const timeRemaining = Math.max(0, state.timeRemaining - action.seconds); return { ...state, timeRemaining, phase: timeRemaining === 0 ? 'failed' : state.phase } }
    case 'TOGGLE_PAUSE': return state.phase === 'playing' ? { ...state, phase: 'paused' } : state.phase === 'paused' ? { ...state, phase: 'playing' } : state
    case 'TOGGLE_MUTE': return { ...state, muted: !state.muted }
    case 'SET_REDUCED_MOTION': return { ...state, reducedMotion: action.value }
    case 'RESTART': return { ...initialGameState, muted: state.muted, reducedMotion: state.reducedMotion, run: state.run + 1 }
  }
}
export function nearestCollectible(state: GameState, radius = 1.6): string | null {
  return ANCHORS.find((a) => !state.collected.includes(a.id) && Math.hypot(state.player.x - a.x, state.player.z - a.z) <= radius)?.id ?? null
}
