import assert from 'node:assert/strict';

const round = (value) => Math.round(value * 1000) / 1000;
const distance = ([ax, ay], [bx, by]) => Math.hypot(ax - bx, ay - by);

function normalize(points) {
  assert.ok(Array.isArray(points) && points.length >= 2, 'path needs at least two points');
  const normalized = [];
  for (const point of points) {
    assert.ok(Array.isArray(point) && point.length === 2, 'point must have x and y');
    const next = [round(point[0]), round(point[1])];
    if (!normalized.length || distance(normalized.at(-1), next) > 0.001) normalized.push(next);
  }
  assert.ok(normalized.length >= 2, 'path collapses after normalization');
  return normalized;
}

function validate(config, rawPoints) {
  const points = normalize(rawPoints);
  const length = points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
  const startsAtAnchor = distance(points[0], config.start) <= config.anchorTolerance;
  const endsAtTarget = distance(points.at(-1), config.target) <= config.targetTolerance;
  const staysInCorridor = points.every(([x, y]) => x >= config.corridor.minX && x <= config.corridor.maxX && y >= config.corridor.minY && y <= config.corridor.maxY);
  const reason = !startsAtAnchor ? 'start_anchor' : !staysInCorridor ? 'outside_corridor' : !endsAtTarget ? 'target_miss' : length > config.budget ? 'over_budget' : null;
  return { valid: reason === null, reason, normalized: points, length: round(length) };
}

const config = {
  start: [0, 0], target: [10, 0], anchorTolerance: 0.2, targetTolerance: 0.6,
  budget: 12, corridor: { minX: 0, maxX: 10, minY: -1.5, maxY: 1.5 }
};

const validRawPath = [[0, 0], [2, 0.25], [5, -0.25], [8, 0.2], [10, 0]];
const validA = validate(config, validRawPath);
const validB = validate(config, validRawPath);
assert.deepEqual(validA, validB, 'identical input must replay identically');
assert.equal(validA.valid, true, 'expected valid path');
assert.deepEqual(validate(config, [[0, 0], [2, 2], [10, 0]]).reason, 'outside_corridor');
assert.deepEqual(validate(config, [[0, 0], [3, 0], [7, 0], [9, 0]]).reason, 'target_miss');
assert.deepEqual(validate({ ...config, budget: 10.01 }, validRawPath).reason, 'over_budget');
assert.deepEqual(validate(config, [[1, 0], [10, 0]]).reason, 'start_anchor');

console.log(JSON.stringify({
  spike: 'path-rules-v1',
  result: 'PASS',
  deterministicReplay: JSON.stringify(validA) === JSON.stringify(validB),
  validLength: validA.length,
  checkedFailures: ['outside_corridor', 'target_miss', 'over_budget', 'start_anchor']
}));
