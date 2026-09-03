import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const gameRoot = fileURLToPath(new URL('.', import.meta.url));
const viteCli = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url));

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './runs/run-20260902-odyssey-graybox/evidence/playwright',
  timeout: 30_000,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 960 },
    trace: 'on'
  },
  webServer: {
    command: `node "${viteCli}" --host 127.0.0.1 --port 4174`,
    cwd: gameRoot,
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: true,
    timeout: 30_000
  }
});
