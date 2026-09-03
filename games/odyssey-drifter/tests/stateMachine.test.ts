import { describe, expect, it } from 'vitest';
import { segments } from '../src/content/segments';
import { initialState, transition, type GameState } from '../src/domain/stateMachine';

function submit(state: GameState, points: readonly (readonly [number, number])[]) {
  let next = transition(state, { type: 'BEGIN_PATH' });
  for (const point of points.slice(1)) next = transition(next, { type: 'UPDATE_PATH', point });
  return transition(next, { type: 'SUBMIT_PATH' });
}

describe('game state machine', () => {
  it('supports start, pause, resume, and deterministic restart', () => {
    let state = transition(initialState(), { type: 'START' });
    expect(state.phase).toBe('TutorialObserve');
    state = transition(state, { type: 'PAUSE' });
    expect(state).toMatchObject({ phase: 'Paused', pausedFrom: 'TutorialObserve' });
    state = transition(state, { type: 'RESUME' });
    expect(state.phase).toBe('TutorialObserve');
    state = transition(state, { type: 'RESTART' });
    expect(state).toMatchObject({ phase: 'TutorialObserve', segmentIndex: 0, exhaustions: 0, completed: [] });
  });

  it('recovers from two invalid paths and fails on the third', () => {
    let state = transition(initialState(), { type: 'START' });
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      state = submit(state, [segments[0].start, [5, 0]]);
      expect(state.exhaustions).toBe(attempt);
      if (attempt < 3) {
        expect(state.phase).toBe('RecoverSegment');
        state = transition(state, { type: 'TICK', deltaMs: 0 });
      }
    }
    expect(state).toMatchObject({ phase: 'RunFailure', lastReason: 'target_miss' });
  });

  it('completes all eight segments only after traversal resolves', () => {
    let state = transition(initialState(), { type: 'START' });
    for (const [index, segment] of segments.entries()) {
      state = submit(state, segment.guide);
      expect(state.phase).toBe('Traverse');
      state = transition(state, { type: 'TICK', deltaMs: 850 });
      expect(state.completed).toHaveLength(index + 1);
    }
    expect(state).toMatchObject({ phase: 'RunSuccess', segmentIndex: 7, exhaustions: 0 });
  });

  it('records an illegal transition without corrupting state', () => {
    const state = transition(initialState(), { type: 'SUBMIT_PATH' });
    expect(state).toMatchObject({ phase: 'Title', segmentIndex: 0 });
    expect(state.diagnostics).toEqual(['Title:SUBMIT_PATH']);
  });
});
