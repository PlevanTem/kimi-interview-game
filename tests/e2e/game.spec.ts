import { expect, test } from '@playwright/test'
test('enters the interaction probe and exposes controls', async ({page}) => { await page.goto('/'); await expect(page.getByText('Gate 01 pending')).toBeVisible(); await page.getByRole('button',{name:/Run interaction probe/}).click(); await expect(page.getByText('Active calibration')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toContainText('Probe paused'); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible() })
test('mute and restart remain keyboard accessible', async ({page}) => { await page.goto('/'); await page.getByRole('button',{name:'Mute sound'}).click(); await expect(page.getByRole('button',{name:'Unmute sound'})).toBeVisible(); await page.getByRole('button',{name:'Restart probe'}).click(); await expect(page.getByText('RUN / 002')).toBeVisible() })
test('@visual gate frame is deterministic', async ({page}) => { await page.goto('/'); await expect(page).toHaveScreenshot('gate-entry.png',{animations:'disabled',maxDiffPixelRatio:.02}) })
test('@performance sustains an interactive frame cadence', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Run interaction probe/ }).click()
  const renderer = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
    const extension = gl?.getExtension('WEBGL_debug_renderer_info')
    return gl && extension ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)) : 'unavailable'
  })
  const medianFps = await page.evaluate(() => new Promise<number>((resolve) => {
    const frameTimes: number[] = []
    const started = performance.now()
    let previous = started
    const sample = (now: number) => {
      frameTimes.push(now - previous)
      previous = now
      if (now - started >= 5000) {
        const sorted = frameTimes.slice(1).sort((a, b) => a - b)
        const medianFrameTime = sorted[Math.floor(sorted.length / 2)]
        resolve(1000 / medianFrameTime)
      }
      else requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }))
  console.info(`webgl-renderer=${renderer}`)
  console.info(`median-fps=${medianFps.toFixed(1)}`)
  expect(medianFps).toBeGreaterThanOrEqual(55)
})
