import { expect, test } from "@playwright/test";

test("captain route completes both combats and writes a rumor", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "千名之海" })).toBeVisible();
  await page.getByRole("button", { name: "驶入盐岬" }).click();
  await page.keyboard.press("f");
  await page.getByRole("button", { name: /归来的船长/ }).click();

  await expect(page.getByText("青色吸气 · 可招架", { exact: true })).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "L 招架" }).click();
  await expect(page.locator(".boss-bar .sigil--thread.is-active")).toHaveCount(1);
  await expect(page.getByText("青色吸气 · 可招架", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "K 重击" }).click();
  await expect(page.getByText("潮门誓卫", { exact: true })).toBeVisible();

  for (let index = 0; index < 2; index += 1) {
    await expect(page.getByText("青色吸气 · 可招架", { exact: true })).toBeVisible({ timeout: 4_000 });
    await page.getByRole("button", { name: "L 招架" }).click({ force: true });
    await expect(page.locator(".boss-bar .sigil--thread.is-active")).toHaveCount(index + 1);
    await expect(page.getByText("青色吸气 · 可招架", { exact: true })).toBeHidden();
  }
  await expect(page.getByText("金色环击 · 闪避", { exact: true })).toBeVisible({ timeout: 4_000 });
  await page.getByRole("button", { name: "⇧ 闪避" }).click({ force: true });
  await expect(page.getByText("金色环击 · 闪避", { exact: true })).toBeHidden();
  await expect(page.getByText("青色吸气 · 可招架", { exact: true })).toBeVisible({ timeout: 4_000 });
  await page.getByRole("button", { name: "L 招架" }).click({ force: true });
  await expect(page.locator(".boss-bar .sigil--thread.is-active")).toHaveCount(3);
  await expect(page.getByText("青色吸气 · 可招架", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "K 重击" }).click();
  await expect(page.getByRole("button", { name: "R 拆名" })).toHaveClass(/ready/);
  await page.getByRole("button", { name: "R 拆名" }).click();

  await expect(page.getByRole("heading", { name: "你如何结束这场胜利？" })).toBeVisible();
  await page.getByRole("button", { name: /公开誓名/ }).click();
  await expect(page.getByText("传闻已写入", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "登上归潮号" }).click();
  await expect(page.getByRole("heading", { name: "海记住了你的结束方式" })).toBeVisible();
  await page.screenshot({ path: "runs/run-20260904-sea-of-thousand-names-action-vertical-slice-v1/success-screen.png", fullPage: true });
});
