import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

type Point = readonly [number, number];
const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../runs/run-20260902-odyssey-graybox/evidence');

async function phase(page: Page) {
  return page.evaluate(() => window.__odysseyGraybox?.getState().phase);
}

async function waitForPhase(page: Page, expected: string | string[]) {
  const phases = Array.isArray(expected) ? expected : [expected];
  await page.waitForFunction((allowed) => allowed.includes(window.__odysseyGraybox?.getState().phase ?? ''), phases);
}

async function draw(page: Page, points: readonly Point[]) {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  const screen = ([x, y]: Point) => ({
    x: box.x + ((x + 1) / 12) * box.width,
    y: box.y + ((4.5 - y) / 9) * box.height
  });
  const first = screen(points[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const point of points.slice(1)) {
    const target = screen(point);
    await page.mouse.move(target.x, target.y, { steps: 8 });
  }
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#primary')).toHaveText('开始旅程');
});

test('completes the full eight-segment desktop-browser loop', async ({ page }) => {
  await page.locator('#primary').click();
  const guides = await page.evaluate(() => window.__odysseyGraybox?.getSegments().map((segment) => segment.guide) ?? []);
  expect(guides).toHaveLength(8);

  for (const [index, guide] of guides.entries()) {
    if (index === 7) {
      await mkdir(evidenceDir, { recursive: true });
      await page.screenshot({ path: path.join(evidenceDir, 'spatial-choice.png'), fullPage: true });
    }
    await draw(page, guide);
    await waitForPhase(page, index === 7 ? 'RunSuccess' : 'Observe');
  }

  await expect(page.locator('#overlay-title')).toHaveText('这一段走完了');
  await expect(page.locator('#progress')).toHaveText('8 / 8');
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, 'full-success.png'), fullPage: true });
});

test('supports pause/resume and failure/restart without losing control', async ({ page }) => {
  await page.locator('#primary').click();
  await page.locator('#pause').click();
  expect(await phase(page)).toBe('Paused');
  await expect(page.locator('#overlay-title')).toHaveText('已暂停');
  await page.locator('#primary').click();
  expect(await phase(page)).toBe('TutorialObserve');

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await draw(page, [[0, 0], [5, 0]]);
    await waitForPhase(page, attempt === 3 ? 'RunFailure' : 'TutorialObserve');
  }
  await expect(page.locator('#overlay-title')).toHaveText('这次路线暂时没有抵达');
  await expect(page.locator('#exhaustions')).toHaveText('3 / 3');
  await page.locator('#primary').click();
  expect(await phase(page)).toBe('TutorialObserve');
  await expect(page.locator('#exhaustions')).toHaveText('0 / 3');
});

test('@performance holds a stable requestAnimationFrame cadence', async ({ page }) => {
  await page.locator('#primary').click();
  const metrics = await page.evaluate(async () => {
    const deltas: number[] = [];
    let previous = performance.now();
    await new Promise<void>((resolve) => {
      const sample = (now: number) => {
        deltas.push(now - previous);
        previous = now;
        if (deltas.length >= 121) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const stable = deltas.slice(1).sort((a, b) => a - b);
    const medianMs = stable[Math.floor(stable.length / 2)];
    const p95Ms = stable[Math.floor(stable.length * 0.95)];
    return { medianFps: 1000 / medianMs, medianMs, p95Ms, samples: stable.length };
  });
  expect(metrics.samples).toBe(120);
  expect(metrics.medianFps).toBeGreaterThanOrEqual(55);
  expect(metrics.p95Ms).toBeLessThan(35);
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, 'performance.json'), `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  test.info().annotations.push({ type: 'performance', description: JSON.stringify(metrics) });
});
