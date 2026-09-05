import { MEMORY_LABELS, TEXT } from '../content/script';
import { ACTS } from '../game/scenes';
import type { Caption } from '../game/types';
import { navigationMark } from './navigation-mark';

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
  muted: boolean;
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
    muted: false,
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

  private buildPause(): HTMLElement {
    const panel = el('div', 'panel pausepanel hidden');
    panel.append(el('h2', undefined, U.paused));

    const grid = el('div', 'settings');

    const motionLabel = el('span', undefined, U.reducedMotion);
    const motionToggle = el('button', 'toggle', this.settings.reducedMotion ? 'ON' : 'OFF');
    motionToggle.dataset.on = String(this.settings.reducedMotion);
    motionToggle.addEventListener('click', () => {
      this.settings.reducedMotion = !this.settings.reducedMotion;
      motionToggle.textContent = this.settings.reducedMotion ? 'ON' : 'OFF';
      motionToggle.dataset.on = String(this.settings.reducedMotion);
      this.applySettings();
    });

    const muteLabel = el('span', undefined, U.mute);
    const muteToggle = el('button', 'toggle', this.settings.muted ? 'ON' : 'OFF');
    muteToggle.dataset.on = String(this.settings.muted);
    muteToggle.addEventListener('click', () => {
      this.settings.muted = !this.settings.muted;
      muteToggle.textContent = this.settings.muted ? 'ON' : 'OFF';
      muteToggle.dataset.on = String(this.settings.muted);
      this.applySettings();
    });

    const slider = (min: number, max: number, step: number, value: number, apply: (v: number) => void): HTMLInputElement => {
      const input = el('input') as HTMLInputElement;
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.addEventListener('input', () => {
        apply(Number(input.value));
        this.applySettings();
      });
      return input;
    };

    grid.append(
      motionLabel,
      motionToggle,
      muteLabel,
      muteToggle,
      el('span', undefined, U.subtitleSize),
      slider(0.8, 1.6, 0.05, this.settings.subtitleScale, (v) => (this.settings.subtitleScale = v)),
      el('span', undefined, U.sensitivity),
      slider(0.4, 2.2, 0.05, this.settings.sensitivity, (v) => (this.settings.sensitivity = v)),
      el('span', undefined, U.fov),
      slider(50, 80, 1, this.settings.fov, (v) => (this.settings.fov = v)),
    );
    panel.append(grid);

    // 航程：八幕走到哪儿了。做成一条竖列而不是百分比进度条——
    // 玩家记得的是"亡者之岸那只空碗"，不是"已完成 50%"
    panel.append(el('div', 'sectionlabel', U.progressTitle));
    panel.append(el('div', 'voyage'));

    const menu = el('div', 'menu');
    const resume = el('button', 'link', U.back);
    resume.addEventListener('click', () => this.handlers.onResume());
    const restart = el('button', 'link', U.restart);
    restart.addEventListener('click', () => this.handlers.onRestart());
    menu.append(resume, restart);
    panel.append(menu);
    panel.append(el('div', 'footnote', U.controls));
    return panel;
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
    this.progressList.innerHTML = '';
    ACTS.forEach((act, index) => {
      const row = el('div', 'voyage-row');
      const state = index < currentAct ? 'done' : index === currentAct ? 'current' : 'locked';
      row.dataset.state = state;
      row.append(el('i'));
      const ordinal = index === 0 ? '序章' : `第${'一二三四五六七'[index - 1]}幕`;
      const label = `${ordinal} · ${act.def.title}`;
      row.append(el('span', 'name', label));
      const memory = index < currentAct ? (MEMORY_LABELS[act.def.id] ?? '') : '';
      row.append(el('span', 'memory', memory));
      this.progressList.append(row);
    });
    const summary = el('div', 'voyage-summary');
    summary.textContent = `第 ${currentAct + 1} / ${ACTS.length} 幕 · 已触碰 ${touched} 处`;
    this.progressList.append(summary);
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
    if (paused) this.pausePanel.querySelector<HTMLButtonElement>('button')?.focus();
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
  }
}
