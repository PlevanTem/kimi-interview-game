import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type {} from '../../src/probe';

test('人工反馈：晴日、陶纹、刻名、光晕及完整序章回忆 @review-r2', async ({ page }) => {
  test.setTimeout(480000);
  const folder = fileURLToPath(new URL('../../runs/run-20260907-review-r2/after/', import.meta.url));
  mkdirSync(folder, { recursive: true });
  const errors: string[] = [], checkpoints: unknown[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.goto('/?preview=lotus');
  await page.waitForFunction(() => window.__nostos?.state().phase === 'roaming');
  for (const pose of [
    { name: 'lotus-sunny', x: 2, z: 0, yaw: -0.8, pitch: 0.04 },
    { name: 'lotus-pottery', x: -16, z: 14, yaw: -2.2, pitch: -0.3 },
  ]) {
    await page.evaluate(p => window.__nostos!.view(p), pose);
    const f = await page.evaluate(() => window.__nostos!.state().frames);
    await page.waitForFunction(f => window.__nostos!.state().frames > f + 4, f);
    await page.screenshot({ path: folder + pose.name + '.jpg', type: 'jpeg', quality: 90 });
  }
  await page.evaluate(() => window.__nostos!.gotoAct(0));
  await page.waitForFunction(() => window.__nostos!.state().phase === 'roaming');
  await page.evaluate(() => window.__nostos!.view({ x: 7.5, z: 6.3, yaw: 0, pitch: -0.53 }));
  const frame = await page.evaluate(() => window.__nostos!.state().frames);
  await page.waitForFunction(f => window.__nostos!.state().frames > f + 5, frame);
  await page.screenshot({ path: folder + 'name-and-glint.jpg', type: 'jpeg', quality: 90 });
  await page.evaluate(() => window.__nostos!.teleport('prologue.oar'));
  await page.waitForFunction(() => window.__nostos!.state().focus === 'prologue.oar');
  await page.keyboard.press('e'); await page.evaluate(() => window.__nostos!.skipNarration());
  await page.waitForFunction(() => window.__nostos!.state().phase === 'vision');
  for (const t of [4, 11.8, 18, 23, 30]) {
    await page.waitForFunction(t => {
      if (window.__nostos!.state().visionTime < t) return false;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' })); return true;
    }, t);
    const actual = await page.evaluate(() => window.__nostos!.state().visionTime);
    expect(actual).toBeLessThan(t + 1);
    await page.screenshot({ path: folder + `memory-${t}.jpg`, type: 'jpeg', quality: 90,
      style: '.pausepanel { visibility: hidden !important; }' });
    checkpoints.push({ target: t, actual }); await page.keyboard.press('Escape');
  }
  await page.waitForFunction(() => window.__nostos!.state().phase === 'roaming');
  expect(await page.evaluate(() => window.__nostos!.state().triggered)).toBe(1);
  writeFileSync(folder + 'report.json', JSON.stringify({ errors, checkpoints, viewport: [1536, 864] }, null, 2));
  expect(errors).toEqual([]);
});
