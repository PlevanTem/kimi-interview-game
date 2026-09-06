import './styles.css';

import { TEXT } from '../../src/content/script';
import { CHART, IslandChart, stateFor, type ChartIsland } from '../../src/ui/chart';

/**
 * 《归航 · NOSTOS》暂停面板研究页。
 *
 * 要判断的是两件事，所以这一页把它们放在同一屏：
 *
 * 1. **三块的布局**成不成立——航程 / 调校 / 舵法 同时在场，
 *    不用翻页、不用竖着滚一米。
 * 2. **八枚章的造型**认不认得出——每一枚是不是一眼能说出"这是哪座岛"。
 *
 * 左下角那条控制带不属于面板设计，它只是用来把八种进度状态一一过一遍：
 * 拖到第 0 幕，除了序章全是未刻的石料；拖到第 7 幕，八枚全刻出来。
 * 评审的时候请把它当成不存在。
 */

const U = TEXT.ui;

const app = document.getElementById('app')!;
app.innerHTML = `
  <div class="stage">
    <div class="frozen"></div>
    <div class="panel">
      <header>
        <h2>${U.paused}</h2>
        <div class="whereami" data-role="whereami"></div>
      </header>

      <div class="body">
        <section class="voyage">
          <div class="sectionlabel">${U.progressTitle}</div>
          <canvas id="chart"></canvas>
          <div class="card" data-role="card">
            <div class="ordinal"></div>
            <div class="name"></div>
            <div class="memory"></div>
            <div class="tone"></div>
          </div>
          <div class="tally" data-role="tally"></div>
        </section>

        <aside>
          <div>
            <div class="sectionlabel">调校</div>
            <div class="settings" data-role="settings"></div>
          </div>
          <div>
            <div class="sectionlabel">舵法</div>
            <div class="keys" data-role="keys"></div>
          </div>
        </aside>
      </div>

      <footer>
        <button class="link">${U.back}</button>
        <button class="link">${U.restart}</button>
      </footer>
    </div>

    <div class="lab">
      <span>走到第 <b data-role="labact">1</b> / 8 幕</span>
      <input type="range" min="0" max="7" step="1" value="0" data-role="labprogress" />
      <label><input type="checkbox" data-role="labmotion" /> 减弱镜头动态</label>
      <span class="hint">这条控制带只在研究页里有</span>
    </div>
  </div>
`;

// ─────────────────────────────────────────── 右栏：调校

interface Setting {
  label: string;
  kind: 'toggle' | 'slider';
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** 读数怎么写给人看。滑杆现在**必须**有读数——盲拖是上一版最实的一处伤 */
  format?: (v: number) => string;
}

const settings: Setting[] = [
  { label: U.reducedMotion, kind: 'toggle', value: 0 },
  { label: '音量', kind: 'slider', value: 0.7, min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}` },
  { label: U.subtitleSize, kind: 'slider', value: 1, min: 0.8, max: 1.6, step: 0.05, format: (v) => `${v.toFixed(2)}×` },
  { label: U.sensitivity, kind: 'slider', value: 1, min: 0.4, max: 2.2, step: 0.05, format: (v) => `${v.toFixed(2)}×` },
  { label: U.fov, kind: 'slider', value: 62, min: 50, max: 80, step: 1, format: (v) => `${v.toFixed(0)}°` },
];

const settingsNode = app.querySelector<HTMLElement>('[data-role="settings"]')!;
for (const setting of settings) {
  const row = document.createElement('div');
  row.className = 'row';
  const label = document.createElement('span');
  label.textContent = setting.label;
  row.append(label);

  if (setting.kind === 'toggle') {
    const button = document.createElement('button');
    button.className = 'toggle';
    button.dataset.on = 'false';
    button.textContent = 'OFF';
    button.addEventListener('click', () => {
      const on = button.dataset.on !== 'true';
      button.dataset.on = String(on);
      button.textContent = on ? 'ON' : 'OFF';
      if (setting.label === U.reducedMotion) applyMotion(on);
    });
    row.append(button);
  } else {
    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = setting.format!(setting.value);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(setting.min);
    input.max = String(setting.max);
    input.step = String(setting.step);
    input.value = String(setting.value);
    input.addEventListener('input', () => {
      value.textContent = setting.format!(Number(input.value));
    });
    row.append(value, input);
  }
  settingsNode.append(row);
}

// ─────────────────────────────────────────── 右栏：舵法

/**
 * 按键做成石刻小方块。
 *
 * 上一版这七个键挤在一行 12px 的脚注里，`H` 和别的键一样大——
 * 而 `H` 是全作唯一的引导机制，世界里专门为它做了引路的光和角落提示。
 * 所以这里给它一整行，外加半句说明。
 */
const KEYS: Array<{ key: string; label: string; note?: string }> = [
  { key: 'W A S D', label: '走' },
  { key: 'Shift', label: '快跑' },
  { key: '鼠标', label: '看' },
  { key: 'E', label: '触碰' },
  { key: 'H', label: '呼唤引路的光', note: '一串光尘会拐向下一处该去的地方，九秒后熄灭' },
  { key: '空格', label: '跳过这段回忆' },
  { key: 'Esc', label: '停下来' },
];

const keysNode = app.querySelector<HTMLElement>('[data-role="keys"]')!;
for (const entry of KEYS) {
  const row = document.createElement('div');
  row.className = entry.note ? 'key accent' : 'key';
  const cap = document.createElement('b');
  cap.textContent = entry.key;
  const text = document.createElement('span');
  text.textContent = entry.label;
  if (entry.note) {
    const note = document.createElement('i');
    note.textContent = entry.note;
    text.append(note);
  }
  row.append(cap, text);
  keysNode.append(row);
}

// ─────────────────────────────────────────── 航程

const canvas = document.getElementById('chart') as HTMLCanvasElement;
const card = app.querySelector<HTMLElement>('[data-role="card"]')!;
const cardOrdinal = card.querySelector<HTMLElement>('.ordinal')!;
const cardName = card.querySelector<HTMLElement>('.name')!;
const cardMemory = card.querySelector<HTMLElement>('.memory')!;
const cardTone = card.querySelector<HTMLElement>('.tone')!;
const whereami = app.querySelector<HTMLElement>('[data-role="whereami"]')!;
const tally = app.querySelector<HTMLElement>('[data-role="tally"]')!;

let currentAct = 0;

function showCard(island: ChartIsland | null): void {
  canvas.classList.toggle('pointing', island !== null);
  if (!island) {
    card.classList.remove('visible');
    return;
  }
  cardOrdinal.textContent = `${island.ordinal} · ${island.subtitle}`;
  cardName.textContent = island.title;
  // 记忆物件只在真的走过之后才写出来：当前这一幕还在走，不剧透
  cardMemory.textContent = stateFor(island.act, currentAct) === 'done' ? island.memory : '';
  cardTone.textContent = island.tone;
  card.classList.add('visible');
}

const chart = new IslandChart(canvas, {
  onHover: showCard,
  onSelect: (island) => chart.setFocus(island.act),
});

function setProgress(act: number): void {
  currentAct = act;
  chart.setProgress(act);
  const island = CHART[act]!;
  whereami.textContent = `${island.ordinal} · ${island.title}  ·  ${act + 1} / ${CHART.length}`;
  tally.textContent = `八枚章，刻出 ${act} 枚 · 悬停可以看那一幕留下的是什么`;
  labAct.textContent = String(act + 1);
}

function applyMotion(reduced: boolean): void {
  chart.setReducedMotion(reduced);
  labMotion.checked = reduced;
}

// ─────────────────────────────────────────── 研究页控制带

const labProgress = app.querySelector<HTMLInputElement>('[data-role="labprogress"]')!;
const labAct = app.querySelector<HTMLElement>('[data-role="labact"]')!;
const labMotion = app.querySelector<HTMLInputElement>('[data-role="labmotion"]')!;

labProgress.addEventListener('input', () => setProgress(Number(labProgress.value)));
labMotion.addEventListener('change', () => chart.setReducedMotion(labMotion.checked));

setProgress(4);
labProgress.value = '4';

// ─────────────────────────────────────────── 循环

const resize = (): void => chart.resize();
window.addEventListener('resize', resize);
resize();

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  chart.update(dt);
  chart.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
