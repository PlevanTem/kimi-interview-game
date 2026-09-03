import { expect, test } from "@playwright/test";

const routes = ["painterly", "relic", "manuscript"];

test("three routes render and preserve shared state", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByTestId("scene-painterly")).toBeVisible();
  await page.getByTestId("observe-token").click();
  await page.getByTestId("route-relic").click();
  await expect(page.getByTestId("scene-relic")).toBeVisible();
  await expect(page.getByText("断裂客符")).toBeVisible();
  await page.getByTestId("route-manuscript").click();
  await expect(page.getByTestId("scene-manuscript")).toBeVisible();
  await expect(page.getByText(/欠来者一次款待/)).toBeVisible();
  expect(errors).toEqual([]);
});

for (const route of routes) {
  test(`capture ${route}`, async ({ page }) => {
    await page.goto(`/?route=${route}`);
    await expect(page.getByTestId(`scene-${route}`)).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `evidence/${route}-1440x960.png`, fullPage: true });
  });
}
