import { test, expect } from '@playwright/test';
import type {} from '../../src/probe';

test.use({ hasTouch: true, viewport: { width: 844, height: 390 }, launchOptions: { channel: 'msedge', args: ['--no-sandbox'] } });

test('touch move/look, interruption, interaction and portrait menu @mobile', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?preview=prologue');
  await page.waitForFunction(() => window.__nostos?.state().phase === 'roaming');
  await expect(page.locator('.mobile-controls')).toBeVisible();
  await page.evaluate(() => window.__nostos!.view({ x: 0, z: 10, yaw: 0, pitch: 0 }));
  const initial = await page.evaluate(() => window.__nostos!.state().player);
  const cdp = await page.context().newCDPSession(page);
  const points = [{ x: 90, y: 290, id: 1 }, { x: 700, y: 280, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...points[0], y: 230 }, { ...points[1], x: 740 }] });
  await page.waitForFunction(initial => {
    const p = window.__nostos!.state().player;
    return p.z < initial.z - .3 && p.yaw < initial.yaw - .08;
  }, initial);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.locator('[data-touch="pause"]').tap();
  await expect(page.locator('.pausepanel')).toBeVisible();
  await expect(page.locator('.mobile-controls')).toBeHidden();
  const stopped = await page.evaluate(() => window.__nostos!.state().player);
  await page.locator('[data-role="resume"]').tap();
  const frame = await page.evaluate(() => window.__nostos!.state().frames);
  await page.waitForFunction(frame => window.__nostos!.state().frames > frame + 3, frame);
  expect((await page.evaluate(() => window.__nostos!.state().player)).z).toBe(stopped.z);
  expect(await page.evaluate(() => document.pointerLockElement === null)).toBe(true);
  await page.evaluate(() => window.__nostos!.teleport('prologue.raft'));
  await page.waitForFunction(() => window.__nostos!.state().focus === 'prologue.raft');
  await page.locator('[data-touch="interact"]').tap();
  await page.waitForFunction(() => window.__nostos!.state().narrating);
  await expect(page.locator('[data-touch="skip"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.touch-portrait-hint')).toBeVisible();
  await page.locator('[data-touch="pause"]').tap();
  await expect(page.locator('[data-role="resume"]')).toBeVisible();
  expect(errors).toEqual([]);
});
