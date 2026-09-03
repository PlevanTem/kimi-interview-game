import { describe, expect, it } from 'vitest';
import { segments } from '../src/content/segments';
import { canonicalize, validatePath, type PathRules, type Point } from '../src/domain/path';

const rules: PathRules = {
  start: [0, 0],
  target: [10, 0],
  anchorTolerance: 0.24,
  targetTolerance: 0.64,
  budget: 11,
  corridor: { minX: 0, maxX: 10, minY: -2.5, maxY: 2.5 }
};

describe('path rules', () => {
  it('canonicalizes equivalent pointer sampling into the same route', () => {
    const sparse: Point[] = [[0, 0], [5, 0], [10, 0]];
    const dense: Point[] = Array.from({ length: 41 }, (_, index) => [index / 4, 0] as const);
    expect(canonicalize(sparse)).toEqual(canonicalize(dense));
  });

  it.each([
    ['start_anchor', [[1, 0], [10, 0]]],
    ['outside_corridor', [[0, 0], [5, 3], [10, 0]]],
    ['target_miss', [[0, 0], [6, 0]]],
    ['over_budget', [[0, 0], [5, 2], [5, -2], [10, 0]]]
  ] as const)('reports %s deterministically', (reason, points) => {
    expect(validatePath(rules, points).reason).toBe(reason);
  });

  it('accepts every authored segment guide within its corridor and budget', () => {
    for (const segment of segments) {
      const result = validatePath(segment, segment.guide);
      expect(result, `${segment.id}: ${result.reason}, length ${result.length}`).toMatchObject({ valid: true, reason: null });
    }
  });

  it('requires a non-straight spatial choice after the tutorial', () => {
    for (const segment of segments.slice(1)) {
      expect(validatePath(segment, [segment.start, segment.target]).valid, `${segment.id} accepted a straight line`).toBe(false);
    }
  });
});
