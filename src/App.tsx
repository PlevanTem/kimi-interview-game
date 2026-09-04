import { useEffect, useMemo, useReducer, useState } from 'react'
import { ALL_LEDGER_ENTRIES } from './content'
import { interactionAt } from './domain/interaction'
import { currentIsland, gameReducer, initialState } from './domain/state'
import { IslandScene } from './render/IslandScene'
import { HUD } from './ui/HUD'
import { Ledger } from './ui/Ledger'
import {
  ArrivalCard,
  ChoicePanel,
  DialoguePanel,
  EndingScreen,
  ExaminePanel,
  OutcomePanel,
  PausePanel,
  TableauOverlay,
  TitleScreen,
} from './ui/panels'
import { useChime } from './ui/useChime'
import { useControls } from './ui/useControls'

export function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const island = currentIsland(state)

  useControls(state, island, dispatch)
  useChime(state.lockPulse, state.muted)

  const interaction = useMemo(
    () => (state.phase === 'explore' ? interactionAt(state, island) : null),
    [state, island],
  )

  // 三条落定时的提示条。它是全作唯一的"你做对了"反馈。
  const [toast, setToast] = useState<string[] | null>(null)
  useEffect(() => {
    if (state.newlyLocked.length === 0) return
    setToast(
      state.newlyLocked.map(
        (id) => ALL_LEDGER_ENTRIES.find((entry) => entry.id === id)?.prompt ?? id,
      ),
    )
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [state.lockPulse, state.newlyLocked])

  const showScene = state.phase !== 'title' && state.phase !== 'ending'

  return (
    <main className={`app phase-${state.phase}`}>
      {showScene && (
        <div className="scene">
          <IslandScene island={island} state={state} />
        </div>
      )}
      <div className="grain" aria-hidden="true" />

      {state.phase === 'title' && <TitleScreen dispatch={dispatch} />}
      {state.phase === 'arrival' && <ArrivalCard island={island} dispatch={dispatch} />}

      {(state.phase === 'explore' ||
        state.phase === 'examine' ||
        state.phase === 'ledger' ||
        state.phase === 'dialogue' ||
        state.phase === 'choice' ||
        state.phase === 'outcome') && (
        <HUD state={state} island={island} interaction={interaction} dispatch={dispatch} />
      )}

      {state.phase === 'examine' && <ExaminePanel state={state} dispatch={dispatch} />}
      {state.phase === 'tableau' && <TableauOverlay state={state} dispatch={dispatch} />}
      {state.phase === 'ledger' && <Ledger state={state} dispatch={dispatch} />}
      {state.phase === 'dialogue' && (
        <DialoguePanel state={state} island={island} dispatch={dispatch} />
      )}
      {state.phase === 'choice' && <ChoicePanel state={state} island={island} dispatch={dispatch} />}
      {state.phase === 'outcome' && <OutcomePanel state={state} dispatch={dispatch} />}
      {state.phase === 'paused' && <PausePanel dispatch={dispatch} />}
      {state.phase === 'ending' && state.ending && (
        <EndingScreen ending={state.ending} state={state} dispatch={dispatch} />
      )}

      {toast && (
        <div className="lock-toast" role="status">
          <strong>三条落定</strong>
          <ul>
            {toast.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  )
}
