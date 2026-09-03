import { segments } from './content/segments';
import { validatePath, type Point } from './domain/path';
import { initialState, transition, type GameEvent, type GameState } from './domain/stateMachine';
import { GrayboxRenderer } from './presentation/renderer';
import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main>
    <header>
      <div><span class="eyebrow">GRAYBOX · GATE 2 PENDING</span><h1>下一盏灯</h1></div>
      <div class="controls"><button id="pause">暂停</button><button id="restart">重开</button></div>
    </header>
    <section class="layout">
      <div id="stage"></div>
      <aside>
        <div class="metric"><span>进度</span><strong id="progress">0 / 8</strong></div>
        <div class="metric"><span>灯芯耗尽</span><strong id="exhaustions">0 / 3</strong></div>
        <div class="metric"><span>本段预算</span><strong id="budget">—</strong></div>
        <p id="segment-label"></p>
        <p id="status" role="status" aria-live="polite"></p>
        <p id="error-detail"></p>
      </aside>
    </section>
    <div id="overlay" class="overlay">
      <div class="panel"><p class="eyebrow">3–5 MINUTE GRAYBOX</p><h2 id="overlay-title">点亮下一百米</h2><p id="overlay-copy">不需要找到唯一答案。先从圆形起点，铺到方形落点。</p><button id="primary">开始旅程</button></div>
    </div>
  </main>`;

const renderer = new GrayboxRenderer(document.querySelector('#stage')!);
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const detail = document.querySelector<HTMLParagraphElement>('#error-detail')!;
const progress = document.querySelector<HTMLElement>('#progress')!;
const exhaustions = document.querySelector<HTMLElement>('#exhaustions')!;
const budget = document.querySelector<HTMLElement>('#budget')!;
const segmentLabel = document.querySelector<HTMLParagraphElement>('#segment-label')!;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const overlayTitle = document.querySelector<HTMLHeadingElement>('#overlay-title')!;
const overlayCopy = document.querySelector<HTMLParagraphElement>('#overlay-copy')!;
const primary = document.querySelector<HTMLButtonElement>('#primary')!;
const pause = document.querySelector<HTMLButtonElement>('#pause')!;
const restart = document.querySelector<HTMLButtonElement>('#restart')!;

let state = initialState();
let drawing = false;
let recoverTimer: number | null = null;
let lastFrame = performance.now();
const eventTrace: GameEvent[] = [];

function dispatch(event: GameEvent) {
  eventTrace.push(event);
  state = transition(state, event);
  updateUi();
  if (state.phase === 'RecoverSegment' && recoverTimer === null) {
    recoverTimer = window.setTimeout(() => {
      recoverTimer = null;
      dispatch({ type: 'TICK', deltaMs: 0 });
    }, 260);
  }
}

function reasonText(reason: GameState['lastReason']) {
  if (!reason) return '';
  return ({ start_anchor: '必须从圆形起点开始。', outside_corridor: '灯带离开了允许走廊。', blocked_gap: '灯带跨过了不可铺设的断口。', target_miss: '灯带还没有抵达方形落点。', over_budget: '灯带超过了本段预算。' })[reason];
}

function updateUi() {
  const segment = segments[state.segmentIndex];
  progress.textContent = `${state.phase === 'RunSuccess' ? 8 : state.segmentIndex} / 8`;
  exhaustions.textContent = `${state.exhaustions} / 3`;
  let used = 0;
  if (state.draft.length > 1) {
    try { used = validatePath(segment, state.draft).length; } catch { used = 0; }
  }
  budget.textContent = state.phase.endsWith('Draft') ? `余 ${(segment.budget - used).toFixed(1)} / ${segment.budget.toFixed(1)}` : `${segment.budget.toFixed(1)} 单位`;
  segmentLabel.textContent = `第 ${state.segmentIndex + 1} 段 · ${segment.label}`;
  detail.textContent = reasonText(state.lastReason);
  pause.textContent = state.phase === 'Paused' ? '继续' : '暂停';
  pause.disabled = ['Title', 'RunSuccess', 'RunFailure'].includes(state.phase);

  if (state.phase === 'Title') {
    overlay.hidden = false;
    status.textContent = '等待开始。';
  } else if (state.phase === 'RunSuccess') {
    overlay.hidden = false;
    overlayTitle.textContent = '这一段走完了';
    overlayCopy.textContent = '八次选择连成了一条可回看的路。灰盒到此结束。';
    primary.textContent = '再走一次';
    status.textContent = '旅程完成。';
  } else if (state.phase === 'RunFailure') {
    overlay.hidden = false;
    overlayTitle.textContent = '这次路线暂时没有抵达';
    overlayCopy.textContent = '失败只代表这次路线试验结束。可以立即以相同布局重开。';
    primary.textContent = '立即重开';
    status.textContent = '连续三次灯芯耗尽。';
  } else if (state.phase === 'Paused') {
    overlay.hidden = false;
    overlayTitle.textContent = '已暂停';
    overlayCopy.textContent = '草案、旅者位置和进度都保持不变。';
    primary.textContent = '继续';
    status.textContent = '运行已冻结。';
  } else {
    overlay.hidden = true;
    primary.textContent = '继续';
    status.textContent = state.phase === 'Traverse' ? '旅者正在通过已铺路径。' : state.phase === 'RecoverSegment' ? '灯芯熄灭，回到同一段。' : state.phase.endsWith('Draft') ? '松开以提交；右键取消草案。' : state.segmentIndex === 0 ? '从圆形起点拖到方形落点。' : '铺出下一段可走的路。';
  }
  renderer.render(state);
}

primary.addEventListener('click', () => {
  if (state.phase === 'Title') dispatch({ type: 'START' });
  else if (state.phase === 'Paused') dispatch({ type: 'RESUME' });
  else dispatch({ type: 'RESTART' });
});
pause.addEventListener('click', () => dispatch({ type: state.phase === 'Paused' ? 'RESUME' : 'PAUSE' }));
restart.addEventListener('click', () => dispatch({ type: 'RESTART' }));
renderer.canvas.addEventListener('contextmenu', (event) => { event.preventDefault(); if (state.phase.endsWith('Draft')) dispatch({ type: 'CANCEL_PATH' }); });
renderer.canvas.addEventListener('pointerdown', (event) => {
  if (!['TutorialObserve', 'Observe'].includes(state.phase)) return;
  renderer.canvas.setPointerCapture(event.pointerId);
  drawing = true;
  dispatch({ type: 'BEGIN_PATH' });
  dispatch({ type: 'UPDATE_PATH', point: renderer.pointerToWorld(event) });
});
renderer.canvas.addEventListener('pointermove', (event) => {
  if (!drawing || !state.phase.endsWith('Draft')) return;
  dispatch({ type: 'UPDATE_PATH', point: renderer.pointerToWorld(event) });
});
renderer.canvas.addEventListener('pointerup', (event) => {
  if (!drawing || !state.phase.endsWith('Draft')) return;
  drawing = false;
  dispatch({ type: 'UPDATE_PATH', point: renderer.pointerToWorld(event) });
  dispatch({ type: 'SUBMIT_PATH' });
  renderer.canvas.releasePointerCapture(event.pointerId);
});

function animate(now: number) {
  const deltaMs = Math.min(50, now - lastFrame);
  lastFrame = now;
  if (state.phase === 'Traverse') dispatch({ type: 'TICK', deltaMs });
  else renderer.render(state);
  requestAnimationFrame(animate);
}

declare global {
  interface Window {
    __odysseyGraybox?: {
      getState: () => GameState;
      getSegments: () => typeof segments;
      getTrace: () => GameEvent[];
      validate: (segmentIndex: number, points: Point[]) => ReturnType<typeof validatePath>;
    };
  }
}
window.__odysseyGraybox = { getState: () => structuredClone(state), getSegments: () => segments, getTrace: () => structuredClone(eventTrace), validate: (index, points) => validatePath(segments[index], points) };

updateUi();
requestAnimationFrame(animate);
