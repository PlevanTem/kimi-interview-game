/**
 * tests/core.test.mjs — 纯逻辑单元测试
 *   node --test games/odyssey-drifter-opus-51/tests/
 * 只覆盖不依赖 DOM 的部分：曲线几何与承重规则。
 * 渲染与手感由 tests/autoplay.js 的整条路线跑通来取证。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../src/core.js');
await import('../src/rules.js');
const C = globalThis.LL.core;
const R = globalThis.LL.rules;

const line = (n, dx) => Array.from({ length: n }, (_, i) => ({ x: i * dx, y: 0 }));

test('polyLength 对直线等于端点距离', () => {
  assert.equal(C.polyLength(line(11, 10)), 100);
  assert.equal(C.polyLength([{ x: 0, y: 0 }, { x: 3, y: 4 }]), 5);
});

test('resample 保端点并保持总长', () => {
  const src = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
  const out = C.resample(src, 41);
  assert.equal(out.length, 41);
  assert.deepEqual(out[0], { x: 0, y: 0 });
  assert.ok(Math.abs(out[40].x - 100) < 1e-6 && Math.abs(out[40].y - 100) < 1e-6);
  assert.ok(Math.abs(C.polyLength(out) - 200) < 1e-6);
});

test('resample 退化输入不抛错', () => {
  assert.equal(C.resample([{ x: 5, y: 5 }], 10).length, 1);
  assert.equal(C.resample([{ x: 5, y: 5 }, { x: 5, y: 5 }], 8).length, 1);
});

test('smoothPoly 不移动端点', () => {
  const src = [{ x: 0, y: 0 }, { x: 10, y: 90 }, { x: 20, y: -90 }, { x: 30, y: 0 }];
  const out = C.smoothPoly(src, 3);
  assert.deepEqual(out[0], src[0]);
  assert.deepEqual(out[out.length - 1], src[src.length - 1]);
  assert.ok(Math.abs(out[1].y) < Math.abs(src[1].y), '中间点应被抹平');
});

test('makeTrack 按弧长采样并给出单位切向', () => {
  const t = C.makeTrack([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
  assert.equal(t.total, 200);
  const a = t.at(50);
  assert.equal(Math.round(a.x), 50);
  assert.equal(Math.round(a.y), 0);
  const b = t.at(150);
  assert.equal(Math.round(b.x), 100);
  assert.equal(Math.round(b.y), 50);
  assert.ok(Math.abs(Math.hypot(b.tx, b.ty) - 1) < 1e-9);
  assert.equal(Math.round(t.at(-99).x), 0);        // 越界钳制
  assert.equal(Math.round(t.at(9e9).y), 100);
});

test('makeRng 确定性且可复现', () => {
  const a = C.makeRng(1234), b = C.makeRng(1234), c = C.makeRng(1235);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()], seqC = [c(), c(), c()];
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
  for (const v of seqA) assert.ok(v >= 0 && v < 1);
});

test('mix 在两个 hex 之间线性插值', () => {
  assert.equal(C.mix('#000000', '#ffffff', 0), '#000000');
  assert.equal(C.mix('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(C.mix('#000000', '#ffffff', 0.5), '#808080');
});

/* ------------------------------------------------------------ 承重规则 */

test('tension: 直线为 1，绕远为小', () => {
  assert.equal(R.tension(100, 100), 1);
  assert.equal(R.tension(200, 100), 0.5);
  assert.equal(R.tension(0, 0), 1);                 // 退化输入不产生 NaN
});

test('capacity 随借锚与同步单调增加', () => {
  const c0 = R.capacity(0, false);
  assert.ok(R.capacity(1, false) > c0);
  assert.ok(R.capacity(0, true) > c0);
  assert.equal(R.capacity(2, true), c0 + 2 * R.RULES.ANCHOR_BONUS + R.RULES.SYNC_BONUS);
});

test('同样弧长下，越紧的线负载越高', () => {
  const cap = R.capacity(0, false);
  const taut = R.load(600, 1.0, cap);
  const slack = R.load(600, 0.6, cap);
  assert.ok(taut > slack, '紧线必须比松线更容易过载');
});

test('借锚可以救回一条过载的长线', () => {
  const arc = 1100;
  assert.ok(R.load(arc, 0.98, R.capacity(0, false)) > 1, '无锚点时应过载');
  assert.ok(R.load(arc, 0.98, R.capacity(1, false)) < 1, '借一个锚点后应成立');
});

test('breakAt: 未过载不断，过载时位置确定且落在可见区间', () => {
  assert.equal(R.breakAt(0.9), Infinity);
  assert.equal(R.breakAt(1.0), Infinity);
  const a = R.breakAt(1.05), b = R.breakAt(1.6);
  assert.ok(a > b, 'load 越高，断点越靠前');
  assert.ok(a > 0.6, '轻微过载应该跑过大半条线才断，玩家才学得到原因');
  for (const l of [1.01, 1.2, 1.5, 3, 99]) {
    const f = R.breakAt(l);
    assert.ok(f >= 0.18 && f <= 0.8, 'load=' + l + ' 的断点必须仍在线上可见');
  }
});

test('tensionLabel 只有三档，且与判定阈值一致', () => {
  assert.equal(R.tensionLabel(0.99), '紧');
  assert.equal(R.tensionLabel(0.8), '稳');
  assert.equal(R.tensionLabel(0.5), '松');
});
