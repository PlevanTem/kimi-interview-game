import { ISLAND_BY_ID } from '../content'
import { CREW } from '../content/crew'
import type { IslandId, LedgerEntry } from '../content/types'
import { availableOptions, LOCK_THRESHOLD } from '../domain/ledger'
import { SHADES_TOTAL, TRUTH_TOTAL } from '../domain/endings'
import type { GameAction, GameState } from '../domain/state'
import { visibleEntries } from '../domain/state'

/**
 * 归乡录面板。
 *
 * 界面上**没有任何"这条对不对"的提示**——没有对勾、没有叉、没有颜色区分。
 * 唯一的反馈是三条一组锁定时整组变成烫金。这是《Obra Dinn》最重要的一条界面
 * 纪律：界面本身不能变成一台可以逐条试错的验证机器。
 */
export function Ledger({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: (action: GameAction) => void
}) {
  const entries = visibleEntries(state)
  const byIsland = new Map<IslandId, LedgerEntry[]>()
  for (const entry of entries) {
    const list = byIsland.get(entry.island) ?? []
    list.push(entry)
    byIsland.set(entry.island, list)
  }

  const knownCrew = CREW.filter((member) => member.revealedBy.some((f) => state.facts.has(f)))
  const pendingCorrect = entries.filter((e) => !state.locked.has(e.id)).length

  return (
    <div className="panel ledger" role="dialog" aria-modal="true" aria-label="归乡录">
      <header className="ledger-head">
        <div>
          <h2>归乡录</h2>
          <p className="greek">ΝΟΣΤΟΥ ΒΙΒΛΟΣ</p>
        </div>
        <div className="ledger-stats">
          <span>
            已锁定 <strong>{state.locked.size}</strong> / {TRUTH_TOTAL}
          </span>
          <span>
            已安息 <strong>{state.shades}</strong> / {SHADES_TOTAL}
          </span>
        </div>
      </header>

      <p className="ledger-rule">
        单独填对一条不会有任何反应。当尚未锁定的条目里同时出现 {LOCK_THRESHOLD} 条正确，
        它们才会一起落定，并且再也不能更改。
      </p>

      <div className="ledger-body">
        <section className="ledger-entries">
          {[...byIsland.entries()].map(([islandId, list]) => (
            <div key={islandId} className="ledger-island">
              <h3>
                {ISLAND_BY_ID.get(islandId)?.name}
                <small>{ISLAND_BY_ID.get(islandId)?.greek}</small>
              </h3>
              {list.map((entry) => {
                const locked = state.locked.has(entry.id)
                const filled = state.answers[entry.id] ?? entry.slots.map(() => null)
                return (
                  <article key={entry.id} className={locked ? 'entry locked' : 'entry'}>
                    <p className="prompt">
                      <span className="entry-id">{entry.id}</span>
                      {entry.prompt}
                    </p>
                    <div className="slots">
                      {entry.slots.map((slot, index) => {
                        const options = availableOptions(slot.pool, state.facts)
                        return (
                          <label key={index}>
                            <span>{slot.label}</span>
                            <select
                              value={filled[index] ?? ''}
                              disabled={locked}
                              aria-label={`${entry.prompt} — ${slot.label}`}
                              onChange={(event) =>
                                dispatch({
                                  type: 'SET_ANSWER',
                                  entry: entry.id,
                                  slot: index,
                                  option: event.target.value === '' ? null : event.target.value,
                                })
                              }
                            >
                              <option value="">——</option>
                              {options.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )
                      })}
                      {locked && <span className="seal">已落定</span>}
                    </div>
                  </article>
                )
              })}
            </div>
          ))}
          {pendingCorrect === 0 && entries.length > 0 && (
            <p className="ledger-done">这一段已经写完了。</p>
          )}
        </section>

        <aside className="roster">
          <h3>
            同船者名册<small>ΕΤΑΙΡΟΙ</small>
          </h3>
          <p className="roster-note">
            一个名字只有在某件遗物或某段记忆提到过之后，才会出现在上面的下拉框里。
          </p>
          <ul>
            {CREW.map((member) => {
              const known = knownCrew.includes(member)
              return (
                <li key={member.id} className={known ? 'known' : 'unknown'}>
                  <strong>{known ? member.label : '？？？'}</strong>
                  <span className="greek">{known ? member.greek : '—'}</span>
                  <small>{known ? member.role : '尚未有任何东西提到过这个人'}</small>
                </li>
              )
            })}
          </ul>
        </aside>
      </div>

      <footer className="panel-foot">
        <button type="button" onClick={() => dispatch({ type: 'CLOSE_PANEL' })}>
          合上册子 <kbd>Tab</kbd>
        </button>
      </footer>
    </div>
  )
}
