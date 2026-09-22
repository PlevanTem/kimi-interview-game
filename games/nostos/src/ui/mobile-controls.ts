import './mobile-controls.css';

export interface TouchActions {
  move(x: number, forward: number): void;
  look(dx: number, dy: number): void;
  interact(): void;
  pause(): void;
  skip(): void;
  guide(): void;
  reset(): void;
}

/** Two independent pointer owners: lifting the looking finger never releases movement. */
export class TouchGestures {
  private movePointer: { id: number; x: number; y: number } | null = null;
  private lookPointer: { id: number; x: number; y: number } | null = null;
  constructor(private readonly actions: Pick<TouchActions, 'move' | 'look'>) {}
  begin(kind: 'move' | 'look', id: number, x: number, y: number): boolean {
    if (this.movePointer?.id === id || this.lookPointer?.id === id) return false;
    if (kind === 'move') {
      if (this.movePointer) return false;
      this.movePointer = { id, x, y };
    } else {
      if (this.lookPointer) return false;
      this.lookPointer = { id, x, y };
    }
    return true;
  }
  drag(id: number, x: number, y: number): void {
    const move = this.movePointer;
    if (move?.id === id) {
      const dx = x - move.x, dy = move.y - y;
      const distance = Math.hypot(dx, dy);
      const strength = Math.min(1, Math.max(0, (distance - 7) / 45));
      this.actions.move(distance ? dx / distance * strength : 0, distance ? dy / distance * strength : 0);
    }
    const look = this.lookPointer;
    if (look?.id === id) {
      this.actions.look(x - look.x, y - look.y);
      look.x = x; look.y = y;
    }
  }
  end(id: number): void {
    if (this.movePointer?.id === id) {
      this.movePointer = null;
      this.actions.move(0, 0);
    }
    if (this.lookPointer?.id === id) this.lookPointer = null;
  }
  reset(): void {
    this.movePointer = null; this.lookPointer = null;
    this.actions.move(0, 0);
  }
}

export class MobileControls {
  readonly enabled = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
  private readonly root = document.createElement('div');
  private readonly gestures: TouchGestures;
  private readonly abort = new AbortController();
  private active = false;
  private skipButton!: HTMLButtonElement;
  private interactButton!: HTMLButtonElement;

  constructor(container: HTMLElement, private readonly actions: TouchActions) {
    this.gestures = new TouchGestures(actions);
    this.root.className = 'mobile-controls';
    this.root.hidden = true;
    if (!this.enabled) return;
    container.classList.add('touch-input');
    for (const kind of ['move', 'look'] as const) {
      const zone = document.createElement('div');
      zone.className = `touch-zone touch-${kind}`;
      zone.setAttribute('aria-label', kind === 'move' ? '拖动行走' : '拖动转向');
      zone.textContent = kind === 'move' ? '拖动行走' : '拖动转向';
      const options = { signal: this.abort.signal };
      zone.addEventListener('pointerdown', (event) => {
        if (!this.active || !this.gestures.begin(kind, event.pointerId, event.clientX, event.clientY)) return;
        event.preventDefault();
        zone.setPointerCapture(event.pointerId);
      }, options);
      zone.addEventListener('pointermove', (event) => {
        if (this.active) this.gestures.drag(event.pointerId, event.clientX, event.clientY);
      }, options);
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
        zone.addEventListener(event, (e) => this.gestures.end(e.pointerId), options);
      }
      this.root.append(zone);
    }
    const buttons = document.createElement('div');
    buttons.className = 'touch-actions';
    const add = (label: string, name: string, action: () => void): HTMLButtonElement => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label; button.dataset.touch = name;
      button.addEventListener('click', () => { if (this.active) action(); }, { signal: this.abort.signal });
      buttons.append(button);
      return button;
    };
    this.interactButton = add('触碰 / 下一句', 'interact', actions.interact);
    this.skipButton = add('跳过', 'skip', actions.skip);
    add('引路', 'guide', actions.guide);
    add('暂停', 'pause', actions.pause);
    const hint = document.createElement('div');
    hint.className = 'touch-portrait-hint';
    hint.textContent = '横屏游玩视野更开阔 · 暂停与菜单始终可用';
    this.root.append(buttons, hint);
    container.append(this.root);
    window.addEventListener('blur', this.reset, { signal: this.abort.signal });
    window.addEventListener('resize', this.reset, { signal: this.abort.signal });
    document.addEventListener('visibilitychange', this.reset, { signal: this.abort.signal });
  }

  setState(active: boolean, canSkip: boolean, canInteract: boolean): void {
    if (!this.enabled) return;
    if (this.active && !active) this.reset();
    this.active = active;
    this.root.hidden = !active;
    this.skipButton.hidden = !canSkip;
    this.interactButton.disabled = !canInteract;
  }

  readonly reset = (): void => {
    this.gestures.reset();
    this.actions.reset();
  };

  dispose(): void {
    this.reset();
    this.abort.abort();
    this.root.remove();
  }
}
