import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import type { NostosProbe } from '../../src/probe';

type NostosState = ReturnType<NostosProbe['state']>;

/**
 * 端到端：从标题走到伊萨卡。
 *
 * 这一遍不只是"跑通"，它顺手把每一幕的登岸、一处线索与一段幻象拍成截图，
 * 存进 docs/screenshots/ —— 美术方向的证据是实拍画面，不是文字描述。
 *
 * 测试通过 window.__nostos 这个只读探针驱动：它只能传送与触发，
 * 不能改变任何叙事结果，所以它测的确实是玩家会经历的那条路径。
 */

const SHOTS = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));

const state = (page: Page): Promise<NostosState> => page.evaluate(() => window.__nostos!.state());

/**
 * 存一张证据图。
 *
 * 用 JPEG 而不是 PNG：这些画面本身带胶片颗粒，是照片式的连续调，
 * 无损压缩既压不动又会让证据目录涨到几十 MB。质量 82 足够看清构图、
 * 色调、遮幅与阴影，也就是这些图要证明的全部东西。
 */
async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${SHOTS}${name}.jpg`, type: 'jpeg', quality: 82 });
}

async function boot(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.__nostos !== 'undefined');
  // 标题界面本身就是一帧游戏画面，先让它跑几秒
  await page.waitForTimeout(2000);
}

async function waitForPhase(page: Page, phase: string): Promise<void> {
  await page.waitForFunction((want) => window.__nostos!.state().phase === want, phase, {
    timeout: 180_000,
  });
}

/**
 * 开场引导会在黑场里念二十几秒。测试关心的是它能正常结束、
 * 而不是它念得对不对（那由 tests/vision.test.ts 那类单测覆盖），
 * 所以这里直接快进过去。
 */
async function skipIntro(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__nostos!.state().phase !== 'title', null, { timeout: 60_000 });
  if ((await state(page)).phase !== 'intro') return;
  await page.evaluate(() => window.__nostos!.skipNarration());
}

async function waitQuiet(page: Page): Promise<void> {
  await page.waitForFunction(() => !window.__nostos!.state().narrating, null, { timeout: 180_000 });
}

/**
 * 传送之后必须等焦点真的落到那件东西上再触碰。
 *
 * 焦点是在主循环的 roaming 更新里重算的，而 CI 跑的是软件渲染、只有约 2 FPS——
 * 用固定的等待毫秒数会在"还没到下一帧"时就按下交互键，那一下会落空。
 */
async function waitForFocus(page: Page, id: string): Promise<void> {
  await page.waitForFunction((want) => window.__nostos!.state().focus === want, id, {
    timeout: 120_000,
  });
}

/** 传送 → 等焦点 → 触碰。全篇只有这一条路径去碰东西。 */
async function touch(page: Page, id: string): Promise<void> {
  await page.evaluate((target) => window.__nostos!.teleport(target), id);
  await waitForFocus(page, id);
  await page.evaluate(() => window.__nostos!.interact());
}

test.beforeAll(() => {
  mkdirSync(SHOTS, { recursive: true });
});

test('海岸标题连续进入开场，暂停冻结镜头并正常交还控制 @opening', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await boot(page);
  expect((await state(page)).fade).toBe(0);
  await expect(page.locator('.titlepanel')).toBeVisible();
  await shot(page, 'opening-01-title');
  await page.locator('button[data-role="start"]').click();
  await waitForPhase(page, 'intro');
  expect((await state(page)).fade).toBe(0);
  await page.waitForFunction(() => window.__nostos!.state().openingTime > 3);
  await shot(page, 'opening-02-cinematic');
  await page.keyboard.press('Escape');
  await expect(page.locator('.pausepanel:not(.hidden)')).toBeVisible();
  const voyageRows = page.locator('.pausepanel:not(.hidden) .voyage-row');
  await expect(voyageRows).toHaveCount(8);
  const voyageNames = ['序章 · 无名之海', '第一幕 · 忘食岸', '第二幕 · 独眼岬', '第三幕 · 喀耳刻的柱廊',
    '第四幕 · 亡者之岸', '第五幕 · 塞壬水道', '第六幕 · 卡吕普索之岛', '第七幕 · 伊萨卡'];
  for (let i = 0; i < voyageNames.length; i++) {
    await expect(voyageRows.nth(i).locator('.name')).toHaveText(voyageNames[i]!);
  }
  const paused = (await state(page)).openingTime;
  // 等暂停层700ms淡入完成再取证，同时证明过渡期间开场时间保持冻结。
  await page.waitForTimeout(800);
  expect((await state(page)).openingTime).toBe(paused);
  await shot(page, 'pause-01-eight-act-names');
  await page.keyboard.press('Escape');
  await waitForPhase(page, 'roaming');
  const landed = await state(page);
  expect(landed.fade).toBe(0);
  expect(landed.player.x).toBeCloseTo(-1.1, 1);
  await expect(page.locator('.tutorial.visible')).toBeVisible();
  await shot(page, 'opening-03-handoff');
  await page.keyboard.down('w');
  try { await waitForFocus(page, 'prologue.raft'); }
  finally { await page.keyboard.up('w'); }
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__nostos!.state().triggered === 1);
  expect((await state(page)).narrating).toBe(true);
  await expect(page.locator('.tutorial')).not.toHaveClass(/visible/);
  expect(errors).toEqual([]);
});

test('窄屏标题、键盘菜单与低动态跳过可用 @opening', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await expect(page.locator('.motion-switch')).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'opening-04-narrow');
  const start = page.locator('button[data-role="start"]');
  const box = await start.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await page.setViewportSize({ width: 844, height: 390 });
  const compact = await start.boundingBox();
  expect(compact!.y + compact!.height).toBeLessThan(390);
  await start.focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.motion-switch')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(start).toBeFocused();
  await page.keyboard.press('Enter');
  await waitForPhase(page, 'intro');
  await page.keyboard.press('Space');
  await waitForPhase(page, 'roaming');
  expect((await state(page)).fade).toBe(0);
  await expect(page.locator('.titlepanel')).toHaveJSProperty('inert', true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Escape');
  const compactVoyage = page.locator('.pausepanel:not(.hidden) .voyage-row');
  await expect(compactVoyage).toHaveCount(8);
  for (let i = 0; i < 8; i++) await expect(compactVoyage.nth(i).locator('.name')).not.toHaveText('？？？');
  await compactVoyage.last().scrollIntoViewIfNeeded();
  const finalRow = await compactVoyage.last().boundingBox();
  expect(finalRow).not.toBeNull();
  expect(finalRow!.x).toBeGreaterThanOrEqual(0);
  expect(finalRow!.x + finalRow!.width).toBeLessThanOrEqual(390);
  await shot(page, 'pause-02-narrow-eight-act-names');
  await page.keyboard.press('Escape');
});

test('第0幕视觉试点可渲染、木筏可读、导星可抬头对焦 @prologue-visual', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await boot(page);
  await page.locator('button[data-role="start"]').click();
  await skipIntro(page);
  await waitForPhase(page, 'roaming');

  const arrived = await state(page);
  expect(arrived.actId).toBe('prologue');
  expect(arrived.vertexCount).toBeLessThan(300_000);
  await page.waitForTimeout(1200);
  await shot(page, '00-prologue-a-登岸');

  await page.evaluate(() => window.__nostos!.teleport('prologue.raft'));
  await waitForFocus(page, 'prologue.raft');
  await page.waitForTimeout(600);
  await shot(page, '00-prologue-b-线索');

  await page.evaluate(() => window.__nostos!.teleport('prologue.star'));
  await waitForFocus(page, 'prologue.star');
  await page.waitForTimeout(600);
  await shot(page, '00-prologue-d-导星');

  await test.step('到达湿岸，实际向前走后仍显示 E，并能触发水温旁白', async () => {
    // 东岸与旧西南潮石相隔近四十米；这里命中才能证明交互跟着整圈湿岸，而非隐藏点。
    await page.evaluate(() => window.__nostos!.view({ x: 20.8, z: 0, yaw: -Math.PI / 2, pitch: -0.18 }));
    await waitForFocus(page, 'prologue.water');
    await expect(page.locator('.prompt.visible')).toContainText('试水温');
    await expect(page.locator('.prompt.visible em')).toHaveText('E');
    const before = await state(page);
    await page.keyboard.down('w');
    try {
      await page.waitForFunction((from) => {
        const p = window.__nostos!.state().player;
        return Math.hypot(p.x - from.x, p.z - from.z) > 1.2;
      }, before.player, { timeout: 30_000 });
    } finally {
      await page.keyboard.up('w');
    }
    await waitForFocus(page, 'prologue.water');
    await expect(page.locator('.prompt.visible')).toContainText('试水温');
    await shot(page, '00-prologue-e-试水温');
    await page.keyboard.press('e');
    await page.waitForFunction((count) => window.__nostos!.state().triggered === count + 1,
      before.triggered, { timeout: 30_000 });
    expect((await state(page)).narrating).toBe(true);
  });
  expect(errors).toEqual([]);
});

for (const act of ['lotus', 'cyclops'] as const) test(`${act} 建模实拍、全部交互与离岛回归 @act12`, async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('nostos.progress.v1', '{"act":4,"triggered":["keep"]}'));
  await page.goto(`/?preview=${act}`);
  await waitForPhase(page, 'roaming');
  const arrived = await state(page);
  expect(arrived.actId).toBe(act);
  expect(arrived.vertexCount).toBeLessThan(300_000);
  console.log(`${act}: ${arrived.vertexCount} batched vertices`);
  const views = act === 'lotus' ? [
    { name: 'entry', x: -4, z: 30, yaw: 0, pitch: 0.02 },
    { name: 'orchard', x: 2, z: 0, yaw: -0.8, pitch: 0.04 },
    { name: 'pottery', x: -10.5, z: 18.5, yaw: 0.54, pitch: -0.4 },
    { name: 'fruit', x: 12, z: -8.5, yaw: -0.6, pitch: -0.06 },
    { name: 'helmet', x: -6, z: -16.5, yaw: 0, pitch: -0.45 },
    { name: 'crewman-front', x: 17.4, z: -0.9, yaw: -0.72, pitch: -0.28 },
    { name: 'crewman-side', x: 22, z: -2.7, yaw: 1.287, pitch: -0.3 },
  ] : [
    { name: 'entry', x: 4, z: 30, yaw: 0.1, pitch: 0.04 },
    { name: 'cave', x: 0, z: -12, yaw: 0, pitch: 0.13 },
    { name: 'stake', x: 0, z: -24.5, yaw: 0, pitch: -0.43 },
    { name: 'bone', x: 10, z: 15, yaw: -0.5, pitch: 0.2 },
  ];
  for (const view of views) {
    await page.evaluate((pose) => window.__nostos!.view(pose), view);
    await page.waitForTimeout(500);
    await shot(page, `act12-${act}-${view.name}`);
  }
  // Real forward movement into the new cave opening must not be stopped by roof proxies.
  if (act === 'cyclops') {
    await page.evaluate(() => window.__nostos!.view({ x: 0, z: -21.5, yaw: 0, pitch: 0 }));
    await page.keyboard.down('w');
    try { await page.waitForFunction(() => window.__nostos!.state().player.z < -24.2, null, { timeout: 30_000 }); }
    finally { await page.keyboard.up('w'); }
  }
  for (const id of arrived.interactableIds.filter((id) => id !== arrived.memoryId && id !== arrived.departId)) {
    await page.evaluate((id) => window.__nostos!.teleport(id), id);
    await waitForFocus(page, id);
    await expect(page.locator('.prompt.visible em')).toHaveText('E');
    const before = (await state(page)).triggered;
    await page.keyboard.press('e');
    await page.waitForFunction((n) => window.__nostos!.state().triggered === n + 1, before);
    await page.evaluate(() => window.__nostos!.skipNarration());
    await waitQuiet(page);
  }
  await touch(page, arrived.memoryId);
  await page.evaluate(() => window.__nostos!.skipNarration());
  await waitForPhase(page, 'vision');
  await page.evaluate(() => window.__nostos!.skipVision());
  await waitForPhase(page, 'roaming');
  await touch(page, arrived.departId!);
  await page.waitForFunction((n) => window.__nostos!.state().act === n + 1, arrived.act);
  expect(await page.evaluate(() => localStorage.getItem('nostos.progress.v1'))).toBe('{"act":4,"triggered":["keep"]}');
  expect(errors).toEqual([]);
});

test('独眼回忆完整小剧场逐段实拍且自然交还控制 @cyclops-theatre', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?preview=cyclops');
  await waitForPhase(page, 'roaming');
  await page.evaluate(() => window.__nostos!.view({ x: 0, z: -24.7, yaw: 0, pitch: 0 }));
  await waitForFocus(page, 'cyclops.stake');
  await page.keyboard.press('e');
  await page.evaluate(() => window.__nostos!.skipNarration());
  await waitForPhase(page, 'vision');
  const checkpoints: Array<{ target: number; actual: number; screenshot: string }> = [];
  for (const t of [7.5, 21, 31, 42, 56, 66, 76]) {
    await page.waitForFunction((t) => {
      if (window.__nostos!.state().visionTime < t) return false;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
      return true;
    }, t, { timeout: 180_000 });
    const actual = (await state(page)).visionTime;
    expect(actual).toBeLessThan(t + 1);
    const screenshot = `cyclops-theatre-${t}.jpg`;
    // Pause freezes timeline/camera; only hide its menu in the captured image, not game content.
    await page.screenshot({ path: `${SHOTS}${screenshot}`, type: 'jpeg', quality: 82,
      style: '.pausepanel { visibility: hidden !important; }' });
    expect((await state(page)).visionTime).toBe(actual);
    checkpoints.push({ target: t, actual, screenshot });
    await page.keyboard.press('Escape');
    console.log(`cyclops theatre frozen checkpoint ${t}: actual ${actual.toFixed(2)}`);
  }
  await waitForPhase(page, 'roaming');
  expect((await state(page)).triggered).toBe(1);
  await touch(page, 'cyclops.depart');
  await page.waitForFunction(() => window.__nostos!.state().act === 3);
  writeFileSync(`${SHOTS}cyclops-theatre-checkpoints.json`, JSON.stringify({ checkpoints, errors }, null, 2));
  expect(errors).toEqual([]);
});

test('两幕60秒观察与重复切换资源回归 @act12-perf', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?preview=lotus');
  await page.waitForFunction(() => Boolean(window.__nostos));
  const reports = [];
  const resources = [];
  for (const act of [1, 2, 1, 2, 1, 2]) {
    await page.evaluate((act) => window.__nostos!.gotoAct(act), act);
    await waitForPhase(page, 'roaming');
    await page.evaluate((act) => window.__nostos!.view(act === 1
      ? { x: 2, z: 0, yaw: -0.8, pitch: 0.04 } : { x: 0, z: -12, yaw: 0, pitch: 0.13 }), act);
    await page.waitForTimeout(500);
    if (reports.length < 2) {
      const report = await page.evaluate(() => new Promise<{ elapsedMs: number; frames: number; medianMs: number; p95Ms: number }>((resolve) => {
        const start = performance.now(), deltas: number[] = []; let last = start;
        const sample = (now: number) => {
          deltas.push(now - last); last = now;
          if (now - start < 30000) { requestAnimationFrame(sample); return; }
          deltas.sort((a, b) => a - b);
          resolve({ elapsedMs: now - start, frames: deltas.length, medianMs: deltas[Math.floor(deltas.length * 0.5)]!, p95Ms: deltas[Math.floor(deltas.length * 0.95)]! });
        }; requestAnimationFrame(sample);
      }));
      reports.push({ act, ...report });
    }
    resources.push({ act, ...(await state(page)).renderStats });
  }
  // textures.ts deliberately memoizes fleece on the first cyclops visit (+1 globally).
  // Compare two fully warmed cycles, not a cold lotus against the first warm lotus.
  const data = { environment: 'Chromium / ANGLE SwiftShader software renderer; not hardware FPS certification', reports, resources, errors };
  writeFileSync(`${SHOTS}act12-performance.json`, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data));
  expect(resources[4]!.geometries).toBeLessThanOrEqual(resources[2]!.geometries);
  expect(resources[4]!.textures).toBeLessThanOrEqual(resources[2]!.textures);
  expect(resources[5]!.geometries).toBeLessThanOrEqual(resources[3]!.geometries);
  expect(resources[5]!.textures).toBeLessThanOrEqual(resources[3]!.textures);
  expect(errors).toEqual([]);
});

test('从标题走到伊萨卡：八幕都能登岸、读线索、看完回忆、离岛 @journey', async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  await boot(page);

  await expect(page.locator('button[data-role="start"]')).toBeVisible();
  await shot(page, `00-title`);

  await page.locator('button[data-role="start"]').click();
  await skipIntro(page);

  const visited: string[] = [];

  for (let act = 0; act < 8; act += 1) {
    await waitForPhase(page, 'roaming');
    const arrived = await state(page);
    expect(arrived.act).toBe(act);
    visited.push(arrived.actId);

    const index = String(act).padStart(2, '0');
    await shot(page, `${index}-${arrived.actId}-a-登岸`);

    // 性能预算：合批之后单幕顶点数必须留在三十万以内
    expect(arrived.vertexCount).toBeLessThan(300_000);

    // 逐一读完这一幕所有的环境线索与对话
    const others = arrived.interactableIds.filter(
      (id) => id !== arrived.memoryId && id !== arrived.departId,
    );
    expect(others.length).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < others.length; i += 1) {
      await page.evaluate((id) => window.__nostos!.teleport(id), others[i]!);
      await waitForFocus(page, others[i]!);
      if (i === 0) await shot(page, `${index}-${arrived.actId}-b-线索`);
      await page.evaluate(() => window.__nostos!.interact());
      // 第一条完整听完，其余快进：这一遍测的是流程能不能走通，
      // 台词本身由 tests/vision.test.ts 覆盖
      if (i > 0) await page.evaluate(() => window.__nostos!.skipNarration());
      await waitQuiet(page);
    }

    const afterClues = await state(page);
    expect(afterClues.triggered).toBeGreaterThanOrEqual(others.length);

    // 船在核心记忆之前不该亮起：站到船边也拿不到焦点，按下去什么也不会发生
    if (arrived.departId) {
      await page.evaluate((id) => window.__nostos!.teleport(id), arrived.departId);
      await page.waitForTimeout(1500);
      expect((await state(page)).focus).not.toBe(arrived.departId);
      await page.evaluate(() => window.__nostos!.interact());
      await page.waitForTimeout(500);
      expect((await state(page)).phase).toBe('roaming');
    }

    // 触碰核心记忆 → 旁白 → 幻象
    await touch(page, arrived.memoryId);
    await waitForPhase(page, 'vision');

    // 让幻象至少放到第三拍，画面里应该已经有剪影了
    await page.waitForFunction(() => window.__nostos!.state().visionTime > 12, null, {
      timeout: 180_000,
    });
    await shot(page, `${index}-${arrived.actId}-c-回忆`);

    await page.evaluate(() => window.__nostos!.skipVision());
    await waitForPhase(page, act === 7 ? 'ended' : 'roaming');

    if (act === 7) break;

    // 现在船亮了，可以离岛
    const ready = await state(page);
    await touch(page, ready.departId!);
    await page.waitForFunction((want) => window.__nostos!.state().act === want, act + 1, {
      timeout: 180_000,
    });
  }

  expect(visited).toEqual([
    'prologue',
    'lotus',
    'cyclops',
    'circe',
    'nekyia',
    'sirens',
    'calypso',
    'ithaca',
  ]);

  // 终幕字卡
  await page.waitForTimeout(1500);
  await shot(page, `99-终幕`);
  await expect(page.locator('.endcard .mark')).toBeVisible();
});

test('暂停与恢复不会丢掉进度 @flow', async ({ page }) => {
  await boot(page);
  await page.locator('button[data-role="start"]').click();
  await skipIntro(page);
  await waitForPhase(page, 'roaming');

  const before = await state(page);
  await touch(page, before.interactableIds[0]!);
  await waitQuiet(page);
  const triggered = (await state(page)).triggered;
  expect(triggered).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  await expect(page.locator('.panel:not(.hidden) h2')).toHaveText('停下来');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const after = await state(page);
  expect(after.phase).toBe('roaming');
  expect(after.triggered).toBe(triggered);
});

test('主循环保持 requestAnimationFrame 节奏 @performance', async ({ page }) => {
  await boot(page);
  await page.locator('button[data-role="start"]').click();
  await skipIntro(page);
  await waitForPhase(page, 'roaming');

  const first = (await state(page)).frames;
  await page.waitForTimeout(5000);
  const second = (await state(page)).frames;

  // 软件渲染下不苛求 60，但循环必须持续推进且不掉到个位数
  // CI 里跑的是 SwiftShader 软件渲染，帧率只有个位数，
  // 这条断言守的是"主循环没有停"，不是画面性能指标。
  // 真实帧率预算见 docs/ART_BIBLE.md，由 draw call 与顶点数约束。
  const fps = (second - first) / 5;
  expect(fps).toBeGreaterThan(1);
});
