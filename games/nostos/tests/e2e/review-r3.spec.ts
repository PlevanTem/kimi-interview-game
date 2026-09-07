import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type {} from '../../src/probe';
import { ART_REVISION } from '../../src/content/revision';

test('r3 人物陶器盾章实拍与Esc同版工作台 @review-r3', async ({ page, context }) => {
  test.setTimeout(360000);
  const folder = fileURLToPath(new URL('../../runs/run-20260907-review-r3/after/', import.meta.url));
  mkdirSync(folder, { recursive: true });
  const errors: string[] = [], reports: unknown[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?preview=lotus&rev=' + ART_REVISION);
  await page.waitForFunction(() => window.__nostos?.state().phase === 'roaming');
  const poses = [
    { act: 1, name: 'crewman-front', x: 17.4, z: -0.9, yaw: -0.72, pitch: -0.28 },
    { act: 1, name: 'crewman-side', x: 22, z: -2.7, yaw: 1.287, pitch: -0.3 },
    { act: 1, name: 'pottery-clearance', x: -16, z: 14, yaw: -2.2, pitch: -0.3 },
    { act: 2, name: 'shield-engraving', x: -6, z: 4.5, yaw: 0, pitch: -0.65 },
  ];
  let current = 1;
  for (const pose of poses) {
    if (pose.act !== current) {
      await page.evaluate(i => window.__nostos!.gotoAct(i), pose.act);
      await page.waitForFunction(() => window.__nostos!.state().phase === 'roaming'); current = pose.act;
    }
    await page.evaluate(p => window.__nostos!.view(p), pose);
    const frame = await page.evaluate(() => window.__nostos!.state().frames);
    await page.waitForFunction(f => window.__nostos!.state().frames > f + 4, frame);
    await page.screenshot({ path: folder + pose.name + '.jpg', type: 'jpeg', quality: 92 });
  }
  await page.evaluate(() => window.__nostos!.teleport('cyclops.shield'));
  await page.waitForFunction(() => window.__nostos!.state().focus === 'cyclops.shield');
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__nostos!.state().triggered === 1);
  await page.evaluate(() => window.__nostos!.skipNarration());
  await page.keyboard.press('Escape');
  await expect(page.locator('.pausepanel')).toBeVisible();
  await expect(page.locator('.pausepanel')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-role="resume"]')).toBeFocused();
  await expect(page.locator('.review-build')).toHaveAttribute('data-revision', ART_REVISION);
  await page.screenshot({ path: folder + 'esc-864p.jpg', type: 'jpeg', quality: 90 });
  const motion = page.locator('[data-setting="motion-pause"]');
  await expect(motion).toHaveText('ON');
  await motion.click();
  await expect(page.locator('[data-setting="motion-title"]')).toHaveText('镜头 / 流动');
  await motion.click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('.review-build').scrollIntoViewIfNeeded();
  await page.screenshot({ path: folder + 'esc-720p.jpg', type: 'jpeg', quality: 90 });
  const popupPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: '打开同版资产工作台' }).click();
  const workbench = await popupPromise;
  workbench.on('pageerror', e => errors.push(e.message));
  await workbench.waitForLoadState();
  await expect(workbench.locator('html')).toHaveAttribute('data-revision', ART_REVISION);
  await expect(workbench.locator('#act12-hero-assets canvas')).toHaveCount(10);
  await workbench.locator('#act12-hero-assets').screenshot({ path: folder + 'workbench-r3.jpg', type: 'jpeg', quality: 90 });
  await workbench.close();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pausepanel')).toHaveClass(/hidden/);
  await expect(page.locator('.pausepanel')).toHaveCSS('opacity', '0');
  // 60-second wall-clock resource observation; SwiftShader is not hardware FPS certification.
  const start = Date.now(), first = await page.evaluate(() => window.__nostos!.state());
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(10000);
    reports.push(await page.evaluate(() => window.__nostos!.state()));
  }
  const last = await page.evaluate(() => window.__nostos!.state());
  expect(last.renderStats.geometries).toBe(first.renderStats.geometries);
  expect(last.renderStats.textures).toBe(first.renderStats.textures);
  expect(last.renderStats.calls).toBeLessThan(250);
  writeFileSync(folder + 'report.json', JSON.stringify({
    revision: ART_REVISION, errors, reports, elapsedMs: Date.now() - start,
    observedFps: (last.frames - first.frames) * 1000 / (Date.now() - start),
    environment: 'Chromium SwiftShader; no hardware FPS certification',
  }, null, 2));
  expect(errors).toEqual([]);
});
