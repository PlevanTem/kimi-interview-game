import { segments } from '../content/segments';
import { validatePath, type PathReason, type Point } from './path';

export type Phase = 'Title' | 'TutorialObserve' | 'TutorialDraft' | 'Observe' | 'Draft' | 'Traverse' | 'RecoverSegment' | 'Paused' | 'RunSuccess' | 'RunFailure';

export interface GameState {
  phase: Phase;
  segmentIndex: number;
  exhaustions: number;
  draft: Point[];
  committed: Point[];
  completed: Point[][];
  travelerProgress: number;
  pausedFrom: Exclude<Phase, 'Paused'> | null;
  lastReason: PathReason;
  diagnostics: string[];
}

export type GameEvent =
  | { type: 'START' }
  | { type: 'BEGIN_PATH' }
  | { type: 'UPDATE_PATH'; point: Point }
  | { type: 'SUBMIT_PATH' }
  | { type: 'CANCEL_PATH' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' };

export const initialState = (): GameState => ({
  phase: 'Title', segmentIndex: 0, exhaustions: 0, draft: [], committed: [], completed: [], travelerProgress: 0, pausedFrom: null, lastReason: null, diagnostics: []
});

const illegal = (state: GameState, event: GameEvent): GameState => ({ ...state, diagnostics: [...state.diagnostics, `${state.phase}:${event.type}`] });
const observePhase = (segmentIndex: number): Phase => segmentIndex === 0 ? 'TutorialObserve' : 'Observe';
const draftPhase = (segmentIndex: number): Phase => segmentIndex === 0 ? 'TutorialDraft' : 'Draft';

export function transition(state: GameState, event: GameEvent): GameState {
  if (event.type === 'RESTART') return { ...initialState(), phase: 'TutorialObserve' };
  if (event.type === 'PAUSE' && !['Title', 'Paused', 'RunSuccess', 'RunFailure'].includes(state.phase)) return { ...state, phase: 'Paused', pausedFrom: state.phase as Exclude<Phase, 'Paused'> };
  if (event.type === 'RESUME' && state.phase === 'Paused' && state.pausedFrom) return { ...state, phase: state.pausedFrom, pausedFrom: null };
  if (state.phase === 'Paused') return illegal(state, event);

  if (state.phase === 'Title' && event.type === 'START') return { ...initialState(), phase: 'TutorialObserve' };
  if ((state.phase === 'TutorialObserve' || state.phase === 'Observe') && event.type === 'BEGIN_PATH') {
    return { ...state, phase: draftPhase(state.segmentIndex), draft: [segments[state.segmentIndex].start], committed: [], lastReason: null };
  }
  if ((state.phase === 'TutorialDraft' || state.phase === 'Draft') && event.type === 'UPDATE_PATH') {
    const draft = [...state.draft, event.point];
    let lastReason: PathReason = null;
    try { lastReason = validatePath(segments[state.segmentIndex], draft).reason; } catch { /* a one-point preview is not yet a path */ }
    return { ...state, draft, lastReason };
  }
  if ((state.phase === 'TutorialDraft' || state.phase === 'Draft') && event.type === 'CANCEL_PATH') return { ...state, phase: observePhase(state.segmentIndex), draft: [], lastReason: null };
  if ((state.phase === 'TutorialDraft' || state.phase === 'Draft') && event.type === 'SUBMIT_PATH') {
    if (state.draft.length < 2) return illegal(state, event);
    const result = validatePath(segments[state.segmentIndex], state.draft);
    if (result.valid) return { ...state, phase: 'Traverse', draft: [], committed: result.normalized, travelerProgress: 0, lastReason: null };
    const exhaustions = state.exhaustions + 1;
    return { ...state, phase: exhaustions >= 3 ? 'RunFailure' : 'RecoverSegment', exhaustions, draft: [], committed: result.normalized, lastReason: result.reason };
  }
  if (state.phase === 'RecoverSegment' && event.type === 'TICK') return { ...state, phase: observePhase(state.segmentIndex), committed: [] };
  if (state.phase === 'Traverse' && event.type === 'TICK') {
    const travelerProgress = Math.min(1, state.travelerProgress + event.deltaMs / 850);
    if (travelerProgress < 1) return { ...state, travelerProgress };
    const completed = [...state.completed, state.committed];
    if (state.segmentIndex === segments.length - 1) return { ...state, phase: 'RunSuccess', travelerProgress: 1, completed };
    const segmentIndex = state.segmentIndex + 1;
    return { ...state, phase: 'Observe', segmentIndex, exhaustions: 0, draft: [], committed: [], completed, travelerProgress: 0 };
  }
  return illegal(state, event);
}

export function replay(events: readonly GameEvent[]): GameState {
  return events.reduce(transition, initialState());
}
