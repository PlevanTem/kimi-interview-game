import { ALL_LEDGER_ENTRIES } from '../content'
import type { Island } from '../content/types'
import { TRUTH_TOTAL } from '../domain/endings'
import type { Interaction } from '../domain/interaction'
import type { GameAction, GameState } from '../domain/state'

/**
 * HUD。
 *
 * 三个计量都**只用符号，不给数字**——玩家应该凭感觉知道自己惹了多少神怒，
 * 而不是盯着一个可以最优化的进度条。归乡录里才给准确数字，因为那是他自己写的账。
 */
export function HUD({
  state,
  island,
  interaction,
  dispatch,
}: {
  state: GameState
  island: Island
  interaction: Interaction | null
  dispatch: (a: GameAction) => void
}) {
  const islandTotal = ALL_LEDGER_ENTRIES.filter((e) => e.island === island.id).length
  const islandLocked = ALL_LEDGER_ENTRIES.filter(
    (e) => e.island === island.id && state.locked.has(e.id),
  ).length

  return (
    <>
      <header className="hud-top">
        <div className="hud-island">
          <span className="greek">{island.greek}</span>
          <strong>{island.name}</strong>
          {islandTotal > 0 && (
            <small>
              本岛已落定 {islandLocked} / {islandTotal}
            </small>
          )}
        </div>

        <div className="hud-meters" aria-label="航程状态">
          <span title={`已锁定 ${state.locked.size} / ${TRUTH_TOTAL} 条`}>
            真相 <i>{'▰'.repeat(Math.round((state.locked.size / TRUTH_TOTAL) * 8)).padEnd(8, '▱')}</i>
          </span>
          <span title="已可随你归乡的同船者">
            安息 <i>{'●'.repeat(state.shades).padEnd(12, '○')}</i>
          </span>
          <span className={state.wrath >= 5 ? 'wrath high' : 'wrath'} title="众神之怒">
            神怒 <i>{'✦'.repeat(Math.min(state.wrath, 10)) || '—'}</i>
          </span>
        </div>

        <div className="hud-actions">
          <button type="button" onClick={() => dispatch({ type: 'OPEN_LEDGER' })}>
            归乡录 <kbd>Tab</kbd>
          </button>
          <button type="button" onClick={() => dispatch({ type: 'TOGGLE_MUTE' })}>
            {state.muted ? '静音中' : '有声'}
          </button>
          <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}>
            暂停 <kbd>Esc</kbd>
          </button>
        </div>
      </header>

      <footer className="hud-bottom">
        {interaction ? (
          <p className={interaction.kind === 'depart-blocked' ? 'prompt blocked' : 'prompt'}>
            {interaction.kind !== 'depart-blocked' && <kbd>E</kbd>}
            {interaction.label}
          </p>
        ) : (
          <p className="prompt idle">
            <kbd>WASD</kbd> 走动 · <kbd>E</kbd> 检视 · <kbd>Tab</kbd> 归乡录
          </p>
        )}
      </footer>
    </>
  )
}
