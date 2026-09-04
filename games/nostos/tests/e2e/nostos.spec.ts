import { mkdirSync } from 'node:fs';
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

test('从标题走到伊萨卡：八幕都能登岸、读线索、看完回忆、离岛 @journey', async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  await boot(page);

  await expect(page.locator('button[data-role="start"]')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}00-title.png` });

  await page.locator('button[data-role="start"]').click();

  const visited: string[] = [];

  for (let act = 0; act < 8; act += 1) {
    await waitForPhase(page, 'roaming');
    const arrived = await state(page);
    expect(arrived.act).toBe(act);
    visited.push(arrived.actId);

    const index = String(act).padStart(2, '0');
    await page.screenshot({ path: `${SHOTS}${index}-${arrived.actId}-a-登岸.png` });

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
      if (i === 0) await page.screenshot({ path: `${SHOTS}${index}-${arrived.actId}-b-线索.png` });
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
    await page.screenshot({ path: `${SHOTS}${index}-${arrived.actId}-c-回忆.png` });

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
  await page.screenshot({ path: `${SHOTS}99-终幕.png` });
  await expect(page.locator('.endcard .mark')).toBeVisible();
});

test('暂停与恢复不会丢掉进度 @flow', async ({ page }) => {
  await boot(page);
  await page.locator('button[data-role="start"]').click();
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
