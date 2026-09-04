import { MEMORY_LABELS, TEXT } from '../content/script';
import { ACTS } from '../game/scenes';
import type { Caption } from '../game/types';

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

    // 开场卡：黑场里压在字幕上方的一行，告诉玩家这几句是给他听的
    this.introCard = el('div', 'introcard');
    this.introCard.append(el('div', 'mark', U.title), el('div', 'latin', U.titleSub));
    this.root.append(this.introCard);

    this.titlePanel = this.buildTitle();
    this.pausePanel = this.buildPause();
    this.endPanel = this.buildEnd();
    this.progressList = this.pausePanel.querySelector('.voyage') as HTMLElement;
    this.endMark = this.endPanel.querySelector('.mark') as HTMLElement;
    this.endDedication = this.endPanel.querySelector('.dedication') as HTMLElement;
    this.continueButton = this.titlePanel.querySelector('[data-role="continue"]') as HTMLButtonElement;
    this.root.append(this.titlePanel, this.pausePanel, this.endPanel);

    container.append(this.root);
    this.applySettings();
  }

  // ── 构建 ──

  private buildTitle(): HTMLElement {
    const panel = el('div', 'panel');
    panel.append(el('h1', undefined, U.title));
    panel.append(el('div', 'latin', U.titleSub));
    panel.append(el('div', 'tagline', U.titleLine));

    const menu = el('div', 'menu');
    const start = el('button', 'link', U.start);
    start.dataset.role = 'start';
    start.addEventListener('click', () => this.handlers.onStart());

    const cont = el('button', 'link', U.resume);
    cont.dataset.role = 'continue';
    cont.hidden = true;
    cont.addEventListener('click', () => this.handlers.onResume());

    menu.append(cont, start);
    panel.append(menu);
    panel.append(el('div', 'footnote', U.controls));
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
    this.introCard.classList.add('visible');
  }

  hideIntroCard(): void {
    this.introCard.classList.remove('visible');
  }

  /**
   * 航程：走到第几幕、看过多少件东西。
   *
   * 幕是线性的，所以当前幕之前的都算走完了；当前幕高亮；后面的还没揭开，
   * 只留一个占位——把没到的地方剧透出来，等于把探索的意义提前花掉。
   */
  setProgress(currentAct: number, touched: number): void {
    this.progressList.innerHTML = '';
    ACTS.forEach((act, index) => {
      const row = el('div', 'voyage-row');
      const state = index < currentAct ? 'done' : index === currentAct ? 'current' : 'locked';
      row.dataset.state = state;
      row.append(el('i'));
      const label = index > currentAct ? '？？？' : act.def.title;
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
  }

  hideTitle(): void {
    this.titlePanel.classList.add('hidden');
  }

  setPaused(paused: boolean): void {
    this.pausePanel.classList.toggle('hidden', !paused);
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
  }

  hideEnd(): void {
    this.endPanel.classList.add('hidden');
  }

  update(dt: number): void {
    if (this.actCardTimer > 0) {
      this.actCardTimer -= dt;
      if (this.actCardTimer <= 0) this.actcard.classList.remove('visible');
    }
  }
}
