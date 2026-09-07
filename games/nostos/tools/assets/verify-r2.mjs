import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const folder = fileURLToPath(new URL('../../runs/run-20260907-review-r2/after/', import.meta.url));
mkdirSync(folder, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [], results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  for (const path of ['/tools/assets/index.html', '/docs/asset-library.html']) {
    await page.goto('http://127.0.0.1:4176' + path);
    await page.locator('#coastal-assets canvas').last().waitFor({ timeout: 120000 });
    assert.equal(await page.locator('#coastal-assets canvas').count(), 8);
    assert.equal(await page.locator('#texture canvas').count(), 8);
    assert.equal(await page.locator('#prologue-hero-assets canvas').count(), 3);
    assert.equal(await page.getByText('渲染失败', { exact: false }).count(), 0);
    results.push({ path, coastalCards: 8, textureCards: 8, prologueCards: 3 });
    if (path.startsWith('/docs')) {
      for (const id of ['prologue-hero-assets', 'coastal-assets', 'texture']) {
        await page.locator('#' + id).screenshot({ path: folder + 'workbench-' + id + '.jpg', type: 'jpeg', quality: 90 });
      }
    }
  }
  assert.deepEqual(errors, []);
  writeFileSync(folder + 'workbench-report.json', JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }));
} finally { await browser.close(); }
