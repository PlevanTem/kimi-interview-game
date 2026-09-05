import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.NOSTOS_E2E_PORT ?? 4175);

/**
 * 仓库容器里预装了 Chromium，但它的版本号未必和当前 @playwright/test
 * 期望的下载版本一致。存在就直接用它，永远不要执行 playwright install。
 */
const PREINSTALLED = '/opt/pw-browsers/chromium';
const executablePath = existsSync(PREINSTALLED) ? PREINSTALLED : undefined;

export default defineConfig({
  testDir: `${root}tests/e2e`,
  outputDir: `${root}test-results`,
  // 软件渲染下一遍完整流程要跑几分钟，超时给足
  timeout: 40 * 60 * 1000,
  expect: { timeout: 120 * 1000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: [
        '--no-sandbox',
        // CI 容器里没有 GPU，用 SwiftShader 软件渲染 WebGL2
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite preview --config games/nostos/vite.config.ts --port ${port} --strictPort`,
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: process.env.NOSTOS_E2E_PORT === undefined,
    timeout: 120 * 1000,
  },
});
