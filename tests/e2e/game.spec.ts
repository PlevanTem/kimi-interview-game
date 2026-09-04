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

/**
 * 按住一组键走一段时间。
 *
 * 注意是「按住不放」而不是反复按下抬起：这台机器上 WebGL 走软件渲染，只有 ~6 fps，
 * 短促的按下-抬起经常整个落在两帧之间，等于一步都没走。
 */
async function run(page: Page, keys: string[], ms: number) {
  for (const key of keys) await page.keyboard.down(key)
  await page.waitForTimeout(ms)
  for (const key of keys) await page.keyboard.up(key)
}

/** 按住键一直走，边走边看 HUD 提示，出现目标文字就松手。 */
async function walkUntil(page: Page, keys: string[], expected: RegExp, maxMs = 8000) {
  for (const key of keys) await page.keyboard.down(key)
  try {
    for (let waited = 0; waited < maxMs; waited += 100) {
      await page.waitForTimeout(100)
      const text = await page.locator('.hud-bottom .prompt').textContent()
      if (text && expected.test(text)) return
    }
    throw new Error(`走了 ${maxMs}ms 仍未出现提示：${expected}`)
  } finally {
    for (const key of keys) await page.keyboard.up(key)
  }
}

test('完整通关教学岛：检视 → 填对三条 → 落定 → 抉择 → 离岛', async ({ page }) => {
  await startFirstIsland(page)

  // 走位靠「贴墙」定位而不是算距离：一直往一个方向走到被地形挡住，
  // 落点就与帧率无关了。这里先撞西边界，再南下撞到那块岩台的北面，
  // 于是玩家停在一条确定的纬线上，然后沿这条线往东扫过刻名的护身符。
  await run(page, ['KeyA'], 5000)
  await run(page, ['KeyW'], 4000)
  await walkUntil(page, ['KeyD'], /刻名的护身符/)

  await page.keyboard.press('KeyE')
  await expect(page.getByText(/ΠΕΡΙΜΗΔΗΣ/)).toBeVisible()
  await page.keyboard.press('KeyQ')

  await page.getByRole('button', { name: /归乡录/ }).click()
  const ledger = page.getByRole('dialog', { name: '归乡录' })

  // 检视过护身符之后，「佩里墨得斯」才会出现在人名下拉框里。
  await ledger.getByLabel(/属于哪一位同船者？ — 他是/).selectOption('perimedes')
  await expect(page.locator('.lock-toast')).toHaveCount(0)

  await ledger.getByLabel(/真实身份是谁？ — 他是/).selectOption('perimedes')
  await expect(page.locator('.lock-toast')).toHaveCount(0)

  // 第三条落位——三条同时正确，一起锁定。
  await ledger.getByLabel(/死因是什么？ — 死于/).selectOption('walked-in')
  await expect(page.locator('.lock-toast')).toBeVisible()
  await expect(ledger.locator('.entry.locked')).toHaveCount(3)
  await expect(ledger.getByText('已锁定 3 / 30')).toBeVisible()
  await expect(ledger.getByText('已安息 3 / 12')).toBeVisible()

  // 已落定的条目不可再更改。
  await expect(ledger.getByLabel(/死因是什么？ — 死于/)).toBeDisabled()

  await page.getByRole('button', { name: /合上册子/ }).click()
  await expect(page.getByText('本岛已落定 3 / 3')).toBeVisible()

  // 锁定 L-002 之后，花丛边的抉择才开放。
  await walkUntil(page, ['KeyS', 'KeyD'], /花丛边的决定/)
  await page.keyboard.press('KeyE')
  const choice = page.getByRole('dialog', { name: '花丛边的决定' })
  await expect(choice).toBeVisible()
  await choice.getByRole('button', { name: '把他绑上船带走' }).click()
  await expect(page.getByText(/绳子勒进皮肉的时候他也没喊/)).toBeVisible()
  await page.getByRole('button', { name: /继续/ }).click()

  // 同样贴北边界定位，再沿岸往东扫到离岛点。
  await run(page, ['KeyS'], 5000)
  await walkUntil(page, ['KeyD'], /登船离岛/)
  await page.keyboard.press('KeyE')
  await expect(page.getByRole('heading', { name: '独目巨人的洞窟' })).toBeVisible()
})
