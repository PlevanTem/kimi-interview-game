import { expect, test } from "@playwright/test";

test("character lab exposes the model, twelve actions, camera presets and debug controls", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await page.goto("/?lab=character");

  await expect(page.getByRole("heading", { name: "角色动作实验室" })).toBeVisible();
  await expect(page.getByText("NOT GATE 3", { exact: true })).toBeVisible();
  const canvas = page.getByTestId("character-canvas").locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(page.getByRole("heading", { name: "千名之海" })).toHaveCount(0);
  expect(await canvas.evaluate((element) => Boolean((element as HTMLCanvasElement).getContext("webgl2")))).toBe(true);

  const actionButtons = page.getByTestId("action-button");
  await expect(actionButtons).toHaveCount(12);

  const heavy = page.locator('[data-testid="action-button"][data-action-id="heavy"]');
  await heavy.click();
  await expect(heavy).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("current-action")).toContainText("重击");

  const heroCamera = page.getByTestId("camera-three-quarter");
  await heroCamera.click();
  await expect(heroCamera).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "runs/run-20260904-sea-of-thousand-names-hero-code-model-v1/character-lab.png",
    fullPage: true,
  });

  const leftCamera = page.getByTestId("camera-left");
  await leftCamera.click();
  await expect(leftCamera).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("camera-status")).toHaveText("左侧 90°");

  const wireframe = page.getByTestId("wireframe-toggle");
  await wireframe.click();
  await expect(wireframe).toHaveAttribute("aria-pressed", "true");

  const autoplay = page.getByTestId("autoplay-toggle");
  await autoplay.click();
  await expect(autoplay).toHaveAttribute("aria-pressed", "true");
  await expect(autoplay).toContainText("暂停轮播");

  await page.screenshot({
    path: "runs/run-20260904-sea-of-thousand-names-hero-code-model-v1/character-lab-wireframe.png",
    fullPage: true,
  });
  expect(runtimeErrors).toEqual([]);
});
