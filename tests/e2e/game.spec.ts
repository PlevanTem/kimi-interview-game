import { expect, test, type Page } from '@playwright/test'

/**
 * 端到端：只覆盖单测覆盖不到的部分——真实浏览器里 WebGL 起得来、键盘走得动、
 * 面板开得开。推理规则本身（三条一组、结局判定）已经由 vitest 全覆盖，这里不重复。
 */

async function startFirstIsland(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /启程/ }).click()
  await expect(page.getByRole('heading', { name: '食忘忧果之岛' })).toBeVisible()
  await page.getByRole('button', { name: /上岸/ }).click()
  await expect(page.getByText('本岛已落定 0 / 3')).toBeVisible()
}

/** 按住一组方向键走一段时间。 */
async function walk(page: Page, keys: string[], ms: number) {
  for (const key of keys) await page.keyboard.down(key)
  await page.waitForTimeout(ms)
  for (const key of keys) await page.keyboard.up(key)
}

test('标题 → 抵达 → 上岛，画布与 HUD 都起得来', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: '归乡录' })).toBeVisible()
  await expect(page.getByText(/三条同时正确，才会一起落定/)).toBeVisible()

  await page.getByRole('button', { name: /启程/ }).click()
  await expect(page.getByRole('heading', { name: '食忘忧果之岛' })).toBeVisible()

  await page.getByRole('button', { name: /上岸/ }).click()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('button', { name: /归乡录/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('走到证物旁边会出现检视提示，检视后写入事实', async ({ page }) => {
  await startFirstIsland(page)

  // 出生点 [0, 8]，沙上脚印 E-001 在 [1.8, 4.6]：往北偏东走。
  await walk(page, ['KeyW', 'KeyD'], 700)
  await walk(page, ['KeyW'], 250)

  await expect(page.getByText(/检视 沙上的脚印/)).toBeVisible({ timeout: 5000 })
  await page.keyboard.press('KeyE')
  await expect(page.getByRole('heading', { name: '沙上的脚印' })).toBeVisible()
  await expect(page.getByText(/第三组脚印没有回来/)).toBeVisible()

  await page.keyboard.press('KeyQ')
  await expect(page.getByRole('heading', { name: '沙上的脚印' })).toBeHidden()
})

test('归乡录：人名默认锁死，且界面不提示对错', async ({ page }) => {
  await startFirstIsland(page)
  await page.getByRole('button', { name: /归乡录/ }).click()

  const ledger = page.getByRole('dialog', { name: '归乡录' })
  await expect(ledger).toBeVisible()
  await expect(ledger.getByText('L-001')).toBeVisible()
  await expect(ledger.getByText(/它们才会一起落定/)).toBeVisible()

  // 开局只认得自己和欧律洛科斯，其余十个名字都是问号。
  await expect(ledger.locator('.roster li.unknown')).toHaveCount(10)

  // 死因这类非人名选项一开始就全列出来——难点是指认谁，不是猜有哪些可能。
  const causeSelect = ledger.getByLabel(/死因是什么？ — 死于/)
  await expect(causeSelect.locator('option')).toHaveCount(5)

  // 填一条正确答案，界面上不能出现任何"对了"的痕迹。
  await causeSelect.selectOption('walked-in')
  await expect(ledger.locator('.entry.locked')).toHaveCount(0)
  await expect(page.locator('.lock-toast')).toHaveCount(0)

  await page.getByRole('button', { name: /合上册子/ }).click()
  await expect(ledger).toBeHidden()
})

test('暂停面板列出全部操作，且不存在计时或血量', async ({ page }) => {
  await startFirstIsland(page)
  await page.keyboard.press('Escape')

  const pause = page.getByRole('dialog', { name: '暂停' })
  await expect(pause).toBeVisible()
  await expect(pause.getByText('这里没有计时，也没有会追上你的东西。慢慢来。')).toBeVisible()
  await expect(pause.getByText('检视 / 交谈 / 唤起记忆')).toBeVisible()

  await page.getByRole('button', { name: /继续/ }).click()
  await expect(pause).toBeHidden()
})
