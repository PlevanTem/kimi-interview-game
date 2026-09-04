import { EVIDENCE_BY_ID, TABLEAU_BY_ID } from '../content'
import type { Island } from '../content/types'
import { evaluateOptional } from '../domain/conditions'
import { TONE_COLORS } from '../render/palette'
import { SHADES_TOTAL, TRUTH_TOTAL, type Ending } from '../domain/endings'
import type { GameAction, GameState } from '../domain/state'
import { conditionContext } from '../domain/state'

const KIND_LABEL: Record<string, string> = {
  object: '物品',
  inscription: '铭文',
  body: '尸体',
  trace: '痕迹',
  testimony: '证词',
}

/** 标题画面。 */
export function TitleScreen({ dispatch }: { dispatch: (a: GameAction) => void }) {
  return (
    <div className="panel title-screen">
      <p className="greek big">ΝΟΣΤΟΣ</p>
      <h1>归乡录</h1>
      <p className="tagline">
        众神拿走了你漂泊十年的记忆。
        <br />
        在获准回家之前，你必须自己把这十年一条一条查清楚。
      </p>
      <ul className="title-rules">
        <li>五座互不相连的岛。每一座上，事情都已经发生完了。</li>
        <li>检视遗物，举杖唤起凝固的记忆，把答案写进归乡录。</li>
        <li>单独填对一条不会有任何反应——三条同时正确，才会一起落定。</li>
        <li>没有战斗，没有计时，没有死亡。你唯一会输掉的东西是真相。</li>
      </ul>
      <button className="primary" type="button" onClick={() => dispatch({ type: 'START' })}>
        启程 <kbd>E</kbd>
      </button>
    </div>
  )
}

/** 抵达岛屿时的陶瓶画标题卡。 */
export function ArrivalCard({
  island,
  dispatch,
}: {
  island: Island
  dispatch: (a: GameAction) => void
}) {
  return (
    <div className="panel arrival">
      <p className="greek big">{island.greek}</p>
      <h2>{island.name}</h2>
      <p className="subtitle">{island.subtitle}</p>
      <div className="arrival-text">
        {island.arrival.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <button className="primary" type="button" onClick={() => dispatch({ type: 'ENTER_ISLAND' })}>
        上岸 <kbd>E</kbd>
      </button>
    </div>
  )
}

/** 检视面板。 */
export function ExaminePanel({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: (a: GameAction) => void
}) {
  const evidence = state.activeEvidence ? EVIDENCE_BY_ID.get(state.activeEvidence) : undefined
  if (!evidence) return null
  return (
    <div className="panel examine" role="dialog" aria-modal="true" aria-label={evidence.name}>
      <header>
        <span className="kind">{KIND_LABEL[evidence.kind]}</span>
        <h2>{evidence.name}</h2>
      </header>
      <div className="prose">
        {evidence.examine.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      {evidence.tableau && (
        <p className="hint staff">
          杖在发烫。退出后按 <kbd>E</kbd> 可以让这一刻重新立起来。
        </p>
      )}
      <footer className="panel-foot">
        <button type="button" onClick={() => dispatch({ type: 'CLOSE_PANEL' })}>
          收起 <kbd>Q</kbd>
        </button>
      </footer>
    </div>
  )
}

/** 记忆定影中的浮层：回声台词 + 图中人物的可辨识细节。 */
export function TableauOverlay({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: (a: GameAction) => void
}) {
  const tableau = state.activeTableau ? TABLEAU_BY_ID.get(state.activeTableau) : undefined
  if (!tableau) return null
  return (
    <div className="tableau-overlay">
      <header>
        <p className="greek">ΜΝΗΜΗ</p>
        <h2>{tableau.title}</h2>
      </header>

      <blockquote className="echo">
        <p>{tableau.echo}</p>
        <cite>—— {tableau.echoSpeaker}</cite>
      </blockquote>

      <div className="figure-notes">
        {tableau.figures.map((figure) => (
          <article key={figure.id}>
            <h3>{figure.label}</h3>
            {figure.detail?.split('\n\n').map((line, i) => <p key={i}>{line}</p>)}
          </article>
        ))}
      </div>

      <footer className="tableau-foot">
        <span>
          <kbd>WASD</kbd> 绕行观察
        </span>
        <button type="button" onClick={() => dispatch({ type: 'CLOSE_PANEL' })}>
          离开这一刻 <kbd>Q</kbd>
        </button>
      </footer>
    </div>
  )
}

/** 对话面板。 */
export function DialoguePanel({
  state,
  island,
  dispatch,
}: {
  state: GameState
  island: Island
  dispatch: (a: GameAction) => void
}) {
  if (!state.dialogue) return null
  const npc = island.npcs.find((n) => n.id === state.dialogue!.npc)
  const node = npc?.nodes.find((n) => n.id === state.dialogue!.node)
  if (!npc || !node) return null

  const ctx = conditionContext(state)
  const choices = node.choices.filter((choice) => evaluateOptional(choice.when, ctx))

  return (
    <div className="panel dialogue" role="dialog" aria-modal="true" aria-label={`与 ${npc.name} 交谈`}>
      <header>
        <h2>{node.speaker}</h2>
      </header>
      <div className="prose speech">
        {node.text.split('\n\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <ul className="choices">
        {choices.map((choice, index) => (
          <li key={index}>
            <button type="button" onClick={() => dispatch({ type: 'DIALOGUE_CHOOSE', index })}>
              <kbd>{index + 1}</kbd>
              {choice.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 关键抉择面板。 */
export function ChoicePanel({
  state,
  island,
  dispatch,
}: {
  state: GameState
  island: Island
  dispatch: (a: GameAction) => void
}) {
  const ctx = conditionContext(state)
  const options = island.choice.options.filter((option) => evaluateOptional(option.when, ctx))
  return (
    <div className="panel choice" role="dialog" aria-modal="true" aria-label={island.choice.title}>
      <header>
        <span className="kind">不可撤销</span>
        <h2>{island.choice.title}</h2>
      </header>
      <div className="prose">
        {island.choice.prompt.split('\n\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <ul className="choices">
        {options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => dispatch({ type: 'MAKE_CHOICE', option: option.id })}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 抉择后果。 */
export function OutcomePanel({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: (a: GameAction) => void
}) {
  if (!state.outcome) return null
  return (
    <div className="panel outcome" role="dialog" aria-modal="true" aria-label="后果">
      <div className="prose">
        {state.outcome.flatMap((block, b) =>
          block.split('\n\n').map((line, i) => <p key={`${b}-${i}`}>{line}</p>),
        )}
      </div>
      <footer className="panel-foot">
        <button className="primary" type="button" onClick={() => dispatch({ type: 'CLOSE_PANEL' })}>
          继续 <kbd>空格</kbd>
        </button>
      </footer>
    </div>
  )
}

/** 暂停。 */
export function PausePanel({ dispatch }: { dispatch: (a: GameAction) => void }) {
  return (
    <div className="panel pause" role="dialog" aria-modal="true" aria-label="暂停">
      <p className="greek">ΣΤΑΣΙΣ</p>
      <h2>停一下</h2>
      <p className="tagline">这里没有计时，也没有会追上你的东西。慢慢来。</p>
      <div className="key-list">
        <span>
          <kbd>WASD</kbd> 移动
        </span>
        <span>
          <kbd>E</kbd> 检视 / 交谈 / 唤起记忆
        </span>
        <span>
          <kbd>Q</kbd> 退出记忆
        </span>
        <span>
          <kbd>Tab</kbd> 归乡录
        </span>
        <span>
          <kbd>1-4</kbd> 对话选项
        </span>
        <span>
          <kbd>M</kbd> 静音
        </span>
      </div>
      <button className="primary" type="button" onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}>
        继续 <kbd>Esc</kbd>
      </button>
    </div>
  )
}

/** 结局画面。 */
export function EndingScreen({
  ending,
  state,
  dispatch,
}: {
  ending: Ending
  state: GameState
  dispatch: (a: GameAction) => void
}) {
  const tone = TONE_COLORS[ending.tone]
  return (
    <div
      className="panel ending"
      style={{ background: tone.bg, color: tone.fg, borderColor: tone.accent }}
    >
      <p className="greek big" style={{ color: tone.accent }}>
        {ending.greek}
      </p>
      <h1 style={{ color: tone.fg }}>{ending.name}</h1>
      <div className="prose">
        {ending.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <dl className="tally">
        <div>
          <dt>写下的真相</dt>
          <dd>
            {state.locked.size} / {TRUTH_TOTAL}
          </dd>
        </div>
        <div>
          <dt>随你归乡的同船者</dt>
          <dd>
            {state.shades} / {SHADES_TOTAL}
          </dd>
        </div>
        <div>
          <dt>众神之怒</dt>
          <dd>{'✦'.repeat(Math.min(state.wrath, 10)) || '—'}</dd>
        </div>
      </dl>
      <button className="primary" type="button" onClick={() => dispatch({ type: 'RESTART' })}>
        再走一遍
      </button>
    </div>
  )
}
