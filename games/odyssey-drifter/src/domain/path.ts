export type Point = readonly [number, number];
export type PathReason = 'start_anchor' | 'outside_corridor' | 'blocked_gap' | 'target_miss' | 'over_budget' | null;

export interface BlockZone {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PathRules {
  start: Point;
  target: Point;
  anchorTolerance: number;
  targetTolerance: number;
  budget: number;
  corridor: { minX: number; maxX: number; minY: number; maxY: number };
  blocks?: readonly BlockZone[];
}

export interface PathValidation {
  valid: boolean;
  reason: PathReason;
  normalized: Point[];
  length: number;
}

const grid = 1 / 64;
const resampleStep = 1 / 4;
const quantize = (value: number) => Math.round(value / grid) * grid;
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const same = (a: Point, b: Point) => distance(a, b) < 0.0001;

export function canonicalize(raw: readonly Point[]): Point[] {
  if (raw.length < 2) throw new Error('路径至少需要两个点');
  const points: Point[] = [];
  for (const point of raw) {
    const next: Point = [quantize(point[0]), quantize(point[1])];
    if (!points.length || !same(points.at(-1)!, next)) points.push(next);
  }
  if (points.length < 2) throw new Error('路径归一化后为空');

  const simplified: Point[] = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = simplified.at(-1)!;
    const current = points[index];
    const next = points[index + 1];
    const dx1 = current[0] - previous[0];
    const dy1 = current[1] - previous[1];
    const dx2 = next[0] - current[0];
    const dy2 = next[1] - current[1];
    const cross = dx1 * dy2 - dy1 * dx2;
    const forward = dx1 * dx2 + dy1 * dy2;
    if (Math.abs(cross) > grid || forward < 0) simplified.push(current);
  }
  simplified.push(points.at(-1)!);

  const sampled: Point[] = [simplified[0]];
  for (let index = 1; index < simplified.length; index += 1) {
    const from = simplified[index - 1];
    const to = simplified[index];
    const segmentLength = distance(from, to);
    const steps = Math.max(1, Math.ceil(segmentLength / resampleStep));
    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps;
      const next: Point = [quantize(from[0] + (to[0] - from[0]) * ratio), quantize(from[1] + (to[1] - from[1]) * ratio)];
      if (!same(sampled.at(-1)!, next)) sampled.push(next);
    }
  }
  return sampled;
}

export function validatePath(rules: PathRules, raw: readonly Point[]): PathValidation {
  const normalized = canonicalize(raw);
  const length = normalized.slice(1).reduce((sum, point, index) => sum + distance(normalized[index], point), 0);
  const startsAtAnchor = distance(normalized[0], rules.start) <= rules.anchorTolerance;
  const endsAtTarget = distance(normalized.at(-1)!, rules.target) <= rules.targetTolerance;
  const staysInCorridor = normalized.every(([x, y]) => x >= rules.corridor.minX && x <= rules.corridor.maxX && y >= rules.corridor.minY && y <= rules.corridor.maxY);
  const crossesGap = normalized.some(([x, y]) => rules.blocks?.some((block) => x >= block.minX && x <= block.maxX && y >= block.minY && y <= block.maxY));
  const reason: PathReason = !startsAtAnchor ? 'start_anchor' : !staysInCorridor ? 'outside_corridor' : crossesGap ? 'blocked_gap' : !endsAtTarget ? 'target_miss' : length > rules.budget ? 'over_budget' : null;
  return { valid: reason === null, reason, normalized, length: Number(length.toFixed(3)) };
}
