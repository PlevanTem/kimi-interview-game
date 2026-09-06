import { MEMORY_LABELS, TEXT } from '../content/script';
import { ACTS } from '../game/scenes';
import type { Caption } from '../game/types';
import { navigationMark } from './navigation-mark';
import { CHART, IslandChart, stateFor, type ChartIsland } from './chart';

/**
 * 界面层。
 *
 * 屏幕上永远只有：一个准星点、一行提示、一条字幕。登岸时多一张幕卡，
 * 暂停时多一块面板。没有血条、小地图、任务栏、收集品清单——
 * 因为这部作品里没有任何需要玩家管理的东西。
 */

export interface Settings {
  reducedMotion: boolean;
  subtitleScale: number;
  sensitivity: number;
  fov: number;
  /** 0–1。0 等同静音——这部作品的声音玩家往往想要"小一点"，不是"没有" */
  volume: number;
}

export interface OverlayHandlers {
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onSettingsChange: (settings: Settings) => void;
}

const U = TEXT.ui;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class Overlay {
  readonly settings: Settings = {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    subtitleScale: 1,
    sensitivity: 1,
    fov: 62,
    volume: 1,
  };

  private readonly root: HTMLElement;
  private readonly reticle: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly speakerNode: HTMLElement;
  private readonly lineNode: HTMLElement;
  private readonly actcard: HTMLElement;
  private readonly actIndex: HTMLElement;
  private readonly actTitle: HTMLElement;
  private readonly actSub: HTMLElement;
  private readonly titlePanel: HTMLElement;
  private readonly pausePanel: HTMLElement;
  private readonly endPanel: HTMLElement;
  private readonly endMark: HTMLElement;
  private readonly endDedication: HTMLElement;
  private readonly skipHint: HTMLElement;
  private readonly guideHint: HTMLElement;
  private readonly introCard: HTMLElement;
  private readonly progressList: HTMLElement;
  private chartCanvas!: HTMLCanvasElement;
  private chartCard!: HTMLElement;
  private whereami!: HTMLElement;
  /** 航程海图。第一次按下 Esc 时才建，不给从不暂停的玩家付这份钱。 */
  private chart: IslandChart | null = null;
  private currentAct = 0;
  private readonly continueButton: HTMLButtonElement;
  private readonly tutorial: HTMLElement;
  private readonly introProgress: HTMLElement;
  private touchAnimation: Animation | null = null;
  private actCardTimer = 0;

  constructor(
    container: HTMLElement,
    private readonly handlers: OverlayHandlers,
  ) {
    this.root = el('div', 'overlay');

    this.reticle = el('div', 'reticle hidden');
    this.prompt = el('div', 'prompt');
    this.root.append(this.reticle, this.prompt);

    this.subtitle = el('div', 'subtitle');
    this.speakerNode = el('span', 'speaker');
    this.lineNode = el('span', 'line');
    this.subtitle.append(this.speakerNode, this.lineNode);
    this.root.append(this.subtitle);

    this.actcard = el('div', 'actcard');
    this.actIndex = el('div', 'index');
    this.actTitle = el('div', 'title');
    this.actSub = el('div', 'sub');
    this.actcard.append(this.actIndex, this.actTitle, this.actSub, el('div', 'rule'));
    this.root.append(this.actcard);

    this.skipHint = el('div', 'skiphint', U.skipHint);
    this.guideHint = el('div', 'guidehint', U.guideHint);
    this.root.append(this.skipHint, this.guideHint);
    this.tutorial = el('div', 'tutorial');
    this.root.append(this.tutorial);

    // 开场页脚：序章署名、可跳过说明与细线进度。
    this.introCard = el('div', 'introcard');
    this.introCard.append(el('div', 'latin', 'N O S T O S / 序'), el('div', 'intro-skip', U.introSkip));
    this.introProgress = el('div', 'intro-progress');
    this.introCard.append(this.introProgress);
    this.root.append(this.introCard);

    this.titlePanel = this.buildTitle();
    this.pausePanel = this.buildPause();
    this.endPanel = this.buildEnd();
    this.progressList = this.pausePanel.querySelector('.voyage') as HTMLElement;
    this.endMark = this.endPanel.querySelector('.mark') as HTMLElement;
    this.endDedication = this.endPanel.querySelector('.dedication') as HTMLElement;
    this.continueButton = this.titlePanel.querySelector('[data-role="continue"]') as HTMLButtonElement;
    this.root.append(this.titlePanel, this.pausePanel, this.endPanel);
    this.pausePanel.inert = true;
    this.endPanel.inert = true;
    // 模态面板内保留键盘焦点；不可见面板完全退出交互。
    this.root.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const panel = this.root.querySelector<HTMLElement>('.panel:not(.hidden)');
      const controls = panel ? [...panel.querySelectorAll<HTMLElement>('button:not([hidden]), input')].filter((node) => node.getClientRects().length) : [];
      if (!controls.length) return;
      const current = controls.indexOf(document.activeElement as HTMLElement);
      const next = (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      event.preventDefault();
      controls[next]!.focus();
    });

    container.append(this.root);
    this.applySettings();
  }

  // ── 构建 ──

  private buildTitle(): HTMLElement {
    const panel = el('div', 'panel titlepanel');
    const mast = el('div', 'title-mast');
    mast.append(el('span', undefined, 'NOSTOS / 归航'), el('span', undefined, 'AN ODYSSEY OF MEMORY'));
    const content = el('div', 'title-content');
    const seal = el('div', 'navigation-mark');
    seal.append(navigationMark());
    content.append(seal, el('div', 'eyebrow', U.titleEyebrow), el('h1', undefined, U.title),
      el('div', 'latin', U.titleSub), el('div', 'tagline', U.titleLine));

    const menu = el('div', 'menu');
    const start = el('button', 'link', U.start);
    start.dataset.role = 'start';
    start.addEventListener('click', () => this.handlers.onStart());

    const cont = el('button', 'link', U.resume);
    cont.dataset.role = 'continue';
    cont.hidden = true;
    cont.addEventListener('click', () => this.handlers.onResume());

    menu.append(cont, start);
    content.append(menu);
    const footer = el('div', 'title-footer');
    footer.append(el('span', undefined, U.titleFootnote));
    const motion = el('button', 'motion-switch', '镜头 / 流动');
    motion.setAttribute('aria-label', '切换减弱镜头动态');
    motion.setAttribute('aria-pressed', String(this.settings.reducedMotion));
    motion.textContent = this.settings.reducedMotion ? '镜头 / 静止' : '镜头 / 流动';
    motion.addEventListener('click', () => {
      this.settings.reducedMotion = !this.settings.reducedMotion;
      motion.setAttribute('aria-pressed', String(this.settings.reducedMotion));
      motion.textContent = this.settings.reducedMotion ? '镜头 / 静止' : '镜头 / 流动';
      this.applySettings();
    });
    footer.append(motion);
    const location = el('div', 'title-location');
    location.append(el('span', 'location-index', '00'), el('span', undefined, U.titleLocation), el('i', 'tideline'));
    panel.append(mast, content, location, footer);
    return panel;
  }

  /**
   * 暂停面板：调校 / 舵法 / 航程 三块。
   *
   * 从前这里是一根竖列——五个设置项压在最上面，八幕的航程垫在最下面，
   * 720p 下还要滚动。顺序反了：最没有感情的东西占了视觉第一位。
   *
   * 现在左边约六成给航程（唯一带情绪的一块），右侧窄栏收工具。
   * 航程有**两种表达同时在场**：上面是八枚地形浮雕组成的海图，
   * 下面是八行名字。海图负责"你走过的是这些地方"，
   * 名字负责窄屏、读屏，以及任何海图画不出来的时候——
   * 一块进度不该只存在于一张 3D 画布里。
   */
  private buildPause(): HTMLElement {
    const panel = el('div', 'panel pausepanel hidden');

    const header = el('header');
    header.append(el('h2', undefined, U.paused));
    this.whereami = el('div', 'whereami');
    header.append(this.whereami);
    panel.append(header);

    const body = el('div', 'pausebody');

    // ── 航程 ──
    const voyage = el('section', 'voyage-block');
    voyage.append(el('div', 'sectionlabel', U.progressTitle));
    this.chartCanvas = el('canvas', 'chart');
    // 海图是航程的**图示**，真正可读的进度在下面那八行里；
    // 读屏软件读那八行就够了，不必让它去描述一张画布。
    this.chartCanvas.setAttribute('aria-hidden', 'true');
    voyage.append(this.chartCanvas);

    this.chartCard = el('div', 'chartcard');
    this.chartCard.append(el('div', 'ordinal'), el('div', 'name'), el('div', 'memory'), el('div', 'tone'));
    voyage.append(this.chartCard);

    // 八行名字。宽屏下它们**压在海图上**，各自贴在自己那枚章下面；
    // 窄屏（海图收起）时退回一列普通的列表。
    // 单独在旁边摆一栏文字等于把同一件事说两遍，还把海图挤小了。
    voyage.append(el('div', 'voyage'));
    body.append(voyage);

    // ── 调校 + 舵法 ──
    const rail = el('aside', 'pauserail');
    const tuning = el('div');
    tuning.append(el('div', 'sectionlabel', U.tuning));
    tuning.append(this.buildSettings());
    const helm = el('div');
    helm.append(el('div', 'sectionlabel', U.helm));
    helm.append(this.buildKeys());
    rail.append(tuning, helm);
    body.append(rail);

    panel.append(body);

    const menu = el('div', 'menu');
    const resume = el('button', 'link', U.back);
    resume.addEventListener('click', () => this.handlers.onResume());
    const restart = el('button', 'link', U.restart);
    restart.addEventListener('click', () => this.handlers.onRestart());
    menu.append(resume, restart);
    panel.append(menu);
    return panel;
  }

  /**
   * 调校。
   *
   * 每根滑杆都带读数。从前一根都没有——玩家是盲拖，
   * 把视野从 62 拉到哪儿了只能靠眼睛猜。
   */
  private buildSettings(): HTMLElement {
    const grid = el('div', 'settings');

    const row = (label: string): HTMLElement => {
      const node = el('div', 'row');
      node.append(el('span', undefined, label));
      grid.append(node);
      return node;
    };

    const motionRow = row(U.reducedMotion);
    const motionToggle = el('button', 'toggle', this.settings.reducedMotion ? 'ON' : 'OFF');
    motionToggle.dataset.on = String(this.settings.reducedMotion);
    motionToggle.addEventListener('click', () => {
      this.settings.reducedMotion = !this.settings.reducedMotion;
      motionToggle.textContent = this.settings.reducedMotion ? 'ON' : 'OFF';
      motionToggle.dataset.on = String(this.settings.reducedMotion);
      this.chart?.setReducedMotion(this.settings.reducedMotion);
      this.applySettings();
    });
    motionRow.append(motionToggle);

    const slider = (
      label: string,
      min: number,
      max: number,
      step: number,
      value: number,
      format: (v: number) => string,
      apply: (v: number) => void,
    ): void => {
      const node = row(label);
      const readout = el('span', 'value', format(value));
      const input = el('input') as HTMLInputElement;
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.setAttribute('aria-label', label);
      input.addEventListener('input', () => {
        const next = Number(input.value);
        readout.textContent = format(next);
        apply(next);
        this.applySettings();
      });
      node.append(readout, input);
    };

    slider(U.volume, 0, 1, 0.05, this.settings.volume, (v) => String(Math.round(v * 100)),
      (v) => (this.settings.volume = v));
    slider(U.subtitleSize, 0.8, 1.6, 0.05, this.settings.subtitleScale, (v) => `${v.toFixed(2)}×`,
      (v) => (this.settings.subtitleScale = v));
    slider(U.sensitivity, 0.4, 2.2, 0.05, this.settings.sensitivity, (v) => `${v.toFixed(2)}×`,
      (v) => (this.settings.sensitivity = v));
    slider(U.fov, 50, 80, 1, this.settings.fov, (v) => `${v.toFixed(0)}°`,
      (v) => (this.settings.fov = v));

    return grid;
  }

  /**
   * 舵法。
   *
   * 从前是一行 12px 的脚注，七个键挤在一起，`H` 和别的键一样大——
   * 而 `H` 是全作唯一的引导机制，世界里专门为它做了引路的光和角落提示。
   * 这里给它一整行，外加半句说明。
   */
  private buildKeys(): HTMLElement {
    const list = el('div', 'keys');
    const entries: Array<[string, string, string?]> = [
      ['W A S D', '走'],
      ['Shift', '快跑'],
      ['鼠标', '看'],
      ['E', '触碰'],
      ['H', '呼唤引路的光', U.guideNote],
      ['空格', '跳过这段回忆'],
      ['Esc', U.paused],
    ];
    for (const [key, label, note] of entries) {
      const row = el('div', note ? 'key accent' : 'key');
      row.append(el('b', undefined, key));
      const text = el('span', undefined, label);
      if (note) text.append(el('i', undefined, note));
      row.append(text);
      list.append(row);
    }
    return list;
  }

  private buildEnd(): HTMLElement {
    const panel = el('div', 'panel endpanel hidden');
    const card = el('div', 'endcard');
    card.append(el('div', 'mark', TEXT.ithaca.epitaph));
    card.append(el('div', 'dedication', TEXT.ithaca.epitaphSub));
    card.append(el('div', 'memoirtitle', U.memoirTitle));
    card.append(el('div', 'memoirs'));
    card.append(el('div', 'reveal'));
    panel.append(card);
    const menu = el('div', 'menu');
    const restart = el('button', 'link', U.restart);
    restart.addEventListener('click', () => this.handlers.onRestart());
    menu.append(restart);
    panel.append(menu);
    return panel;
  }

  private applySettings(): void {
    document.documentElement.style.setProperty('--subtitle-scale', String(this.settings.subtitleScale));
    document.documentElement.dataset.motion = this.settings.reducedMotion ? 'reduced' : 'full';
    this.handlers.onSettingsChange(this.settings);
  }

  // ── 运行时接口 ──

  setReticle(visible: boolean, focused: boolean): void {
    this.reticle.classList.toggle('hidden', !visible);
    this.reticle.classList.toggle('focused', focused);
  }

  setPrompt(text: string | null, key = 'E'): void {
    if (!text) {
      this.prompt.classList.remove('visible');
      return;
    }
    if (this.prompt.dataset.text === text && this.prompt.dataset.key === key) {
      this.prompt.classList.add('visible');
      return;
    }
    this.prompt.dataset.text = text;
    this.prompt.dataset.key = key;
    this.prompt.innerHTML = '';
    this.prompt.append(el('em', undefined, key), document.createTextNode(text));
    this.prompt.classList.add('visible');
  }

  setCaption(caption: Caption | null): void {
    if (!caption) {
      this.subtitle.classList.remove('visible');
      return;
    }
    this.speakerNode.textContent = caption.speaker ?? '';
    this.speakerNode.style.display = caption.speaker ? 'block' : 'none';
    this.lineNode.textContent = caption.text;
    this.subtitle.classList.add('visible');
  }

  showActCard(act: number, title: string, subtitle: string, seconds = 6): void {
    // 幕号后面挂一个 X / 8：玩家随时知道自己走到哪儿了，也知道还剩多远
    const name = act === 0 ? '序章' : `第 ${'一二三四五六七'[act - 1]} 幕`;
    this.actIndex.textContent = `${name}  ·  ${act + 1} / ${ACTS.length}`;
    this.actTitle.textContent = title;
    this.actSub.textContent = subtitle;
    this.actcard.classList.add('visible');
    this.actCardTimer = seconds;
  }

  setSkipHint(visible: boolean): void {
    this.skipHint.classList.toggle('visible', visible);
  }

  /** 漫游时在角落挂一行"H 呼唤引路的光"，让这个功能被看见。 */
  setGuideHint(visible: boolean): void {
    this.guideHint.classList.toggle('visible', visible);
  }

  showIntroCard(): void {
    this.root.classList.add('cinematic');
    this.introCard.classList.add('visible');
  }

  hideIntroCard(): void {
    this.root.classList.remove('cinematic');
    this.introCard.classList.remove('visible');
  }

  setIntroProgress(progress: number): void {
    this.introProgress.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
  }

  setTutorial(text: string | null): void {
    if (this.tutorial.textContent !== (text ?? '')) this.tutorial.textContent = text ?? '';
    this.tutorial.classList.toggle('visible', text !== null);
  }

  pulseTouch(): void {
    this.touchAnimation?.cancel();
    if (!this.settings.reducedMotion) this.touchAnimation = this.reticle.animate([
      { transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.7)', opacity: 0 },
    ], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
  }

  /**
   * 航程：走到第几幕、看过多少件东西。
   *
   * 幕是线性的，所以当前幕之前的都算走完了；当前幕高亮。
   * 八幕名称始终可见，作为航程结构；核心记忆仍只在真正走过后揭示。
   */
  setProgress(currentAct: number, touched: number): void {
    this.currentAct = currentAct;
    this.progressList.innerHTML = '';
    ACTS.forEach((act, index) => {
      const row = el('div', 'voyage-row');
      const state = stateFor(index, currentAct);
      row.dataset.state = state;
      row.dataset.act = String(index);
      row.append(el('i'));
      const ordinal = index === 0 ? '序章' : `第${'一二三四五六七'[index - 1]}幕`;
      const label = `${ordinal} · ${act.def.title}`;
      row.append(el('span', 'name', label));
      // 记忆物件只在窄屏那份列表里铺开；宽屏下海图已经很满，它归悬停卡管
      const memory = index < currentAct ? (MEMORY_LABELS[act.def.id] ?? '') : '';
      row.append(el('span', 'memory', memory));
      // 名字列表与海图互指：停在一行上，图上那一枚也抬起来
      row.addEventListener('pointerenter', () => this.chart?.setHighlight(index));
      row.addEventListener('pointerleave', () => this.chart?.setHighlight(null));
      this.progressList.append(row);
    });
    const summary = el('div', 'voyage-summary');
    summary.textContent = `第 ${currentAct + 1} / ${ACTS.length} 幕 · 已触碰 ${touched} 处`;
    this.progressList.append(summary);

    const here = CHART[Math.max(0, Math.min(CHART.length - 1, currentAct))];
    this.whereami.innerHTML = '';
    if (here) {
      this.whereami.append(
        el('span', undefined, `${here.ordinal} · ${here.title}  ·  ${currentAct + 1} / ${ACTS.length} 幕`),
        // 触碰数在窄屏收起：那儿的汇总行已经写着同一句，页头再挤就会折行
        el('span', 'touched', `  ·  已触碰 ${touched} 处`),
      );
    }
    this.chart?.setProgress(currentAct);
  }

  /** 悬停某一枚章时浮出的那张卡：岛名 / 记忆物件 / 那一句基调。 */
  private showChartCard(island: ChartIsland | null): void {
    if (!island) {
      this.chartCard.classList.remove('visible');
      return;
    }
    const done = stateFor(island.act, this.currentAct) === 'done';
    (this.chartCard.querySelector('.ordinal') as HTMLElement).textContent =
      `${island.ordinal} · ${island.subtitle}`;
    (this.chartCard.querySelector('.name') as HTMLElement).textContent = island.title;
    // 记忆物件只在真的走过之后才写出来：当前这一幕还在走，不剧透
    (this.chartCard.querySelector('.memory') as HTMLElement).textContent = done ? island.memory : '';
    (this.chartCard.querySelector('.tone') as HTMLElement).textContent = island.tone;
    this.chartCard.classList.add('visible');
  }

  showTitle(hasSave: boolean): void {
    this.continueButton.hidden = !hasSave;
    this.titlePanel.classList.remove('hidden');
    this.titlePanel.inert = false;
    (hasSave ? this.continueButton : this.titlePanel.querySelector<HTMLButtonElement>('[data-role="start"]'))?.focus();
  }

  hideTitle(): void {
    this.titlePanel.classList.add('hidden');
    this.titlePanel.inert = true;
  }

  setPaused(paused: boolean): void {
    this.pausePanel.classList.toggle('hidden', !paused);
    this.pausePanel.inert = !paused;
    this.root.classList.toggle('is-paused', paused);
    if (!paused) {
      this.showChartCard(null);
      return;
    }
    this.ensureChart();
    this.chart?.resize();
    this.chart?.setProgress(this.currentAct);
    this.pausePanel.querySelector<HTMLButtonElement>('button')?.focus();
  }

  /**
   * 第一次按下 Esc 时才建海图。
   *
   * 它自带一个 WebGL 上下文，不复用游戏的 `Viewport`——这一条是权衡过的：
   * 游戏的渲染器输出线性色（唯一一次 sRGB 编码交给 `post.ts` 的合成 pass），
   * 而且全作**没有任何地方开阴影**。共用同一个渲染器，就得为海图开启
   * shadowMap 并临时改 outputColorSpace，两者都会让整幕的材质重新编译，
   * 代价落在正常游玩的那 99% 时间里，只为了一块暂停面板。
   *
   * 窄屏下画布被 CSS 收起来（`display:none`），此时不建也不渲染。
   */
  private ensureChart(): void {
    if (this.chart || !this.chartCanvas.clientWidth) return;
    this.chart = new IslandChart(this.chartCanvas, {
      onHover: (island) => {
        this.showChartCard(island);
        const rows = this.progressList.querySelectorAll<HTMLElement>('.voyage-row');
        rows.forEach((row) => row.classList.toggle('hover', row.dataset.act === String(island?.act)));
      },
    });
    this.chart.setReducedMotion(this.settings.reducedMotion);
  }

  showEnd(
    mark: string,
    dedication: string,
    memoirs: readonly { act: number; title: string; item: string }[],
    reveal: readonly string[],
  ): void {
    this.endMark.textContent = mark;
    this.endDedication.textContent = dedication;

    const list = this.endPanel.querySelector('.memoirs') as HTMLElement;
    list.innerHTML = '';
    for (const entry of memoirs) {
      const row = el('div', 'memoir');
      row.append(el('span', 'no', entry.act === 0 ? '序' : String(entry.act)));
      row.append(el('span', 'where', entry.title));
      row.append(el('span', 'what', entry.item));
      list.append(row);
    }

    const revealNode = this.endPanel.querySelector('.reveal') as HTMLElement;
    revealNode.innerHTML = '';
    for (const line of reveal) {
      revealNode.append(el('p', undefined, line));
    }

    this.endPanel.classList.remove('hidden');
    this.endPanel.inert = false;
    this.endPanel.querySelector<HTMLButtonElement>('button')?.focus();
  }

  hideEnd(): void {
    this.endPanel.classList.add('hidden');
    this.endPanel.inert = true;
  }

  update(dt: number): void {
    if (this.actCardTimer > 0) {
      this.actCardTimer -= dt;
      if (this.actCardTimer <= 0) this.actcard.classList.remove('visible');
    }
    // 海图只在面板真的开着的时候跑。恢复游玩后它一帧都不画。
    if (!this.pausePanel.classList.contains('hidden')) {
      if (!this.chart) this.ensureChart();
      this.chart?.update(dt);
      this.chart?.render();
      this.placeVoyageLabels();
    }
  }

  /**
   * 把八行名字摆到各自那枚章的下面。
   *
   * 章在呼吸、镜头有视差，所以每帧都要重摆——标签一旦和章脱开，
   * 它就从"这座岛叫什么"退回成"旁边的一份清单"。
   *
   * 窄屏下海图是收起来的（画布宽度为 0），这时什么也不做，
   * CSS 让那八行退回普通列表。
   */
  private placeVoyageLabels(): void {
    if (!this.chart || !this.chartCanvas.clientWidth) return;
    const anchors = this.chart.labelAnchors();
    const rows = this.progressList.querySelectorAll<HTMLElement>('.voyage-row');
    rows.forEach((row, index) => {
      const anchor = anchors[index];
      if (!anchor) return;
      row.style.left = `${anchor.x.toFixed(1)}px`;
      row.style.top = `${(anchor.y + anchor.scale * 0.16 + 6).toFixed(1)}px`;
    });
  }
}
