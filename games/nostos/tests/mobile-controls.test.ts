// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MobileControls, TouchGestures, type TouchActions } from '../src/ui/mobile-controls';
import { Walker } from '../src/engine/controller';

const actions = (): TouchActions => ({ move: vi.fn(), look: vi.fn(), interact: vi.fn(), pause: vi.fn(), skip: vi.fn(), guide: vi.fn(), reset: vi.fn() });
afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });

describe('mobile independent input ownership', () => {
  it('moves and looks simultaneously; releasing look preserves movement', () => {
    const a = actions(), input = new TouchGestures(a);
    expect(input.begin('move', 1, 0, 0)).toBe(true);
    expect(input.begin('look', 2, 100, 100)).toBe(true);
    input.drag(1, 0, -60); input.drag(2, 120, 110);
    expect(a.move).toHaveBeenLastCalledWith(0, 1);
    expect(a.look).toHaveBeenLastCalledWith(20, 10);
    input.end(2);
    expect(a.move).toHaveBeenLastCalledWith(0, 1);
    input.end(1);
    expect(a.move).toHaveBeenLastCalledWith(0, 0);
  });
  it('rejects extra finger ownership, removes drift and normalizes diagonals', () => {
    const a = actions(), input = new TouchGestures(a);
    input.begin('move', 7, 20, 20);
    expect(input.begin('move', 8, 0, 0)).toBe(false);
    expect(input.begin('look', 7, 0, 0)).toBe(false);
    input.drag(7, 23, 24);
    expect(a.move).toHaveBeenLastCalledWith(0, -0);
    input.drag(7, 100, -60);
    const [x, y] = vi.mocked(a.move).mock.calls.at(-1)!;
    expect(Math.hypot(x, y)).toBeCloseTo(1);
    input.reset(); input.drag(7, 1000, -1000);
    expect(a.move).toHaveBeenLastCalledWith(0, 0);
  });
});

describe('mobile flow-facing controls', () => {
  it('hybrid fine-pointer laptops retain mouse locking and keyboard motion after touch', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 10 });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    canvas.requestPointerLock = vi.fn();
    const walker = new Walker(canvas);
    const dispatchPointer = (pointerType: string): void => {
      const event = new Event('pointerdown', { bubbles: true });
      Object.defineProperty(event, 'pointerType', { value: pointerType });
      canvas.dispatchEvent(event);
    };
    const controls = new MobileControls(document.body, actions());
    expect(controls.enabled).toBe(true);
    expect(walker.touchMode).toBe(false);
    dispatchPointer('touch'); walker.requestPointerLock();
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
    dispatchPointer('mouse'); walker.requestPointerLock();
    expect(canvas.requestPointerLock).toHaveBeenCalledOnce();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    walker.place(0, 0, 0); walker.update(.1);
    expect(walker.position.z).toBeLessThan(0);
    controls.dispose(); walker.dispose(); vi.unstubAllGlobals();
  });
  it('hides gameplay controls over menus and resets on blur, visibility, resize and dispose', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 2 });
    const a = actions(), controls = new MobileControls(document.body, a);
    controls.setState(true, true, true);
    for (const name of ['interact', 'pause', 'skip', 'guide'] as const) {
      document.querySelector<HTMLButtonElement>(`[data-touch="${name}"]`)!.click();
      expect(a[name]).toHaveBeenCalledOnce();
    }
    window.dispatchEvent(new Event('blur'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('resize'));
    expect(a.reset).toHaveBeenCalledTimes(3);
    controls.setState(false, false, false);
    expect(document.querySelector<HTMLElement>('.mobile-controls')!.hidden).toBe(true);
    document.querySelector<HTMLButtonElement>('[data-touch="pause"]')!.click();
    expect(a.pause).toHaveBeenCalledOnce();
    controls.dispose();
    expect(document.querySelector('.mobile-controls')).toBeNull();
  });
  it('touch never requests pointer lock, obeys phase locks and resets movement', () => {
    const canvas = document.createElement('canvas');
    canvas.requestPointerLock = vi.fn();
    const walker = new Walker(canvas);
    walker.touchMode = true;
    walker.requestPointerLock();
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
    walker.place(0, 0, 0); walker.setTouchMove(0, 1); walker.update(.1);
    expect(walker.position.z).toBeLessThan(0);
    walker.resetInput();
    const z = walker.position.z; walker.update(.1);
    expect(walker.position.z).toBe(z);
    walker.lookEnabled = false; walker.lookBy(40, 50);
    expect(walker.yaw).toBe(0);
    walker.lookEnabled = true; walker.lookBy(40, 10000);
    expect(walker.yaw).toBeLessThan(0);
    expect(walker.pitch).toBeGreaterThan(-Math.PI / 2);
    walker.dispose();
  });
});
