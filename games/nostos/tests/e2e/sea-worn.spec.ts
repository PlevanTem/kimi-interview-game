import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type {} from '../../src/probe';

test('前三幕1080p低动态固定镜头、Shader错误与现实记忆切换 @sea-worn', async ({ page }) => {
  test.setTimeout(360000);
  const folder = fileURLToPath(new URL('../../runs/run-20260906-sea-worn-r1/after/', import.meta.url));
  mkdirSync(folder, { recursive: true });
  const errors: string[] = [], reports: unknown[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?preview=lotus');
  await page.waitForFunction(() => window.__nostos?.state().phase === 'roaming');
  const views = [
    { act: 1, name: 'lotus-orchard', x: 2, z: 0, yaw: -0.8, pitch: 0.04 },
    { act: 1, name: 'lotus-crewman', x: 17.4, z: -0.9, yaw: -0.72, pitch: -0.28 },
    { act: 1, name: 'lotus-pottery', x: -10.5, z: 18.5, yaw: 0.54, pitch: -0.4 },
    { act: 1, name: 'lotus-helmet', x: -6, z: -16.5, yaw: 0, pitch: -0.45 },
    { act: 1, name: 'lotus-basket', x: 12, z: -8.5, yaw: -0.7, pitch: -0.4 },
    { act: 2, name: 'cyclops-cave', x: 0, z: -12, yaw: 0, pitch: 0.13 },
    { act: 2, name: 'cyclops-stake', x: 0, z: -24.5, yaw: 0, pitch: -0.43 },
    { act: 0, name: 'prologue-raft', x: 0, z: 7.5, yaw: 0.63, pitch: -0.36 },
    { act: 0, name: 'prologue-boat', x: -8, z: 12.2, yaw: 0, pitch: -0.4 },
  ];
  let current = 1;
  for (const view of views) {
    if (view.act !== current) {
      await page.evaluate((act) => window.__nostos!.gotoAct(act), view.act);
      await page.waitForFunction(() => window.__nostos!.state().phase === 'roaming'); current = view.act;
    }
    await page.evaluate((pose) => window.__nostos!.view(pose), view);
    const before = await page.evaluate(() => window.__nostos!.state().frames);
    await page.waitForFunction((frame) => window.__nostos!.state().frames > frame + 4, before);
    expect(await page.evaluate(() => window.__nostos!.state().artStyle)).toBe(1);
    expect(await page.evaluate(() => window.__nostos!.state().artMotion)).toBe(0);
    await page.screenshot({ path: `${folder}${view.name}.jpg`, type: 'jpeg', quality: 90 });
    reports.push({ view, state: await page.evaluate(() => window.__nostos!.state()) });
  }
  // Exercise the final material's engraving transition, including skipping back to real-world colour.
  await page.evaluate(() => window.__nostos!.teleport('prologue.oar'));
  await page.waitForFunction(() => window.__nostos!.state().focus === 'prologue.oar');
  await page.keyboard.press('e');
  await page.evaluate(() => window.__nostos!.skipNarration());
  await page.waitForFunction(() => window.__nostos!.state().phase === 'vision');
  await page.waitForFunction(() => window.__nostos!.state().visionTime >= 5);
  await page.screenshot({ path: `${folder}prologue-memory.jpg`, type: 'jpeg', quality: 90 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__nostos!.state().phase === 'roaming');
  writeFileSync(`${folder}capture-report.json`, JSON.stringify({ viewport: [1920, 1080], reducedMotion: true,
    renderer: 'Chromium ANGLE SwiftShader; not hardware performance certification', errors, reports }, null, 2));
  expect(errors).toEqual([]);
});
