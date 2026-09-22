import { test, expect, type Page } from '@playwright/test';
import type {} from '../../src/probe';

// Installed Windows Edge; these checks prove rendering/contracts, not phone FPS.
test.use({ launchOptions: { channel: 'msedge', args: ['--no-sandbox'] }, viewport: { width: 960, height: 540 } });

async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__nostos?.state().phase === 'roaming');
  await page.evaluate(() => window.__nostos!.view({ x: 4, z: 33, yaw: 0, pitch: -0.04 }));
  const frames = await page.evaluate(() => window.__nostos!.state().frames);
  await page.waitForFunction(n => window.__nostos!.state().frames > n + 5, frames);
}

test('quality tiers render without shader errors and low removes halation passes', async ({ page }, info) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const results: Record<string, ReturnType<NonNullable<typeof window.__nostos>['state']>> = {};
  for (const tier of ['low', 'medium', 'high']) {
    await page.goto(`/?preview=calypso&quality=${tier}`);
    await settle(page);
    results[tier] = await page.evaluate(() => window.__nostos!.state());
    expect(results[tier]!.quality.level).toBe(tier);
    expect(results[tier]!.renderStats.calls).toBeGreaterThan(2);
    await info.attach(`${tier}-render`, { body: await page.screenshot(), contentType: 'image/png' });
  }
  expect(results.high!.renderStats.calls - results.low!.renderStats.calls).toBe(3);
  expect(results.medium!.renderStats.calls).toBe(results.high!.renderStats.calls);
  expect(errors).toEqual([]);
  await info.attach('quality-metrics', { body: JSON.stringify({ results, errors }, null, 2), contentType: 'application/json' });
});

test('desktop and emulated touch choose documented defaults; URL wins on touch', async ({ browser }, info) => {
  test.setTimeout(240000);
  for (const touch of [false, true]) {
    const context = await browser.newContext({ hasTouch: touch, viewport: { width: 960, height: 540 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${info.project.use.baseURL ?? 'http://127.0.0.1:4175'}/?preview=calypso`);
    await settle(page);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(touch);
    expect(await page.evaluate(() => window.__nostos!.state().quality.level)).toBe(touch ? 'low' : 'high');
    if (touch) {
      await page.goto(`${info.project.use.baseURL ?? 'http://127.0.0.1:4175'}/?preview=calypso&quality=high`);
      await settle(page);
      expect(await page.evaluate(() => window.__nostos!.state().quality.level)).toBe('high');
    }
    expect(errors).toEqual([]);
    await context.close();
  }
});
