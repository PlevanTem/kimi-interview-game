import { useEffect, useReducer } from 'react'
import { GameScene } from './game/GameScene'
import { gameReducer, initialGameState, nearestCollectible } from './game/model'
import { useGameControls } from './game/useGameControls'
import conceptSet from '../game-context/concepts.json'

const labels = { gate: 'Gate 01 pending', playing: 'Interaction probe', paused: 'Probe paused', complete: 'Signal complete', failed: 'Probe expired' }
export function App() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  useGameControls(state, dispatch)
  useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'); dispatch({ type: 'SET_REDUCED_MOTION', value: media.matches }) }, [])
  const nearby = nearestCollectible(state)
  return <main className={`app phase-${state.phase}`}>
    <div className="scene"><GameScene state={state} /></div><div className="grain" aria-hidden="true" />
    <header className="topbar"><a className="brand" href="#overview" aria-label="Concept Forge home"><span className="brand-mark">CF</span><span>Concept Forge<small>Vertical slice system</small></span></a><div className="gate-pill"><i />{labels[state.phase]}</div><div className="run-id">RUN / {String(state.run).padStart(3, '0')}</div></header>
    <section className="brief" id="overview"><p className="eyebrow">Mechanic calibration · no theme locked</p><h1>Find the <em>feel</em><br />before the fiction.</h1><p className="lede">A neutral interaction field for testing movement, feedback and pacing. No world, character or art direction is committed at this gate.</p>
      {state.phase === 'gate' && <button className="primary" onClick={() => dispatch({ type: 'START' })}>Run interaction probe <span>↗</span></button>}
      {state.phase === 'playing' && <div className="objective"><span>Active calibration</span><strong>Connect {3 - state.collected.length} signal anchors</strong><small>Move close, then press SPACE</small></div>}
      {(state.phase === 'complete' || state.phase === 'failed') && <div className="result"><span>{state.phase === 'complete' ? 'Probe passed' : 'Time elapsed'}</span><strong>{state.phase === 'complete' ? 'Interaction loop verified.' : 'The loop needs another pass.'}</strong><button onClick={() => dispatch({ type: 'RESTART' })}>Return to Gate 01</button></div>}
    </section>
    <aside className="concepts" aria-label="Concept candidate status"><div className="section-head"><span>Concept candidates</span><small>0 / 3 locked</small></div>{conceptSet.candidates.map((candidate, index) => <article key={candidate.id} title={candidate.fantasy}><span>0{index + 1}</span><div><strong>{candidate.title}</strong><small>{candidate.coreVerb.toUpperCase()} · {candidate.scores.weightedTotal.toFixed(2)}</small></div><i /></article>)}<p>Scores are evidence only. Human approval is required before Concept Lock.</p></aside>
    <footer className="controls"><div className="metric"><small>TIME</small><strong>{String(Math.ceil(state.timeRemaining)).padStart(2,'0')}</strong><span>SEC</span></div><div className="progress" aria-label={`${state.collected.length} of 3 anchors collected`}><small>SIGNAL</small><div>{[0,1,2].map(i => <i key={i} className={i < state.collected.length ? 'on' : ''} />)}</div><span>{state.collected.length}/3</span></div><div className="keys"><span><kbd>WASD</kbd> Move</span><span><kbd>SPACE</kbd> {nearby ? 'Connect' : 'Interact'}</span><span><kbd>ESC</kbd> Pause</span></div><div className="actions"><button aria-label={state.muted ? 'Unmute sound' : 'Mute sound'} onClick={() => dispatch({ type: 'TOGGLE_MUTE' })}>{state.muted ? 'Sound off' : 'Sound on'}</button><button aria-label="Restart probe" onClick={() => dispatch({ type: 'RESTART' })}>Restart</button></div></footer>
    {state.phase === 'paused' && <div className="modal" role="dialog" aria-modal="true"><p>System hold</p><h2>Probe paused</h2><button className="primary" onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}>Resume calibration</button><small>Press ESC to continue</small></div>}
  </main>
}
