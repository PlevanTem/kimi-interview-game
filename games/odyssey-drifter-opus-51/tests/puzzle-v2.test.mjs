import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../src/puzzle-v2.js');
const P = globalThis.LL.puzzleV2;
const room = (i) => P.ROOMS[i];

test('spike: 同一轨迹可确定识别绞盘、棱镜与出口顺序', () => {
  const r = room(4);
  const points = [r.source, { x: 275, y: 525 }];
  const first = P.analyzeStroke(r, 0, points);
  assert.equal(first.valid, true);
  const second = P.analyzeStroke(r, 1, [
    { x: 275, y: 475 }, { x: 520, y: 485 }, { x: 710, y: 285 },
    { x: 930, y: 515 }, { x: 1160, y: 325 },
  ]);
  assert.equal(second.valid, true, second.reason);
  assert.equal(second.solution, 'short');
  assert.deepEqual(second.trace.map((x) => x.id), ['winch', 'prism-a', 'prism-b', 'exit']);
});

test('房 0 必须经过绞盘，直连出口不能通过', () => {
  const r = room(0);
  assert.equal(P.analyzeStroke(r, 0, [r.source, { x: 1100, y: 450 }]).valid, false);
  assert.equal(P.analyzeStroke(r, 0, [r.source, { x: 520, y: 350 }, { x: 1100, y: 450 }]).valid, true);
});

test('房 1 要求前紧后松，同一条直线不是解', () => {
  const r = room(1);
  const straight = P.analyzeStroke(r, 0, [r.source, { x: 470, y: 340 }, { x: 1115, y: 415 }]);
  assert.equal(straight.valid, false);
  assert.match(straight.reason, /太紧/);
  const shaped = P.analyzeStroke(r, 0, [r.source, { x: 470, y: 340 }, { x: 690, y: 620 }, { x: 1115, y: 415 }]);
  assert.equal(shaped.valid, true, shaped.reason);
  assert.ok(shaped.tensions.before > 0.88 && shaped.tensions.after < 0.84);
});

test('房 2 棱镜顺序错误会被拒绝', () => {
  const r = room(2);
  const wrong = P.analyzeStroke(r, 0, [r.source, { x: 900, y: 540 }, { x: 410, y: 250 }, { x: 1130, y: 320 }]);
  assert.equal(wrong.valid, false);
  const right = P.analyzeStroke(r, 0, [r.source, { x: 410, y: 250 }, { x: 900, y: 540 }, { x: 1130, y: 320 }]);
  assert.equal(right.valid, true, right.reason);
});

test('房 3 必须分两笔，并让阿迦先压住踏座', () => {
  const r = room(3);
  const run = P.makeRun(); run.room = 3;
  const a = P.analyzeStroke(r, 0, [r.source, { x: 475, y: 500 }]);
  assert.equal(a.valid, true);
  const next = P.applyResult(run, a);
  assert.equal(next.phase, 1);
  const b = P.analyzeStroke(r, 1, [{ x: 475, y: 452 }, { x: 760, y: 245 }, { x: 1120, y: 420 }]);
  assert.equal(b.valid, true, b.reason);
});

test('最终房短解与长解都可成立', () => {
  const r = room(4);
  const short = P.analyzeStroke(r, 1, [
    { x: 275, y: 475 }, { x: 520, y: 485 }, { x: 710, y: 285 }, { x: 930, y: 515 }, { x: 1160, y: 325 },
  ]);
  assert.equal(short.valid, true, short.reason);
  assert.equal(short.solution, 'short');
  const long = P.analyzeStroke(r, 1, [
    { x: 275, y: 475 }, { x: 430, y: 230 }, { x: 520, y: 485 },
    { x: 710, y: 285 }, { x: 930, y: 515 }, { x: 1160, y: 325 },
  ]);
  assert.equal(long.valid, true, long.reason);
  assert.equal(long.solution, 'long');
});

test('直连终点策略五房通过率低于 20%', () => {
  let passed = 0;
  for (let i = 0; i < P.ROOMS.length; i++) {
    const r = room(i);
    // 对双阶段房评估真正的解谜阶段；第一阶段的踏座本来就承担教学作用。
    const phaseIndex = r.phases.length - 1;
    const phase = r.phases[phaseIndex];
    const target = phase.devices[phase.devices.length - 1];
    if (P.analyzeStroke(r, phaseIndex, [P.sourceFor(r, phaseIndex), { x: target.x, y: target.y }]).valid) passed++;
  }
  assert.ok(passed / P.ROOMS.length < 0.2, `直连通过率=${passed / P.ROOMS.length}`);
});

test('run 状态在五房完成后确定进入 complete', () => {
  let run = P.makeRun();
  for (let i = 0; i < P.ROOMS.length; i++) {
    const r = room(i);
    for (let phase = 0; phase < r.phases.length; phase++) {
      const spec = r.phases[phase];
      const req = spec.alternatives ? spec.alternatives[0].required : spec.required;
      const devices = Object.fromEntries(spec.devices.map((d) => [d.id, d]));
      const points = [P.sourceFor(r, phase), ...req.map((id) => ({ x: devices[id].x, y: devices[id].y }))];
      if (i === 1) points.splice(2, 0, { x: 690, y: 620 });
      const result = P.analyzeStroke(r, phase, points);
      assert.equal(result.valid, true, `${r.id}/${phase}: ${result.reason}`);
      run = P.applyResult(run, result);
    }
  }
  assert.equal(run.complete, true);
  assert.ok(run.interactions >= 9);
});
